// 38 — Portal Arch: a monumental stone arch holding a swirling luminous vortex on a dark mirror floor.
export default {
  id: "38",
  name: "Portal Arch",
  blurb: "A monolithic stone arch frames a swirling vortex of light. The vortex's eye drifts with your cursor.",
  theme: "neon",
  camera: { fov: 38, position: [0, 0.8, 11.5], target: [0, 1.45, 0] },
  bloom: { strength: 0.85, radius: 0.6, threshold: 0.72 },
  exposure: 1.0,

  setup({ THREE, scene, camera, pointer, rand, glsl }) {
    const r = rand(38);
    scene.fog = new THREE.FogExp2(0x040914, 0.018);
    const world = new THREE.Group();
    world.scale.setScalar(0.82);
    scene.add(world);

    // Arch outline as a single polygon (outer arch, then the opening in reverse).
    const W = 4.6, w = 2.8, HS = 3.2, DEPTH = 1.1;
    const s = new THREE.Shape();
    s.moveTo(-W / 2, 0); s.lineTo(-W / 2, HS);
    s.absarc(0, HS, W / 2, Math.PI, 0, true);
    s.lineTo(W / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, HS);
    s.absarc(0, HS, w / 2, 0, Math.PI, false);
    s.lineTo(-w / 2, 0); s.closePath();
    const archGeo = new THREE.ExtrudeGeometry(s, { depth: DEPTH, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 2, curveSegments: 48 });
    archGeo.translate(0, 0, -DEPTH / 2);

    const vortexLight = new THREE.PointLight(0x8fb4ff, 30, 12, 1.6);
    vortexLight.position.set(0, 2.8, 1.2);
    world.add(vortexLight);
    const rim = new THREE.DirectionalLight(0x9fc0ff, 0.7);
    rim.position.set(-4, 8, -6);
    const fill = new THREE.DirectionalLight(0x6f8fd0, 0.35);
    fill.position.set(5, 4, 9);
    scene.add(rim, fill, new THREE.AmbientLight(0x1a2a55, 0.6));

    const stone = new THREE.MeshStandardMaterial({ color: 0x55658c, roughness: 0.85, metalness: 0.05 });
    stone.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vSP;")
        .replace("#include <begin_vertex>", "#include <begin_vertex>\nvSP = position;");
      sh.fragmentShader = sh.fragmentShader
        .replace("#include <common>", `#include <common>\nvarying vec3 vSP;\n${glsl.noise}`)
        .replace("#include <color_fragment>", `#include <color_fragment>
          float n = snoise(vSP * 1.3) * 0.5 + snoise(vSP * 4.0) * 0.3 + snoise(vSP * 11.0) * 0.2;
          float course = smoothstep(0.03, 0.0, abs(fract(vSP.y * 1.4) - 0.5) - 0.47);
          diffuseColor.rgb *= (0.62 + n * 0.5) * (1.0 - course * 0.45) * mix(1.0, 0.55, smoothstep(1.0, 5.5, vSP.y));`);
    };
    const arch = new THREE.Mesh(archGeo, stone);
    world.add(arch);

    // Stepped base.
    const step1 = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.28, 1.9), stone);
    step1.position.y = -0.14;
    const step2 = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.22, 2.7), stone);
    step2.position.y = -0.39;
    world.add(step1, step2);

    // Glowing inner rim tracing the opening.
    const rimPts = [new THREE.Vector3(-w / 2 + 0.02, 0, 0)];
    for (let i = 0; i <= 48; i++) { const a = Math.PI - (i / 48) * Math.PI; rimPts.push(new THREE.Vector3(Math.cos(a) * (w / 2 - 0.02), HS + Math.sin(a) * (w / 2 - 0.02), 0)); }
    rimPts.push(new THREE.Vector3(w / 2 - 0.02, 0, 0));
    const rimMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.2, 1.6, 2.6) });
    for (const z of [DEPTH / 2 + 0.03, -DEPTH / 2 - 0.03]) {
      const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rimPts, false, "centripetal"), 160, 0.018, 6), rimMat);
      tube.position.z = z;
      world.add(tube);
    }

    // Vortex filling the opening.
    const hole = new THREE.Shape();
    hole.moveTo(-w / 2, 0); hole.lineTo(-w / 2, HS); hole.absarc(0, HS, w / 2, Math.PI, 0, true); hole.lineTo(w / 2, 0); hole.closePath();
    const vU = { uTime: { value: 0 }, uC: { value: new THREE.Vector2(0, 2.5) } };
    const vortex = new THREE.Mesh(new THREE.ShapeGeometry(hole, 48), new THREE.ShaderMaterial({
      uniforms: vU,
      vertexShader: "varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
      fragmentShader: `
        uniform float uTime; uniform vec2 uC; varying vec2 vP;
        ${glsl.noise}
        void main(){
          vec2 d = vP - uC; float rr = length(d); float a = atan(d.y, d.x);
          float sw = a + 2.6 / (rr + 0.35) - uTime * 0.9;
          vec2 q = vec2(cos(sw), sin(sw)) * rr;
          float n = snoise(vec3(q * 1.6, uTime * 0.25)) * 0.6 + snoise(vec3(q * 4.0, uTime * 0.4)) * 0.3;
          float arms = pow(0.5 + 0.5 * sin(sw * 3.0 + n * 2.5), 3.0);
          float core = exp(-rr * 3.4);
          float body = (arms * 0.7 + 0.3) * exp(-rr * 0.75) * (0.7 + n * 0.5);
          vec3 deep = vec3(0.02, 0.03, 0.12), mid = vec3(0.18, 0.2, 0.85), ice = vec3(0.55, 0.8, 1.6);
          vec3 col = mix(deep, mid, smoothstep(0.0, 0.5, body));
          col = mix(col, ice, smoothstep(0.45, 1.0, body));
          col += vec3(1.4, 1.7, 2.4) * core * 0.75;
          col += vec3(0.35, 0.25, 0.9) * pow(arms, 4.0) * exp(-rr * 1.2) * 0.5;
          gl_FragColor = vec4(col, 1.0);
        }`,
    }));
    world.add(vortex);

    // Motes spiralling into the vortex.
    const M = 700, seeds = new Float32Array(M * 4);
    for (let i = 0; i < M * 4; i++) seeds[i] = r();
    const mg = new THREE.BufferGeometry();
    mg.setAttribute("position", new THREE.BufferAttribute(new Float32Array(M * 3), 3));
    mg.setAttribute("aS", new THREE.BufferAttribute(seeds, 4));
    const motes = new THREE.Points(mg, new THREE.ShaderMaterial({
      uniforms: vU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `
        uniform float uTime; uniform vec2 uC; attribute vec4 aS; varying float vA;
        void main(){
          float life = fract(uTime * (0.08 + aS.w * 0.08) + aS.x);
          float rad = mix(2.3, 0.05, pow(life, 0.8)) * (0.7 + aS.y * 0.5);
          float ang = aS.z * 6.2832 + life * (4.0 + aS.y * 4.0);
          vec3 p = vec3(uC.x + cos(ang) * rad, uC.y + sin(ang) * rad * 0.9, (1.0 - life) * (0.5 + aS.y * 2.5));
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          vA = smoothstep(0.0, 0.15, life) * smoothstep(1.0, 0.8, life);
          gl_PointSize = (1.0 + aS.y * 1.8) * (12.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: "varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(vec3(0.6, 0.75, 1.4) * vA * 0.8 * smoothstep(0.5, 0.0, d), 1.0); }",
    }));
    motes.frustumCulled = false;
    world.add(motes);

    // Mirror copy seen through a dark glossy floor.
    const mirror = new THREE.Group();
    mirror.scale.y = -1;
    mirror.position.y = -1.0; // reflect about the floor plane (y = -0.5 in world units before scale)
    mirror.add(arch.clone(), step1.clone(), step2.clone(), vortex.clone());
    world.add(mirror);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.ShaderMaterial({
      transparent: true, uniforms: vU,
      vertexShader: "varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }",
      fragmentShader: `
        uniform float uTime; varying vec3 vW;
        void main(){
          vec2 p = vW.xz - vec2(0.0, 1.2);
          float pool = exp(-dot(p * vec2(0.45, 0.8), p * vec2(0.45, 0.8)));
          vec3 col = vec3(0.001, 0.002, 0.006) + vec3(0.05, 0.08, 0.25) * pool * (0.9 + 0.1 * sin(uTime * 2.0));
          float a = mix(0.8, 0.97, smoothstep(2.0, 14.0, length(vW.xz)));
          gl_FragColor = vec4(col, a);
        }`,
    }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.5 * 0.82;
    scene.add(floor);

    const base = camera.position.clone(), look = new THREE.Vector3(0, 1.45, 0);
    return (t) => {
      vU.uTime.value = t;
      vU.uC.value.set(pointer.x * 0.6, 2.5 + pointer.y * 0.55);
      vortexLight.position.set(vU.uC.value.x, vU.uC.value.y, 1.2);
      vortexLight.intensity = 26 + Math.sin(t * 2.3) * 4;
      camera.position.set(base.x + pointer.x * 1.2, base.y + pointer.y * 0.4, base.z);
      camera.lookAt(look);
    };
  },
};
