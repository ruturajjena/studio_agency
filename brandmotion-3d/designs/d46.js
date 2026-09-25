// 46 — Shape Shifter: a swarm of light that keeps reassembling itself as sphere, torus, cube and knot.



export default {
  id: "46",
  name: "Shape Shifter",
  blurb: "Fifteen thousand particles flowing between forms. Your cursor scatters the ones nearby.",
  theme: "aurora",
  camera: { fov: 40, position: [0, 0, 9], target: [0, -0.35, 0] },
  bloom: { strength: 0.9, radius: 0.5, threshold: 0.55 },
  exposure: 1.0,

  setup({ THREE, scene, camera, pointer, glsl, palette, rand }) {
    const R = rand(46);
    const N = 15000;
    const shapes = [new Float32Array(N * 3), new Float32Array(N * 3), new Float32Array(N * 3), new Float32Array(N * 3)];
    const rnd = new Float32Array(N * 4);
    const col = new Float32Array(N * 3);
    const glow = new THREE.Color(palette.glow), ice = new THREE.Color(palette.ice), blue = new THREE.Color(palette.blue), cyan = new THREE.Color(palette.cyan), violet = new THREE.Color(palette.violet);
    const c = new THREE.Color();

    for (let i = 0; i < N; i++) {
      const u = R(), v = R(), w = R();
      // Sphere (even surface distribution).
      const th = u * Math.PI * 2, ph = Math.acos(2 * v - 1), rs = 1.7;
      shapes[0].set([rs * Math.sin(ph) * Math.cos(th), rs * Math.cos(ph), rs * Math.sin(ph) * Math.sin(th)], i * 3);
      // Torus.
      const a = u * Math.PI * 2, b = v * Math.PI * 2, Rr = 1.45, rr = 0.55;
      shapes[1].set([(Rr + rr * Math.cos(b)) * Math.cos(a), rr * Math.sin(b), (Rr + rr * Math.cos(b)) * Math.sin(a)], i * 3);
      // Cube surface with slightly denser edges.
      const face = Math.floor(w * 6), s = 1.25;
      let x = (u * 2 - 1), y = (v * 2 - 1);
      if (R() < 0.3) (R() < 0.5 ? (x = Math.sign(x)) : (y = Math.sign(y)));
      const p = [x * s, y * s, (face & 1 ? 1 : -1) * s];
      const ax = face >> 1;
      shapes[2].set(ax === 0 ? p : ax === 1 ? [p[2], p[0], p[1]] : [p[1], p[2], p[0]], i * 3);
      // Trefoil knot tube.
      const tk = u * Math.PI * 2, ang = v * Math.PI * 2, k = 0.62;
      const kp = (t) => new THREE.Vector3(Math.sin(t) + 2 * Math.sin(2 * t), Math.cos(t) - 2 * Math.cos(2 * t), -Math.sin(3 * t)).multiplyScalar(k);
      const P = kp(tk), T = kp(tk + 0.001).sub(P).normalize();
      const Nn = new THREE.Vector3(0, 0, 1).cross(T).normalize(), B = T.clone().cross(Nn);
      const tr = 0.2 * Math.sqrt(R());
      P.addScaledVector(Nn, Math.cos(ang) * tr).addScaledVector(B, Math.sin(ang) * tr);
      shapes[3].set([P.x, P.y, P.z], i * 3);

      rnd.set([R(), R(), R(), R()], i * 4);
      const r = R();
      c.copy(r < 0.04 ? cyan : r < 0.07 ? violet : r < 0.4 ? glow : r < 0.8 ? ice : blue);
      col.set([c.r, c.g, c.b], i * 3);
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(shapes[0], 3));
    shapes.forEach((a, k) => g.setAttribute("aS" + k, new THREE.BufferAttribute(a, 3)));
    g.setAttribute("aRnd", new THREE.BufferAttribute(rnd, 4));
    g.setAttribute("aCol", new THREE.BufferAttribute(col, 3));

    const uniforms = {
      uTime: { value: 0 },
      uFrom: { value: 0 }, uTo: { value: 1 }, uMix: { value: 0 },
      uPointer: { value: new THREE.Vector3(99, 99, 0) },
      uPx: { value: 1 },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
      vertexShader: /* glsl */ `
        ${glsl.noise}
        uniform float uTime, uMix, uFrom, uTo, uPx; uniform vec3 uPointer;
        attribute vec3 aS0, aS1, aS2, aS3, aCol; attribute vec4 aRnd;
        varying vec3 vCol; varying float vA;
        vec3 pick(float k){ return k < 0.5 ? aS0 : k < 1.5 ? aS1 : k < 2.5 ? aS2 : aS3; }
        void main(){
          // staggered, eased morph so the swarm pours from one form into the next
          float m = clamp(uMix * 1.6 - aRnd.x * 0.6, 0.0, 1.0);
          m = m * m * (3.0 - 2.0 * m);
          vec3 p = mix(pick(uFrom), pick(uTo), m);
          float flight = sin(m * 3.14159);
          vec3 n = vec3(snoise(p * 0.8 + uTime * 0.3), snoise(p * 0.8 + 17.0 + uTime * 0.3), snoise(p * 0.8 + 31.0 + uTime * 0.3));
          p += n * (0.03 + flight * 0.55);
          vec4 w = modelMatrix * vec4(p, 1.0);
          // scatter away from the cursor
          vec3 d = w.xyz - uPointer;
          float r = length(d.xy);
          float f = exp(-r * r * 0.9);
          w.xyz += normalize(d + vec3(0.0, 0.0, 0.3) + (aRnd.yzw - 0.5) * 0.6) * f * (1.1 + aRnd.y * 1.4);
          vec4 mv = viewMatrix * w;
          vCol = aCol * (1.0 + f * 1.5 + flight * 0.4);
          vA = 0.55 + 0.45 * sin(uTime * 2.0 + aRnd.w * 40.0);
          gl_PointSize = (1.4 + aRnd.z * 2.4) * uPx * (9.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `varying vec3 vCol; varying float vA;
        void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d);
          gl_FragColor = vec4(vCol * a * a * vA * 0.9, 1.0); }`,
    });
    const pts = new THREE.Points(g, mat);
    pts.frustumCulled = false;
    scene.add(pts);

    // Soft halo behind the form.
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uCol: { value: new THREE.Color(palette.navy) } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv - 0.5; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform vec3 uCol; varying vec2 vUv; void main(){ float a = exp(-dot(vUv, vUv) * 14.0); gl_FragColor = vec4(uCol * 1.2, a * 0.8); }`,
    }));
    halo.position.z = -3;
    scene.add(halo);

    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), ray = new THREE.Raycaster(), hit = new THREE.Vector3();
    const HOLD = 3.2, MORPH = 2.4, CYCLE = HOLD + MORPH;
    return (t) => {
      uniforms.uTime.value = t;
      uniforms.uPx.value = window.devicePixelRatio > 1 ? 1.3 : 1;
      const k = Math.floor(t / CYCLE), ph = t % CYCLE;
      uniforms.uFrom.value = k % 4;
      uniforms.uTo.value = (k + 1) % 4;
      uniforms.uMix.value = ph < HOLD ? 0 : (ph - HOLD) / MORPH;
      ray.setFromCamera(pointer, camera);
      if (ray.ray.intersectPlane(plane, hit)) uniforms.uPointer.value.copy(hit);
      pts.rotation.y = t * 0.25;
      pts.rotation.x = Math.sin(t * 0.2) * 0.3 + 0.35;
    };
  },
};
