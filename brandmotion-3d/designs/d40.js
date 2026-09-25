// 40 — Droplet Pool: a single drop falls into a black pool on a loop; rings of light ripple outward.
export default {
  id: "40",
  name: "Droplet Pool",
  blurb: "Drops fall into a still black pool and spread rings of reflected light. Your cursor picks where they land.",
  theme: "ocean",
  camera: { fov: 36, position: [0, 3.1, 7.4], target: [0, 0.35, -0.6] },
  bloom: { strength: 0.8, radius: 0.55, threshold: 0.8 },
  exposure: 1.0,

  setup({ THREE, scene, camera, pointer, rand }) {
    const r = rand(40);
    const NS = 6;
    const src = Array.from({ length: NS }, () => new THREE.Vector4(0, 0, -99, 0)); // x, z, t0, amp
    const U = { uTime: { value: 0 }, uSrc: { value: src } };

    const chunk = /* glsl */ `
      uniform float uTime; uniform vec4 uSrc[${NS}];
      float height(vec2 p){
        float h = 0.0;
        for (int i = 0; i < ${NS}; i++) {
          float tau = uTime - uSrc[i].z;
          if (tau < 0.0 || tau > 7.0) continue;
          float d = length(p - uSrc[i].xy);
          float x = d - tau * 1.25;
          float env = exp(-x * x * 1.6) * exp(-tau * 0.55) / (1.0 + d * 1.2);
          h += uSrc[i].w * sin(x * 10.0) * env * smoothstep(0.0, 0.15, d + 0.05);
        }
        return h;
      }
      vec3 envMap(vec3 R){
        vec3 col = mix(vec3(0.002, 0.004, 0.012), vec3(0.01, 0.02, 0.06), smoothstep(-0.1, 0.4, R.y));
        vec3 ax = normalize(vec3(0.0, 0.335, -0.94));
        float ca = dot(R, ax);
        col += vec3(1.4, 1.7, 2.6) * exp(-pow((ca - 0.9955) * 900.0, 2.0)) * 1.5;
        col += vec3(0.4, 0.6, 1.3) * exp(-(1.0 - ca) * 90.0) * 0.25;
        col += vec3(0.25, 0.4, 0.9) * exp(-pow(R.y - 0.05, 2.0) * 1500.0) * smoothstep(0.9, 0.0, abs(R.x)) * 0.5;
        col += vec3(0.4, 0.3, 1.0) * exp(-pow(dot(R, normalize(vec3(-0.8, 0.3, -0.5))) - 0.995, 2.0) * 9000.0) * 0.8;
        return col;
      }`;

    // Pool surface.
    const water = new THREE.Mesh(new THREE.PlaneGeometry(26, 26, 240, 240), new THREE.ShaderMaterial({
      uniforms: U,
      vertexShader: `${chunk}
        varying vec3 vW;
        void main(){ vec3 p = (modelMatrix * vec4(position, 1.0)).xyz; p.y += height(p.xz); vW = p; gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0); }`,
      fragmentShader: `${chunk}
        varying vec3 vW;
        void main(){
          float e = 0.02; vec2 p = vW.xz;
          float h0 = height(p);
          vec3 N = normalize(vec3(h0 - height(p + vec2(e, 0.0)), e, h0 - height(p + vec2(0.0, e))));
          vec3 V = normalize(cameraPosition - vW);
          float F = 0.03 + 0.97 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
          vec3 col = vec3(0.001, 0.003, 0.009) + envMap(reflect(-V, N)) * F * 1.4;
          float dist = length(vW - cameraPosition);
          col = mix(vec3(0.0012, 0.0028, 0.007), col, smoothstep(24.0, 7.0, dist));
          gl_FragColor = vec4(col, 1.0);
        }`,
    }));
    water.rotation.x = -Math.PI / 2;
    scene.add(water);

    // Drop + jet share one lookdev: fresnel-lit liquid glass.
    const dropMat = new THREE.ShaderMaterial({
      uniforms: U,
      vertexShader: "varying vec3 vN; varying vec3 vW; void main(){ vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }",
      fragmentShader: `${chunk}
        varying vec3 vN; varying vec3 vW;
        void main(){ vec3 N = normalize(vN), V = normalize(cameraPosition - vW);
          float F = 0.1 + 0.9 * pow(1.0 - max(dot(N, V), 0.0), 3.0);
          vec3 col = envMap(reflect(-V, N)) * 1.6 * F + envMap(refract(-V, N, 0.75)) * 0.8 + vec3(0.25, 0.4, 0.9) * F * 0.6;
          gl_FragColor = vec4(col, 1.0); }`,
    });
    const drop = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), dropMat);
    const jet = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), dropMat);
    scene.add(drop, jet);

    // Splash crown particles.
    const SP = 70, sd = new Float32Array(SP * 4);
    for (let i = 0; i < SP; i++) sd.set([r() * 6.2832, 0.6 + r() * 1.3, 2.2 + r() * 2.2, r()], i * 4);
    const sg = new THREE.BufferGeometry();
    sg.setAttribute("position", new THREE.BufferAttribute(new Float32Array(SP * 3), 3));
    sg.setAttribute("aS", new THREE.BufferAttribute(sd, 4));
    const splashU = { uT0: { value: -99 }, uC: { value: new THREE.Vector2() }, uTime: U.uTime };
    const splash = new THREE.Points(sg, new THREE.ShaderMaterial({
      uniforms: splashU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `uniform float uTime, uT0; uniform vec2 uC; attribute vec4 aS; varying float vA;
        void main(){ float tau = uTime - uT0; vec3 p = vec3(uC.x + cos(aS.x) * aS.y * tau, aS.z * tau - 9.0 * tau * tau, uC.y + sin(aS.x) * aS.y * tau);
          vA = step(0.0, tau) * step(0.0, p.y) * (0.5 + aS.w * 0.5);
          vec4 mv = viewMatrix * vec4(p, 1.0); gl_PointSize = (2.0 + aS.w * 3.0) * (8.0 / -mv.z); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: "varying float vA; void main(){ if (vA <= 0.0) discard; float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(vec3(1.0, 1.25, 1.9) * vA * smoothstep(0.5, 0.0, d), 1.0); }",
    }));
    splash.frustumCulled = false;
    scene.add(splash);

    const ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3();
    const land = new THREE.Vector2(), aim = new THREE.Vector2();
    const PERIOD = 2.3, FALL = 0.62, H = 5.5;
    let cycle = -1, slot = 0;
    const addSrc = (x, z, t0, amp) => { src[slot].set(x, z, t0, amp); slot = (slot + 1) % NS; };
    const base = camera.position.clone(), look = new THREE.Vector3(0, 0.35, -0.6);

    return (t) => {
      U.uTime.value = t;
      ray.setFromCamera(pointer, camera);
      if (ray.ray.intersectPlane(plane, hit)) aim.set(hit.x, hit.z); else aim.set(pointer.x * 3, -3);
      if (aim.length() > 3.2) aim.setLength(3.2);

      const c = Math.floor(t / PERIOD), ct = t - c * PERIOD;
      if (c !== cycle) {
        cycle = c;
        land.copy(aim);
        addSrc(land.x, land.y, c * PERIOD + FALL, 0.05);
        addSrc(land.x, land.y, c * PERIOD + FALL + 0.62, 0.022);
        splashU.uT0.value = c * PERIOD + FALL;
        splashU.uC.value.copy(land);
      }
      // Falling drop (gravity), stretched along its motion.
      const fall = ct / FALL;
      if (fall < 1) {
        drop.visible = true;
        drop.position.set(land.x, H * (1 - fall * fall), land.y);
        drop.scale.set(0.085, 0.085 * (1.15 + fall * 0.5), 0.085);
      } else drop.visible = false;
      // Worthington jet: a column that rises and pinches back into the pool.
      const jt = ct - FALL - 0.12;
      if (jt > 0 && jt < 0.5) {
        const k = Math.sin((jt / 0.5) * Math.PI);
        jet.visible = true;
        jet.position.set(land.x, k * 0.32, land.y);
        jet.scale.set(0.05 + 0.03 * (1 - k), 0.05 + k * 0.28, 0.05 + 0.03 * (1 - k));
      } else jet.visible = false;

      camera.position.set(base.x + pointer.x * 0.6, base.y + pointer.y * 0.3, base.z);
      camera.lookAt(look);
    };
  },
};
