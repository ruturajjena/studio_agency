// 48 — Plasma Orb: a glass plasma ball whose lightning tendrils crackle from the core to the glass.
export default {
  id: "48",
  name: "Plasma Orb",
  blurb: "A glass plasma ball crackling with lightning. One tendril reaches for your cursor.",
  theme: "violet",
  camera: { fov: 36, position: [0, 0.5, 8.2], target: [0, -0.05, 0] },
  bloom: { strength: 0.75, radius: 0.35, threshold: 0.75 },
  exposure: 1.0,

  setup({ THREE, scene, camera, pointer, glsl, palette, rand }) {
    const R = rand(48);
    const C = new THREE.Vector3(0, 0.45, 0), RAD = 1.5;

    // Backdrop glow.
    const back = new THREE.Mesh(new THREE.PlaneGeometry(30, 20), new THREE.ShaderMaterial({
      depthWrite: false,
      uniforms: { uA: { value: new THREE.Color(palette.navy) }, uB: { value: new THREE.Color(palette.ink) } },
      vertexShader: `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform vec3 uA, uB; varying vec2 vP; void main(){ float r = length(vP - vec2(0.0, 0.6)); gl_FragColor = vec4(mix(uA * 0.55, uB, smoothstep(0.0, 6.0, r)), 1.0); }`,
    }));
    back.position.z = -6;
    scene.add(back);

    // Glass shell: fresnel rim, soft studio reflections, faint violet gas inside.
    const uniforms = { uTime: { value: 0 } };
    const glass = new THREE.Mesh(new THREE.SphereGeometry(RAD, 96, 64), new THREE.ShaderMaterial({
      uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
      vertexShader: `varying vec3 vN, vV, vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz;
        vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - w.xyz); gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `${glsl.noise}
        uniform float uTime; varying vec3 vN, vV, vW;
        void main(){
          float ndv = clamp(dot(vN, vV), 0.0, 1.0);
          float fr = pow(1.0 - ndv, 7.0);
          vec3 r = reflect(-vV, vN);
          float strip = smoothstep(0.9, 0.97, r.y) * smoothstep(0.3, 0.1, abs(r.x));      // overhead softbox
          float side = smoothstep(0.96, 0.995, dot(r, normalize(vec3(-0.9, 0.3, 0.3))));
          float gas = snoise(vW * 1.3 + vec3(0.0, uTime * 0.25, 0.0)) * 0.5 + 0.5;
          vec3 col = vec3(0.3, 0.45, 0.95) * fr * 0.9 + vec3(0.9, 0.95, 1.2) * (strip * 0.35 + side * 0.3);
          col += vec3(0.2, 0.18, 0.6) * ndv * gas * 0.025;
          gl_FragColor = vec4(col, 1.0);
        }`,
    }));
    glass.position.copy(C);
    scene.add(glass);

    // Core.
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.2, 32, 24), new THREE.ShaderMaterial({
      uniforms, toneMapped: false,
      vertexShader: `varying vec3 vP, vN, vV; void main(){ vP = position; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `${glsl.noise} uniform float uTime; varying vec3 vP, vN, vV;
        void main(){ float n = snoise(vP * 9.0 + uTime * 2.0) * 0.5 + 0.5; float f = pow(1.0 - max(dot(vN, vV), 0.0), 2.0);
          gl_FragColor = vec4(mix(vec3(1.2, 1.3, 2.0), vec3(2.4, 2.6, 3.2), n) * (0.7 + f), 1.0); }`,
    }));
    core.position.copy(C);
    scene.add(core);

    // Lightning ribbons, rebuilt on the CPU each frame and expanded to camera-facing strips in the shader.
    const MAIN = 10, FORK = 10, NB = MAIN + FORK, S = 44;
    const V = NB * S * 2;
    const pos = new Float32Array(V * 3), nxt = new Float32Array(V * 3), side = new Float32Array(V), along = new Float32Array(V), power = new Float32Array(V);
    const idx = [];
    for (let b = 0; b < NB; b++) for (let i = 0; i < S; i++) {
      const v = (b * S + i) * 2;
      side[v] = -1; side[v + 1] = 1;
      along[v] = along[v + 1] = i / (S - 1);
      if (i < S - 1) idx.push(v, v + 1, v + 2, v + 1, v + 3, v + 2);
    }
    const bg = new THREE.BufferGeometry();
    bg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    bg.setAttribute("aNext", new THREE.BufferAttribute(nxt, 3));
    bg.setAttribute("aSide", new THREE.BufferAttribute(side, 1));
    bg.setAttribute("aT", new THREE.BufferAttribute(along, 1));
    bg.setAttribute("aPow", new THREE.BufferAttribute(power, 1));
    bg.setIndex(idx);
    const bolts = new THREE.Mesh(bg, new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, toneMapped: false,
      vertexShader: `attribute vec3 aNext; attribute float aSide, aT, aPow; varying float vX, vT, vPow;
        void main(){
          vec3 a = (modelViewMatrix * vec4(position, 1.0)).xyz, b = (modelViewMatrix * vec4(aNext, 1.0)).xyz;
          vec3 dir = normalize(b - a + vec3(1e-5));
          vec3 perp = normalize(cross(dir, normalize(-a)));
          float w = (0.036 - 0.02 * aT) * (0.5 + aPow * 0.6);
          a += perp * aSide * w;
          vX = aSide; vT = aT; vPow = aPow;
          gl_Position = projectionMatrix * vec4(a, 1.0);
        }`,
      fragmentShader: `varying float vX, vT, vPow;
        void main(){
          float core = exp(-vX * vX * 30.0), halo = exp(-vX * vX * 3.0) * 0.25;
          vec3 c = mix(vec3(0.45, 0.55, 1.3), vec3(0.7, 0.55, 1.4), smoothstep(0.3, 1.0, vT));
          vec3 col = vec3(1.3, 1.45, 1.9) * core + c * halo;
          gl_FragColor = vec4(col * vPow * (0.6 + 0.4 * (1.0 - vT)), 1.0);
        }`,
    }));
    bolts.frustumCulled = false;
    bolts.renderOrder = 3;
    scene.add(bolts);

    // Contact sparks where tendrils touch the glass.
    const sp = new THREE.BufferGeometry();
    sp.setAttribute("position", new THREE.BufferAttribute(new Float32Array(MAIN * 3), 3));
    sp.setAttribute("aPow", new THREE.BufferAttribute(new Float32Array(MAIN), 1));
    const sparks = new THREE.Points(sp, new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, toneMapped: false,
      vertexShader: `attribute float aPow; varying float vP; void main(){ vP = aPow; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = 110.0 / -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `varying float vP; void main(){ float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(vec3(0.9, 1.0, 1.6) * (exp(-d * d * 60.0) * 1.4 + exp(-d * d * 12.0) * 0.25) * vP, 1.0); }`,
    }));
    sparks.frustumCulled = false;
    scene.add(sparks);

    // Pedestal.
    scene.add(new THREE.HemisphereLight(palette.ice, palette.ink, 0.3));
    const orbLight = new THREE.PointLight(0xa8b8ff, 6, 6, 1.5);
    orbLight.position.copy(C);
    scene.add(orbLight);
    const ped = new THREE.Mesh(
      new THREE.LatheGeometry([[0, -1.9], [1.05, -1.9], [1.1, -1.82], [0.9, -1.45], [0.62, -1.2], [0.55, -0.98], [0, -0.98]].map(([x, y]) => new THREE.Vector2(x, y)), 72),
      new THREE.MeshStandardMaterial({ color: 0x070d1d, metalness: 0.85, roughness: 0.28 })
    );
    scene.add(ped);
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.012, 8, 96), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.8, 1.0, 2.0), toneMapped: false }));
    collar.rotation.x = Math.PI / 2;
    collar.position.y = -0.985;
    scene.add(collar);

    // Tiny smooth 1D value noise.
    const hash = (n) => { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); };
    const vn = (x) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return (hash(i) * (1 - u) + hash(i + 1) * u) * 2 - 1; };

    const seeds = Array.from({ length: NB }, () => ({ a: R() * 100, b: R() * 100, c: R() * 100 }));
    const dirs = Array.from({ length: MAIN }, () => new THREE.Vector3());
    const ray = new THREE.Raycaster(), sphere = new THREE.Sphere(C, RAD * 0.97), hit = new THREE.Vector3();
    const tmp = new THREE.Vector3(), u = new THREE.Vector3(), w = new THREE.Vector3(), p = new THREE.Vector3(), start = new THREE.Vector3(), end = new THREE.Vector3();
    const pts = Array.from({ length: S }, () => new THREE.Vector3());
    const pointerDir = new THREE.Vector3(0, 0, 1);

    function writeBolt(b, from, to, amp, t, pw) {
      const sd = seeds[b];
      const len = from.distanceTo(to);
      tmp.subVectors(to, from).normalize();
      u.set(0, 1, 0).cross(tmp); if (u.lengthSq() < 1e-4) u.set(1, 0, 0);
      u.normalize(); w.crossVectors(tmp, u);
      const tq = Math.floor(t * 16);
      for (let i = 0; i < S; i++) {
        const s = i / (S - 1);
        const env = Math.pow(Math.sin(Math.PI * s), 0.8) * len;
        const o1 = vn(s * 3 + sd.a + t * 0.8) * 0.16 + vn(s * 11 + sd.b + tq * 0.37) * 0.06 + vn(s * 29 + tq * 1.3 + sd.c) * 0.022;
        const o2 = vn(s * 3 + sd.b + t * 0.7) * 0.16 + vn(s * 11 + sd.c + tq * 0.41) * 0.06 + vn(s * 31 + tq * 1.7 + sd.a) * 0.022;
        pts[i].lerpVectors(from, to, s).addScaledVector(u, o1 * env * amp).addScaledVector(w, o2 * env * amp);
      }
      for (let i = 0; i < S; i++) {
        const n = pts[Math.min(i + 1, S - 1)], c = pts[i];
        const nx = i === S - 1 ? tmp.copy(c).multiplyScalar(2).sub(pts[i - 1]) : n;
        for (let k = 0; k < 2; k++) {
          const v = (b * S + i) * 2 + k;
          pos[v * 3] = c.x; pos[v * 3 + 1] = c.y; pos[v * 3 + 2] = c.z;
          nxt[v * 3] = nx.x; nxt[v * 3 + 1] = nx.y; nxt[v * 3 + 2] = nx.z;
          power[v] = pw;
        }
      }
    }

    const sPos = sp.attributes.position.array, sPow = sp.attributes.aPow.array;
    return (t) => {
      uniforms.uTime.value = t;
      // Pointer tendril target on the glass.
      ray.setFromCamera(pointer, camera);
      if (ray.ray.intersectSphere(sphere, hit)) pointerDir.copy(hit).sub(C).normalize();
      else pointerDir.set(pointer.x * 1.5, pointer.y * 1.5, 0.35).normalize();

      for (let b = 0; b < MAIN; b++) {
        const sd = seeds[b];
        const d = dirs[b];
        if (b === 0) d.lerp(pointerDir, 0.25).normalize();
        else d.set(vn(t * 0.13 + sd.a), vn(t * 0.11 + sd.b) * 0.8 + 0.1, vn(t * 0.12 + sd.c)).normalize();
        start.copy(C).addScaledVector(d, 0.18);
        end.copy(C).addScaledVector(d, RAD * 0.97);
        const flick = b === 0 ? 1.5 : 0.75 + 0.35 * Math.max(0, vn(t * 3 + sd.a));
        writeBolt(b, start, end, 1, t, flick);
        sPos[b * 3] = end.x; sPos[b * 3 + 1] = end.y; sPos[b * 3 + 2] = end.z; sPow[b] = flick;
        // A short fork splitting from the mid-section.
        const f = MAIN + b;
        const s0 = 0.35 + 0.2 * (vn(sd.c + Math.floor(t * 4)) * 0.5 + 0.5);
        p.copy(pts[Math.floor(s0 * (S - 1))]);
        end.copy(d).add(tmp.set(vn(sd.a + t * 0.5), vn(sd.b + t * 0.5), vn(sd.c + t * 0.5)).multiplyScalar(0.7)).normalize();
        end.multiplyScalar(RAD * (0.55 + 0.3 * s0)).add(C);
        writeBolt(f, p, end, 0.8, t + 3.1, flick * 0.45);
      }
      bg.attributes.position.needsUpdate = bg.attributes.aNext.needsUpdate = bg.attributes.aPow.needsUpdate = true;
      sp.attributes.position.needsUpdate = sp.attributes.aPow.needsUpdate = true;
      orbLight.intensity = 5 + Math.sin(t * 23) * 0.8 + Math.sin(t * 7.1) * 0.8;
    };
  },
};
