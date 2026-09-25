// 23 — Pendulum Wave: a row of luminous pendulums drifting in and out of phase into snakes and braids.
export default {
  id: "23",
  name: "Pendulum Wave",
  blurb: "Eighteen glowing pendulums slipping in and out of phase. Move to swing the camera around them.",
  camera: { fov: 36, position: [6, 3, 9], target: [0, 0.9, 0] },
  bloom: { strength: 0.7, radius: 0.35, threshold: 0.8 },
  exposure: 1.0,

  setup({ THREE, scene, camera, sky, pointer, palette }) {
    sky({ haze: 0.14, horizon: "#213d73", mid: "#0a1733" });
    const N = 18, TOP = 2.7, FLOOR = -1.25, CYCLE = 40, K = 30, AMP = 0.42, TRAIL = 42;
    const cyan = new THREE.Color(palette.cyan), glow = new THREE.Color(palette.glow), violet = new THREE.Color(palette.violet);

    const L0 = 3.3;
    const pend = [];
    const bobGeo = new THREE.SphereGeometry(0.12, 24, 16);
    const bobs = new THREE.Group(), mirror = new THREE.Group();
    scene.add(bobs, mirror);
    mirror.scale.y = -1;
    mirror.position.y = 2 * FLOOR;
    for (let i = 0; i < N; i++) {
      const f = i / (N - 1);
      const col = f < 0.5 ? cyan.clone().lerp(glow, Math.min(1, f * 2.6)) : glow.clone().lerp(violet, Math.max(0, (f - 0.6) * 1.9));
      const w = (2 * Math.PI * (K + i)) / CYCLE;
      const len = L0 * Math.pow(K / (K + i), 2) * 0.7 + L0 * 0.3;
      const x = (f - 0.5) * 8.4;
      const m = new THREE.Mesh(bobGeo, new THREE.MeshBasicMaterial({ color: col.clone().multiplyScalar(2.2), toneMapped: false }));
      const mm = new THREE.Mesh(bobGeo, new THREE.MeshBasicMaterial({ color: col.clone().multiplyScalar(0.28), toneMapped: false }));
      bobs.add(m); mirror.add(mm);
      pend.push({ w, len, x, col, m, mm, hist: [], pos: new THREE.Vector3() });
    }

    // Top bar with end caps.
    const barMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.9, 1.1, 1.6), toneMapped: false });
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 9.2, 8), barMat);
    bar.rotation.z = Math.PI / 2;
    bar.position.y = TOP;
    scene.add(bar);
    [-4.6, 4.6].forEach((x) => {
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), barMat);
      cap.position.set(x, TOP, 0);
      scene.add(cap);
    });

    // Strings.
    const sGeo = new THREE.BufferGeometry();
    sGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N * 6), 3));
    const strings = new THREE.LineSegments(sGeo, new THREE.LineBasicMaterial({ color: palette.ice, transparent: true, opacity: 0.28, depthWrite: false }));
    scene.add(strings);

    // Fading trails (shared by the mirrored reflection).
    const tPos = new Float32Array(N * (TRAIL - 1) * 6), tCol = new Float32Array(N * (TRAIL - 1) * 6);
    const tGeo = new THREE.BufferGeometry();
    tGeo.setAttribute("position", new THREE.BufferAttribute(tPos, 3));
    tGeo.setAttribute("color", new THREE.BufferAttribute(tCol, 3));
    const trailMat = (o) => new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    const trails = new THREE.LineSegments(tGeo, trailMat(1));
    trails.frustumCulled = false;
    scene.add(trails);
    const mTrails = new THREE.LineSegments(tGeo, trailMat(0.18));
    mTrails.frustumCulled = false;
    mirror.add(mTrails);

    // Glossy floor: dims the mirrored copy and pools light under each bob.
    const bobU = Array.from({ length: N }, () => new THREE.Vector3());
    const colU = pend.map((p) => p.col);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 60),
      new THREE.ShaderMaterial({
        transparent: true, depthWrite: false,
        uniforms: { uBobs: { value: bobU }, uCols: { value: colU } },
        vertexShader: `varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
        fragmentShader: `
          uniform vec3 uBobs[${N}]; uniform vec3 uCols[${N}]; varying vec3 vW;
          void main(){
            vec3 light = vec3(0.0);
            for(int i=0;i<${N};i++){ vec3 b=uBobs[i]; float h=b.y-(${FLOOR.toFixed(2)}); vec2 d=vW.xz-b.xz;
              light += uCols[i] * exp(-dot(d,d)/(0.05+h*0.12)) / (0.5+h*2.0); }
            float r = length(vW.xz);
            float grid = smoothstep(0.965,1.0,abs(fract(vW.x*0.5)-0.5)*2.0) + smoothstep(0.965,1.0,abs(fract(vW.z*0.5)-0.5)*2.0);
            vec3 col = vec3(0.008,0.014,0.035) + light * 0.1 + vec3(0.15,0.22,0.4) * grid * 0.06 * exp(-r*0.12);
            float a = mix(0.82, 1.0, smoothstep(3.0, 14.0, r));
            gl_FragColor = vec4(col, a);
          }`,
      })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = FLOOR;
    floor.renderOrder = -1;
    mTrails.renderOrder = -2;
    scene.add(floor);

    const sp = sGeo.attributes.position.array;
    let az = 0.62, el = 0.26;
    return (t) => {
      pend.forEach((p, i) => {
        const a = AMP * Math.cos(p.w * t) * (0.92 + 0.08 * Math.sin(t * 0.2));
        p.pos.set(p.x, TOP - Math.cos(a) * p.len, Math.sin(a) * p.len);
        p.m.position.copy(p.pos); p.mm.position.copy(p.pos);
        bobU[i].copy(p.pos);
        sp.set([p.x, TOP, 0, p.pos.x, p.pos.y, p.pos.z], i * 6);
        p.hist.unshift(p.pos.clone());
        if (p.hist.length > TRAIL) p.hist.pop();
        for (let k = 0; k < TRAIL - 1; k++) {
          const a0 = p.hist[Math.min(k, p.hist.length - 1)], a1 = p.hist[Math.min(k + 1, p.hist.length - 1)];
          const o = (i * (TRAIL - 1) + k) * 6;
          tPos.set([a0.x, a0.y, a0.z, a1.x, a1.y, a1.z], o);
          const f0 = Math.pow(1 - k / TRAIL, 2.2) * 1.3, f1 = Math.pow(1 - (k + 1) / TRAIL, 2.2) * 1.3;
          tCol.set([p.col.r * f0, p.col.g * f0, p.col.b * f0, p.col.r * f1, p.col.g * f1, p.col.b * f1], o);
        }
      });
      sGeo.attributes.position.needsUpdate = true;
      tGeo.attributes.position.needsUpdate = true;
      tGeo.attributes.color.needsUpdate = true;

      // Pointer orbits the camera.
      az += (0.62 + pointer.x * 0.75 + Math.sin(t * 0.1) * 0.08 - az) * 0.08;
      el += (0.26 + pointer.y * 0.22 - el) * 0.08;
      const r = 11.2;
      camera.position.set(Math.sin(az) * Math.cos(el) * r, 0.9 + Math.sin(el) * r, Math.cos(az) * Math.cos(el) * r);
      camera.lookAt(0, 0.55, 0);
    };
  },
};
