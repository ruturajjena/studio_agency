// 25 — Knot Current: a smoked-glass torus knot with comets of energy racing through its core.
export default {
  id: "25",
  name: "Knot Current",
  blurb: "Energy races through a smoked-glass knot. The further your cursor strays, the faster it flows.",
  theme: "sunset",
  camera: { fov: 34, position: [0, 0.3, 10], target: [0, 0.55, 0] },
  bloom: { strength: 0.9, radius: 0.4, threshold: 0.82 },
  exposure: 1.0,

  setup({ THREE, scene, sky, pointer, rand, palette }) {
    sky({ haze: 0.14, horizon: "#1f3a70", mid: "#0a1631" });

    const uniforms = {
      uPhase: { value: new THREE.Vector3() },
      uGlow: { value: new THREE.Color(palette.glow) },
      uCyan: { value: new THREE.Color(palette.cyan) },
      uViolet: { value: new THREE.Color(palette.violet) },
    };
    const energyGLSL = /* glsl */ `
      uniform vec3 uPhase, uGlow, uCyan, uViolet;
      float comet(float s, float n, float ph, float tail){
        float g = fract(s * n - ph);
        return pow(g, tail) * smoothstep(1.0, 0.975, g);
      }
      vec3 energy(float s){
        return uGlow * comet(s, 9.0, uPhase.x, 6.0)
             + uCyan * comet(s + 0.37, 5.0, uPhase.y, 9.0) * 0.55
             + uViolet * comet(s + 0.71, 3.0, uPhase.z, 12.0) * 0.7;
      }`;
    const vert = /* glsl */ `
      varying vec3 vN; varying vec3 vW; varying vec2 vUv;
      void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz;
        vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`;

    // Bright filament running through the core.
    const filament = new THREE.Mesh(
      new THREE.TorusKnotGeometry(1.12, 0.04, 520, 8, 2, 3),
      new THREE.ShaderMaterial({
        uniforms, vertexShader: vert, toneMapped: false,
        fragmentShader: `${energyGLSL} varying vec2 vUv;
          void main(){ gl_FragColor = vec4(vec3(0.12, 0.17, 0.3) + energy(vUv.x) * 3.4, 1.0); }`,
      })
    );

    // Smoked-glass tube around it.
    const glass = new THREE.Mesh(
      new THREE.TorusKnotGeometry(1.12, 0.3, 520, 48, 2, 3),
      new THREE.ShaderMaterial({
        uniforms, vertexShader: vert, transparent: true,
        fragmentShader: /* glsl */ `${energyGLSL}
          varying vec3 vN; varying vec3 vW; varying vec2 vUv;
          vec3 env(vec3 r){
            vec3 c = mix(vec3(0.015,0.03,0.07), vec3(0.08,0.14,0.28), smoothstep(-0.3, 0.5, r.y));
            c += vec3(1.6,1.8,2.2) * smoothstep(0.02, 0.0, abs(r.y - 0.62)) * smoothstep(0.7, 0.2, abs(r.x));
            c += vec3(0.4,0.6,1.1) * smoothstep(0.06, 0.0, abs(r.x + 0.75)) * 0.8;
            c += vec3(0.6,0.5,1.2) * smoothstep(0.08, 0.0, abs(r.x - 0.8)) * 0.5;
            return c;
          }
          void main(){
            vec3 N = normalize(vN), V = normalize(cameraPosition - vW);
            float ndv = clamp(dot(N, V), 0.0, 1.0);
            float fr = 0.04 + 0.96 * pow(1.0 - ndv, 5.0);
            vec3 e = energy(vUv.x) + uGlow * 0.04;
            vec3 col = env(reflect(-V, N)) * (0.15 + fr * 1.5) + e * (pow(ndv, 3.0) * 0.28 + pow(1.0 - ndv, 3.0) * 0.1);
            gl_FragColor = vec4(col, 0.5 + fr * 0.48);
          }`,
      })
    );
    const knot = new THREE.Group();
    knot.add(filament, glass);
    const pivot = new THREE.Group();
    pivot.position.y = 0.8;
    pivot.add(knot);
    scene.add(pivot);

    // Dust motes.
    const R = rand(25), N = 240, dp = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) dp.set([(R() - 0.5) * 14, (R() - 0.5) * 8, (R() - 0.5) * 8 - 2], i * 3);
    const dg = new THREE.BufferGeometry();
    dg.setAttribute("position", new THREE.BufferAttribute(dp, 3));
    const dust = new THREE.Points(dg, new THREE.PointsMaterial({ color: new THREE.Color(0.9, 1.1, 1.6), size: 0.02, transparent: true, opacity: 0.5, depthWrite: false, toneMapped: false }));
    scene.add(dust);

    let speed = 0.12;
    return (t, dt) => {
      speed += (0.12 + Math.min(pointer.length(), 1.2) * 0.55 - speed) * 0.05;
      const ph = uniforms.uPhase.value;
      ph.x += dt * speed * 5.0; ph.y += dt * speed * 2.2; ph.z += dt * speed * 3.4;
      knot.rotation.z = t * 0.08;
      pivot.rotation.x += (-pointer.y * 0.45 + Math.sin(t * 0.3) * 0.1 - pivot.rotation.x) * 0.05;
      pivot.rotation.y += (pointer.x * 0.6 + Math.sin(t * 0.23) * 0.15 - pivot.rotation.y) * 0.05;
      dust.rotation.y = t * 0.02;
    };
  },
};
