// 06 — Silk Ribbons: lengths of satin carried across the frame on a noise-driven wind.
export default {
  id: "06",
  name: "Silk Ribbons",
  blurb: "Satin ribbons ripple and twist like fabric in the wind. Your cursor gathers them toward it.",
  camera: { fov: 38, position: [0, 0.2, 11], target: [0, -0.1, 0] },
  bloom: { strength: 0.6, radius: 0.55, threshold: 0.8 },
  exposure: 1.0,

  setup({ THREE, scene, sky, pointer, palette, glsl }) {
    sky({ top: "#02040b", mid: "#07132c", horizon: "#0d1f48", below: "#040a1a", haze: 0.05 });

    const pull = new THREE.Vector3();
    const shared = { uTime: { value: 0 }, uPull: { value: pull } };
    const vert = /* glsl */ `
      uniform float uTime, uK, uWidth, uY, uZ, uPullStr; uniform vec3 uPull;
      varying vec3 vN; varying vec3 vT; varying vec3 vV; varying vec2 vUv;
      ${glsl.noise}
      vec3 centre(float v){
        float x = mix(-10.0, 10.0, v), tt = uTime * 0.32;
        float y = uY + 0.95 * snoise(vec3(x * 0.15 - tt, uK * 1.7, tt * 0.3)) + 0.3 * snoise(vec3(x * 0.42 - tt * 1.7, uK * 3.1 + 5.0, 0.0));
        float z = uZ + 1.5 * snoise(vec3(x * 0.11 - tt * 0.8, uK * 2.3 + 11.0, tt * 0.2));
        float g = exp(-(x - uPull.x) * (x - uPull.x) * 0.09) * uPullStr;
        return vec3(x, mix(y, uPull.y, g), mix(z, 1.2, g * 0.6));
      }
      void main(){
        float v = uv.y;
        vec3 c = centre(v), T = normalize(centre(v + 0.002) - c);
        vec3 B = normalize(cross(T, vec3(0.0, 0.0, 1.0))), N0 = cross(B, T);
        float a = 1.5 * snoise(vec3(mix(-10.0, 10.0, v) * 0.14 - uTime * 0.28, uK * 5.0, 7.0)) + uK;
        vec3 side = B * cos(a) + N0 * sin(a);
        vec3 p = c + side * (uv.x - 0.5) * uWidth;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vN = normalize(normalMatrix * cross(T, side));
        vT = normalize(normalMatrix * T);
        vV = -mv.xyz; vUv = uv;
        gl_Position = projectionMatrix * mv;
      }`;
    // Satin shading: Kajiya-Kay highlights along the weave, wrapped diffuse, fresnel sheen.
    const frag = /* glsl */ `
      uniform vec3 uColor, uSheen; uniform float uTime;
      varying vec3 vN; varying vec3 vT; varying vec3 vV; varying vec2 vUv;
      float kk(vec3 T, vec3 H, float e){ float th = dot(T, H); return pow(sqrt(max(0.0, 1.0 - th * th)), e); }
      void main(){
        vec3 n = normalize(vN) * (gl_FrontFacing ? 1.0 : -1.0);
        vec3 V = normalize(vV), T = normalize(vT);
        vec3 L1 = normalize(vec3(0.4, 0.8, 0.5)), L2 = normalize(vec3(-0.7, -0.3, 0.3));
        vec3 H1 = normalize(L1 + V), H2 = normalize(L2 + V);
        float dif = 0.5 + 0.5 * dot(n, L1);
        float s1 = kk(normalize(T + n * 0.15), H1, 160.0) * 1.2 + kk(normalize(T - n * 0.1), H1, 18.0) * 0.08;
        float s2 = kk(T, H2, 40.0) * 0.4;
        float fr = pow(1.0 - abs(dot(n, V)), 3.0);
        float hem = pow(abs(vUv.x * 2.0 - 1.0), 16.0);
        vec3 col = uColor * (0.15 + dif * 0.75) + uSheen * (s1 * 1.6 * max(dot(n, L1) * 0.5 + 0.6, 0.0) + s2 * 0.8) + mix(uColor * 2.5, uSheen, 0.35) * fr * 0.3 + uSheen * hem * 0.6;
        gl_FragColor = vec4(col, 1.0);
      }`;

    const specs = [
      { y: 1.35, z: -1.5, w: 0.9, col: "#1b2f66", sheen: palette.glow },
      { y: 0.85, z: 0.2, w: 1.15, col: "#14285a", sheen: palette.ice },
      { y: 0.4, z: -0.6, w: 0.7, col: "#2a2468", sheen: "#b5a8ff" },
      { y: 0.05, z: 0.9, w: 0.95, col: "#0f2552", sheen: palette.glow },
      { y: -0.3, z: -1.2, w: 0.6, col: "#0d3050", sheen: palette.cyan },
      { y: 1.8, z: -2.6, w: 0.75, col: "#122a60", sheen: palette.ice },
    ];
    const mats = specs.map((s, k) => {
      const m = new THREE.ShaderMaterial({
        uniforms: {
          ...shared,
          uK: { value: k * 1.37 + 0.4 }, uWidth: { value: s.w }, uY: { value: s.y }, uZ: { value: s.z }, uPullStr: { value: 0.45 + (k % 3) * 0.17 },
          uColor: { value: new THREE.Color(s.col) }, uSheen: { value: new THREE.Color(s.sheen) },
        },
        vertexShader: vert, fragmentShader: frag, side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, 6, 520), m);
      mesh.frustumCulled = false;
      scene.add(mesh);
      return m;
    });

    // A few loose threads of light drifting behind.
    const dn = 400, dp = new Float32Array(dn * 3);
    for (let i = 0; i < dn; i++) dp.set([(Math.random() - 0.5) * 20, (Math.random() - 0.4) * 9, -3 - Math.random() * 8], i * 3);
    const dg = new THREE.BufferGeometry();
    dg.setAttribute("position", new THREE.BufferAttribute(dp, 3));
    const dust = new THREE.Points(dg, new THREE.PointsMaterial({ color: palette.ice, size: 0.03, transparent: true, opacity: 0.45, depthWrite: false }));
    scene.add(dust);

    return (t) => {
      shared.uTime.value = t;
      pull.set(pointer.x * 6.5, pointer.y * 3.2 + 0.45, 0);
      mats.forEach((m) => (m.uniforms.uTime.value = t));
      dust.position.x = Math.sin(t * 0.1) * 0.6 - pointer.x * 0.5;
    };
  },
};
