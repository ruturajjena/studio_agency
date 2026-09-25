// 47 — Light Maze: a dark labyrinth seen from above while a filament of light finds its way through it.
export default {
  id: "47",
  name: "Light Maze",
  blurb: "A beam of light solves a dark labyrinth, then a new one rises. Your cursor tilts the maze.",
  theme: "emerald",
  camera: { fov: 39, position: [0, 15.5, 11], target: [0, -2.3, 0.6] },
  bloom: { strength: 1.0, radius: 0.5, threshold: 0.7 },
  exposure: 1.1,

  setup({ THREE, scene, pointer, palette, rand }) {
    const W = 11, G = 2 * W + 1, B = 0.44, H = 0.42;
    const MAXW = G * G;
    const group = new THREE.Group();
    scene.add(group);

    scene.add(new THREE.HemisphereLight(0x6f8fd0, 0x02040a, 0.35));
    const moon = new THREE.DirectionalLight(0x9fc0ff, 0.9);
    moon.position.set(-4, 10, -3);
    scene.add(moon);
    const headLight = new THREE.PointLight(0xcfe0ff, 5, 4.5, 1.6);
    group.add(headLight);
    const goalLight = new THREE.PointLight(0x6fe3ff, 2, 3, 1.6);
    group.add(goalLight);

    // Plinth + floor with a faint cell grid.
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(G * B + 0.5, 0.5, G * B + 0.5), new THREE.MeshStandardMaterial({ color: 0x060c1a, roughness: 0.6, metalness: 0.3 }));
    plinth.position.y = -0.26;
    group.add(plinth);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(G * B, G * B), new THREE.MeshStandardMaterial({ color: 0x03060e, roughness: 0.9 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0.001;
    group.add(floor);
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uCol: { value: new THREE.Color(palette.blue) } },
      vertexShader: `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform vec3 uCol; varying vec2 vP; void main(){ vec2 q = max(abs(vP) - 5.0, 0.0); float a = exp(-dot(q, q) * 0.5) * 0.35; gl_FragColor = vec4(uCol * a, a); }`,
    }));
    pool.rotation.x = -Math.PI / 2;
    pool.position.y = -0.52;
    group.add(pool);

    const walls = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color: 0x1a2d5c, emissive: 0x040a1c, roughness: 0.45, metalness: 0.3 }),
      MAXW
    );
    group.add(walls);

    const trailU = { uHead: { value: 0 }, uFade: { value: 1 }, uTime: { value: 0 } };
    const trailMat = new THREE.ShaderMaterial({
      uniforms: trailU, transparent: true, depthWrite: false, toneMapped: false,
      blending: THREE.CustomBlending, blendEquation: THREE.MaxEquation,
      vertexShader: `attribute float aDist, aAcross; varying float vD, vX;
        void main(){ vD = aDist; vX = aAcross; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform float uHead, uFade, uTime; varying float vD, vX;
        void main(){
          float behind = uHead - vD;
          if (behind < 0.0) discard;
          float core = exp(-vX * vX * 28.0), soft = exp(-vX * vX * 5.0) * 0.3;
          float heat = 0.3 + 2.6 * exp(-behind * 0.9) + 0.1 * sin(vD * 6.0 - uTime * 5.0);
          vec3 c = mix(vec3(0.35, 0.55, 1.2), vec3(0.8, 0.95, 1.4), exp(-behind * 0.6));
          gl_FragColor = vec4(c * (core + soft) * heat * uFade, 1.0);
        }`,
    });
    let trail = null;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 3.4, 4), toneMapped: false }));
    group.add(head);
    const ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.6, 1.6, 2.2), toneMapped: false, transparent: true });
    const goal = new THREE.Mesh(new THREE.RingGeometry(0.12, 0.15, 40), ringMat);
    goal.rotation.x = -Math.PI / 2;
    group.add(goal);

    const toWorld = (bx, by, y = 0) => new THREE.Vector3((bx - (G - 1) / 2) * B, y, (by - (G - 1) / 2) * B);
    let wallCells = [], path = [], cum = [], total = 1;
    let seed = 47;

    function build() {
      const R = rand(seed++);
      const g = Array.from({ length: G }, () => new Uint8Array(G).fill(1));
      // Recursive backtracker.
      const stack = [[0, 0]];
      const seen = new Set(["0,0"]);
      g[1][1] = 0;
      while (stack.length) {
        const [cx, cy] = stack[stack.length - 1];
        const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [cx + dx, cy + dy, dx, dy]).filter(([x, y]) => x >= 0 && y >= 0 && x < W && y < W && !seen.has(x + "," + y));
        if (!nb.length) { stack.pop(); continue; }
        const [nx, ny, dx, dy] = nb[Math.floor(R() * nb.length)];
        g[2 * cy + 1 + dy][2 * cx + 1 + dx] = 0;
        g[2 * ny + 1][2 * nx + 1] = 0;
        seen.add(nx + "," + ny);
        stack.push([nx, ny]);
      }
      // Solve with BFS across blocks.
      const start = [1, 1], end = [G - 2, G - 2];
      const prev = new Map([[start.join(), null]]);
      const q = [start];
      while (q.length) {
        const [x, y] = q.shift();
        if (x === end[0] && y === end[1]) break;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const k = [x + dx, y + dy];
          if (!g[k[1]][k[0]] && !prev.has(k.join())) { prev.set(k.join(), [x, y]); q.push(k); }
        }
      }
      const cells = [];
      for (let c = end; c; c = prev.get(c.join())) cells.unshift(c);
      // Keep only corners so the ribbon is a clean polyline.
      path = cells.filter((c, i) => i === 0 || i === cells.length - 1 ||
        (cells[i - 1][0] - c[0]) * (cells[i + 1][1] - c[1]) - (cells[i - 1][1] - c[1]) * (cells[i + 1][0] - c[0]) !== 0).map(([x, y]) => toWorld(x, y, 0.16));
      cum = [0];
      for (let i = 1; i < path.length; i++) cum.push(cum[i - 1] + path[i].distanceTo(path[i - 1]));
      total = cum[cum.length - 1];

      wallCells = [];
      for (let y = 0; y < G; y++) for (let x = 0; x < G; x++) if (g[y][x]) wallCells.push({ p: toWorld(x, y), d: Math.hypot(x - G / 2, y - G / 2), h: H * (0.85 + R() * 0.3) });
      walls.count = wallCells.length;

      // Trail ribbon: one quad per straight run, padded to close the corners.
      const pos = [], dist = [], across = [], idx = [];
      const WID = 0.34;
      for (let i = 0; i < path.length - 1; i++) {
        const a = path[i], b = path[i + 1];
        const dir = b.clone().sub(a).normalize(), side = new THREE.Vector3(-dir.z, 0, dir.x);
        const pad = WID / 2;
        const a2 = a.clone().addScaledVector(dir, -pad), b2 = b.clone().addScaledVector(dir, pad);
        const base = pos.length / 3;
        for (const [p, d] of [[a2, cum[i] - pad], [b2, cum[i + 1] + pad]])
          for (const s of [-1, 1]) {
            const v = p.clone().addScaledVector(side, s * WID / 2);
            pos.push(v.x, v.y, v.z); dist.push(Math.max(0, d)); across.push(s * 0.5);
          }
        idx.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
      }
      const tg = new THREE.BufferGeometry();
      tg.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      tg.setAttribute("aDist", new THREE.Float32BufferAttribute(dist, 1));
      tg.setAttribute("aAcross", new THREE.Float32BufferAttribute(across, 1));
      tg.setIndex(idx);
      if (trail) { trail.geometry.dispose(); group.remove(trail); }
      trail = new THREE.Mesh(tg, trailMat);
      trail.renderOrder = 2;
      group.add(trail);
      goal.position.copy(path[path.length - 1]).setY(0.02);
      goalLight.position.copy(goal.position).setY(0.4);
    }

    const at = (s, out) => {
      let i = 1;
      while (i < cum.length - 1 && cum[i] < s) i++;
      const f = Math.min(1, Math.max(0, (s - cum[i - 1]) / (cum[i] - cum[i - 1] || 1)));
      return out.lerpVectors(path[i - 1], path[i], f);
    };

    build();
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), hp = new THREE.Vector3(), wp = new THREE.Vector3();
    const SPEED = 2.6, HOLD = 2.2, FADE = 1.2;
    let phase = 0, rise = 0;

    return (t, dt) => {
      trailU.uTime.value = t;
      phase += dt;
      const run = total / SPEED;
      if (phase > run + HOLD + FADE) { phase = 0; rise = 0; build(); }
      rise = Math.min(rise + dt * 0.9, 2);
      const s = Math.min(phase, run) * SPEED;
      trailU.uHead.value = s;
      const fade = phase > run + HOLD ? 1 - (phase - run - HOLD) / FADE : 1;
      trailU.uFade.value = fade * Math.min(1, rise * 2);
      at(s, hp);
      head.position.copy(hp).setY(0.17);
      head.scale.setScalar(fade * Math.min(1, rise * 2) + 0.001);
      headLight.position.copy(hp).setY(0.35);
      headLight.intensity = 3.2 * fade;
      goalLight.intensity = 1.2 + Math.sin(t * 3) * 0.6 + (phase > run ? 3 * fade : 0);
      ringMat.opacity = 0.6 + 0.4 * Math.sin(t * 3);
      goal.scale.setScalar(1 + (t * 0.8) % 1 * 0.6);

      // Walls rise from the centre outwards on each new maze.
      for (let i = 0; i < wallCells.length; i++) {
        const w = wallCells[i];
        const k = Math.min(1, Math.max(0, rise * 2.2 - w.d * 0.08));
        const e = 1 - Math.pow(1 - k, 3);
        const h = Math.max(0.001, w.h * e);
        sc.set(B * 1.001, h, B * 1.001);
        m.compose(wp.set(w.p.x, h / 2, w.p.z), q, sc);
        walls.setMatrixAt(i, m);
      }
      walls.instanceMatrix.needsUpdate = true;

      group.rotation.x = pointer.y * -0.22;
      group.rotation.z = pointer.x * -0.18;
      group.rotation.y = Math.sin(t * 0.1) * 0.12 + pointer.x * 0.25;
    };
  },
};
