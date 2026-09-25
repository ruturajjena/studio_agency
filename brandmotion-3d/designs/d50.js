// 50 — Glow Reef: a bioluminescent reef of branching corals with glowing tips and drifting plankton.
export default {
  id: "50",
  name: "Glow Reef",
  blurb: "A bioluminescent reef of branching coral and drifting plankton. Coral near your cursor glows brighter.",
  camera: { fov: 40, position: [0, 1.7, 7.6], target: [0, 0.95, 0] },
  bloom: { strength: 0.7, radius: 0.35, threshold: 0.8 },
  exposure: 1.0,
  background: "#030a1a",

  setup({ THREE, scene, camera, pointer, sky, glsl, palette, rand }) {
    const R = rand(50);
    sky({ top: "#0e2656", mid: "#07142e", horizon: "#040b1c", below: "#030a1a", haze: 0.0 });
    const FOG = new THREE.Color("#040b1c");
    const uniforms = {
      uTime: { value: 0 },
      uPointer: { value: new THREE.Vector3(0, 99, 0) },
      uFog: { value: FOG },
    };
    const common = /* glsl */ `
      uniform float uTime; uniform vec3 uPointer, uFog;
      vec3 sway(vec3 w){
        float h = max(w.y, 0.0);
        return w + vec3(sin(uTime * 0.7 + w.y * 1.1 + w.z * 0.6), 0.0, cos(uTime * 0.55 + w.y * 0.9 + w.x * 0.5) * 0.6) * 0.025 * h * h;
      }
      float nearPointer(vec3 w){ vec3 d = w - uPointer; d.z *= 0.35; return exp(-dot(d, d) * 1.6); }
      vec3 fogged(vec3 c, vec3 w){ float d = distance(w, cameraPosition); return mix(c, uFog, 1.0 - exp(-d * d * 0.004)); }
    `;

    // Grow colonies: recursive branching, some bushy, some flat like sea fans.
    const segs = [], tips = [];
    const up = new THREE.Vector3(0, 1, 0);
    const tints = [new THREE.Color(palette.ice), new THREE.Color("#5f8dff"), new THREE.Color(palette.cyan), new THREE.Color(palette.violet)];
    function grow(a, dir, len, rad, depth, sp) {
      const b = a.clone().addScaledVector(dir, depth === 0 ? len * 0.35 : len);
      segs.push({ a, b, r: rad, level: depth / sp.max, tint: sp.tint });
      if (depth >= sp.max) { tips.push({ p: b, tint: sp.tint, s: rad * 1.3 + 0.014 }); return; }
      const n = depth === 0 ? sp.first : R() < sp.split ? 3 : 2;
      for (let i = 0; i < n; i++) {
        const axis = sp.fan ? sp.normal.clone() : new THREE.Vector3(R() - 0.5, R() - 0.5, R() - 0.5).cross(dir).normalize();
        const ang = (sp.fan ? (i / Math.max(1, n - 1) - 0.5) * 2 : 1) * (sp.angle * (0.6 + R() * 0.6)) * (sp.fan ? 1 : (i % 2 ? 1 : -1));
        const d = dir.clone().applyAxisAngle(axis, ang).addScaledVector(up, sp.lift).normalize();
        grow(b, d, len * (0.68 + R() * 0.16), rad * 0.7, depth + 1, sp);
      }
    }
    const colonies = [];
    for (let i = 0; i < 26; i++) {
      const a = R() * Math.PI * 2, d = Math.sqrt(R()) * 4.6;
      colonies.push([Math.cos(a) * d * 1.3, Math.sin(a) * d * 0.6 - 0.4, d < 2 ? 6 : 5, R() < 0.3]);
    }
    colonies.forEach(([x, z, max, fan], i) => {
      const r = R();
      const tint = tints[r < 0.4 ? 0 : r < 0.75 ? 1 : r < 0.92 ? 2 : 3];
      const sp = { max, fan, tint, first: fan ? 4 : 5, split: fan ? 0.25 : 0.3, angle: fan ? 0.4 : 0.55, lift: fan ? 0.22 : 0.4,
        normal: new THREE.Vector3(Math.sin(i), 0, Math.cos(i) + 2).normalize() };
      const base = new THREE.Vector3(x, -0.05, z);
      const scale = 1.25 - Math.hypot(x, z) * 0.08;
      grow(base, new THREE.Vector3((R() - 0.5) * 0.3, 1, (R() - 0.5) * 0.3).normalize(), (0.34 + max * 0.04) * scale, 0.045 * scale, 0, sp);
    });

    // Branch instances.
    const bGeo = new THREE.CylinderGeometry(0.72, 1, 1, 7, 1, true);
    bGeo.translate(0, 0.5, 0);
    const level = new Float32Array(segs.length), bTint = new Float32Array(segs.length * 3);
    const branches = new THREE.InstancedMesh(bGeo, new THREE.ShaderMaterial({
      uniforms,
      vertexShader: `${common}
        attribute float aLevel; attribute vec3 aTint; varying float vL, vH, vGlow; varying vec3 vT, vW, vN;
        void main(){
          vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0);
          w.xyz = sway(w.xyz);
          vL = aLevel + position.y / 7.0; vT = aTint; vW = w.xyz; vGlow = nearPointer(w.xyz);
          vN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
          gl_Position = projectionMatrix * viewMatrix * w;
        }`,
      fragmentShader: `${common}
        varying float vL, vH, vGlow; varying vec3 vT, vW, vN;
        void main(){
          float k = clamp(vL, 0.0, 1.0);
          float top = 0.35 + 0.65 * max(vN.y, 0.0);
          vec3 body = mix(vec3(0.02, 0.04, 0.1), vec3(0.06, 0.12, 0.28), k) * top;
          vec3 glow = vT * (pow(k, 5.0) * 0.35 + 0.01) * (1.0 + vGlow * 2.5);
          float rim = pow(1.0 - abs(dot(vN, normalize(cameraPosition - vW))), 2.0);
          vec3 c = body + glow + vT * rim * (0.05 + 0.4 * vGlow) * k * k;
          gl_FragColor = vec4(fogged(c, vW), 1.0);
        }`,
    }), segs.length);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), dir = new THREE.Vector3();
    segs.forEach((g, i) => {
      dir.subVectors(g.b, g.a);
      const len = dir.length();
      q.setFromUnitVectors(up, dir.normalize());
      m.compose(g.a, q, s.set(g.r, len * 1.04, g.r));
      branches.setMatrixAt(i, m);
      level[i] = g.level;
      bTint.set([g.tint.r, g.tint.g, g.tint.b], i * 3);
    });
    bGeo.setAttribute("aLevel", new THREE.InstancedBufferAttribute(level, 1));
    bGeo.setAttribute("aTint", new THREE.InstancedBufferAttribute(bTint, 3));
    scene.add(branches);

    // Glowing polyps at every tip.
    const tGeo = new THREE.IcosahedronGeometry(1, 1);
    const tPh = new Float32Array(tips.length), tTint = new Float32Array(tips.length * 3);
    const polyps = new THREE.InstancedMesh(tGeo, new THREE.ShaderMaterial({
      uniforms, toneMapped: false,
      vertexShader: `${common}
        attribute float aPh; attribute vec3 aTint; varying vec3 vC, vW;
        void main(){
          vec3 center = sway((modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz);
          vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0);
          w.xyz += center - (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
          float pulse = 0.6 + 0.4 * sin(uTime * 1.6 + aPh);
          float g = nearPointer(w.xyz);
          vC = aTint * (0.8 + 1.0 * pulse + 2.0 * g); vW = w.xyz;
          gl_Position = projectionMatrix * viewMatrix * w;
        }`,
      fragmentShader: `${common} varying vec3 vC, vW; void main(){ gl_FragColor = vec4(fogged(vC, vW), 1.0); }`,
    }), tips.length);
    tips.forEach((tp, i) => {
      m.compose(tp.p, q.identity(), s.setScalar(tp.s));
      polyps.setMatrixAt(i, m);
      tPh[i] = R() * 20;
      tTint.set([tp.tint.r, tp.tint.g, tp.tint.b], i * 3);
    });
    tGeo.setAttribute("aPh", new THREE.InstancedBufferAttribute(tPh, 1));
    tGeo.setAttribute("aTint", new THREE.InstancedBufferAttribute(tTint, 3));
    scene.add(polyps);

    // Seabed with drifting caustics.
    const bed = new THREE.PlaneGeometry(70, 50, 120, 90);
    bed.rotateX(-Math.PI / 2);
    const bp = bed.attributes.position;
    for (let i = 0; i < bp.count; i++) {
      const x = bp.getX(i), z = bp.getZ(i);
      bp.setY(i, Math.sin(x * 0.35 + z * 0.2) * 0.25 + Math.sin(x * 0.9 - z * 0.7) * 0.08 - 0.15 - Math.max(0, -z - 6) * 0.08);
    }
    bed.computeVertexNormals();
    scene.add(new THREE.Mesh(bed, new THREE.ShaderMaterial({
      uniforms,
      vertexShader: `varying vec3 vW, vN; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normal; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `${common} ${glsl.noise} varying vec3 vW, vN;
        void main(){
          vec2 p = vW.xz * 0.7;
          float c1 = pow(1.0 - abs(snoise(vec3(p, uTime * 0.25))), 8.0);
          float c2 = pow(1.0 - abs(snoise(vec3(p * 1.7 + 4.0, uTime * 0.3))), 10.0);
          vec3 c = vec3(0.012, 0.025, 0.06) * (0.5 + vN.y * 0.5) + vec3(0.2, 0.4, 0.85) * (c1 * 0.06 + c2 * 0.04);
          c += vec3(0.25, 0.45, 1.0) * nearPointer(vW + vec3(0.0, 0.8, 0.0)) * 0.12;
          gl_FragColor = vec4(fogged(c, vW), 1.0);
        }`,
    })));

    // Plankton drifting upward.
    const P = 1400, pp = new Float32Array(P * 3), pr = new Float32Array(P);
    for (let i = 0; i < P; i++) { pp.set([(R() - 0.5) * 18, R() * 7, (R() - 0.5) * 12 - 1], i * 3); pr[i] = R(); }
    const pg = new THREE.BufferGeometry();
    pg.setAttribute("position", new THREE.BufferAttribute(pp, 3));
    pg.setAttribute("aR", new THREE.BufferAttribute(pr, 1));
    const plankton = new THREE.Points(pg, new THREE.ShaderMaterial({
      uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
      vertexShader: `${common} ${glsl.noise} attribute float aR; varying float vA; varying vec3 vC;
        void main(){
          vec3 p = position;
          p.y = mod(p.y + uTime * (0.05 + aR * 0.1), 7.0) - 0.3;
          p += vec3(snoise(vec3(p.xz * 0.3, uTime * 0.1 + aR * 10.0)), 0.0, snoise(vec3(p.zx * 0.3, uTime * 0.1 + 5.0))) * 0.4;
          float g = nearPointer(p);
          vA = (0.35 + 0.65 * pow(0.5 + 0.5 * sin(uTime * (1.0 + aR * 2.0) + aR * 50.0), 3.0)) * smoothstep(0.0, 0.8, p.y) * smoothstep(6.7, 5.5, p.y);
          vA *= 0.6 + g * 1.5;
          vC = aR < 0.12 ? vec3(0.4, 1.0, 1.2) : vec3(0.7, 0.85, 1.2);
          vec4 mv = viewMatrix * modelMatrix * vec4(p, 1.0);
          gl_PointSize = (1.0 + aR * 2.2) * (10.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `varying float vA; varying vec3 vC; void main(){ float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(vC * exp(-d * d * 18.0) * vA, 1.0); }`,
    }));
    plankton.frustumCulled = false;
    scene.add(plankton);

    // Light shafts from the surface.
    const shaftMat = new THREE.ShaderMaterial({
      uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform float uTime; varying vec2 vUv;
        void main(){ float a = sin(vUv.x * 3.14159) * smoothstep(0.0, 1.0, vUv.y) * (0.6 + 0.4 * sin(uTime * 0.4 + vUv.x * 5.0));
          gl_FragColor = vec4(vec3(0.12, 0.22, 0.45) * a * 0.18, 1.0); }`,
    });
    for (let i = 0; i < 5; i++) {
      const sh = new THREE.Mesh(new THREE.PlaneGeometry(1.2 + R() * 1.5, 14), shaftMat);
      sh.position.set(-6 + i * 3 + R(), 5, -5 - R() * 4);
      sh.rotation.z = 0.25 + R() * 0.1;
      scene.add(sh);
    }

    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), ray = new THREE.Raycaster(), hit = new THREE.Vector3();
    return (t) => {
      uniforms.uTime.value = t;
      ray.setFromCamera(pointer, camera);
      if (ray.ray.intersectPlane(plane, hit)) uniforms.uPointer.value.copy(hit);
      camera.position.x = Math.sin(t * 0.08) * 0.8 + pointer.x * 0.5;
      camera.lookAt(0, 0.95, 0);
    };
  },
};
