// 41 — Cube Cipher: a Rubik-style cube of dark glass cubies turning layer by layer, light leaking through its seams.
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

export default {
  id: "41",
  name: "Cube Cipher",
  blurb: "A cube of dark glass cubies solving itself layer by layer, light bleeding from its seams. Move to tilt it.",
  theme: "citrus",
  camera: { fov: 35, position: [0, 0.2, 9.6], target: [0, 0.35, 0] },
  bloom: { strength: 0.85, radius: 0.55, threshold: 0.78 },
  exposure: 1.0,

  setup({ THREE, scene, renderer, sky, pointer, rand, track }) {
    const r = rand(41);
    const skyMesh = sky({ haze: 0.3, horizon: "#2d4c8a", mid: "#0b1a3c" });
    scene.remove(skyMesh);
    const pmrem = track(new THREE.PMREMGenerator(renderer));
    const envScene = new THREE.Scene();
    envScene.add(skyMesh);
    const strip = (w, h, x, y, z, k) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(k, k * 1.12, k * 1.4), side: THREE.DoubleSide }));
      m.position.set(x, y, z); m.lookAt(0, 0, 0); envScene.add(m);
    };
    strip(30, 5, 0, 30, 20, 2.6);
    strip(6, 40, -35, 0, 15, 1.4);
    strip(6, 40, 35, 5, -10, 1.0);
    scene.environment = track(pmrem.fromScene(envScene, 0.02)).texture;

    const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(50, 30), new THREE.ShaderMaterial({
      depthWrite: false,
      vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
      fragmentShader: "varying vec2 vUv; void main(){ vec2 p = (vUv - vec2(0.5, 0.52)) * vec2(1.66, 1.0); float g = exp(-dot(p, p) * 9.0); gl_FragColor = vec4(mix(vec3(0.0012, 0.0028, 0.007), vec3(0.008, 0.016, 0.045), g), 1.0); }",
    }));
    backdrop.position.z = -14;
    scene.add(backdrop);

    const root = new THREE.Group();
    root.position.y = 0.62;
    scene.add(root);
    const cube = new THREE.Group();
    cube.scale.setScalar(0.8);
    root.add(cube);

    // Inner light: only visible through the gaps between cubies.
    const core = new THREE.Mesh(new THREE.SphereGeometry(1.36, 48, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 2.0, 3.0) }));
    cube.add(core);

    const geo = new RoundedBoxGeometry(0.93, 0.93, 0.93, 3, 0.07);
    const cubies = [];
    for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) {
      if (!x && !y && !z) continue;
      const u = { uGlow: { value: 0 }, uSeed: { value: r() * 100 } };
      const mat = new THREE.MeshPhysicalMaterial({ color: 0x0b1530, metalness: 0.25, roughness: 0.14, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 1.25 });
      mat.onBeforeCompile = (s) => {
        Object.assign(s.uniforms, u);
        s.vertexShader = s.vertexShader
          .replace("#include <common>", "#include <common>\nvarying vec3 vLP;")
          .replace("#include <begin_vertex>", "#include <begin_vertex>\nvLP = position;");
        s.fragmentShader = s.fragmentShader
          .replace("#include <common>", `#include <common>
            varying vec3 vLP; uniform float uGlow, uSeed;
            float h21(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1)) + uSeed) * 43758.5453); }`)
          .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
            vec3 a = abs(vLP);
            float mx = max(a.x, max(a.y, a.z)), mn = min(a.x, min(a.y, a.z));
            float md = a.x + a.y + a.z - mx - mn;
            float edge = smoothstep(0.37, 0.455, md);
            // Cipher mark: a faint inset frame plus one hashed code bar per face.
            vec2 f = a.x >= mx ? vLP.yz : (a.y >= mx ? vLP.xz : vLP.xy);
            float faceId = a.x >= mx ? sign(vLP.x) : (a.y >= mx ? 2.0 * sign(vLP.y) : 3.0 * sign(vLP.z));
            float sq = max(abs(f.x), abs(f.y));
            float frame = smoothstep(0.012, 0.0, abs(sq - 0.3));
            float hy = floor(h21(vec2(faceId, 1.0)) * 3.0 - 1.0) * 0.12;
            float bl = 0.06 + h21(vec2(faceId, 2.0)) * 0.14;
            float bar = smoothstep(0.018, 0.0, abs(f.y - hy)) * step(abs(f.x + 0.2 - bl), bl) * step(0.5, h21(vec2(faceId, 3.0)));
            float dotm = frame * 0.6 + bar;
            float on = 1.0;
            totalEmissiveRadiance += vec3(0.5, 0.75, 1.6) * (edge * (0.18 + uGlow * 1.8) + dotm * on * (0.06 + uGlow * 1.2));`);
      };
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      cube.add(m);
      cubies.push({ m, u });
    }

    const key = new THREE.DirectionalLight(0xdce8ff, 1.3);
    key.position.set(3, 5, 6);
    scene.add(key);

    // Layer-turn sequencer.
    const pivot = new THREE.Group();
    cube.add(pivot);
    const axes = ["x", "y", "z"];
    let move = null, wait = 0.4, lastAxis = "";
    const m4 = new THREE.Matrix4();
    const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
    const startMove = () => {
      let axis;
      do axis = axes[Math.floor(r() * 3)]; while (axis === lastAxis);
      lastAxis = axis;
      const layer = Math.floor(r() * 3) - 1, dir = r() < 0.5 ? 1 : -1;
      const members = cubies.filter((c) => Math.round(c.m.position[axis]) === layer);
      members.forEach((c) => pivot.attach(c.m));
      move = { axis, dir, members, p: 0 };
    };
    const endMove = () => {
      pivot.rotation[move.axis] = move.dir * Math.PI / 2;
      pivot.updateMatrixWorld();
      for (const c of move.members) {
        cube.attach(c.m);
        c.m.position.set(Math.round(c.m.position.x), Math.round(c.m.position.y), Math.round(c.m.position.z));
        m4.makeRotationFromQuaternion(c.m.quaternion);
        const e = m4.elements;
        for (let i = 0; i < 16; i++) e[i] = Math.round(e[i]);
        c.m.quaternion.setFromRotationMatrix(m4);
      }
      pivot.rotation.set(0, 0, 0);
      move = null;
    };

    return (t, dt) => {
      if (move) {
        move.p = Math.min(move.p + dt / 0.62, 1);
        pivot.rotation.set(0, 0, 0);
        pivot.rotation[move.axis] = move.dir * (Math.PI / 2) * ease(move.p);
        const flare = Math.sin(move.p * Math.PI);
        for (const c of move.members) c.u.uGlow.value = Math.max(c.u.uGlow.value, flare);
        if (move.p >= 1) { endMove(); wait = 0.22; }
      } else if ((wait -= dt) <= 0) startMove();
      for (const c of cubies) c.u.uGlow.value *= Math.exp(-dt * 2.2);

      core.material.color.setRGB(1.6, 2.0, 3.0).multiplyScalar(0.85 + 0.15 * Math.sin(t * 1.7));
      root.rotation.set(0.42 - pointer.y * 0.45, -0.62 + t * 0.08 + pointer.x * 0.7, 0);
      cube.rotation.z = Math.sin(t * 0.3) * 0.05;
    };
  },
};
