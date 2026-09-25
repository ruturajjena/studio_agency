// 10 — Deep Jellyfish: a bioluminescent bell pulsing through the midnight zone, trailing light.
export default {
  id: "10",
  name: "Deep Jellyfish",
  blurb: "A bioluminescent jellyfish pulses through the deep, trailing threads of light. It slowly swims toward your cursor.",
  theme: "neon",
  camera: { fov: 40, position: [0, 0, 10], target: [0, -0.3, 0] },
  bloom: { strength: 0.7, radius: 0.55, threshold: 0.75 },
  exposure: 1.0,

  setup({ THREE, scene, renderer, sky, pointer, palette, glsl, rand, onResize }) {
    sky({ top: "#0b2250", mid: "#061634", horizon: "#030b1f", below: "#01040c", haze: 0.0 });

    const jelly = new THREE.Group();
    jelly.position.set(0, 0.9, 0);
    scene.add(jelly);

    const uniforms = { uTime: { value: 0 }, uPulse: { value: 0 }, uVel: { value: new THREE.Vector3() }, uScale: { value: 600 } };
    const PULSE = `
      float bellR(float y, float pulse){ return 1.0 - pulse * 0.24 * smoothstep(0.9, 0.0, y); }`;

    // Bell: a hemisphere squeezed by the pulse, shaded as a glowing translucent membrane.
    const bellMat = (tint, rimCol, strength) =>
      new THREE.ShaderMaterial({
        uniforms: { ...uniforms, uTint: { value: new THREE.Color(tint) }, uRim: { value: new THREE.Color(rimCol) }, uStr: { value: strength } },
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
        vertexShader: /* glsl */ `
          uniform float uTime, uPulse; varying vec3 vN; varying vec3 vV; varying vec3 vP;
          ${glsl.noise} ${PULSE}
          void main(){
            vec3 p = position;
            float yn = position.y / 1.25;
            float k = bellR(yn, uPulse);
            p.xz *= k;
            p.y = p.y * (0.72 + uPulse * 0.18);
            float az = atan(p.z, p.x);
            p.y -= pow(max(1.0 - yn, 0.0), 6.0) * 0.07 * (0.5 + 0.5 * sin(az * 16.0));   // scalloped margin
            p += normal * snoise(position * 2.2 + uTime * 0.4) * 0.035;
            vP = position / 1.25;
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz);
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uTint, uRim; uniform float uStr, uTime, uPulse; varying vec3 vN; varying vec3 vV; varying vec3 vP;
          void main(){
            float fr = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.2);
            float az = atan(vP.z, vP.x);
            float canals = pow(abs(sin(az * 8.0)), 40.0) * smoothstep(0.95, 0.2, vP.y);
            float margin = smoothstep(0.18, 0.0, vP.y);
            float crown = smoothstep(0.7, 1.0, vP.y) * 0.4;
            float spark = pow(0.5 + 0.5 * sin(az * 32.0 + uTime * 2.0), 24.0) * margin;
            vec3 col = uTint * (fr * 1.3 + crown * 0.6 + 0.04) + uRim * (margin * 0.9 + canals * 0.7 + spark * 1.8);
            gl_FragColor = vec4(col * uStr * (0.85 + uPulse * 0.4), 1.0);
          }`,
      });
    const bellGeo = new THREE.SphereGeometry(1.25, 96, 48, 0, Math.PI * 2, 0, Math.PI * 0.52);
    const bell = new THREE.Mesh(bellGeo, bellMat(palette.ice, palette.cyan, 0.42));
    jelly.add(bell);
    const innerBell = new THREE.Mesh(bellGeo, bellMat(palette.violet, palette.ice, 0.3));
    innerBell.scale.set(0.62, 0.7, 0.62);
    innerBell.position.y = -0.05;
    jelly.add(innerBell);

    // Gonads: four soft arcs glowing inside the bell.
    for (let i = 0; i < 4; i++) {
      const arc = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.035, 8, 48, Math.PI * 1.3), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.9, 0.7, 2.2), transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
      arc.rotation.set(Math.PI / 2, 0, (i / 4) * Math.PI * 2);
      arc.position.set(Math.cos((i / 4) * Math.PI * 2) * 0.22, 0.45, Math.sin((i / 4) * Math.PI * 2) * 0.22);
      jelly.add(arc);
    }

    // Tentacles and oral arms: camera-facing strips animated entirely in the vertex shader.
    const R = rand(10);
    const SEG = 64;
    const strands = [];
    for (let i = 0; i < 30; i++) strands.push({ ang: (i / 30) * Math.PI * 2 + R() * 0.1, rad: 1.18, len: 2.8 + R() * 1.8, w: 0.012 + R() * 0.008, ph: R() * 6.28, arm: 0 });
    for (let i = 0; i < 5; i++) strands.push({ ang: (i / 5) * Math.PI * 2, rad: 0.12, len: 1.6 + R() * 0.5, w: 0.07, ph: R() * 6.28, arm: 1 });
    const vc = strands.length * (SEG + 1) * 2;
    const aS = new Float32Array(vc * 2), aT = new Float32Array(vc * 4), idx = [];
    let v = 0;
    strands.forEach((st) => {
      for (let j = 0; j <= SEG; j++)
        for (const side of [-1, 1]) {
          aS.set([j / SEG, side], v * 2);
          aT.set([st.ang, st.rad + st.arm * 10, st.len, Math.floor(st.ph * 10) + st.w], v * 4);
          v++;
        }
      const b = v - (SEG + 1) * 2;
      for (let j = 0; j < SEG; j++) {
        const a = b + j * 2;
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    });
    const tg = new THREE.BufferGeometry();
    tg.setAttribute("position", new THREE.BufferAttribute(new Float32Array(vc * 3), 3));
    tg.setAttribute("aS", new THREE.BufferAttribute(aS, 2));
    tg.setAttribute("aT", new THREE.BufferAttribute(aT, 4));
    tg.setIndex(idx);
    const tentacles = new THREE.Mesh(
      tg,
      new THREE.ShaderMaterial({
        uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
        vertexShader: /* glsl */ `
          uniform float uTime, uPulse; uniform vec3 uVel;
          attribute vec2 aS; attribute vec4 aT;
          varying float vS; varying float vX; varying float vArm;
          ${PULSE}
          vec3 strand(float s){
            float arm = step(5.0, aT.y);
            float rad = aT.y - arm * 10.0;
            float ph = floor(aT.w) * 0.1;                   // phase in the integer part, width in the fraction
            float r = arm > 0.5 ? rad : rad * bellR(0.0, uPulse);
            vec3 base = vec3(cos(aT.x) * r, arm > 0.5 ? 0.0 : -0.05, sin(aT.x) * r);
            float L = aT.z * s;
            vec3 p = base + vec3(0.0, -L, 0.0);
            float amp = (arm > 0.5 ? 0.28 : 0.22) * s;
            p.x += sin(s * 5.0 - uTime * 1.6 + ph) * amp + cos(aT.x) * s * (0.35 - uPulse * 0.3) * (1.0 - arm);
            p.z += cos(s * 4.3 - uTime * 1.3 + ph * 1.3) * amp + sin(aT.x) * s * (0.35 - uPulse * 0.3) * (1.0 - arm);
            p -= uVel * s * s * aT.z * 0.9;                 // trail behind the swim
            return p;
          }
          void main(){
            float s = aS.x;
            vec4 p0 = modelViewMatrix * vec4(strand(s), 1.0);
            vec4 p1 = modelViewMatrix * vec4(strand(s + 0.01), 1.0);
            vec2 d = normalize(p1.xy - p0.xy + 1e-5);
            float w = fract(aT.w) * (1.0 - s * 0.85);
            vArm = step(5.0, aT.y);
            if (vArm > 0.5) w *= 1.0 + 0.6 * sin(s * 30.0 - uTime * 2.0);   // frilly oral arms
            p0.xy += vec2(-d.y, d.x) * aS.y * w;
            vS = s; vX = aS.y;
            gl_Position = projectionMatrix * p0;
          }`,
        fragmentShader: /* glsl */ `
          uniform float uTime; varying float vS; varying float vX; varying float vArm;
          void main(){
            float across = exp(-vX * vX * 2.5);
            float fade = pow(1.0 - vS, 1.4);
            float beads = pow(0.5 + 0.5 * sin(vS * 70.0 - uTime * 3.0), 16.0) * (1.0 - vArm);
            vec3 c = mix(vec3(0.55, 0.85, 1.4), vec3(0.75, 0.6, 1.6), vArm);
            gl_FragColor = vec4(c * across * fade * (0.55 + beads * 1.6) * (vArm > 0.5 ? 0.6 : 1.0), 1.0);
          }`,
      })
    );
    tentacles.frustumCulled = false;
    jelly.add(tentacles);

    // Marine snow drifting through the water column.
    const n = 1200, sp = new Float32Array(n * 3), sd = new Float32Array(n);
    for (let i = 0; i < n; i++) { sp.set([(R() - 0.5) * 22, (R() - 0.5) * 14, (R() - 0.5) * 10 - 2], i * 3); sd[i] = R(); }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute("position", new THREE.BufferAttribute(sp, 3));
    sg.setAttribute("aSeed", new THREE.BufferAttribute(sd, 1));
    const snow = new THREE.Points(sg, new THREE.ShaderMaterial({
      uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `uniform float uTime, uScale; attribute float aSeed; varying float vA;
        void main(){ vec3 p = position; p.y = mod(p.y - uTime * (0.08 + aSeed * 0.1) + 7.0, 14.0) - 7.0; p.x += sin(uTime * 0.3 + aSeed * 20.0) * 0.2;
          vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
          gl_PointSize = uScale * (0.01 + aSeed * 0.012) / -mv.z; vA = 0.25 + aSeed * 0.5; }`,
      fragmentShader: `varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(vec3(0.55, 0.7, 1.0) * smoothstep(0.5, 0.0, d) * vA, 1.0); }`,
    }));
    scene.add(snow);

    // Faint light shafts from the surface far above.
    const shaftMat = new THREE.ShaderMaterial({
      uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform float uTime; varying vec2 vUv;
        void main(){ float x = abs(vUv.x - 0.5) * 2.0; float a = (1.0 - x * x) * pow(vUv.y, 2.0) * (0.7 + 0.3 * sin(uTime * 0.4 + vUv.y * 3.0));
          gl_FragColor = vec4(vec3(0.12, 0.22, 0.45) * a * 0.5, 1.0); }`,
    });
    [[-4, 0.25], [1.5, -0.15], [5, 0.2]].forEach(([x, rz]) => {
      const s = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 18), shaftMat);
      s.position.set(x, 3, -6);
      s.rotation.z = rz;
      scene.add(s);
    });

    onResize((s) => (uniforms.uScale.value = s.height * renderer.getPixelRatio()));

    const goal = new THREE.Vector3(), prev = new THREE.Vector3().copy(jelly.position), vel = new THREE.Vector3(), velS = new THREE.Vector3(), q = new THREE.Quaternion();
    return (t, dt) => {
      uniforms.uTime.value = t;
      const ph = (t * 0.42) % 1;
      const pulse = Math.min(ph / 0.22, 1) * (1 - THREE.MathUtils.smoothstep(ph, 0.22, 1.0));
      uniforms.uPulse.value = Math.sin(pulse * Math.PI * 0.5);
      // Swim toward the cursor, surging on each contraction.
      goal.set(pointer.x * 3.2, pointer.y * 1.6 + 0.7, 0);
      const surge = 0.25 + pulse * 1.4;
      jelly.position.lerp(goal, Math.min(1, dt * 0.45 * surge));
      jelly.position.y += Math.sin(t * 0.6) * 0.002;
      if (dt > 0) vel.copy(jelly.position).sub(prev).divideScalar(dt).clampLength(0, 1.2);
      prev.copy(jelly.position);
      velS.lerp(vel, 0.05);
      jelly.rotation.set(0.18 + velS.y * 0.1, t * 0.1, -velS.x * 0.35, "ZXY");
      uniforms.uVel.value.copy(velS).applyQuaternion(q.copy(jelly.quaternion).invert());
    };
  },
};
