// 21 — Double Helix: a luminous DNA strand turning in the dark while streams of data spiral up its core.
export default {
  id: "21",
  name: "Double Helix",
  blurb: "A glowing DNA double helix, turning slowly as data streams up its spine. Your cursor winds and tilts it.",
  theme: "emerald",
  camera: { fov: 36, position: [0, 0.6, 12.5], target: [0, 0.7, 0] },
  bloom: { strength: 0.95, radius: 0.55, threshold: 0.7 },
  exposure: 1.0,

  setup({ THREE, scene, pointer, rand, sky }) {
    sky({ top: "#02050d", mid: "#07112a", horizon: "#15285a", haze: 0.15 });
    const rnd = rand(21);
    const group = new THREE.Group();
    group.position.y = 0.9;
    group.rotation.z = -0.2;
    scene.add(group);

    const R = 25, H = 6.2, dy = H / (R - 1), RAD = 1.15, SUB = 3;
    const uniforms = { uTwist: { value: 0.33 }, uSpin: { value: 0 }, uTime: { value: 0 } };

    // Shared lit shader for instanced beads/rungs: instance colour, soft lambert, rim glow, depth fade.
    const litMat = new THREE.ShaderMaterial({
      vertexShader: `varying vec3 vN, vCol, vV; varying float vFade;
        void main(){
          vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0);
          vN = normalize(mat3(modelMatrix * instanceMatrix) * normal);
          vCol = instanceColor;
          vV = normalize(cameraPosition - wp.xyz);
          vFade = (0.5 + 0.5 * smoothstep(-1.4, 1.4, wp.z)) * smoothstep(${(H / 2 + 0.2).toFixed(2)}, ${(H / 2 - 1.6).toFixed(2)}, abs(wp.y - 0.9));
          gl_Position = projectionMatrix * viewMatrix * wp;
        }`,
      fragmentShader: `varying vec3 vN, vCol, vV; varying float vFade;
        void main(){
          vec3 n = normalize(vN);
          float l = max(dot(n, normalize(vec3(0.4, 0.8, 0.6))), 0.0);
          float rim = pow(1.0 - max(dot(n, vV), 0.0), 2.0);
          gl_FragColor = vec4(vCol * (0.22 + 0.5 * l + 0.75 * rim) * vFade, 1.0);
        }`,
    });

    const beadGeo = new THREE.SphereGeometry(1, 18, 12);
    const nodes = new THREE.InstancedMesh(beadGeo, litMat, R * 2);
    const beads = new THREE.InstancedMesh(beadGeo, litMat, (R - 1) * SUB * 2);
    const rungs = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 10), litMat, R * 2);
    [nodes, beads, rungs].forEach((m) => { m.frustumCulled = false; group.add(m); });

    const cA = new THREE.Color(1.1, 1.35, 2.0), cB = new THREE.Color(0.5, 0.78, 2.0);
    const pairs = [
      [new THREE.Color(0.9, 1.1, 1.8), new THREE.Color(0.35, 0.55, 1.5)],
      [new THREE.Color(0.35, 0.55, 1.5), new THREE.Color(0.9, 1.1, 1.8)],
      [new THREE.Color(0.4, 1.3, 1.6), new THREE.Color(0.7, 0.55, 1.7)],
      [new THREE.Color(0.7, 0.55, 1.7), new THREE.Color(0.4, 1.3, 1.6)],
    ];
    const rungPair = Array.from({ length: R }, () => pairs[rnd() < 0.8 ? Math.floor(rnd() * 2) : 2 + Math.floor(rnd() * 2)]);
    for (let i = 0; i < R; i++) {
      nodes.setColorAt(i * 2, cA); nodes.setColorAt(i * 2 + 1, cB);
      rungs.setColorAt(i * 2, rungPair[i][0]); rungs.setColorAt(i * 2 + 1, rungPair[i][1]);
    }
    for (let i = 0; i < (R - 1) * SUB; i++) { beads.setColorAt(i * 2, cA.clone().multiplyScalar(0.7)); beads.setColorAt(i * 2 + 1, cB.clone().multiplyScalar(0.7)); }

    // Data particles spiralling up through and around the helix.
    const P = 1400;
    const seeds = new Float32Array(P * 4);
    for (let i = 0; i < P; i++) seeds.set([rnd(), 0.15 + Math.pow(rnd(), 0.7) * 2.2, 0.25 + rnd() * 0.7, rnd()], i * 4);
    const pg = new THREE.BufferGeometry();
    pg.setAttribute("position", new THREE.BufferAttribute(new Float32Array(P * 3), 3));
    pg.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 4));
    const parts = new THREE.Points(pg, new THREE.ShaderMaterial({
      uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `uniform float uTwist, uSpin, uTime; attribute vec4 aSeed; varying float vA;
        void main(){
          float y = mod(aSeed.x * ${H.toFixed(2)} + uTime * aSeed.z, ${H.toFixed(2)}) - ${(H / 2).toFixed(2)};
          float a = aSeed.x * 40.0 + y / ${dy.toFixed(4)} * uTwist * 0.6 + uSpin;
          vec3 p = vec3(cos(a) * aSeed.y, y, sin(a) * aSeed.y);
          vA = smoothstep(${(H / 2).toFixed(2)}, ${(H / 2 - 1.5).toFixed(2)}, abs(y)) * (0.4 + 0.6 * aSeed.w);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = (1.0 + aSeed.w * 2.2) * 18.0 / -mv.z;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `varying float vA;
        void main(){ float d = length(gl_PointCoord - 0.5) * 2.0; float a = pow(max(1.0 - d, 0.0), 2.0) * vA;
          gl_FragColor = vec4(vec3(0.6, 0.85, 1.6) * a, 1.0); }`,
    }));
    parts.frustumCulled = false;
    group.add(parts);

    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3();
    const a = new THREE.Vector3(), b = new THREE.Vector3(), mid = new THREE.Vector3(), dir = new THREE.Vector3();
    const Y = new THREE.Vector3(0, 1, 0);
    const pt = (i, strand, twist, spin, out) => {
      const th = i * twist + spin + strand * Math.PI;
      return out.set(Math.cos(th) * RAD, -H / 2 + i * dy, Math.sin(th) * RAD);
    };
    let spin = 0;
    return (t, dt) => {
      const twist = 0.33 + pointer.x * 0.22;
      uniforms.uTwist.value += (twist - uniforms.uTwist.value) * 0.1;
      spin += dt * (0.45 + pointer.x * 0.25);
      uniforms.uSpin.value = spin;
      uniforms.uTime.value = t;
      const tw = uniforms.uTwist.value;
      group.rotation.x = -pointer.y * 0.35;
      group.rotation.z = -0.2 + Math.sin(t * 0.25) * 0.04;

      for (let i = 0; i < R; i++) {
        pt(i, 0, tw, spin, a); pt(i, 1, tw, spin, b);
        const pulse = 1 + 0.25 * Math.sin(t * 2.4 - i * 0.5);
        m4.compose(a, q.identity(), s.setScalar(0.13 * pulse)); nodes.setMatrixAt(i * 2, m4);
        m4.compose(b, q, s); nodes.setMatrixAt(i * 2 + 1, m4);
        // Two half-rungs meeting in the middle with a small gap.
        dir.subVectors(b, a); const len = dir.length(); dir.normalize();
        q.setFromUnitVectors(Y, dir);
        const half = len / 2 - 0.08;
        mid.copy(a).addScaledVector(dir, half / 2 + 0.02);
        m4.compose(mid, q, s.set(0.035, half - 0.04, 0.035)); rungs.setMatrixAt(i * 2, m4);
        mid.copy(b).addScaledVector(dir, -(half / 2 + 0.02));
        m4.compose(mid, q, s); rungs.setMatrixAt(i * 2 + 1, m4);
        if (i < R - 1) for (let k = 1; k <= SUB; k++) {
          const f = i + k / (SUB + 1);
          q.identity(); s.setScalar(0.05);
          pt(f, 0, tw, spin, mid); m4.compose(mid, q, s); beads.setMatrixAt((i * SUB + k - 1) * 2, m4);
          pt(f, 1, tw, spin, mid); m4.compose(mid, q, s); beads.setMatrixAt((i * SUB + k - 1) * 2 + 1, m4);
        }
      }
      nodes.instanceMatrix.needsUpdate = beads.instanceMatrix.needsUpdate = rungs.instanceMatrix.needsUpdate = true;
    };
  },
};
