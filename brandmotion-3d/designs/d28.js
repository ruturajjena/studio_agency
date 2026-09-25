// 28 — Signal Flag: a verlet-cloth banner with luminous trim, rippling in a night wind you can push.
export default {
  id: "28",
  name: "Signal Flag",
  blurb: "A silk banner rippling in the night wind. Your cursor is a gust that billows the cloth.",
  theme: "ember",
  camera: { fov: 40, position: [2.4, 1.3, 8.0], target: [0.2, 0.6, 0] },
  bloom: { strength: 0.7, radius: 0.45, threshold: 0.85 },
  exposure: 1.1,

  setup({ THREE, scene, camera, sky, pointer, pointerRaw, rand, palette }) {
    sky({ haze: 0.2, horizon: "#243f78", mid: "#0a1733" });
    const R = rand(28);

    // Cloth grid: particles, previous positions, constraints.
    const CX = 46, CY = 28, W = 4.4, H = 2.7, X0 = -2.1, Y0 = 2.25;
    const n = CX * CY, pos = new Float32Array(n * 3), prev = new Float32Array(n * 3), acc = new Float32Array(n * 3);
    const idx = (i, j) => j * CX + i;
    for (let j = 0; j < CY; j++)
      for (let i = 0; i < CX; i++) {
        const k = idx(i, j) * 3;
        pos[k] = X0 + (i / (CX - 1)) * W; pos[k + 1] = Y0 - (j / (CY - 1)) * H; pos[k + 2] = 0;
      }
    prev.set(pos);
    const rest0 = W / (CX - 1);
    const cons = [];
    const link = (a, b) => {
      const dx = pos[a * 3] - pos[b * 3], dy = pos[a * 3 + 1] - pos[b * 3 + 1];
      cons.push(a, b, Math.hypot(dx, dy));
    };
    for (let j = 0; j < CY; j++)
      for (let i = 0; i < CX; i++) {
        if (i < CX - 1) link(idx(i, j), idx(i + 1, j));
        if (j < CY - 1) link(idx(i, j), idx(i, j + 1));
        if (i < CX - 1 && j < CY - 1) { link(idx(i, j), idx(i + 1, j + 1)); link(idx(i + 1, j), idx(i, j + 1)); }
        if (j < CY - 2) link(idx(i, j), idx(i, j + 2));
      }
    const C = new Float32Array(cons);
    const pinned = (i) => i % CX === 0;

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const uv = new Float32Array(n * 2), index = [];
    for (let j = 0; j < CY; j++)
      for (let i = 0; i < CX; i++) {
        uv.set([i / (CX - 1), 1 - j / (CY - 1)], idx(i, j) * 2);
        if (i < CX - 1 && j < CY - 1) {
          const a = idx(i, j), b = idx(i + 1, j), c = idx(i, j + 1), d = idx(i + 1, j + 1);
          index.push(a, c, b, b, c, d);
        }
      }
    geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    geo.setIndex(index);
    geo.computeVertexNormals();
    const tris = geo.index.array;

    const uniforms = { uTime: { value: 0 }, uTrim: { value: new THREE.Color(1.3, 1.65, 2.4) }, uCyan: { value: new THREE.Color(palette.cyan) } };
    const mat = new THREE.MeshPhysicalMaterial({
      color: 0x0d1a3a, roughness: 0.55, metalness: 0.1, sheen: 1, sheenRoughness: 0.35, sheenColor: new THREE.Color(palette.ice), side: THREE.DoubleSide,
    });
    mat.onBeforeCompile = (s) => {
      Object.assign(s.uniforms, uniforms);
      s.vertexShader = s.vertexShader.replace("#include <common>", "#include <common>\nvarying vec2 vCl;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvCl = uv;");
      s.fragmentShader = s.fragmentShader
        .replace("#include <common>", "#include <common>\nvarying vec2 vCl; uniform float uTime; uniform vec3 uTrim, uCyan;")
        .replace("#include <emissivemap_fragment>", /* glsl */ `#include <emissivemap_fragment>
          vec2 q = vCl; vec2 ed = min(q, 1.0 - q) * vec2(${(W / H).toFixed(3)}, 1.0);
          float e = min(ed.x, ed.y);
          float trim = smoothstep(0.028, 0.018, e) * smoothstep(0.0, 0.01, e);
          float inner = smoothstep(0.075, 0.068, e) * smoothstep(0.06, 0.068, e);
          vec2 c = (q - vec2(0.56, 0.5)) * vec2(${(W / H).toFixed(3)}, 1.0);
          float r = length(c);
          float ring = smoothstep(0.01, 0.0, abs(r - 0.27)) + smoothstep(0.006, 0.0, abs(r - 0.36)) * 0.35;
          float chev = smoothstep(0.075, 0.06, r) * (0.6 + 0.4 * sin(uTime * 3.0));
          float shimmer = 0.75 + 0.25 * sin(uTime * 2.0 - q.x * 9.0);
          totalEmissiveRadiance += uTrim * (trim * 0.75 + inner * 0.18) * shimmer + mix(uTrim, uCyan, 0.35) * (ring * 0.6 + chev) * shimmer;`);
    };
    const cloth = new THREE.Mesh(geo, mat);
    scene.add(cloth);

    // Pole with glowing finial.
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 7, 16), new THREE.MeshStandardMaterial({ color: 0x5a6a90, metalness: 0.8, roughness: 0.3 }));
    pole.position.set(X0 - 0.05, -0.9, 0);
    scene.add(pole);
    const finial = new THREE.Mesh(new THREE.SphereGeometry(0.09, 20, 14), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.6, 3.4), toneMapped: false }));
    finial.position.set(X0 - 0.05, Y0 + 0.2, 0);
    scene.add(finial);

    scene.add(new THREE.AmbientLight(0x3a5aa0, 0.4));
    const key = new THREE.DirectionalLight(0xdce8ff, 2.2);
    key.position.set(3, 4, 6);
    const rim = new THREE.DirectionalLight(0x7a6cff, 1.6);
    rim.position.set(-4, 2, -5);
    const fill = new THREE.DirectionalLight(0x6fe3ff, 0.5);
    fill.position.set(-5, -2, 4);
    scene.add(key, rim, fill);

    // Wind streaks drifting past.
    const SN = 40, sPos = new Float32Array(SN * 6), sd = [];
    for (let i = 0; i < SN; i++) sd.push({ x: (R() - 0.5) * 16, y: (R() - 0.5) * 7 + 0.8, z: -1.5 - R() * 5, v: 2 + R() * 3, l: 0.3 + R() * 0.8 });
    const sGeo = new THREE.BufferGeometry();
    sGeo.setAttribute("position", new THREE.BufferAttribute(sPos, 3));
    const sCol = new Float32Array(SN * 6);
    for (let i = 0; i < SN; i++) sCol.set([0, 0, 0, 0.25, 0.33, 0.55], i * 6);
    sGeo.setAttribute("color", new THREE.BufferAttribute(sCol, 3));
    const streaks = new THREE.LineSegments(sGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    streaks.frustumCulled = false;
    scene.add(streaks);

    const ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -0.8), src = new THREE.Vector3();
    const lastRaw = new THREE.Vector2(), wind = new THREE.Vector3();
    let gust = 0, acc_t = 0;
    const STEP = 1 / 90, DAMP = 0.985;

    const simulate = (t) => {
      acc.fill(0);
      // Base breeze with slow turbulence.
      wind.set(3.2 + Math.sin(t * 0.7) * 1.2 + Math.sin(t * 1.9) * 0.6, Math.sin(t * 0.9) * 0.35, Math.sin(t * 1.3) * 1.4 + Math.cos(t * 2.7) * 0.6);
      // Aerodynamic force per triangle, along its normal.
      for (let k = 0; k < tris.length; k += 3) {
        const a = tris[k] * 3, b = tris[k + 1] * 3, c = tris[k + 2] * 3;
        const e1x = pos[b] - pos[a], e1y = pos[b + 1] - pos[a + 1], e1z = pos[b + 2] - pos[a + 2];
        const e2x = pos[c] - pos[a], e2y = pos[c + 1] - pos[a + 1], e2z = pos[c + 2] - pos[a + 2];
        const nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x;
        const cx = (pos[a] + pos[b] + pos[c]) / 3, cy = (pos[a + 1] + pos[b + 1] + pos[c + 1]) / 3, cz = (pos[a + 2] + pos[b + 2] + pos[c + 2]) / 3;
        let wx = wind.x, wy = wind.y, wz = wind.z;
        // Pointer gust: radial blast from the cursor, pushing into the cloth.
        const dx = cx - src.x, dy = cy - src.y, dz = cz - src.z, d2 = dx * dx + dy * dy + dz * dz;
        const g = gust * Math.exp(-d2 * 0.9) * 9;
        const inv = 1 / Math.sqrt(d2 + 1e-4);
        wx += dx * inv * g; wy += dy * inv * g; wz += (dz * inv - 1.2) * g;
        const len = Math.hypot(nx, ny, nz) + 1e-9;
        const f = ((nx * wx + ny * wy + nz * wz) / len) * 0.33;
        const fx = (nx / len) * f * len * 60, fy = (ny / len) * f * len * 60, fz = (nz / len) * f * len * 60;
        for (const p of [a, b, c]) { acc[p] += fx; acc[p + 1] += fy; acc[p + 2] += fz; }
      }
      for (let i = 0; i < n; i++) {
        if (pinned(i)) continue;
        const k = i * 3;
        // Drag pulls the cloth downwind; the pointer gust blows radially.
        const dx = pos[k] - src.x, dy = pos[k + 1] - src.y, d2 = dx * dx + dy * dy;
        const g = gust * Math.exp(-d2 * 0.8) * 7, inv = 1 / Math.sqrt(d2 + 0.05);
        const u = (pos[k] - X0) / W, flutter = Math.sin(u * 7 - t * 7.5 + pos[k + 1] * 1.3) * (3 + u * 10) + Math.sin(u * 13 - t * 11) * u * 4;
        acc[k] += wind.x * 1.7 + dx * inv * g; acc[k + 1] += wind.y + dy * inv * g; acc[k + 2] += wind.z * 0.6 + flutter - g * 0.8;
        for (let d = 0; d < 3; d++) {
          const x = pos[k + d], v = (x - prev[k + d]) * DAMP;
          prev[k + d] = x;
          pos[k + d] = x + v + (acc[k + d] + (d === 1 ? -3.2 : 0)) * STEP * STEP;
        }
      }
      for (let it = 0; it < 5; it++)
        for (let c = 0; c < C.length; c += 3) {
          const a = C[c] * 3, b = C[c + 1] * 3, r = C[c + 2];
          const dx = pos[b] - pos[a], dy = pos[b + 1] - pos[a + 1], dz = pos[b + 2] - pos[a + 2];
          const d = Math.sqrt(dx * dx + dy * dy + dz * dz) + 1e-9, diff = (d - r) / d;
          const pa = pinned(C[c]), pb = pinned(C[c + 1]);
          const wa = pa ? 0 : pb ? 1 : 0.5, wb = pb ? 0 : pa ? 1 : 0.5;
          pos[a] += dx * diff * wa; pos[a + 1] += dy * diff * wa; pos[a + 2] += dz * diff * wa;
          pos[b] -= dx * diff * wb; pos[b + 1] -= dy * diff * wb; pos[b + 2] -= dz * diff * wb;
        }
    };

    return (t, dt) => {
      uniforms.uTime.value = t;
      // Gust strength: stronger while the cursor moves, always a little present.
      const moved = pointerRaw.distanceTo(lastRaw);
      lastRaw.copy(pointerRaw);
      gust += (Math.min(0.35 + moved * 25, 1.6) - gust) * 0.08;
      ray.setFromCamera(pointer, camera);
      ray.ray.intersectPlane(plane, src);

      acc_t = Math.min(acc_t + dt, STEP * 4);
      while (acc_t >= STEP) { simulate(t); acc_t -= STEP; }
      geo.attributes.position.needsUpdate = true;
      geo.computeVertexNormals();

      sd.forEach((s, i) => {
        s.x += dt * s.v * (1 + gust * 0.5);
        if (s.x > 9) { s.x = -9; s.y = (R() - 0.5) * 7 + 0.8; }
        const y = s.y + Math.sin(t * 1.3 + s.x * 0.5) * 0.12;
        sPos.set([s.x, y, s.z, s.x + s.l, y + Math.cos(t * 1.3 + s.x * 0.5) * 0.03, s.z], i * 6);
      });
      sGeo.attributes.position.needsUpdate = true;
      camera.position.x = 2.4 + pointer.x * 0.8;
      camera.position.y = 1.3 + pointer.y * 0.5;
      camera.lookAt(0.2, 0.6, 0);
    };
  },
};
