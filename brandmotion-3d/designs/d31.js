// 31 — Iridescent Bubbles: thin-film soap bubbles drifting and wobbling through the night air.
export default {
  id: "31",
  name: "Iridescent Bubbles",
  blurb: "Blue-violet soap bubbles drifting in the dark. Sweep your cursor to blow them away.",
  camera: { fov: 40, position: [0, 0.4, 10], target: [0, 0.6, 0] },
  bloom: { strength: 0.7, radius: 0.5, threshold: 0.8 },
  exposure: 1.05,

  setup({ THREE, scene, camera, sky, pointer, pointerRaw, rand, glsl }) {
    sky({ top: "#02050d", mid: "#0a1631", horizon: "#223d74", haze: 0.18 });
    const R = rand(31);

    const base = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uSeed: { value: 0 }, uWob: { value: 0 } },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      vertexShader: /* glsl */ `
        uniform float uTime, uSeed, uWob; varying vec3 vN; varying vec3 vW; varying vec3 vP;
        ${glsl.noise}
        void main(){
          float w = snoise(vec3(position * 1.2 + uSeed * 10.0 + vec3(0.0, uTime * 0.5, 0.0))) * (0.03 + uWob);
          vec3 p = position * (1.0 + w);
          vP = position;
          vec4 wp = modelMatrix * vec4(p, 1.0); vW = wp.xyz;
          vN = normalize(mat3(modelMatrix) * normal);
          gl_Position = projectionMatrix * viewMatrix * wp;
        }`,
      fragmentShader: /* glsl */ `
        uniform float uTime, uSeed; varying vec3 vN; varying vec3 vW; varying vec3 vP;
        ${glsl.noise}
        vec3 env(vec3 r){
          vec3 c = mix(vec3(0.02,0.035,0.08), vec3(0.1,0.16,0.32), smoothstep(-0.4, 0.6, r.y));
          // soft window highlight + rim strips
          vec2 q = (r.xy - vec2(0.32, 0.46)) / vec2(0.22, 0.3);
          c += vec3(1.8, 1.95, 2.3) * smoothstep(1.0, 0.35, length(q)) * smoothstep(-0.1, 0.3, r.z);
          c += vec3(0.35,0.5,0.9) * smoothstep(0.08, 0.0, abs(r.x + 0.8)) * 0.6;
          return c;
        }
        void main(){
          vec3 N = normalize(vN), V = normalize(cameraPosition - vW);
          if (!gl_FrontFacing) N = -N;
          float c = clamp(abs(dot(N, V)), 0.0, 1.0);
          // Film thickness (nm): drains downward, swirls slowly.
          float sw = snoise(vec3(vP * 1.8 + vec3(0.0, uTime * 0.12, uSeed * 7.0))) * 0.5 + snoise(vP * 4.0 - uTime * 0.08 + uSeed) * 0.2;
          float d = 280.0 + 260.0 * (0.5 - vP.y * 0.45) + 180.0 * sw;
          float st = sqrt(1.0 - c * c) / 1.33; float ct = sqrt(max(1.0 - st * st, 0.0));
          float opd = 2.0 * 1.33 * d * ct;
          vec3 lam = vec3(640.0, 540.0, 440.0);
          vec3 film = 0.5 - 0.5 * cos(6.2831853 * opd / lam);
          film = pow(film, vec3(1.6));
          film = mix(film, film * vec3(0.6, 0.8, 1.4), 0.7);       // blue/violet bias
          float fr = 0.03 + 0.97 * pow(1.0 - c, 3.0);
          vec3 R = reflect(-V, N);
          vec3 col = film * (env(R) * 0.9 + 0.1) * (0.04 + fr * 2.0);
          if (!gl_FrontFacing) col *= 0.45;
          col += vec3(0.8, 0.9, 1.2) * pow(max(dot(R, normalize(vec3(0.35, 0.5, 0.8))), 0.0), 160.0) * 2.5;
          gl_FragColor = vec4(col, 1.0);
        }`,
    });

    const geo = new THREE.SphereGeometry(1, 72, 48);
    const bubbles = [];
    const layout = [
      [-0.3, 1.2, 0.5, 1.15], [2.4, 0.4, -0.6, 0.8], [-2.8, 0.1, -1.2, 0.9], [1.1, 2.6, -2.0, 0.6], [-1.8, 2.7, -1.5, 0.55],
      [3.9, 2.3, -3.5, 0.7], [-4.6, 1.8, -3.0, 0.75], [0.9, -0.3, 1.8, 0.45], [-1.7, -0.3, 1.2, 0.35], [4.5, -0.4, -2.2, 0.5],
      [-3.7, -0.8, -0.5, 0.4], [2.2, 3.4, 0.5, 0.3], [-0.2, 3.6, -3.8, 0.5], [5.8, 0.9, -5.0, 0.65],
    ];
    layout.forEach(([x, y, z, r], i) => {
      const mat = base.clone();
      mat.uniforms.uSeed.value = R() * 10;
      const m = new THREE.Mesh(geo, mat);
      m.scale.setScalar(r);
      scene.add(m);
      bubbles.push({ m, home: new THREE.Vector3(x, y, z), off: new THREE.Vector3(), vel: new THREE.Vector3(), r, ph: R() * 6.28, sp: 0.4 + R() * 0.5, wob: 0 });
    });

    // Soft bokeh motes.
    const N = 160, dp = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) dp.set([(R() - 0.5) * 20, (R() - 0.5) * 11, -4 - R() * 10], i * 3);
    const dg = new THREE.BufferGeometry();
    dg.setAttribute("position", new THREE.BufferAttribute(dp, 3));
    const motes = new THREE.Points(dg, new THREE.PointsMaterial({ color: new THREE.Color(0.35, 0.45, 0.9), size: 0.07, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
    scene.add(motes);

    const ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), hit = new THREE.Vector3(), p = new THREE.Vector3();
    const last = new THREE.Vector2();
    let gust = 0;
    return (t, dt) => {
      const moved = pointerRaw.distanceTo(last);
      last.copy(pointerRaw);
      gust += (Math.min(0.25 + moved * 30, 2.5) - gust) * 0.1;
      ray.setFromCamera(pointer, camera);
      const ok = ray.ray.intersectPlane(plane, hit);

      bubbles.forEach((b) => {
        const drift = p.set(Math.sin(t * b.sp * 0.6 + b.ph) * 0.35, Math.sin(t * b.sp + b.ph * 2.0) * 0.25, Math.cos(t * b.sp * 0.5 + b.ph) * 0.2);
        const cur = drift.add(b.home).add(b.off);
        if (ok) {
          const dx = cur.x - hit.x, dy = cur.y - hit.y, d2 = dx * dx + dy * dy + 0.25;
          const f = (gust * 2.2) / (d2 * (0.6 + b.r));
          const inv = 1 / Math.sqrt(d2);
          b.vel.x += dx * inv * f * dt; b.vel.y += dy * inv * f * dt; b.vel.z -= f * dt * 0.4;
          b.wob = Math.min(0.05, b.wob + f * dt * 0.04);
        }
        b.vel.addScaledVector(b.off, -0.35 * dt).multiplyScalar(1 - dt * 0.9);
        b.off.addScaledVector(b.vel, dt);
        b.wob *= 1 - dt * 1.5;
        b.m.position.copy(cur);
        b.m.rotation.y = t * 0.1 + b.ph;
        b.m.material.uniforms.uTime.value = t;
        b.m.material.uniforms.uWob.value = b.wob;
      });
      motes.rotation.z = t * 0.01;
      camera.position.x = pointer.x * 0.4;
      camera.position.y = 0.4 + pointer.y * 0.25;
      camera.lookAt(0, 0.6, 0);
    };
  },
};
