// 30 — Constellations: a deep starfield where the stars around your cursor join into constellations.
export default {
  id: "30",
  name: "Constellations",
  blurb: "A deep field of stars. Wherever you point, nearby stars reach for each other and draw a constellation.",
  camera: { fov: 50, position: [0, 0, 10], target: [0, 0, 0] },
  bloom: { strength: 0.9, radius: 0.5, threshold: 0.7 },
  exposure: 1.0,
  background: "#02050d",

  setup({ THREE, scene, camera, renderer, pointer, rand, glsl, palette, size }) {
    const R = rand(30);
    const field = new THREE.Group();
    scene.add(field);

    // Nebula backdrop.
    const neb = new THREE.Mesh(
      new THREE.PlaneGeometry(160, 100),
      new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uA: { value: new THREE.Color(palette.blue) }, uB: { value: new THREE.Color(palette.violet) } },
        depthWrite: false,
        vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
        fragmentShader: /* glsl */ `uniform float uTime; uniform vec3 uA, uB; varying vec2 vUv; ${glsl.noise}
          void main(){
            vec2 p = (vUv - 0.5) * vec2(3.2, 2.0);
            float n = snoise(vec3(p * 1.2, uTime * 0.02)) * 0.5 + snoise(vec3(p * 2.7 + 4.0, uTime * 0.03)) * 0.3 + snoise(vec3(p * 6.0, 1.0)) * 0.12;
            float band = exp(-pow((p.y + p.x * 0.35) * 1.3, 2.0));
            float m = smoothstep(-0.2, 0.9, n) * band;
            vec3 col = vec3(0.004, 0.008, 0.02) + uA * m * 0.12 + uB * smoothstep(0.3, 1.0, n) * band * 0.05;
            gl_FragColor = vec4(col, 1.0);
          }`,
      })
    );
    neb.position.z = -60;
    scene.add(neb);

    // Stars: many faint background ones plus brighter anchors that can link up.
    const BG = 2600, AN = 240, TOT = BG + AN;
    const pos = new Float32Array(TOT * 3), sz = new Float32Array(TOT), br = new Float32Array(TOT), seed = new Float32Array(TOT), tint = new Float32Array(TOT);
    for (let i = 0; i < TOT; i++) {
      const anchor = i >= BG;
      if (anchor) pos.set([(R() - 0.5) * 18, (R() - 0.5) * 10.5, -5 + R() * 7], i * 3);
      else pos.set([(R() - 0.5) * 90, (R() - 0.5) * 55, -45 + R() * 38], i * 3);
      sz[i] = anchor ? 1.0 + Math.pow(R(), 2) * 1.8 : 0.5 + Math.pow(R(), 4) * 2.2;
      br[i] = anchor ? 0.8 : 0.35 + R() * 0.55;
      seed[i] = R();
      tint[i] = R() < 0.08 ? 1 : R() < 0.06 ? 2 : 0;
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    sg.setAttribute("aSize", new THREE.BufferAttribute(sz, 1));
    sg.setAttribute("aBright", new THREE.BufferAttribute(br, 1));
    sg.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    sg.setAttribute("aTint", new THREE.BufferAttribute(tint, 1));
    const starU = {
      uTime: { value: 0 }, uPR: { value: renderer.getPixelRatio() },
      uGlow: { value: new THREE.Color(palette.glow) }, uCyan: { value: new THREE.Color(palette.cyan) }, uViolet: { value: new THREE.Color(palette.violet) },
    };
    const stars = new THREE.Points(sg, new THREE.ShaderMaterial({
      uniforms: starU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        uniform float uTime, uPR; attribute float aSize, aBright, aSeed, aTint; varying float vB; varying float vT;
        void main(){
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          float tw = 0.75 + 0.25 * sin(uTime * (1.0 + aSeed * 3.0) + aSeed * 40.0);
          vB = aBright * tw; vT = aTint;
          gl_PointSize = aSize * uPR * (1.0 + aBright * 0.6) * (22.0 / -mv.z) * 3.0;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uGlow, uCyan, uViolet; varying float vB; varying float vT;
        void main(){
          float d = length(gl_PointCoord - 0.5);
          float a = (exp(-d * d * 70.0) * 1.4 + exp(-d * 9.0) * 0.22) * smoothstep(0.5, 0.3, d);
          vec3 c = vT > 1.5 ? mix(uGlow, uViolet, 0.6) : vT > 0.5 ? mix(uGlow, uCyan, 0.55) : uGlow;
          gl_FragColor = vec4(c * a * vB, 1.0);
        }`,
    }));
    stars.frustumCulled = false;
    field.add(stars);

    // Constellation lines (updated each frame).
    const MAXE = 160;
    const lp = new Float32Array(MAXE * 6), lc = new Float32Array(MAXE * 6);
    const lg = new THREE.BufferGeometry();
    lg.setAttribute("position", new THREE.BufferAttribute(lp, 3));
    lg.setAttribute("color", new THREE.BufferAttribute(lc, 3));
    const lines = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    lines.frustumCulled = false;
    field.add(lines);

    const edges = new Map(); // key → { a, b, alpha, target }
    const v = new THREE.Vector3(), scr = new Float32Array(AN * 2), near = [];
    const lineCol = new THREE.Color(palette.ice).lerp(new THREE.Color(palette.glow), 0.4);

    return (t) => {
      starU.uTime.value = t;
      field.rotation.y = Math.sin(t * 0.05) * 0.08;
      field.rotation.z = t * 0.004;
      camera.position.set(pointer.x * 0.9, pointer.y * 0.6, 10);
      camera.lookAt(0, 0, 0);
      camera.updateMatrixWorld();
      field.updateMatrixWorld();

      // Screen-space positions of anchors; pick those near the pointer.
      const asp = size.aspect;
      near.length = 0;
      for (let i = 0; i < AN; i++) {
        v.fromArray(pos, (BG + i) * 3).applyMatrix4(field.matrixWorld).project(camera);
        scr[i * 2] = v.x * asp; scr[i * 2 + 1] = v.y;
        const dx = v.x * asp - pointer.x * asp, dy = v.y - pointer.y;
        const d = Math.hypot(dx, dy);
        if (d < 0.62 && v.z < 1) near.push([i, d]);
        br[BG + i] = 0.8;
      }
      near.sort((a, b) => a[1] - b[1]);
      near.length = Math.min(near.length, 16);

      // Minimum spanning tree over the nearby stars reads as a constellation.
      edges.forEach((e) => (e.target = 0));
      if (near.length > 1) {
        const inTree = [near[0]], rest = near.slice(1);
        while (rest.length) {
          let best = Infinity, bi = 0, bj = 0;
          for (let a = 0; a < inTree.length; a++)
            for (let b = 0; b < rest.length; b++) {
              const i = inTree[a][0], j = rest[b][0];
              const d = Math.hypot(scr[i * 2] - scr[j * 2], scr[i * 2 + 1] - scr[j * 2 + 1]);
              if (d < best) { best = d; bi = a; bj = b; }
            }
          const A = inTree[bi], B = rest.splice(bj, 1)[0];
          inTree.push(B);
          if (best > 0.55) continue;
          const i = Math.min(A[0], B[0]), j = Math.max(A[0], B[0]);
          const key = i * 1000 + j;
          const fall = 1 - Math.min(1, Math.max(A[1], B[1]) / 0.62);
          const e = edges.get(key) || edges.set(key, { a: i, b: j, alpha: 0, target: 0 }).get(key);
          e.target = Math.pow(fall, 0.7);
        }
      }

      let k = 0;
      edges.forEach((e, key) => {
        e.alpha += (e.target - e.alpha) * (e.target > e.alpha ? 0.08 : 0.05);
        if (e.alpha < 0.01 && e.target === 0) { edges.delete(key); return; }
        if (k >= MAXE) return;
        const ia = (BG + e.a) * 3, ib = (BG + e.b) * 3;
        lp.set([pos[ia], pos[ia + 1], pos[ia + 2], pos[ib], pos[ib + 1], pos[ib + 2]], k * 6);
        const s = e.alpha * 1.6;
        lc.set([lineCol.r * s, lineCol.g * s, lineCol.b * s, lineCol.r * s, lineCol.g * s, lineCol.b * s], k * 6);
        br[BG + e.a] = Math.max(br[BG + e.a], 0.8 + e.alpha * 1.6);
        br[BG + e.b] = Math.max(br[BG + e.b], 0.8 + e.alpha * 1.6);
        k++;
      });
      lg.setDrawRange(0, k * 2);
      lg.attributes.position.needsUpdate = true;
      lg.attributes.color.needsUpdate = true;
      sg.attributes.aBright.needsUpdate = true;
      neb.material.uniforms.uTime.value = t;
    };
  },
};
