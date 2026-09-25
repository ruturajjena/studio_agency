// 42 — Fiber Bloom: a fountain of fibre-optic strands swaying from a dark base, each tip a point of light.
export default {
  id: "42",
  name: "Fiber Bloom",
  blurb: "Thousands of fibre-optic strands with glowing tips. Your cursor blows through them like wind.",
  camera: { fov: 38, position: [0, 0.9, 8.6], target: [0, 0.05, 0] },
  bloom: { strength: 0.9, radius: 0.5, threshold: 0.75 },
  exposure: 1.0,

  setup({ THREE, scene, pointer, glsl, palette, rand }) {
    const R = rand(42);
    const STRANDS = 3200, SEG = 14;
    const ORIGIN = new THREE.Vector3(0, -0.95, 0);

    // Per-strand seed: azimuth, tilt, length, phase. Per-vertex: s along strand.
    const segVerts = SEG * 2;
    const seedArr = new Float32Array(STRANDS * segVerts * 4);
    const sArr = new Float32Array(STRANDS * segVerts);
    const tipSeed = new Float32Array(STRANDS * 4);
    const tipTint = new Float32Array(STRANDS * 3);
    const glow = new THREE.Color(palette.glow), cyan = new THREE.Color(palette.cyan), violet = new THREE.Color(palette.violet), ice = new THREE.Color(palette.ice);
    for (let i = 0; i < STRANDS; i++) {
      const u = R();
      const seed = [R() * Math.PI * 2, Math.pow(u, 0.8) * 0.95, 2.4 + R() * 1.2 - u * 0.3, R() * 100];
      for (let k = 0; k < segVerts; k++) {
        const v = i * segVerts + k;
        seedArr.set(seed, v * 4);
        const seg = k >> 1;
        sArr[v] = (seg + (k & 1)) / SEG;
      }
      tipSeed.set(seed, i * 4);
      const r = R();
      const c = r < 0.06 ? cyan : r < 0.1 ? violet : r < 0.45 ? ice : glow;
      tipTint.set([c.r, c.g, c.b], i * 3);
    }

    const uniforms = {
      uTime: { value: 0 },
      uWind: { value: new THREE.Vector2() },
      uOrigin: { value: ORIGIN },
      uBase: { value: new THREE.Color(palette.navy) },
      uTip: { value: new THREE.Color(palette.ice) },
    };

    const fiberChunk = /* glsl */ `
      uniform float uTime; uniform vec2 uWind; uniform vec3 uOrigin;
      attribute vec4 aSeed;
      ${glsl.noise}
      vec3 fiber(float s){
        float th = aSeed.x + uTime * 0.05, tilt = aSeed.y, L = aSeed.z, ph = aSeed.w;
        vec3 dir = vec3(sin(tilt) * cos(th), cos(tilt), sin(tilt) * sin(th));
        vec3 p = dir * s * L;
        p.y -= (0.35 + sin(tilt) * 1.25) * s * s * L * 0.42;   // gravity droop, stronger for outer strands
        vec2 h = dir.xz;
        float gust = snoise(vec3(h * 1.4 + uWind * 0.6, uTime * 0.35));
        float sway = sin(uTime * 1.1 + ph + s * 2.2) * 0.12 + gust * 0.28;
        vec3 wind = vec3(uWind.x * 1.9 + sway * cos(ph), 0.0, -uWind.y * 0.9 + sway * sin(ph));
        wind.x += snoise(vec3(h * 3.0, uTime * 0.6 + ph)) * 0.07;
        float bend = s * s * L * 0.55;
        p += wind * bend;
        p.y -= length(wind.xz) * bend * 0.35 - uWind.y * bend * 0.25;
        return uOrigin + p;
      }
    `;

    // Strands: additive lines, dark at the base, bright towards the tip.
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(STRANDS * segVerts * 3), 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seedArr, 4));
    g.setAttribute("aS", new THREE.BufferAttribute(sArr, 1));
    const lineMat = new THREE.ShaderMaterial({
      uniforms,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
      vertexShader: `${fiberChunk}
        attribute float aS; uniform vec3 uBase, uTip; varying vec3 vCol;
        void main(){
          vec3 p = fiber(aS);
          float k = pow(aS, 2.4);
          vCol = mix(uBase * 0.5, uTip, k) * (0.08 + 0.92 * k);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }`,
      fragmentShader: `varying vec3 vCol; void main(){ gl_FragColor = vec4(vCol * 0.16, 1.0); }`,
    });
    const lines = new THREE.LineSegments(g, lineMat);
    lines.frustumCulled = false;
    scene.add(lines);

    // Tips: soft glowing sprites at s = 1.
    const tg = new THREE.BufferGeometry();
    tg.setAttribute("position", new THREE.BufferAttribute(new Float32Array(STRANDS * 3), 3));
    tg.setAttribute("aSeed", new THREE.BufferAttribute(tipSeed, 4));
    tg.setAttribute("aTint", new THREE.BufferAttribute(tipTint, 3));
    const tipMat = new THREE.ShaderMaterial({
      uniforms,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
      vertexShader: `${fiberChunk}
        attribute vec3 aTint; varying vec3 vCol;
        void main(){
          vec4 mv = modelViewMatrix * vec4(fiber(1.0), 1.0);
          float tw = 0.75 + 0.25 * sin(uTime * 2.0 + aSeed.w * 7.0);
          vCol = aTint * tw;
          gl_PointSize = (3.0 + fract(aSeed.w) * 4.0) * (8.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `varying vec3 vCol;
        void main(){ float d = length(gl_PointCoord - 0.5); float a = exp(-d * d * 22.0);
          gl_FragColor = vec4(vCol * a * 1.4, 1.0); }`,
    });
    const tips = new THREE.Points(tg, tipMat);
    tips.frustumCulled = false;
    scene.add(tips);

    // Base: glossy dark vase with a luminous collar.
    scene.add(new THREE.HemisphereLight(palette.ice, palette.ink, 0.4));
    const key = new THREE.PointLight(0xbfd4ff, 6, 8, 2);
    key.position.set(0, 0.2, 1.2);
    scene.add(key);
    const vase = new THREE.Mesh(
      new THREE.LatheGeometry([[0, -1.9], [0.62, -1.9], [0.7, -1.7], [0.55, -1.3], [0.28, -1.02], [0.22, -0.95], [0, -0.95]].map(([x, y]) => new THREE.Vector2(x, y)), 64),
      new THREE.MeshStandardMaterial({ color: palette.night, metalness: 0.7, roughness: 0.25 })
    );
    scene.add(vase);
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.018, 12, 64), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 2.0, 3.0), toneMapped: false }));
    collar.rotation.x = Math.PI / 2;
    collar.position.y = -0.96;
    scene.add(collar);

    // Floor: soft pool of light under the bloom.
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.ShaderMaterial({
        transparent: true, depthWrite: false,
        uniforms: { uCol: { value: new THREE.Color(palette.blue) }, uTime: uniforms.uTime },
        vertexShader: `varying vec2 vUv; void main(){ vUv = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `uniform vec3 uCol; varying vec2 vUv;
          void main(){ float r = length(vUv); float a = exp(-r * r * 0.08) * 0.18 + exp(-r * r * 1.2) * 0.25;
            gl_FragColor = vec4(uCol * a, a); }`,
      })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.9;
    scene.add(floor);

    // Faint dust in the air.
    const DUST = 400, dp = new Float32Array(DUST * 3);
    for (let i = 0; i < DUST; i++) dp.set([(R() - 0.5) * 14, R() * 7 - 2, (R() - 0.5) * 8 - 2], i * 3);
    const dg = new THREE.BufferGeometry();
    dg.setAttribute("position", new THREE.BufferAttribute(dp, 3));
    const dust = new THREE.Points(dg, new THREE.PointsMaterial({ color: palette.horizon, size: 0.025, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending }));
    scene.add(dust);

    const wind = new THREE.Vector2();
    return (t, dt) => {
      uniforms.uTime.value = t;
      wind.lerp(pointer, Math.min(1, dt * 3));
      uniforms.uWind.value.copy(wind);
      dust.rotation.y = t * 0.02;
      dust.position.y = Math.sin(t * 0.2) * 0.1;
    };
  },
};
