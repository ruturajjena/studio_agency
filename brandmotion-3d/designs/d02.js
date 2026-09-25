// 02 — Orbital Gyroscope: nested gimbal rings of light spinning around an obsidian core.
export default {
  id: "02",
  name: "Orbital Gyroscope",
  blurb: "Rings of light spin on independent axes around an obsidian core. Your cursor tilts the whole rig.",
  theme: "ember",
  camera: { fov: 36, position: [0, 0.4, 10], target: [0, -0.15, 0] },
  bloom: { strength: 0.75, radius: 0.5, threshold: 0.8 },
  exposure: 1.0,

  setup({ THREE, scene, renderer, sky, pointer, palette, track, rand }) {
    const skyMesh = sky({ haze: 0.08, horizon: "#15306a", mid: palette.night, top: "#02050d" });

    // Environment: the sky plus a few soft light strips for crisp highlights on the core.
    const pmrem = track(new THREE.PMREMGenerator(renderer));
    const env = new THREE.Scene();
    env.add(skyMesh.clone());
    const strip = (w, h, pos, c) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide }));
      m.position.set(...pos);
      m.lookAt(0, 0, 0);
      env.add(m);
    };
    strip(30, 4, [-20, 25, 30], new THREE.Color(6, 7, 9));
    strip(4, 40, [40, 0, -10], new THREE.Color(1.5, 2.5, 4));
    strip(50, 2, [0, -30, 20], new THREE.Color(0.8, 0.7, 2.4));
    scene.environment = track(pmrem.fromScene(env, 0.02, 0.1, 500)).texture;

    const rig = new THREE.Group();
    rig.position.y = 0.25;
    scene.add(rig);

    // Obsidian core.
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(1.0, 96, 64),
      new THREE.MeshPhysicalMaterial({ color: 0x04060c, metalness: 0.55, roughness: 0.14, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 1.6 })
    );
    rig.add(core);

    // Rings: a travelling comet highlight sweeps around each one.
    const rings = [];
    const ringMat = (color, base, speed) => {
      const m = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(color) }, uBase: { value: base }, uSpeed: { value: speed } },
        vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
        fragmentShader: `uniform float uTime,uBase,uSpeed; uniform vec3 uColor; varying vec2 vUv;
          void main(){ float f=fract(vUv.x+uTime*uSpeed);
            float head=pow(f,10.0)*3.2*smoothstep(1.0,0.992,f)+pow(f,2.0)*0.5;
            gl_FragColor=vec4(uColor*(uBase+head),1.0);}`,
        toneMapped: false,
      });
      rings.push(m);
      return m;
    };
    const ring = (r, tube, mat) => new THREE.Mesh(new THREE.TorusGeometry(r, tube, 10, 320), mat);
    const glow = new THREE.Color(palette.glow).multiplyScalar(1.6);
    const ice = new THREE.Color(palette.ice).multiplyScalar(1.3);
    const cyan = new THREE.Color(palette.cyan).multiplyScalar(1.5);
    const violet = new THREE.Color(palette.violet).multiplyScalar(1.4);

    const bead = (parent, pos, s = 0.045) => {
      const b = new THREE.Mesh(new THREE.SphereGeometry(s, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(2, 2.3, 2.8), toneMapped: false }));
      b.position.set(...pos);
      parent.add(b);
    };

    // Gimbal hierarchy: g1 spins about Y, g2 about X inside it, g3 about Y inside that.
    const g1 = new THREE.Group(), g2 = new THREE.Group(), g3 = new THREE.Group();
    rig.add(g1); g1.add(g2); g2.add(g3);
    g1.add(ring(2.2, 0.016, ringMat(glow, 0.55, 0.22)));
    bead(g1, [0, 2.2, 0]); bead(g1, [0, -2.2, 0]);
    g2.add(ring(1.86, 0.014, ringMat(ice, 0.45, -0.3)));
    bead(g2, [1.86, 0, 0]); bead(g2, [-1.86, 0, 0]);
    g3.add(ring(1.54, 0.012, ringMat(cyan, 0.35, 0.45)));
    bead(g3, [0, 1.54, 0], 0.035); bead(g3, [0, -1.54, 0], 0.035);
    // Spin axle through the core's poles.
    const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 3.08, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.2, 1.5, 2.2), toneMapped: false }));
    g3.add(axle);

    // Wide tilted orbit with tick marks and a satellite.
    const orbit = new THREE.Group();
    orbit.rotation.set(1.25, 0, 0.35);
    rig.add(orbit);
    orbit.add(ring(2.95, 0.006, ringMat(violet, 0.35, -0.12)));
    const ticks = new THREE.InstancedMesh(new THREE.BoxGeometry(0.012, 0.09, 0.012), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.9, 1.1, 1.8), toneMapped: false }), 96);
    const m4 = new THREE.Matrix4();
    for (let i = 0; i < 96; i++) {
      const a = (i / 96) * Math.PI * 2;
      const len = i % 8 === 0 ? 2.2 : 1;
      m4.compose(new THREE.Vector3(Math.cos(a) * 3.1, Math.sin(a) * 3.1, 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, a - Math.PI / 2)), new THREE.Vector3(1, len, 1));
      ticks.setMatrixAt(i, m4);
    }
    orbit.add(ticks);
    const sat = new THREE.Group();
    orbit.add(sat);
    bead(sat, [2.95, 0, 0], 0.06);

    // Fine dust drifting around the rig.
    const R = rand(2), n = 700, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const r = 3 + R() * 6, a = R() * Math.PI * 2, y = (R() - 0.5) * 6;
      pos.set([Math.cos(a) * r, y, Math.sin(a) * r - 2], i * 3);
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: palette.ice, size: 0.025, transparent: true, opacity: 0.55, depthWrite: false }));
    scene.add(dust);

    return (t) => {
      rings.forEach((m) => (m.uniforms.uTime.value = t));
      g1.rotation.y = 0.7 + t * 0.42;
      g2.rotation.x = 1.1 + t * 0.63;
      g3.rotation.y = -0.5 - t * 0.95;
      core.rotation.y = t * 0.3;
      orbit.rotation.z = 0.35 + t * 0.05;
      sat.rotation.z = -t * 0.6;
      rig.rotation.x = 0.28 - pointer.y * 0.55;
      rig.rotation.z = -pointer.x * 0.45;
      rig.rotation.y = pointer.x * 0.35;
      dust.rotation.y = t * 0.02;
    };
  },
};
