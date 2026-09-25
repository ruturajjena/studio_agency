// 14 — Floating Isles: low-poly rock islands adrift in the night, spilling waterfalls of light into the void.
export default {
  id: "14",
  name: "Floating Isles",
  blurb: "Faceted islands drift in a night void, pouring waterfalls of light. Move to shift the parallax.",
  theme: "sunset",
  camera: { fov: 38, position: [0, 3.4, 13], target: [0, 0.7, 0] },
  bloom: { strength: 0.85, radius: 0.6, threshold: 0.7 },
  exposure: 1.05,

  setup({ THREE, scene, camera, pointer, sky, rand, palette, target }) {
    sky({ top: "#02050d", mid: "#0a1733", horizon: "#3a5b98", haze: 0.35 });
    scene.fog = new THREE.Fog("#07102a", 14, 34);
    const rnd = rand(14);

    // Moon glow behind the scene.
    const glowTex = (() => {
      const c = document.createElement("canvas"); c.width = c.height = 128;
      const g = c.getContext("2d"), grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      grd.addColorStop(0, "rgba(255,255,255,1)"); grd.addColorStop(0.2, "rgba(200,220,255,0.45)"); grd.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
      return new THREE.CanvasTexture(c);
    })();
    const moon = new THREE.Mesh(new THREE.PlaneGeometry(26, 26), new THREE.MeshBasicMaterial({ map: glowTex, color: new THREE.Color(0.45, 0.6, 1.0), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    moon.position.set(-2, 5, -30);
    scene.add(moon);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(1.3, 64), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.8, 2.3), toneMapped: false, fog: false }));
    disc.position.set(-2, 5, -29.9);
    scene.add(disc);

    // Lighting: cold moon key from behind-left, soft navy fill, cyan bounce from below.
    const key = new THREE.DirectionalLight(0xcfe0ff, 2.4); key.position.set(-4, 8, -6); scene.add(key);
    const front = new THREE.DirectionalLight(0x6d8fd6, 0.9); front.position.set(3, 2, 8); scene.add(front);
    scene.add(new THREE.HemisphereLight(0x2c55a8, 0x040914, 0.7));
    const under = new THREE.PointLight(0x6fe3ff, 12, 12, 2); under.position.set(0, -2.5, 2); scene.add(under);

    // Deterministic jitter keyed on vertex position so shared vertices stay welded.
    const hash = (x, y, z) => { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); };
    const rockMat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.85, metalness: 0.05 });
    const top = new THREE.Color("#8fa9d8"), rock = new THREE.Color("#1a2d58"), deep = new THREE.Color("#0a1430");

    const makeIsland = (r, h) => {
      const g = new THREE.CylinderGeometry(r, r * 0.08, h, 11, 5);
      const p = g.attributes.position, cols = [];
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
        const k = hash(Math.round(x * 100), Math.round(y * 100), Math.round(z * 100));
        const k2 = hash(Math.round(z * 100), Math.round(x * 100), Math.round(y * 100));
        const t = (y + h / 2) / h; // 0 bottom → 1 top
        const isTop = t > 0.99;
        const radial = isTop ? 0.92 + k * 0.12 : 0.7 + k * 0.55;
        p.setXYZ(i, x * radial, y + (isTop ? (k2 - 0.5) * 0.12 * r : (k2 - 0.5) * h * 0.12), z * radial);
        const c = isTop ? top.clone().lerp(new THREE.Color("#c9d9f5"), k2 * 0.5) : rock.clone().lerp(deep, 1 - t);
        cols.push(c.r, c.g, c.b);
      }
      g.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3));
      g.computeVertexNormals();
      return new THREE.Mesh(g, rockMat);
    };

    const treeGeo = new THREE.ConeGeometry(0.16, 0.6, 5);
    const treeMat = new THREE.MeshStandardMaterial({ color: "#0e1d40", flatShading: true, roughness: 0.9 });
    const crystalGeo = new THREE.OctahedronGeometry(0.08, 0);
    const crystalMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.8, 1.4, 2.0), toneMapped: false });

    // Waterfalls: GPU-animated particles falling off the island rim.
    const fallMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 } },
      vertexShader: `uniform float uTime; attribute vec4 aSeed; attribute vec3 aOut; varying float vA;
        void main(){
          float u = fract(uTime * (0.16 + aSeed.w * 0.05) + aSeed.z);
          float T = u * 3.4;
          vec3 side = normalize(cross(aOut, vec3(0.0, 1.0, 0.0)));
          vec3 p = position + aOut * (0.35 * T + aSeed.y * 0.05 * T * T) + side * (aSeed.x - 0.5) * (0.16 + T * 0.3);
          p.y -= 0.55 * T * T;
          vA = smoothstep(0.0, 0.03, u) * pow(1.0 - u, 1.6);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = (1.0 + T * 0.7) * (38.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `varying float vA;
        void main(){ float d = length(gl_PointCoord - 0.5) * 2.0; float a = pow(max(1.0 - d, 0.0), 1.8) * vA;
          gl_FragColor = vec4(vec3(0.7, 0.85, 1.5) * a * 0.55, a); }`,
    });
    const makeFall = (r, h, ang, count) => {
      const pos = new Float32Array(count * 3), seed = new Float32Array(count * 4), out = new Float32Array(count * 3);
      const ox = Math.cos(ang), oz = Math.sin(ang);
      for (let i = 0; i < count; i++) {
        pos.set([ox * r * 0.95, h / 2 - 0.02, oz * r * 0.95], i * 3);
        seed.set([rnd(), rnd(), rnd(), rnd()], i * 4);
        out.set([ox, 0, oz], i * 3);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 4));
      g.setAttribute("aOut", new THREE.BufferAttribute(out, 3));
      const pts = new THREE.Points(g, fallMat);
      pts.frustumCulled = false;
      return pts;
    };

    // Island layout: [x, y, z, radius, height, waterfall angles, trees, crystals]
    const layout = [
      [0, 0.9, 0, 2.3, 2.6, [1.3, 2.2], 6, 3],
      [-4.6, 2.1, -3.5, 1.1, 1.4, [1.6], 3, 1],
      [4.6, 2.5, -4.5, 1.3, 1.6, [1.1], 3, 1],
      [3.5, -0.2, 2.2, 0.55, 0.8, [], 1, 0],
      [-3.4, -0.4, 1.0, 0.7, 0.9, [1.5], 1, 1],
      [-8, 3.8, -13, 1.6, 2.0, [], 3, 0],
      [8.5, 1.2, -15, 1.9, 2.2, [1.8], 4, 0],
    ];
    const isles = layout.map(([x, y, z, r, h, falls, trees, crystals], idx) => {
      const grp = new THREE.Group();
      grp.position.set(x, y, z);
      grp.rotation.y = rnd() * Math.PI;
      grp.add(makeIsland(r, h));
      for (let i = 0; i < trees; i++) {
        const tr = new THREE.Mesh(treeGeo, treeMat);
        const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * r * 0.7, s = 0.6 + rnd() * 0.8;
        tr.position.set(Math.cos(a) * d, h / 2 + 0.3 * s, Math.sin(a) * d);
        tr.scale.setScalar(s);
        grp.add(tr);
      }
      for (let i = 0; i < crystals; i++) {
        const c = new THREE.Mesh(crystalGeo, crystalMat);
        const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * r * 0.6;
        c.position.set(Math.cos(a) * d, h / 2 + 0.18, Math.sin(a) * d);
        c.scale.set(1, 2.2 + rnd() * 1.5, 1);
        c.rotation.z = (rnd() - 0.5) * 0.4;
        grp.add(c);
      }
      // Waterfalls face roughly toward the camera so they read clearly.
      falls.forEach((a) => grp.add(makeFall(r, h, a + grp.rotation.y, Math.round(1400 + r * 1200))));
      scene.add(grp);
      return { grp, y, ph: idx * 1.7, sp: 0.4 + rnd() * 0.3 };
    });

    // Drifting motes.
    const M = 900, mp = new Float32Array(M * 3);
    for (let i = 0; i < M; i++) mp.set([(rnd() - 0.5) * 30, (rnd() - 0.5) * 16, -rnd() * 26 + 4], i * 3);
    const mg = new THREE.BufferGeometry(); mg.setAttribute("position", new THREE.BufferAttribute(mp, 3));
    const motes = new THREE.Points(mg, new THREE.PointsMaterial({ color: new THREE.Color(0.6, 0.75, 1.2), size: 0.05, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending }));
    scene.add(motes);

    const base = camera.position.clone();
    return (t) => {
      fallMat.uniforms.uTime.value = t;
      isles.forEach((o) => {
        o.grp.position.y = o.y + Math.sin(t * o.sp + o.ph) * 0.14;
        o.grp.rotation.z = Math.sin(t * o.sp * 0.7 + o.ph) * 0.02;
      });
      motes.position.y = (t * 0.08) % 2;
      camera.position.set(base.x + pointer.x * 2.2, base.y + pointer.y * 1.1, base.z);
      camera.lookAt(target);
    };
  },
};
