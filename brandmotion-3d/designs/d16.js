// 16 — Neural Net: a 3D web of neurons whose synapses carry travelling pulses; the cursor excites nearby nodes.
export default {
  id: "16",
  name: "Neural Net",
  blurb: "A living network of neurons firing pulses along their synapses. Nodes near your cursor light up and cascade.",
  camera: { fov: 40, position: [0, 0.5, 11], target: [0, 0.6, 0] },
  bloom: { strength: 0.9, radius: 0.5, threshold: 0.72 },
  exposure: 1.0,
  background: "#030712",

  setup({ THREE, scene, camera, pointer, rand, size, sky }) {
    sky({ top: "#02050d", mid: "#07112a", horizon: "#13254d", haze: 0.1 });
    const rnd = rand(16);
    const group = new THREE.Group();
    group.position.y = 0.95;
    scene.add(group);

    // Nodes in a flattened, slightly lumpy ellipsoid.
    const N = 230;
    const nodes = [];
    while (nodes.length < N) {
      const v = new THREE.Vector3(rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1);
      if (v.lengthSq() > 1) continue;
      v.multiply(new THREE.Vector3(4.3, 2.0, 2.8));
      v.y += Math.sin(v.x * 0.9) * 0.4;
      nodes.push({ p: v, act: 0, ref: 0, edges: [] });
    }

    // Synapses: each node links to its 3 nearest neighbours.
    const edges = [];
    const key = new Set();
    nodes.forEach((n, i) => {
      nodes.map((m, j) => [j, n.p.distanceToSquared(m.p)]).filter(([j]) => j !== i).sort((a, b) => a[1] - b[1]).slice(0, 3)
        .forEach(([j]) => {
          const k = i < j ? `${i}-${j}` : `${j}-${i}`;
          if (key.has(k)) return;
          key.add(k);
          const e = { a: i, b: j, len: n.p.distanceTo(nodes[j].p), heat: 0 };
          edges.push(e);
          n.edges.push(e); nodes[j].edges.push(e);
        });
    });

    const E = edges.length;
    const ePos = new Float32Array(E * 6), eCol = new Float32Array(E * 6);
    edges.forEach((e, i) => { ePos.set([...nodes[e.a].p.toArray(), ...nodes[e.b].p.toArray()], i * 6); });
    const eGeo = new THREE.BufferGeometry();
    eGeo.setAttribute("position", new THREE.BufferAttribute(ePos, 3));
    eGeo.setAttribute("color", new THREE.BufferAttribute(eCol, 3));
    const lines = new THREE.LineSegments(eGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    group.add(lines);

    // Glow sprites for nodes and pulses share one shader.
    const spriteMat = (scale) => new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `attribute vec3 aCol; attribute float aSize; varying vec3 vCol;
        void main(){ vCol = aCol; vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * ${scale.toFixed(1)} / -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `varying vec3 vCol;
        void main(){ float d = length(gl_PointCoord - 0.5) * 2.0; if (d > 1.0) discard;
          float a = exp(-d * d * 6.0) + smoothstep(0.35, 0.0, d) * 0.8;
          gl_FragColor = vec4(vCol * a, 1.0); }`,
    });
    const nPos = new Float32Array(N * 3), nCol = new Float32Array(N * 3), nSize = new Float32Array(N);
    nodes.forEach((n, i) => { nPos.set(n.p.toArray(), i * 3); nSize[i] = 0.7 + rnd() * 0.6; });
    const nGeo = new THREE.BufferGeometry();
    nGeo.setAttribute("position", new THREE.BufferAttribute(nPos, 3));
    nGeo.setAttribute("aCol", new THREE.BufferAttribute(nCol, 3));
    nGeo.setAttribute("aSize", new THREE.BufferAttribute(nSize, 1));
    const nodePts = new THREE.Points(nGeo, spriteMat(150));
    group.add(nodePts);

    const P = 700;
    const pulses = [];
    const TR = 4; // sprites per pulse (head + trail)
    const pPos = new Float32Array(P * TR * 3), pCol = new Float32Array(P * TR * 3), pSize = new Float32Array(P * TR);
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
    pGeo.setAttribute("aCol", new THREE.BufferAttribute(pCol, 3));
    pGeo.setAttribute("aSize", new THREE.BufferAttribute(pSize, 1));
    const pulsePts = new THREE.Points(pGeo, spriteMat(150));
    pulsePts.frustumCulled = nodePts.frustumCulled = false;
    group.add(pulsePts);

    const fire = (i, from = -1) => {
      const n = nodes[i];
      if (n.ref > 0) { n.act = Math.max(n.act, 0.45); return; }
      n.act = 1; n.ref = 0.9;
      n.edges.forEach((e) => {
        const to = e.a === i ? e.b : e.a;
        if (to === from || pulses.length >= P || rnd() > 0.75) return;
        e.heat = 1;
        pulses.push({ from: i, to, e, u: 0, speed: 3.2 / e.len, hue: rnd() < 0.12 ? 1 : 0 });
      });
    };

    const v = new THREE.Vector3();
    const blue = new THREE.Color(0.55, 0.75, 1.6), hot = new THREE.Color(1.6, 1.9, 2.6);
    const cyan = new THREE.Color(0.6, 1.6, 2.2), violet = new THREE.Color(1.2, 0.9, 2.4);
    return (t, dt) => {
      group.rotation.y = t * 0.07 + pointer.x * 0.45;
      group.rotation.x = -pointer.y * 0.25 + Math.sin(t * 0.2) * 0.05;
      group.updateMatrixWorld();

      // Spontaneous firing: rare in general, frequent under the cursor.
      nodes.forEach((n, i) => {
        v.copy(n.p).applyMatrix4(group.matrixWorld).project(camera);
        const dx = (v.x - pointer.x) * size.aspect, dy = v.y - pointer.y;
        const near = Math.exp(-(dx * dx + dy * dy) * 14);
        n.near = near;
        if (rnd() < dt * (0.03 + near * 0.9)) fire(i);
        n.act = Math.max(0, n.act - dt * 1.4);
        n.ref = Math.max(0, n.ref - dt);
      });

      for (let k = pulses.length - 1; k >= 0; k--) {
        const p = pulses[k];
        p.u += p.speed * dt;
        if (p.u >= 1) {
          pulses.splice(k, 1);
          if (rnd() < 0.42) fire(p.to, p.from); else nodes[p.to].act = Math.max(nodes[p.to].act, 0.5);
        }
      }

      nodes.forEach((n, i) => {
        const c = blue.clone().lerp(hot, n.act);
        const s = 0.22 + n.act * 0.95 + n.near * 0.2;
        nCol.set([c.r * s, c.g * s, c.b * s], i * 3);
      });
      nGeo.attributes.aCol.needsUpdate = true;

      edges.forEach((e, i) => {
        e.heat = Math.max(0, e.heat - dt * 0.9);
        const b = 0.06 + e.heat * 0.45;
        eCol.set([b * 0.55, b * 0.75, b * 1.5, b * 0.55, b * 0.75, b * 1.5], i * 6);
      });
      eGeo.attributes.color.needsUpdate = true;

      for (let k = 0; k < P; k++) {
        const p = pulses[k];
        for (let j = 0; j < TR; j++) {
          const q = k * TR + j;
          if (!p) { pSize[q] = 0; continue; }
          v.copy(nodes[p.from].p).lerp(nodes[p.to].p, Math.max(0, p.u - j * 0.05));
          pPos.set([v.x, v.y, v.z], q * 3);
          const c = p.hue ? violet : cyan, f = 1 - j / TR;
          pCol.set([c.r * f, c.g * f, c.b * f], q * 3);
          pSize[q] = 1.1 * (1 - j * 0.18);
        }
      }
      pGeo.attributes.position.needsUpdate = pGeo.attributes.aCol.needsUpdate = pGeo.attributes.aSize.needsUpdate = true;
    };
  },
};
