// 33 — Holo Globe: a dotted holographic Earth-like globe with light arcs flying between cities.
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export default {
  id: "33",
  name: "Holo Globe",
  blurb: "A dotted holographic globe traced by flight arcs between glowing cities. Move to spin it.",
  camera: { fov: 38, position: [0, 0.1, 7.4], target: [0, 0.25, 0] },
  bloom: { strength: 0.9, radius: 0.6, threshold: 0.7 },
  exposure: 1.0,

  setup({ THREE, scene, pointer, rand }) {
    const r = rand(33);
    const R = 1.42;
    const globe = new THREE.Group();
    globe.position.y = 0.42;
    globe.rotation.z = 0.28;
    scene.add(globe);
    const spin = new THREE.Group();
    globe.add(spin);

    // Smooth "continent" field from a few random plane waves.
    const waves = Array.from({ length: 14 }, (_, i) => {
      const d = new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize();
      return { d, f: 1.6 + i * 0.45 + r(), p: r() * 6.28, a: 1 / (1 + i * 0.3) };
    });
    const land = (v) => waves.reduce((s, w) => s + w.a * Math.sin(v.dot(w.d) * w.f * 2 + w.p), 0) - Math.pow(Math.abs(v.y), 3) * 1.5;

    // Fibonacci dot lattice.
    const N = 11000, pos = new Float32Array(N * 3), aL = new Float32Array(N), aR = new Float32Array(N);
    const landDirs = [];
    const v = new THREE.Vector3();
    const fib = (i) => { const y = 1 - (i / (N - 1)) * 2, rad = Math.sqrt(1 - y * y), th = i * 2.399963; return v.set(Math.cos(th) * rad, y, Math.sin(th) * rad); };
    const lv = Array.from({ length: N }, (_, i) => land(fib(i)));
    const cut = [...lv].sort((a, b) => a - b)[Math.floor(N * 0.62)];
    for (let i = 0; i < N; i++) {
      fib(i);
      aL[i] = lv[i] > cut ? 1 : 0;
      aR[i] = r();
      if (lv[i] > cut + 0.25 && Math.abs(v.y) < 0.8) landDirs.push(v.clone());
      pos.set([v.x * R, v.y * R, v.z * R], i * 3);
    }
    const dg = new THREE.BufferGeometry();
    dg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    dg.setAttribute("aL", new THREE.BufferAttribute(aL, 1));
    dg.setAttribute("aR", new THREE.BufferAttribute(aR, 1));
    const dotU = { uTime: { value: 0 }, uPx: { value: 1 } };
    const dots = new THREE.Points(dg, new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: dotU,
      vertexShader: `
        uniform float uTime, uPx; attribute float aL, aR; varying float vA; varying float vL;
        void main(){
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vec3 n = normalize(normalMatrix * position);
          float facing = smoothstep(-0.35, 0.5, n.z);
          float scan = exp(-pow((position.y / ${R.toFixed(2)}) - sin(uTime * 0.45) * 0.9, 2.0) * 90.0);
          vL = aL;
          vA = mix(0.045, 0.9, aL) * mix(0.12, 1.0, facing) * (0.8 + 0.2 * sin(uTime * 2.0 + aR * 30.0)) + scan * (0.35 + aL * 0.8) * facing;
          gl_PointSize = mix(1.0, 2.3, aL) * uPx * (7.4 / -mv.z) * (1.0 + scan * 0.6);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        varying float vA; varying float vL;
        void main(){
          float d = length(gl_PointCoord - 0.5);
          vec3 c = mix(vec3(0.25, 0.45, 1.0), vec3(0.75, 0.9, 1.5), vL);
          gl_FragColor = vec4(c * vA * smoothstep(0.5, 0.1, d), 1.0);
        }`,
    }));
    spin.add(dots);

    // Dark core + fresnel atmosphere.
    const core = new THREE.Mesh(new THREE.SphereGeometry(R * 0.985, 64, 32), new THREE.ShaderMaterial({
      transparent: true,
      vertexShader: `varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = -mv.xyz; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `varying vec3 vN; varying vec3 vV; void main(){ float f = 1.0 - max(dot(normalize(vN), normalize(vV)), 0.0);
        vec3 c = vec3(0.006, 0.015, 0.045) + vec3(0.15, 0.3, 0.8) * pow(f, 3.0) * 0.45; gl_FragColor = vec4(c, 0.9); }`,
    }));
    core.renderOrder = -1;
    globe.add(core);
    const atmo = new THREE.Mesh(new THREE.SphereGeometry(R * 1.18, 64, 32), new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.BackSide, blending: THREE.AdditiveBlending,
      vertexShader: `varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = -mv.xyz; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `varying vec3 vN; varying vec3 vV; void main(){ float f = max(dot(normalize(vN), normalize(vV)), 0.0);
        float a = smoothstep(0.0, 0.55, f) * (1.0 - smoothstep(0.55, 0.9, f)); gl_FragColor = vec4(vec3(0.25, 0.5, 1.2) * pow(a, 2.0) * 0.9, 1.0); }`,
    }));
    globe.add(atmo);

    // Cities and arcs.
    const cities = [];
    while (cities.length < 16 && landDirs.length) {
      const c = landDirs[Math.floor(r() * landDirs.length)];
      if (cities.every((o) => o.angleTo(c) > 0.3)) cities.push(c);
    }
    const pairs = [];
    for (let k = 0; pairs.length < 14 && k < 500; k++) {
      const a = cities[Math.floor(r() * cities.length)], b = cities[Math.floor(r() * cities.length)];
      const ang = a.angleTo(b);
      if (ang > 0.5 && ang < 2.3) pairs.push([a, b, ang]);
    }
    const tubes = pairs.map(([a, b, ang], i) => {
      const pts = [];
      const q = new THREE.Quaternion(), qa = new THREE.Quaternion().setFromUnitVectors(a, b);
      for (let s = 0; s <= 40; s++) {
        const u = s / 40;
        q.identity().slerp(qa, u);
        pts.push(a.clone().applyQuaternion(q).multiplyScalar(R * (1.005 + Math.sin(Math.PI * u) * (0.05 + ang * 0.11))));
      }
      const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 64, 0.007, 4, false);
      g.setAttribute("aOff", new THREE.BufferAttribute(new Float32Array(g.attributes.position.count).fill(i * 0.37 + r() * 0.6), 1));
      return g;
    });
    const arcU = { uTime: { value: 0 } };
    const arcs = new THREE.Mesh(mergeGeometries(tubes), new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: arcU,
      vertexShader: `attribute float aOff; varying float vU; varying float vO; void main(){ vU = uv.x; vO = aOff; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `
        uniform float uTime; varying float vU; varying float vO;
        void main(){
          float cyc = fract(uTime * 0.22 + vO);
          float head = cyc * 1.9 - 0.2;
          float x = head - vU;
          float trail = step(0.0, x) * exp(-x * 5.0) * step(vU, 1.0);
          float tip = exp(-x * x * 900.0);
          vec3 c = vec3(0.35, 0.6, 1.4) * trail * 1.2 + vec3(1.0, 1.3, 2.0) * tip * 0.9 + vec3(0.2, 0.35, 0.8) * 0.1;
          gl_FragColor = vec4(c, 1.0);
        }`,
    }));
    spin.add(arcs);

    // City markers (pulse when an arc lands).
    const cg = new THREE.BufferGeometry().setFromPoints(cities.map((c) => c.clone().multiplyScalar(R * 1.01)));
    const cityU = { uTime: { value: 0 }, uPx: dotU.uPx };
    const cityPts = new THREE.Points(cg, new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: cityU,
      vertexShader: `uniform float uTime, uPx; varying float vA;
        void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); float f = smoothstep(-0.2, 0.4, normalize(normalMatrix * position).z);
          float p = 0.5 + 0.5 * sin(uTime * 3.0 + position.x * 20.0);
          vA = f; gl_PointSize = (9.0 + p * 8.0) * uPx * (7.4 / -mv.z); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `varying float vA; void main(){ float d = length(gl_PointCoord - 0.5);
        float core = smoothstep(0.14, 0.0, d); float ring = smoothstep(0.05, 0.0, abs(d - 0.36)) * 0.6;
        gl_FragColor = vec4(vec3(0.9, 1.1, 1.8) * (core * 2.0 + ring) * vA, 1.0); }`,
    }));
    spin.add(cityPts);

    // Orbit rings with a travelling satellite.
    const ringGroup = new THREE.Group();
    globe.add(ringGroup);
    const ringMat = new THREE.LineBasicMaterial({ color: new THREE.Color(0.25, 0.4, 0.85), transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false });
    const orbit = (rad, tilt) => {
      const pts = Array.from({ length: 129 }, (_, i) => { const a = (i / 128) * Math.PI * 2; return new THREE.Vector3(Math.cos(a) * rad, 0, Math.sin(a) * rad); });
      const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), ringMat);
      l.rotation.set(tilt, 0, tilt * 0.6);
      ringGroup.add(l);
      return l;
    };
    const o1 = orbit(R * 1.45, 0.42);
    orbit(R * 1.7, -0.22);
    const sat = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(2, 2.4, 3.2), toneMapped: false }));
    o1.add(sat);

    // Faint star dust.
    const SD = 900, sd = new Float32Array(SD * 3);
    for (let i = 0; i < SD; i++) { v.set(r() - 0.5, r() - 0.5, r() - 0.5).normalize().multiplyScalar(20 + r() * 30); sd.set([v.x, v.y, v.z - 10], i * 3); }
    const stars = new THREE.Points(new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(sd, 3)),
      new THREE.PointsMaterial({ color: 0x6d86c4, size: 0.08, transparent: true, opacity: 0.6, depthWrite: false }));
    scene.add(stars);

    let rotY = 0;
    return (t, dt) => {
      dotU.uPx.value = Math.min(window.devicePixelRatio, 1.75);
      rotY += dt * (0.1 + pointer.x * 0.9);
      spin.rotation.y = rotY + pointer.x * 0.6;
      globe.rotation.x = -pointer.y * 0.45;
      ringGroup.rotation.y = -t * 0.05;
      const sa = t * 0.5;
      sat.position.set(Math.cos(sa) * R * 1.45, 0, Math.sin(sa) * R * 1.45);
      dotU.uTime.value = arcU.uTime.value = cityU.uTime.value = t;
      stars.rotation.y = pointer.x * 0.05;
    };
  },
};
