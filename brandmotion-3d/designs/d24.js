// 24 — Möbius Band: a glossy one-sided loop with light lanes that flow over both "faces" forever.
import { ParametricGeometry } from "three/examples/jsm/geometries/ParametricGeometry.js";

export default {
  id: "24",
  name: "Möbius Band",
  blurb: "A lacquered Möbius strip where light runs its single endless surface. Your cursor turns it.",
  theme: "neon",
  camera: { fov: 34, position: [0, 0.4, 9.5], target: [0, 0.55, 0] },
  bloom: { strength: 0.65, radius: 0.3, threshold: 0.9 },
  exposure: 1.05,

  setup({ THREE, scene, sky, renderer, pointer, rand, palette, track }) {
    const skyMesh = sky({ haze: 0.18, horizon: "#243f78" });

    // Studio-style reflections: sky plus a few cool softboxes.
    const pmrem = track(new THREE.PMREMGenerator(renderer));
    const env = new THREE.Scene();
    env.add(skyMesh.clone());
    const box = (w, h, x, y, z, c) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide }));
      m.position.set(x, y, z); m.lookAt(0, 0, 0); env.add(m);
    };
    box(24, 3, 0, 30, 20, new THREE.Color(3, 3.4, 4.2));
    box(8, 30, -35, 5, -10, new THREE.Color(1.2, 1.8, 3));
    box(8, 30, 35, 0, 5, new THREE.Color(1.6, 1.4, 3.2));
    const envRT = track(pmrem.fromScene(env, 0.02, 0.1, 500));
    scene.environment = envRT.texture;

    const RAD = 1.5, HW = 0.56;
    const geo = new ParametricGeometry((u, v, p) => {
      const U = u * Math.PI * 2, V = (v - 0.5) * 2 * HW;
      const r = RAD + V * Math.cos(U / 2);
      p.set(r * Math.cos(U), r * Math.sin(U), V * Math.sin(U / 2));
    }, 480, 28);

    const uniforms = { uTime: { value: 0 }, uIce: { value: new THREE.Color(palette.glow) }, uCyan: { value: new THREE.Color(palette.cyan) }, uViolet: { value: new THREE.Color(palette.violet) } };
    const mat = new THREE.MeshPhysicalMaterial({
      color: 0x081028, metalness: 0.15, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.04,
      side: THREE.DoubleSide, envMapIntensity: 0.45,
    });
    mat.onBeforeCompile = (s) => {
      Object.assign(s.uniforms, uniforms);
      s.vertexShader = s.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec2 vMob;")
        .replace("#include <begin_vertex>", "#include <begin_vertex>\nvMob = uv;");
      s.fragmentShader = s.fragmentShader
        .replace("#include <common>", "#include <common>\nvarying vec2 vMob; uniform float uTime; uniform vec3 uIce, uCyan, uViolet;")
        .replace("#include <emissivemap_fragment>", /* glsl */ `#include <emissivemap_fragment>
          float U = vMob.x * 6.28318, V = vMob.y * 2.0 - 1.0;
          // Extended coordinate: going round once lands on the "other side", so lanes loop over 4π.
          float s = U + (V < 0.0 ? 6.28318 : 0.0);
          float aV = abs(V);
          vec3 em = vec3(0.0);
          for (int k = 0; k < 2; k++) {
            float a = k == 0 ? 0.38 : 0.78;
            float lane = exp(-pow((aV - a) / 0.06, 2.0));
            float ph = s * 3.5 - uTime * (k == 0 ? 1.6 : 1.1) + float(k) * 2.0;
            float pulse = pow(0.5 + 0.5 * sin(ph), 16.0);
            vec3 c = k == 0 ? uIce : mix(uIce, uCyan, 0.35);
            em += c * lane * (0.14 + pulse * 3.0);
          }
          float sweep = pow(0.5 + 0.5 * cos(U * 2.0 - uTime * 0.7), 24.0);
          em += mix(uIce, uViolet, 0.3) * sweep * 0.35 * (1.0 - aV * 0.4);
          em += mix(uIce, uCyan, 0.3) * smoothstep(0.96, 1.0, aV) * 1.2;
          totalEmissiveRadiance += em;`);
    };
    const band = new THREE.Mesh(geo, mat);
    const pivot = new THREE.Group();
    pivot.position.y = 0.8;
    pivot.add(band);
    scene.add(pivot);

    // Fine drifting dust for depth.
    const R = rand(24), N = 260, dp = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) dp.set([(R() - 0.5) * 14, (R() - 0.5) * 8, (R() - 0.5) * 8 - 2], i * 3);
    const dg = new THREE.BufferGeometry();
    dg.setAttribute("position", new THREE.BufferAttribute(dp, 3));
    const dust = new THREE.Points(dg, new THREE.PointsMaterial({ color: new THREE.Color(0.9, 1.1, 1.6), size: 0.022, transparent: true, opacity: 0.55, depthWrite: false, toneMapped: false }));
    scene.add(dust);

    let rx = 0, ry = 0;
    return (t) => {
      uniforms.uTime.value = t;
      rx += (-0.8 + pointer.y * 0.7 + Math.sin(t * 0.21) * 0.08 - rx) * 0.06;
      ry += (0.35 + pointer.x * 1.1 - ry) * 0.06;
      pivot.rotation.set(rx, ry, 0);
      band.rotation.z = t * 0.12;
      dust.rotation.y = t * 0.015;
    };
  },
};
