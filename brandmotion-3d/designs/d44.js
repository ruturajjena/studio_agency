// 44 — Sky Lanterns: paper lanterns drift up from a still night lake, their light trembling in the water.
export default {
  id: "44",
  name: "Sky Lanterns",
  blurb: "Paper lanterns rise over dark water. Your cursor releases new ones and nudges them aside.",
  theme: "gold",
  camera: { fov: 45, position: [0, 1.3, 10], target: [0, 2.7, 0] },
  bloom: { strength: 0.9, radius: 0.6, threshold: 0.7 },
  exposure: 1.0,

  setup({ THREE, scene, camera, pointer, sky, glsl, palette, rand }) {
    const R = rand(44);
    sky({ top: "#020611", mid: "#0a1733", horizon: "#29467f", below: "#030812", haze: 0.55 });

    const N = 120, TOP = 11;
    const warm = new THREE.Color(1.0, 0.8, 0.58), cool = new THREE.Color(0.72, 0.86, 1.0), glow = new THREE.Color(palette.glow);
    const L = [];
    const spawn = (l, y, x) => {
      l.z = 3 - Math.pow(R(), 0.7) * 34;
      const spread = 5 + (3 - l.z) * 0.55;
      l.x = x ?? (R() - 0.5) * 2 * spread;
      l.y = y;
      l.vy = 0.28 + R() * 0.3;
      l.ph = R() * 100;
      l.px = 0; l.py = 0; // pointer push offset
    };
    const tint = new Float32Array(N * 3), halo = new Float32Array(N * 3), seed = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const l = {};
      spawn(l, R() * TOP);
      L.push(l);
      const r = R();
      const c = r < 0.62 ? warm : r < 0.85 ? glow : cool;
      tint.set([c.r, c.g, c.b], i * 3);
      seed[i] = R() * 100;
    }

    // Lantern bodies.
    const geo = new THREE.CylinderGeometry(0.17, 0.12, 0.5, 18, 4, false);
    geo.setAttribute("aTint", new THREE.InstancedBufferAttribute(tint, 3));
    geo.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seed, 1));
    const uniforms = { uTime: { value: 0 } };
    const lanterns = new THREE.InstancedMesh(geo, new THREE.ShaderMaterial({
      uniforms, toneMapped: false,
      vertexShader: `attribute vec3 aTint; attribute float aSeed; varying vec3 vP, vN, vV, vTint; varying float vSeed;
        void main(){ vP = position; vTint = aTint; vSeed = aSeed;
          vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
          vN = normalize(normalMatrix * mat3(instanceMatrix) * normal); vV = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform float uTime; varying vec3 vP, vN, vV, vTint; varying float vSeed;
        void main(){
          float h = clamp((vP.y + 0.25) / 0.5, 0.0, 1.0);
          float face = clamp(dot(vN, vV), 0.0, 1.0);
          float ribs = 0.88 + 0.12 * cos(atan(vP.z, vP.x) * 10.0);
          float band = smoothstep(0.0, 0.08, h) * smoothstep(1.0, 0.9, h);
          float flick = 0.9 + 0.1 * sin(uTime * 9.0 + vSeed * 13.0) * sin(uTime * 5.3 + vSeed);
          float k = mix(2.3, 0.35, pow(h, 0.7)) * (0.45 + 0.55 * face) * ribs * mix(0.35, 1.0, band) * flick;
          gl_FragColor = vec4(vTint * k, 1.0);
        }`,
    }), N);
    lanterns.frustumCulled = false;
    scene.add(lanterns);

    // Glow halos above water and trembling streaks below it share one sprite system.
    const makeSprites = (reflect) => {
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N * 3), 3));
      g.setAttribute("aTint", new THREE.BufferAttribute(tint, 3));
      g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
      g.setAttribute("aFade", new THREE.BufferAttribute(new Float32Array(N), 1));
      const m = new THREE.ShaderMaterial({
        uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
        defines: reflect ? { REFLECT: 1 } : {},
        vertexShader: `${glsl.noise}
          uniform float uTime; attribute vec3 aTint; attribute float aSeed, aFade; varying vec3 vTint; varying float vA;
          void main(){
            vec3 p = position;
            #ifdef REFLECT
              p.x += snoise(vec3(p.z * 0.4, p.y * 1.5, uTime * 0.8 + aSeed)) * 0.06;
              vA = aFade * exp(p.y * 0.18) * (0.75 + 0.25 * snoise(vec3(aSeed, uTime * 1.7, 0.0)));
            #else
              vA = aFade;
            #endif
            vTint = aTint;
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            #ifdef REFLECT
              gl_PointSize = 480.0 / -mv.z;
            #else
              gl_PointSize = 150.0 / -mv.z;
            #endif
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: `varying vec3 vTint; varying float vA;
          void main(){
            vec2 q = gl_PointCoord - 0.5;
            #ifdef REFLECT
              float w = 1.0 + sin(q.y * 60.0) * 0.25;
              float a = exp(-(q.x * q.x * 500.0 * w + q.y * q.y * 12.0)) * 0.6 + exp(-(q.x * q.x * 70.0 + q.y * q.y * 8.0)) * 0.16;
            #else
              float d = dot(q, q);
              float a = exp(-d * 30.0) * 0.4 + exp(-d * 8.0) * 0.12;
            #endif
            gl_FragColor = vec4(vTint * a * vA, 1.0);
          }`,
      });
      const pts = new THREE.Points(g, m);
      pts.frustumCulled = false;
      if (reflect) pts.renderOrder = 1;
      scene.add(pts);
      return g;
    };

    // Water: dark, rippled, catching the sky at grazing angles.
    const water = new THREE.Mesh(
      new THREE.PlaneGeometry(400, 200, 1, 1),
      new THREE.ShaderMaterial({
        depthWrite: false, // reflections below the surface stay visible
        uniforms: { uTime: uniforms.uTime, uDeep: { value: new THREE.Color("#02050c") }, uSky: { value: new THREE.Color("#29467f") }, uHigh: { value: new THREE.Color(palette.night) } },
        vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
        fragmentShader: `${glsl.noise}
          uniform float uTime; uniform vec3 uDeep, uSky, uHigh; varying vec3 vW;
          void main(){
            vec3 v = normalize(cameraPosition - vW);
            vec2 q = vW.xz * vec2(0.35, 1.2);
            vec3 n = normalize(vec3(snoise(vec3(q, uTime * 0.25)) * 0.05, 1.0, snoise(vec3(q * 1.7 + 7.0, uTime * 0.3)) * 0.08));
            vec3 r = reflect(-v, n);
            float fr = pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 4.0);
            vec3 sky = mix(uSky, uHigh, smoothstep(0.0, 0.25, r.y));
            vec3 col = mix(uDeep, sky, fr * 0.45);
            col += uSky * 0.35 * exp(-abs(vW.z + 60.0) * 0.02) * smoothstep(-40.0, -120.0, vW.z);
            gl_FragColor = vec4(col, 1.0);
          }`,
      })
    );
    water.rotation.x = -Math.PI / 2;
    water.position.z = -80;
    scene.add(water);

    const haloGeo = makeSprites(false);
    const reflGeo = makeSprites(true);

    // Stars.
    const S = 700, sp = new Float32Array(S * 3);
    for (let i = 0; i < S; i++) {
      const a = R() * Math.PI - Math.PI, e = 0.03 + Math.pow(R(), 1.6) * 1.2;
      sp.set([Math.cos(a) * Math.cos(e) * 250, Math.sin(e) * 250, Math.sin(a) * Math.cos(e) * 250], i * 3);
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute("position", new THREE.BufferAttribute(sp, 3));
    scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: palette.ice, size: 1.1, sizeAttenuation: false, transparent: true, opacity: 0.55, depthWrite: false })));

    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), e = new THREE.Euler();
    const ray = new THREE.Ray(), ndc = new THREE.Vector3(), tmp = new THREE.Vector3(), push = new THREE.Vector3();
    const hp = haloGeo.attributes.position.array, hf = haloGeo.attributes.aFade.array;
    const rp = reflGeo.attributes.position.array, rf = reflGeo.attributes.aFade.array;
    let lastP = new THREE.Vector2(), release = 0;

    return (t, dt) => {
      uniforms.uTime.value = t;
      ndc.set(pointer.x, pointer.y, 0.5).unproject(camera);
      ray.origin.copy(camera.position);
      ray.direction.copy(ndc).sub(camera.position).normalize();

      // Moving the cursor releases lanterns from the water beneath it.
      release += dt * 0.6 + lastP.distanceTo(pointer) * 6;
      lastP.copy(pointer);
      while (release > 1) {
        release -= 1;
        let hi = 0;
        for (let i = 1; i < N; i++) if (L[i].y > L[hi].y) hi = i;
        const l = L[hi];
        spawn(l, 0.25);
        const d = (camera.position.z - l.z) / Math.max(0.2, -ray.direction.z);
        l.x = camera.position.x + ray.direction.x * d + (R() - 0.5) * 1.5;
      }

      for (let i = 0; i < N; i++) {
        const l = L[i];
        l.y += l.vy * dt * (0.6 + 0.4 * Math.min(1, l.y));
        if (l.y > TOP) spawn(l, 0.25);
        const sx = Math.sin(t * 0.4 + l.ph) * 0.25 * Math.min(1, l.y * 0.5);
        p.set(l.x + sx + l.px, l.y + l.py, l.z);
        // Push away from the pointer ray.
        ray.closestPointToPoint(p, tmp);
        push.subVectors(p, tmp);
        const dist = push.length();
        const f = Math.max(0, 1 - dist / 1.8);
        if (f > 0 && dist > 1e-4) {
          push.multiplyScalar((f * f * 3.0 * dt) / dist);
          l.px += push.x; l.py += push.y * 0.6;
        }
        l.px *= 1 - dt * 0.15; l.py *= 1 - dt * 0.4;
        const fade = Math.min(1, l.y / 0.8) * Math.min(1, (TOP - l.y) / 2.5);
        s.setScalar(Math.max(0.001, fade));
        e.set(Math.sin(t * 0.7 + l.ph) * 0.08, l.ph, Math.cos(t * 0.6 + l.ph) * 0.08);
        m.compose(p, q.setFromEuler(e), s);
        lanterns.setMatrixAt(i, m);
        hp[i * 3] = p.x; hp[i * 3 + 1] = p.y; hp[i * 3 + 2] = p.z; hf[i] = fade;
        rp[i * 3] = p.x; rp[i * 3 + 1] = -p.y - 0.1; rp[i * 3 + 2] = p.z; rf[i] = fade;
      }
      lanterns.instanceMatrix.needsUpdate = true;
      haloGeo.attributes.position.needsUpdate = haloGeo.attributes.aFade.needsUpdate = true;
      reflGeo.attributes.position.needsUpdate = reflGeo.attributes.aFade.needsUpdate = true;

      camera.position.x = pointer.x * 0.6;
      camera.lookAt(pointer.x * 0.3, 2.7 + pointer.y * 0.2, 0);
    };
  },
};
