// 17 — Origami Crane: a folded paper crane in flat facets, wings flexing along luminous creases.
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";

export default {
  id: "17",
  name: "Origami Crane",
  blurb: "A paper crane of flat folds and glowing creases, gliding in moonlight. It turns to follow your cursor.",
  camera: { fov: 35, position: [0, 2.2, 9], target: [0, 0.8, 0] },
  bloom: { strength: 0.75, radius: 0.5, threshold: 0.86 },
  exposure: 1.0,

  setup({ THREE, scene, pointer, sky, rand, onResize }) {
    sky({ top: "#02050d", mid: "#0a1733", horizon: "#2c4a86", haze: 0.3 });
    const rnd = rand(17);
    const V = (x, y, z) => new THREE.Vector3(x, y, z);

    const paper = new THREE.MeshStandardMaterial({ color: "#e4ebf9", roughness: 0.7, metalness: 0, side: THREE.DoubleSide, emissive: "#0e1a3a", emissiveIntensity: 0.5, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 2 });
    const crease = new LineMaterial({ color: new THREE.Color(1.0, 1.45, 2.6), linewidth: 1.3, transparent: true, toneMapped: false });
    onResize((s) => crease.resolution.set(s.width, s.height));

    // Build a flat-shaded part from triangles, with glowing edges on every fold.
    const part = (tris) => {
      const pos = [];
      tris.forEach((t) => t.forEach((v) => pos.push(v.x, v.y, v.z)));
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      g.computeVertexNormals();
      const grp = new THREE.Group();
      grp.add(new THREE.Mesh(g, paper));
      grp.add(new LineSegments2(new LineSegmentsGeometry().fromEdgesGeometry(new THREE.EdgesGeometry(g, 1)), crease));
      return grp;
    };

    const crane = new THREE.Group();
    scene.add(crane);

    // Body: a folded diamond with a ridge on top.
    const RF = V(0.45, 0.18, 0), RB = V(-0.45, 0.18, 0), K = V(0, -0.4, 0), F = V(0.62, -0.06, 0), Bk = V(-0.62, -0.06, 0);
    const bodyTris = [];
    [1, -1].forEach((s) => {
      const S = V(0, 0.0, 0.22 * s);
      bodyTris.push([F, RF, S], [RF, RB, S], [RB, Bk, S], [F, S, K], [S, Bk, K]);
    });
    crane.add(part(bodyTris));

    // Neck with a folded head, and a tail.
    const NT = V(1.35, 1.0, 0);
    crane.add(part([
      [F, V(0.42, -0.24, 0.05), NT], [F, V(0.42, -0.24, -0.05), NT],
      [V(1.25, 0.86, 0.04), NT, V(1.62, 0.8, 0)], [V(1.25, 0.86, -0.04), NT, V(1.62, 0.8, 0)],
      [Bk, V(-0.42, -0.24, 0.05), V(-1.42, 0.95, 0)], [Bk, V(-0.42, -0.24, -0.05), V(-1.42, 0.95, 0)],
    ]));

    // Wings: inner panel hinged on the ridge, outer panel hinged on a crease.
    const wings = [1, -1].map((s) => {
      const inner = new THREE.Group();
      inner.position.set(0, 0.18, 0);
      const WF = V(0.38, 0, 0), WB = V(-0.46, 0, 0), MF = V(0.16, 0, 0.9 * s), MB = V(-0.52, 0, 0.9 * s);
      inner.add(part([[WF, WB, MB], [WF, MB, MF]]));
      const outer = new THREE.Group();
      outer.position.set(0, 0, 0.9 * s);
      outer.add(part([[V(0.16, 0, 0), V(-0.52, 0, 0), V(-0.62, 0.02, 1.05 * s)]]));
      inner.add(outer);
      crane.add(inner);
      return { inner, outer, s };
    });

    // Lights: cool moon key, violet-blue rim, soft fill.
    const key = new THREE.DirectionalLight(0xe6eeff, 2.2); key.position.set(3, 5, 4); scene.add(key);
    const rim = new THREE.DirectionalLight(0x7a8cff, 1.6); rim.position.set(-4, 1, -5); scene.add(rim);
    scene.add(new THREE.HemisphereLight(0x4a6fae, 0x040914, 0.8));

    // Moon: soft disc with a luminous limb, behind the crane.
    const moon = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `varying vec2 vUv; void main(){ float d = length(vUv - 0.5) * 2.0;
        float disc = smoothstep(0.5, 0.49, d) * (0.05 + 0.05 * smoothstep(0.1, 0.5, d));
        float limb = exp(-pow((d - 0.5) * 60.0, 2.0)) * 0.55;
        float halo = pow(max(1.0 - d, 0.0), 3.0) * 0.12;
        gl_FragColor = vec4(vec3(0.55, 0.7, 1.2) * (disc + halo) + vec3(0.9, 1.1, 1.6) * limb, 1.0); }`,
    }));
    moon.position.set(0.4, 1.3, -7); moon.scale.setScalar(1.35);
    scene.add(moon);

    // Drifting petals of light.
    const M = 400, mp = new Float32Array(M * 3);
    for (let i = 0; i < M; i++) mp.set([(rnd() - 0.5) * 16, (rnd() - 0.5) * 9, (rnd() - 0.5) * 8 - 2], i * 3);
    const mg = new THREE.BufferGeometry(); mg.setAttribute("position", new THREE.BufferAttribute(mp, 3));
    const motes = new THREE.Points(mg, new THREE.PointsMaterial({ color: new THREE.Color(0.7, 0.85, 1.4), size: 0.035, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }));
    scene.add(motes);

    crane.scale.setScalar(1.45);
    return (t) => {
      const ph = t * 1.5;
      const a = 0.3 + Math.sin(ph) * 0.5;
      const b = Math.sin(ph - 0.7) * 0.45;
      wings.forEach(({ inner, outer, s }) => { inner.rotation.x = -a * s; outer.rotation.x = -b * s; });
      crane.position.y = 0.55 - Math.sin(ph) * 0.1 + Math.sin(t * 0.4) * 0.08;
      crane.rotation.y = -0.55 + pointer.x * 1.3 + Math.sin(t * 0.3) * 0.12;
      crane.rotation.x = 0.12 - pointer.y * 0.35;
      crane.rotation.z = Math.sin(t * 0.5) * 0.05 - pointer.x * 0.12;
      motes.rotation.y = t * 0.03 + pointer.x * 0.1;
    };
  },
};
