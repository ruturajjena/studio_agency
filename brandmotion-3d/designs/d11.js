// 11 — Tesseract: a four-dimensional hypercube turning through planes we cannot see.
export default {
  id: "11",
  name: "Tesseract",
  blurb: "A hypercube rotating through the fourth dimension, projected into ours. Your cursor sets the speed and plane of its turn.",
  camera: { fov: 36, position: [0, 0.5, 9.5], target: [0, 0.05, 0] },
  bloom: { strength: 0.65, radius: 0.45, threshold: 0.8 },
  exposure: 1.0,

  setup({ THREE, scene, renderer, sky, pointer, palette, rand, onResize }) {
    sky({ top: "#02040b", mid: "#081632", horizon: "#0f2250", haze: 0.05 });

    // 16 vertices of {±1}^4, 32 edges (pairs differing in one coordinate), 24 square faces.
    const V = [];
    for (let i = 0; i < 16; i++) V.push([i & 1 ? 1 : -1, i & 2 ? 1 : -1, i & 4 ? 1 : -1, i & 8 ? 1 : -1]);
    const E = [];
    for (let i = 0; i < 16; i++) for (let b = 0; b < 4; b++) if (!(i & (1 << b))) E.push([i, i | (1 << b)]);
    const F = [];
    for (let a = 0; a < 4; a++)
      for (let b = a + 1; b < 4; b++)
        for (let i = 0; i < 16; i++) if (!(i & (1 << a)) && !(i & (1 << b))) F.push([i, i | (1 << a), i | (1 << a) | (1 << b), i | (1 << b)]);

    const hyper = new THREE.Group();
    hyper.position.y = 0.5;
    scene.add(hyper);

    const edgeMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 10, 1, true), new THREE.MeshBasicMaterial({ toneMapped: false }), E.length);
    const nodeMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 20, 14), new THREE.MeshBasicMaterial({ toneMapped: false }), 16);
    edgeMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    nodeMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    edgeMesh.frustumCulled = nodeMesh.frustumCulled = false;
    const white = new THREE.Color();
    for (let i = 0; i < E.length; i++) edgeMesh.setColorAt(i, white);
    for (let i = 0; i < 16; i++) nodeMesh.setColorAt(i, white);
    hyper.add(edgeMesh, nodeMesh);

    // Translucent cells so the volumes read as glass.
    const faceGeo = new THREE.BufferGeometry();
    faceGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(F.length * 4 * 3), 3).setUsage(THREE.DynamicDrawUsage));
    const fi = [];
    F.forEach((_, k) => fi.push(k * 4, k * 4 + 1, k * 4 + 2, k * 4, k * 4 + 2, k * 4 + 3));
    faceGeo.setIndex(fi);
    const faces = new THREE.Mesh(faceGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(palette.blue), transparent: true, opacity: 0.035, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    faces.frustumCulled = false;
    hyper.add(faces);

    // Soft glow cores at the vertices.
    const glowGeo = new THREE.BufferGeometry();
    glowGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(16 * 3), 3).setUsage(THREE.DynamicDrawUsage));
    glowGeo.setAttribute("aW", new THREE.BufferAttribute(new Float32Array(16), 1).setUsage(THREE.DynamicDrawUsage));
    const gu = { uScale: { value: 600 } };
    const glows = new THREE.Points(glowGeo, new THREE.ShaderMaterial({
      uniforms: gu, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `uniform float uScale; attribute float aW; varying float vW;
        void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; vW = aW; gl_PointSize = uScale * (0.1 + 0.06 * aW) / -mv.z; }`,
      fragmentShader: `varying float vW; void main(){ float d = length(gl_PointCoord - 0.5) * 2.0;
        vec3 c = mix(vec3(0.45, 0.4, 1.0), vec3(0.6, 0.9, 1.2), vW); gl_FragColor = vec4(c * exp(-d * d * 7.0) * 0.45, 1.0); }`,
    }));
    glows.frustumCulled = false;
    hyper.add(glows);
    onResize((s) => (gu.uScale.value = s.height * renderer.getPixelRatio()));

    // Dust field for depth.
    const R = rand(11), n = 900, dp = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) dp.set([(R() - 0.5) * 30, (R() - 0.5) * 18, -4 - R() * 20], i * 3);
    const dg = new THREE.BufferGeometry();
    dg.setAttribute("position", new THREE.BufferAttribute(dp, 3));
    const dust = new THREE.Points(dg, new THREE.PointsMaterial({ color: palette.ice, size: 0.05, transparent: true, opacity: 0.5, depthWrite: false }));
    scene.add(dust);

    const rot = (p, i, j, a) => {
      const c = Math.cos(a), s = Math.sin(a), x = p[i], y = p[j];
      p[i] = x * c - y * s;
      p[j] = x * s + y * c;
    };
    const P = V.map(() => new THREE.Vector3()), W = new Float32Array(16);
    const ang = { xw: 0, yw: 0, zw: 0, xy: 0 };
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), dir = new THREE.Vector3(), mid = new THREE.Vector3(), sc = new THREE.Vector3();
    const cInner = new THREE.Color(palette.violet).multiplyScalar(1.1), cOuter = new THREE.Color(palette.glow).multiplyScalar(1.5), cMid = new THREE.Color(palette.cyan).multiplyScalar(1.2), col = new THREE.Color();
    const tint = (w) => (w < 0.5 ? col.copy(cInner).lerp(cMid, w * 2) : col.copy(cMid).lerp(cOuter, (w - 0.5) * 2));
    const SIZE = 0.8, DIST = 3.0;

    return (t, dt) => {
      // The cursor steers which 4D planes dominate the rotation.
      ang.xw += dt * (0.32 + pointer.x * 0.55);
      ang.yw += dt * (0.2 + pointer.y * 0.5);
      ang.zw += dt * (0.12 + Math.abs(pointer.x * pointer.y) * 0.6);
      ang.xy += dt * 0.08;
      V.forEach((v, i) => {
        const p = v.slice();
        rot(p, 0, 3, ang.xw);
        rot(p, 1, 3, ang.yw);
        rot(p, 2, 3, ang.zw);
        rot(p, 0, 1, ang.xy);
        const k = SIZE * (DIST / (DIST - p[3]));
        P[i].set(p[0] * k, p[1] * k, p[2] * k);
        W[i] = (p[3] + 1.8) / 3.6; // 0 = far in w, 1 = near
      });
      E.forEach(([a, b], i) => {
        dir.subVectors(P[b], P[a]);
        const len = dir.length();
        mid.addVectors(P[a], P[b]).multiplyScalar(0.5);
        q.setFromUnitVectors(up, dir.divideScalar(len));
        const w = (W[a] + W[b]) / 2;
        const r = 0.011 + 0.009 * w;
        m.compose(mid, q, sc.set(r, len, r));
        edgeMesh.setMatrixAt(i, m);
        edgeMesh.setColorAt(i, tint(w));
      });
      P.forEach((p, i) => {
        const r = 0.025 + 0.03 * W[i];
        m.compose(p, q.identity(), sc.set(r, r, r));
        nodeMesh.setMatrixAt(i, m);
        nodeMesh.setColorAt(i, tint(W[i]).multiplyScalar(1.4));
        glowGeo.attributes.position.setXYZ(i, p.x, p.y, p.z);
        glowGeo.attributes.aW.setX(i, W[i]);
      });
      const fp = faceGeo.attributes.position;
      F.forEach((f, k) => f.forEach((vi, j) => fp.setXYZ(k * 4 + j, P[vi].x, P[vi].y, P[vi].z)));
      fp.needsUpdate = glowGeo.attributes.position.needsUpdate = glowGeo.attributes.aW.needsUpdate = true;
      edgeMesh.instanceMatrix.needsUpdate = nodeMesh.instanceMatrix.needsUpdate = true;
      edgeMesh.instanceColor.needsUpdate = nodeMesh.instanceColor.needsUpdate = true;
      hyper.rotation.y = t * 0.1 + pointer.x * 0.3;
      hyper.rotation.x = 0.35 - pointer.y * 0.3;
      dust.position.x = -pointer.x * 0.4;
      dust.position.y = -pointer.y * 0.3;
    };
  },
};
