// 49 — Twist Tower: a column of glossy stacked plates, each turned a little further, twisting and breathing.
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

export default {
  id: "49",
  name: "Twist Tower",
  blurb: "A breathing tower of glossy stacked plates. Move your cursor sideways to wind or unwind the twist.",
  camera: { fov: 34, position: [0, 1.4, 11], target: [0, 0.45, 0] },
  bloom: { strength: 0.7, radius: 0.5, threshold: 0.85 },
  exposure: 1.05,

  setup({ THREE, scene, renderer, pointer, sky, palette, track }) {
    const skyMesh = sky({ top: "#02050d", mid: "#0a1733", horizon: "#223f78", haze: 0.3 });

    // Studio environment: the night sky plus a few long softboxes for crisp reflections.
    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = new THREE.Scene();
    env.add(skyMesh.clone());
    const box = (w, h, pos, c) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide }));
      m.position.set(...pos);
      m.lookAt(0, 0, 0);
      env.add(m);
    };
    box(6, 60, [-30, 0, 10], new THREE.Color(2.4, 2.7, 3.4));
    box(4, 60, [28, 0, -8], new THREE.Color(0.9, 1.4, 2.6));
    box(50, 3, [0, 35, 0], new THREE.Color(1.2, 1.4, 2.0));
    box(3, 50, [0, 0, -30], new THREE.Color(0.6, 0.8, 1.8));
    const envRT = track(pmrem.fromScene(env, 0.02));
    scene.environment = envRT.texture;
    pmrem.dispose();
    scene.remove(skyMesh);

    // Backdrop: a soft pool of navy light behind the tower.
    const glowMat = (inner, outer, fade) => new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uA: { value: new THREE.Color(inner) }, uB: { value: new THREE.Color(outer) } },
      vertexShader: `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform vec3 uA, uB; varying vec2 vP; void main(){ float r = length(vP * vec2(0.8, 1.0)); float k = exp(-r * r * ${fade});
        gl_FragColor = vec4(mix(uB, uA, k), ${fade > 0.1 ? "k" : "1.0"}); }`,
    });
    const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(60, 40), glowMat(palette.navy, palette.ink, "0.02"));
    backdrop.position.set(0, 1, -14);
    scene.add(backdrop);

    const N = 42, GAP = 0.1;
    const geo = new RoundedBoxGeometry(1.7, 0.085, 1.7, 3, 0.04);
    const mat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 1, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 1.1 });
    const tower = new THREE.InstancedMesh(geo, mat, N);
    const c = new THREE.Color(), deep = new THREE.Color("#22386b"), mid = new THREE.Color(palette.horizon), hi = new THREE.Color(palette.ice);
    for (let i = 0; i < N; i++) {
      const k = i / (N - 1);
      c.copy(deep).lerp(mid, Math.pow(k, 1.4)).lerp(hi, Math.pow(k, 6) * 0.7);
      tower.setColorAt(i, c);
    }
    scene.add(tower);

    // Light blades slotted between plates every few levels.
    const bladeIdx = [];
    for (let i = 3; i < N; i += 7) bladeIdx.push(i);
    const blades = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1.58, 0.012, 1.58),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 2.0, 3.0), toneMapped: false }),
      bladeIdx.length
    );
    scene.add(blades);

    // Mirror floor ring.
    const floor = new THREE.Mesh(new THREE.CircleGeometry(9, 64), glowMat("#0e1f45", "#040914", "0.12"));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.95;
    scene.add(floor);
    const halo = new THREE.Mesh(new THREE.RingGeometry(1.5, 1.53, 96), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.9, 1.3, 2.2), toneMapped: false }));
    halo.rotation.x = -Math.PI / 2;
    halo.position.y = -1.94;
    scene.add(halo);

    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    let twist = 0.12;
    return (t, dt) => {
      twist += (0.12 + pointer.x * 0.1 - twist) * Math.min(1, dt * 3);
      const base = t * 0.3;
      let b = 0;
      for (let i = 0; i < N; i++) {
        const k = i / (N - 1);
        // A slow wave of breath travels up the column.
        const breath = Math.sin(t * 1.3 - k * 6.0);
        const sc = 0.78 + 0.22 * Math.sin(k * Math.PI) + breath * 0.06;
        const y = -1.9 + i * GAP + (1 + Math.sin(t * 1.3 - k * 6.0 - 0.6)) * k * 0.08;
        const lean = pointer.y * 0.25 * k * k;
        q.setFromAxisAngle(up, base + i * twist + Math.sin(t * 0.6 + k * 3) * 0.08);
        p.set(Math.sin(lean) * 0.9 * k, y, 0);
        s.set(sc, 1, sc);
        m.compose(p, q, s);
        tower.setMatrixAt(i, m);
        if (bladeIdx[b] === i) {
          p.y -= GAP * 0.5;
          s.setScalar(sc * (0.98 + 0.04 * Math.max(0, breath))).setY(1);
          m.compose(p, q, s);
          blades.setMatrixAt(b++, m);
        }
      }
      tower.instanceMatrix.needsUpdate = true;
      blades.instanceMatrix.needsUpdate = true;
    };
  },
};
