// 26 — Night City: a slow glide down a rain-soaked boulevard of dark towers and lit windows.
export default {
  id: "26",
  name: "Night City",
  blurb: "A rain-streaked skyline gliding past in the dark. Your cursor steers the fly-over.",
  camera: { fov: 48, position: [0, 15, 14], target: [0, 8, -60] },
  bloom: { strength: 0.75, radius: 0.45, threshold: 0.8 },
  exposure: 1.0,
  background: "#050b1a",

  setup({ THREE, scene, camera, sky, pointer, rand, palette }) {
    sky({ top: "#02050d", mid: "#0b1733", horizon: "#34528c", haze: 0.35 });
    const R = rand(26);
    const FOG = new THREE.Color("#10224a");
    const Z0 = -150, Z1 = 16, D = Z1 - Z0, SPEED = 2.2;

    // Towers on a grid either side of a central boulevard.
    const lots = [];
    for (let z = Z0; z < Z1; z += 4.8)
      for (let x = -48; x <= 48; x += 4.8) {
        if (Math.abs(x) < 4 || R() < 0.18) continue;
        const tower = Math.abs(x) > 8 && R() < 0.09;
        const h = tower ? 14 + R() * 24 : 1.5 + Math.pow(R(), 1.6) * 7;
        lots.push({ x: x + (R() - 0.5) * 0.8, z, w: 2.2 + R() * 1.6, d: 2.2 + R() * 1.6, h, seed: R() });
      }
    const geo = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
    const seeds = new Float32Array(lots.map((l) => l.seed));
    geo.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seeds, 1));
    const uniforms = {
      uTime: { value: 0 }, uFog: { value: FOG },
      uGlow: { value: new THREE.Color(palette.glow) }, uIce: { value: new THREE.Color(palette.ice) }, uCyan: { value: new THREE.Color(palette.cyan) },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: /* glsl */ `
        attribute float aSeed; varying vec3 vL; varying vec3 vN; varying float vSeed; varying float vDist; varying float vH;
        void main(){
          vec3 sc = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
          vL = position * sc; vN = normal; vSeed = aSeed; vH = sc.y;
          vec4 mv = viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0);
          vDist = -mv.z; gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform float uTime; uniform vec3 uFog, uGlow, uIce, uCyan;
        varying vec3 vL; varying vec3 vN; varying float vSeed; varying float vDist; varying float vH;
        float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
        void main(){
          vec3 col = vec3(0.012, 0.02, 0.042) + vec3(0.03, 0.05, 0.1) * exp(-vL.y * 0.25);
          if (abs(vN.y) < 0.5) {
            vec2 f = abs(vN.x) > 0.5 ? vec2(vL.z, vL.y) : vec2(vL.x, vL.y);
            float face = abs(vN.x) > 0.5 ? sign(vN.x) : 2.0 + sign(vN.z);
            vec2 cs = vec2(0.34, 0.46);
            vec2 cell = floor(f / cs), g = fract(f / cs);
            float win = step(0.2, g.x) * step(g.x, 0.8) * step(0.22, g.y) * step(g.y, 0.72);
            float rnd = h21(cell + vec2(vSeed * 91.0, face * 17.0));
            float floorLit = h21(vec2(cell.y, vSeed * 53.0 + face));
            float on = step(0.84 - floorLit * 0.24, rnd);
            on *= step(0.08, h21(cell + floor(uTime * 0.15 + rnd * 20.0)));
            on *= step(0.9, vL.y) * step(vL.y, vH - 0.4);
            vec3 wc = mix(uIce, uGlow, h21(cell * 1.7 + vSeed)) ;
            wc = mix(wc, uCyan, step(0.93, rnd) * 0.6);
            col += win * on * wc * (0.7 + 1.5 * h21(cell + 3.1));
            col += win * (1.0 - on) * vec3(0.004, 0.008, 0.018);
          } else {
            col = vec3(0.02, 0.03, 0.06);
          }
          col = mix(col, uFog, 1.0 - exp(-pow(vDist * 0.0125, 2.0)));
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    const city = new THREE.InstancedMesh(geo, mat, lots.length);
    city.frustumCulled = false;
    scene.add(city);

    // Beacons on the tallest towers.
    const tall = lots.filter((l) => l.h > 20);
    const bGeo = new THREE.BufferGeometry();
    const bPos = new Float32Array(tall.length * 3);
    bGeo.setAttribute("position", new THREE.BufferAttribute(bPos, 3));
    const beaconMat = new THREE.PointsMaterial({ color: new THREE.Color(2.2, 2.6, 3.4), size: 0.35, transparent: true, depthWrite: false, toneMapped: false });
    const beacons = new THREE.Points(bGeo, beaconMat);
    beacons.frustumCulled = false;
    scene.add(beacons);

    // Wet street with light streaks from traffic.
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(200, 200),
      new THREE.ShaderMaterial({
        uniforms: { uTime: uniforms.uTime, uFog: uniforms.uFog },
        vertexShader: `varying vec3 vW; varying float vD; void main(){ vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; vec4 mv=viewMatrix*w; vD=-mv.z; gl_Position=projectionMatrix*mv; }`,
        fragmentShader: /* glsl */ `
          uniform float uTime; uniform vec3 uFog; varying vec3 vW; varying float vD;
          void main(){
            float road = smoothstep(4.0, 3.0, abs(vW.x));
            float lane = smoothstep(0.05, 0.0, abs(abs(vW.x) - 1.3)) * step(0.5, fract(vW.z * 0.25 + uTime * 0.55));
            float sheen = exp(-abs(vW.x) * 0.9) * 0.22;
            float trails = 0.0;
            for (int i = 0; i < 4; i++) {
              float fi = float(i);
              float x = (fi < 2.0 ? -1.0 : 1.0) * (0.6 + mod(fi, 2.0) * 1.3);
              float z = fract(vW.z * 0.02 + uTime * (fi < 2.0 ? 0.09 : -0.07) + fi * 0.31);
              trails += smoothstep(0.1, 0.0, abs(vW.x - x)) * smoothstep(0.0, 0.3, z) * smoothstep(0.35, 0.3, z);
            }
            vec3 col = vec3(0.01, 0.016, 0.035) + vec3(0.12, 0.2, 0.4) * sheen * road + vec3(0.5, 0.6, 0.8) * lane * 0.25 * road;
            col += vec3(1.6, 1.9, 2.6) * trails * 0.9;
            col = mix(col, uFog, 1.0 - exp(-pow(vD * 0.0125, 2.0)));
            gl_FragColor = vec4(col, 1.0);
          }`,
      })
    );
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    // Rain streaks falling around the camera path.
    const RN = 1500, rp = new Float32Array(RN * 6), re = new Float32Array(RN * 2);
    for (let i = 0; i < RN; i++) {
      const x = (R() - 0.5) * 60, y = R() * 26, z = -R() * 70 + 4;
      rp.set([x, y, z, x, y, z], i * 6);
      re.set([0, 1], i * 2);
    }
    const rGeo = new THREE.BufferGeometry();
    rGeo.setAttribute("position", new THREE.BufferAttribute(rp, 3));
    rGeo.setAttribute("aEnd", new THREE.BufferAttribute(re, 1));
    const rain = new THREE.LineSegments(rGeo, new THREE.ShaderMaterial({
      uniforms: { uTime: uniforms.uTime },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        uniform float uTime; attribute float aEnd; varying float vA;
        void main(){
          vec3 p = position;
          float fall = uTime * (14.0 + fract(p.x * 7.13) * 6.0);
          p.y = mod(p.y - fall, 26.0);
          p.x += p.y * 0.12;
          p += vec3(0.07, 0.6, 0.0) * aEnd;
          vA = aEnd;
          vec4 mv = viewMatrix * modelMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `varying float vA; void main(){ gl_FragColor = vec4(vec3(0.45, 0.58, 0.85) * (0.08 + vA * 0.24), 1.0); }`,
    }));
    rain.frustumCulled = false;
    scene.add(rain);

    const m4 = new THREE.Matrix4(), look = new THREE.Vector3();
    let off = 0;
    return (t, dt) => {
      uniforms.uTime.value = t;
      off += dt * SPEED;
      let bi = 0;
      lots.forEach((l, i) => {
        const z = ((l.z - Z0 + off) % D) + Z0;
        m4.makeScale(l.w, l.h, l.d).setPosition(l.x, 0, z);
        city.setMatrixAt(i, m4);
        if (l.h > 20) { bPos.set([l.x, l.h + 0.4, z], bi * 3); bi++; }
      });
      city.instanceMatrix.needsUpdate = true;
      bGeo.attributes.position.needsUpdate = true;
      beaconMat.opacity = 0.35 + 0.65 * Math.pow(0.5 + 0.5 * Math.sin(t * 2.4), 6);

      camera.position.set(pointer.x * 4, 15 + pointer.y * 5, 14);
      look.set(pointer.x * 6, 8 + pointer.y * 3, -60);
      camera.lookAt(look);
    };
  },
};
