// 39 — Ringed World: a banded gas giant with particle rings, orbiting moons and a cinematic rim light.
export default {
  id: "39",
  name: "Ringed World",
  blurb: "A banded giant wrapped in thin particle rings, moons in slow orbit. Move to orbit the camera around it.",
  theme: "gold",
  camera: { fov: 36, position: [0, 2, 11], target: [0, 0.35, 0] },
  bloom: { strength: 0.75, radius: 0.6, threshold: 0.78 },
  exposure: 1.05,

  setup({ THREE, scene, camera, pointer, rand, glsl, target }) {
    const r = rand(39);
    const C = new THREE.Vector3(0, 0.55, 0), R = 1.45;
    const SUN = new THREE.Vector3(0.85, 0.28, -0.6).normalize();
    const TILT = new THREE.Euler(0.1, 0, 0.3);
    const ringN = new THREE.Vector3(0, 1, 0).applyEuler(TILT);
    const RIN = 1.95, ROUT = 3.6;
    const shared = {
      uSun: { value: SUN }, uC: { value: C }, uN: { value: ringN }, uTime: { value: 0 },
    };
    // Radial ring density with a few Cassini-like gaps.
    const ringDensity = /* glsl */ `
      float ringD(float rr){
        float x = (rr - ${RIN.toFixed(2)}) / ${(ROUT - RIN).toFixed(2)};
        if (x < 0.0 || x > 1.0) return 0.0;
        float d = 0.55 + 0.45 * sin(x * 60.0) * sin(x * 23.0 + 1.0);
        d *= smoothstep(0.0, 0.08, x) * smoothstep(1.0, 0.85, x);
        d *= 1.0 - 0.9 * exp(-pow((x - 0.62) * 40.0, 2.0));
        d *= 1.0 - 0.7 * exp(-pow((x - 0.3) * 60.0, 2.0));
        return clamp(d, 0.0, 1.0);
      }`;

    // Planet.
    const planet = new THREE.Mesh(new THREE.SphereGeometry(R, 128, 64), new THREE.ShaderMaterial({
      uniforms: shared,
      vertexShader: `varying vec3 vN; varying vec3 vW; varying vec3 vO;
        void main(){ vO = position; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `
        uniform vec3 uSun, uC, uN; uniform float uTime; varying vec3 vN; varying vec3 vW; varying vec3 vO;
        ${glsl.noise}
        ${ringDensity}
        void main(){
          vec3 N = normalize(vN), V = normalize(cameraPosition - vW);
          float lat = vO.y / ${R.toFixed(2)};
          float warp = snoise(vec3(vO.x * 1.2 + uTime * 0.03, lat * 6.0, vO.z * 1.2)) * 0.18 + snoise(vO * 4.0 + uTime * 0.02) * 0.05;
          float b = lat * 7.0 + warp * 4.0;
          float bands = 0.5 + 0.5 * sin(b * 3.1) * 0.7 + 0.3 * sin(b * 7.3);
          vec3 c1 = vec3(0.03, 0.07, 0.2), c2 = vec3(0.16, 0.28, 0.6), c3 = vec3(0.55, 0.68, 0.95);
          vec3 alb = mix(c1, c2, smoothstep(0.2, 0.7, bands));
          alb = mix(alb, c3, smoothstep(0.75, 1.0, bands) * 0.6);
          float ndl = dot(N, uSun);
          float diff = smoothstep(-0.12, 0.6, ndl);
          // Ring shadow on the planet.
          float dn = dot(uSun, uN); float sh = 1.0;
          if (abs(dn) > 1e-3) { float tt = -dot(vW - uC, uN) / dn; if (tt > 0.0) sh = 1.0 - 0.75 * ringD(length(vW + uSun * tt - uC)); }
          vec3 col = alb * diff * sh * 1.6;
          float fr = pow(1.0 - max(dot(N, V), 0.0), 3.0);
          col += vec3(0.35, 0.6, 1.4) * fr * smoothstep(-0.35, 0.4, ndl) * 1.4;
          col += alb * 0.006;
          gl_FragColor = vec4(col, 1.0);
        }`,
    }));
    planet.position.copy(C);
    scene.add(planet);

    // Atmosphere halo.
    const atmo = new THREE.Mesh(new THREE.SphereGeometry(R * 1.08, 64, 32), new THREE.ShaderMaterial({
      uniforms: shared, transparent: true, depthWrite: false, side: THREE.BackSide, blending: THREE.AdditiveBlending,
      vertexShader: `varying vec3 vN; varying vec3 vW; void main(){ vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `uniform vec3 uSun; varying vec3 vN; varying vec3 vW;
        void main(){ vec3 V = normalize(cameraPosition - vW); float f = pow(max(dot(-normalize(vN), V), 0.0), 1.5);
          float lit = smoothstep(-0.5, 0.6, dot(-normalize(vN), -uSun) * -1.0);
          float edge = smoothstep(0.0, 0.35, f) * (1.0 - smoothstep(0.35, 0.95, f));
          gl_FragColor = vec4(vec3(0.3, 0.55, 1.3) * edge * (0.15 + lit) * 0.8, 1.0); }`,
    }));
    atmo.position.copy(C);
    scene.add(atmo);

    const ring = new THREE.Group();
    ring.position.copy(C);
    ring.rotation.copy(TILT);
    scene.add(ring);

    // Dust sheet under the particles.
    const sheet = new THREE.Mesh(new THREE.RingGeometry(RIN, ROUT, 256, 1), new THREE.ShaderMaterial({
      uniforms: shared, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
      vertexShader: `varying vec3 vW; varying float vR; void main(){ vR = length(position.xy); vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `uniform vec3 uSun, uC; varying vec3 vW; varying float vR;
        ${ringDensity}
        void main(){
          vec3 P = vW - uC; float along = dot(-P, uSun); float perp = length(cross(P, uSun));
          float shadow = (along > 0.0 && perp < ${R.toFixed(2)}) ? 0.1 : 1.0;
          float d = ringD(vR);
          gl_FragColor = vec4(vec3(0.25, 0.38, 0.75) * d * 0.28 * shadow, 1.0);
        }`,
    }));
    sheet.rotation.x = -Math.PI / 2;
    ring.add(sheet);

    // Particle rings.
    const NP = 26000, pp = new Float32Array(NP * 3), ps = new Float32Array(NP);
    for (let i = 0, k = 0; k < NP && i < NP * 20; i++) {
      const rr = RIN + r() * (ROUT - RIN), x = (rr - RIN) / (ROUT - RIN);
      let d = (0.55 + 0.45 * Math.sin(x * 60) * Math.sin(x * 23 + 1)) * Math.min(x / 0.08, 1) * Math.min((1 - x) / 0.15, 1);
      d *= (1 - 0.9 * Math.exp(-(((x - 0.62) * 40) ** 2))) * (1 - 0.7 * Math.exp(-(((x - 0.3) * 60) ** 2)));
      if (r() > d) continue;
      const a = r() * Math.PI * 2;
      pp.set([Math.cos(a) * rr, (r() - 0.5) * 0.03, Math.sin(a) * rr], k * 3);
      ps[k++] = r();
    }
    const pg = new THREE.BufferGeometry();
    pg.setAttribute("position", new THREE.BufferAttribute(pp, 3));
    pg.setAttribute("aS", new THREE.BufferAttribute(ps, 1));
    const ringU = { ...shared, uPx: { value: 1 } };
    const parts = new THREE.Points(pg, new THREE.ShaderMaterial({
      uniforms: ringU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `
        uniform vec3 uSun, uC; uniform float uTime, uPx; attribute float aS; varying float vB;
        void main(){
          float rr = length(position.xz);
          float ang = uTime * 0.9 / pow(rr, 1.5);
          vec3 p = vec3(position.x * cos(ang) - position.z * sin(ang), position.y, position.x * sin(ang) + position.z * cos(ang));
          vec4 w = modelMatrix * vec4(p, 1.0);
          vec3 P = w.xyz - uC; float along = dot(-P, uSun); float perp = length(cross(P, uSun));
          float shadow = (along > 0.0 && perp < ${R.toFixed(2)}) ? 0.08 : 1.0;
          vec3 V = normalize(cameraPosition - w.xyz);
          float fwd = pow(max(dot(-V, uSun), 0.0), 4.0);
          vB = shadow * (0.35 + aS * 0.65) * (0.55 + fwd * 1.5);
          vec4 mv = viewMatrix * w;
          gl_PointSize = (0.9 + aS * 1.6) * uPx * (11.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `varying float vB; void main(){ float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(vec3(0.75, 0.85, 1.25) * vB * smoothstep(0.5, 0.1, d), 1.0); }`,
    }));
    parts.frustumCulled = false;
    ring.add(parts);

    // Moons, lit by the same sun.
    const sun = new THREE.DirectionalLight(0xe6eeff, 3.0);
    sun.position.copy(SUN).multiplyScalar(20);
    scene.add(sun, new THREE.AmbientLight(0x1b2a55, 0.25));
    const moons = [[0.2, 5.0, 0.22, 0.5], [0.13, 6.2, 0.14, -0.25], [0.09, 4.4, 0.34, 0.9]].map(([size, orbit, speed, incl]) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(size, 48, 24), new THREE.MeshStandardMaterial({ color: 0x9aa8c8, roughness: 0.9 }));
      scene.add(m);
      return { m, orbit, speed, incl, phase: r() * 6.28 };
    });

    // Stars.
    const S = 2200, sp = new Float32Array(S * 3), v = new THREE.Vector3();
    for (let i = 0; i < S; i++) { v.set(r() - 0.5, r() - 0.5, r() - 0.5).normalize().multiplyScalar(80 + r() * 60); sp.set([v.x, v.y, v.z], i * 3); }
    scene.add(new THREE.Points(new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(sp, 3)),
      new THREE.PointsMaterial({ color: 0x9fb3e0, size: 0.35, transparent: true, opacity: 0.7, depthWrite: false })));

    const DIST = 11.2;
    return (t) => {
      shared.uTime.value = t;
      ringU.uPx.value = Math.min(window.devicePixelRatio, 1.75);
      const az = -0.25 + pointer.x * 0.75 + Math.sin(t * 0.07) * 0.12;
      const el = 0.16 + pointer.y * 0.2;
      camera.position.set(C.x + Math.sin(az) * Math.cos(el) * DIST, C.y + Math.sin(el) * DIST, C.z + Math.cos(az) * Math.cos(el) * DIST);
      camera.lookAt(target);
      planet.rotation.y = t * 0.05;
      for (const o of moons) {
        const a = o.phase + t * o.speed;
        o.m.position.set(C.x + Math.cos(a) * o.orbit, C.y + Math.sin(a) * o.orbit * Math.sin(o.incl) * 0.4, C.z + Math.sin(a) * o.orbit * Math.cos(o.incl));
      }
    };
  },
};
