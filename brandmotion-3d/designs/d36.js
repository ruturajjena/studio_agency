// 36 — Smoke Column: a luminous particle plume curling up from a glowing floor vent.
export default {
  id: "36",
  name: "Smoke Column",
  blurb: "A column of luminous smoke curls up from a glowing vent. The plume bends toward your cursor.",
  camera: { fov: 38, position: [0, 2.0, 10.5], target: [0, 1.2, 0] },
  bloom: { strength: 0.8, radius: 0.7, threshold: 0.75 },
  exposure: 1.0,

  setup({ THREE, scene, camera, pointer, rand, glsl }) {
    const r = rand(36);
    const VENT = -0.35;
    const uniforms = { uTime: { value: 0 }, uBend: { value: new THREE.Vector2() }, uPx: { value: 1 } };

    // Particle plume. Each particle is stateless: its age drives height, spread and colour.
    const makePlume = (count, opts) => {
      const seed = new Float32Array(count * 4);
      for (let i = 0; i < count * 4; i++) seed[i] = r();
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
      g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 4));
      const m = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms,
        vertexShader: `
          uniform float uTime, uPx; uniform vec2 uBend; attribute vec4 aSeed; varying float vAge; varying float vA; varying float vS;
          ${glsl.noise}
          void main(){
            float life = ${opts.life};
            float age = fract(uTime / (life * (0.75 + aSeed.w * 0.5)) + aSeed.x);
            float H = ${opts.height};
            float y = H * (1.0 - pow(1.0 - age, 1.35));
            float a = aSeed.z * 6.2832 + age * ${opts.swirl};
            float rad = sqrt(aSeed.y) * ${opts.r0} + pow(age, 1.3) * ${opts.spread};
            vec3 p = vec3(cos(a) * rad, y, sin(a) * rad);
            vec3 q = p * 0.55 + vec3(0.0, -uTime * 0.45, 0.0);
            vec3 n = vec3(snoise(q), snoise(q + vec3(19.1, 7.3, 3.7)), snoise(q + vec3(-4.2, 31.7, 11.9)));
            p += n * (0.08 + age * ${opts.turb});
            p.x += uBend.x * y * y * 0.075;
            p.z += uBend.y * y * y * 0.05;
            p.y += ${VENT.toFixed(2)};
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            gl_PointSize = (${opts.size0} + age * ${opts.size1}) * uPx * (10.0 / -mv.z);
            vAge = age; vS = aSeed.w;
            vA = smoothstep(0.0, 0.06, age) * pow(1.0 - age, 1.6);
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: `
          varying float vAge; varying float vA; varying float vS;
          void main(){
            vec2 c = gl_PointCoord - 0.5; float d = dot(c, c) * 4.0;
            float f = exp(-d * ${opts.sharp});
            vec3 hot = vec3(1.0, 1.25, 1.9), mid = vec3(0.35, 0.55, 1.2), cool = vec3(0.25, 0.22, 0.75);
            vec3 col = mix(hot, mid, smoothstep(0.0, 0.25, vAge));
            col = mix(col, cool, smoothstep(0.35, 1.0, vAge) * (0.5 + 0.5 * vS));
            gl_FragColor = vec4(col * f * vA * ${opts.alpha}, 1.0);
          }`,
      });
      const pts = new THREE.Points(g, m);
      pts.frustumCulled = false;
      scene.add(pts);
    };
    makePlume(16000, { life: "7.0", height: "5.4", swirl: "3.0", r0: "0.32", spread: "1.1", turb: "1.25", size0: "5.0", size1: "34.0", sharp: "3.0", alpha: "0.075" });
    makePlume(900, { life: "3.2", height: "4.2", swirl: "5.0", r0: "0.25", spread: "0.5", turb: "0.7", size0: "2.2", size1: "1.0", sharp: "6.0", alpha: "0.9" });

    // Floor lit by the vent.
    const floorU = { uTime: uniforms.uTime };
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.ShaderMaterial({
      uniforms: floorU,
      vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `
        uniform float uTime; varying vec3 vW;
        void main(){
          float d = length(vW.xz);
          float flick = 0.9 + 0.1 * sin(uTime * 7.0) * sin(uTime * 3.1);
          vec3 col = vec3(0.0012, 0.0025, 0.007);
          col += vec3(0.08, 0.14, 0.4) * exp(-d * 0.9) * flick;
          float grid = max(smoothstep(0.97, 1.0, abs(sin(vW.x * 3.1416))), smoothstep(0.97, 1.0, abs(sin(vW.z * 3.1416))));
          col += vec3(0.012, 0.022, 0.06) * grid * exp(-d * 0.35);
          col = mix(col, vec3(0.0012, 0.0028, 0.007), smoothstep(8.0, 30.0, length(vW - cameraPosition)));
          gl_FragColor = vec4(col, 1.0);
        }`,
    }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = VENT;
    scene.add(floor);

    // Vent: bright ring and a hot core disc.
    const ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.8, 2.2, 3.2), toneMapped: false });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.025, 12, 96), ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = VENT + 0.02;
    scene.add(ring);
    const lip = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.05, 12, 96), new THREE.MeshStandardMaterial({ color: 0x0b1428, metalness: 0.8, roughness: 0.3 }));
    lip.rotation.x = Math.PI / 2;
    lip.position.y = VENT + 0.01;
    scene.add(lip);
    const core = new THREE.Mesh(new THREE.CircleGeometry(0.48, 64), new THREE.ShaderMaterial({
      uniforms: floorU, toneMapped: false,
      vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
      fragmentShader: "uniform float uTime; varying vec2 vUv; void main(){ float d = length(vUv - 0.5) * 2.0; float f = 0.85 + 0.15 * sin(uTime * 9.0 + d * 8.0); gl_FragColor = vec4(mix(vec3(2.4, 2.8, 3.6), vec3(0.3, 0.5, 1.2), d) * f, 1.0); }",
    }));
    core.rotation.x = -Math.PI / 2;
    core.position.y = VENT + 0.015;
    scene.add(core);
    scene.add(new THREE.AmbientLight(0x4060a0, 0.4));
    const pl = new THREE.PointLight(0x9fc0ff, 6, 6, 1.5);
    pl.position.set(0, VENT + 0.4, 0);
    scene.add(pl);

    const base = camera.position.clone(), look = new THREE.Vector3(0, 1.2, 0);
    return (t) => {
      uniforms.uTime.value = t;
      uniforms.uPx.value = Math.min(window.devicePixelRatio, 1.75);
      uniforms.uBend.value.set(pointer.x * 1.2 + Math.sin(t * 0.3) * 0.12, -pointer.y * 0.6);
      camera.position.set(base.x + pointer.x * 0.5, base.y + pointer.y * 0.3, base.z);
      camera.lookAt(look);
    };
  },
};
