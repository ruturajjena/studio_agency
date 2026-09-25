// 27 — Lighthouse: a lone lighthouse throwing a volumetric beam across fog and a rolling night sea.
export default {
  id: "27",
  name: "Lighthouse",
  blurb: "A lighthouse sweeping its beam through sea fog. Point, and the light turns to find you.",
  camera: { fov: 40, position: [0.6, 2.4, 17], target: [0.6, 2.9, 0] },
  bloom: { strength: 0.8, radius: 0.55, threshold: 0.82 },
  exposure: 1.0,

  setup({ THREE, scene, camera, sky, pointer, rand, glsl, palette }) {
    sky({ top: "#02050e", mid: "#0a1733", horizon: "#2b4a86", haze: 0.3 });
    const R = rand(27);
    const LAMP = new THREE.Vector3(-3.2, 6.35, -2);
    const beamDir = new THREE.Vector3(1, 0, 0), beamDir2 = new THREE.Vector3(-1, 0, 0);
    const shared = {
      uTime: { value: 0 }, uLamp: { value: LAMP }, uB1: { value: beamDir }, uB2: { value: beamDir2 },
      uGlow: { value: new THREE.Color(palette.glow) },
    };
    const beamLight = /* glsl */ `
      uniform vec3 uLamp, uB1, uB2;
      float beamAt(vec3 p, float tight){
        vec3 d = p - uLamp; float l = length(d); d /= l;
        float b = pow(max(dot(d, uB1), 0.0), tight) + pow(max(dot(d, uB2), 0.0), tight) * 0.6;
        return b / (1.0 + l * 0.04);
      }`;

    // Stars.
    const SN = 700, sp = new Float32Array(SN * 3);
    for (let i = 0; i < SN; i++) {
      const th = R() * Math.PI * 2, y = 0.08 + Math.pow(R(), 0.8) * 0.9, r = Math.sqrt(1 - y * y);
      sp.set([Math.cos(th) * r * 250, y * 250, Math.sin(th) * r * 250], i * 3);
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute("position", new THREE.BufferAttribute(sp, 3));
    scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: palette.ice, size: 1.1, sizeAttenuation: false, transparent: true, opacity: 0.75, depthWrite: false })));

    // Rock.
    const rockGeo = new THREE.IcosahedronGeometry(1, 4);
    const pa = rockGeo.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < pa.count; i++) {
      v.fromBufferAttribute(pa, i);
      const n = 1 + 0.18 * Math.sin(v.x * 5.1 + v.z * 3.7) * Math.cos(v.y * 4.3 - v.z * 2.2) + 0.08 * Math.sin(v.x * 13 + v.y * 11);
      v.multiplyScalar(n).multiply(new THREE.Vector3(2.8, 1.5, 2.2));
      pa.setXYZ(i, v.x, v.y, v.z);
    }
    rockGeo.computeVertexNormals();
    const rock = new THREE.Mesh(rockGeo, new THREE.MeshStandardMaterial({ color: 0x141c2c, roughness: 0.9, flatShading: true }));
    rock.position.set(LAMP.x, 0.1, LAMP.z);
    scene.add(rock);

    // Tower.
    const tower = new THREE.Group();
    tower.position.set(LAMP.x, 1.1, LAMP.z);
    scene.add(tower);
    const wall = new THREE.MeshStandardMaterial({ color: 0x9aa8c2, roughness: 0.6 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x0c1428, roughness: 0.5, metalness: 0.4 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.78, 4.4, 40), wall);
    body.position.y = 2.2;
    tower.add(body);
    [1.0, 2.6].forEach((y) => {
      const r = (yy) => 0.78 - (yy / 4.4) * 0.28 + 0.012;
      const band = new THREE.Mesh(new THREE.CylinderGeometry(r(y + 0.275), r(y - 0.275), 0.55, 40), dark);
      band.position.y = y;
      tower.add(band);
    });
    const gallery = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.62, 0.12, 40), dark);
    gallery.position.y = 4.46;
    const rail = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.015, 6, 48), dark);
    rail.rotation.x = Math.PI / 2;
    rail.position.y = 4.78;
    const lampRoom = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.62, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.5, 3.2), toneMapped: false }));
    lampRoom.position.y = 4.85;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(0.52, 0.55, 24), dark);
    roof.position.y = 5.43;
    tower.add(gallery, rail, lampRoom, roof);
    scene.add(new THREE.AmbientLight(0x3a5790, 0.5));
    const moon = new THREE.DirectionalLight(0x9fc0ff, 0.9);
    moon.position.set(8, 10, 6);
    scene.add(moon);
    const lampLight = new THREE.PointLight(0xdce8ff, 6, 9, 1.6);
    lampLight.position.copy(LAMP);
    scene.add(lampLight);

    // Beams: open cones with their apex at the lamp.
    const H = 34;
    const beamGeo = new THREE.ConeGeometry(4.2, H, 48, 1, true).translate(0, -H / 2, 0).rotateZ(Math.PI / 2);
    const beamMat = new THREE.ShaderMaterial({
      uniforms: shared, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      vertexShader: /* glsl */ `
        varying float vAlong; varying vec3 vN; varying vec3 vW;
        void main(){ vAlong = position.x / ${H.toFixed(1)}; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz;
          vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: /* glsl */ `
        uniform float uTime; uniform vec3 uGlow; varying float vAlong; varying vec3 vN; varying vec3 vW;
        ${glsl.noise}
        void main(){
          float edge = abs(dot(normalize(vN), normalize(cameraPosition - vW)));
          float n = snoise(vec3(vW.xz * 0.16 + vec2(uTime * 0.1, 0.0), vW.y * 0.2 + uTime * 0.12)) * 0.5 + 0.5;
          float a = pow(edge, 2.5) * pow(1.0 - vAlong, 1.6) * smoothstep(0.0, 0.03, vAlong) * (0.3 + 0.9 * n * n);
          gl_FragColor = vec4(uGlow * a * 0.42, 1.0);
        }`,
    });
    const beams = new THREE.Group();
    beams.position.copy(LAMP);
    const b1 = new THREE.Mesh(beamGeo, beamMat), b2 = new THREE.Mesh(beamGeo, beamMat);
    b2.rotation.y = Math.PI;
    b2.scale.setScalar(0.8);
    beams.add(b1, b2);
    scene.add(beams);

    // Flare at the lamp, stronger when the beam faces us.
    const flare = new THREE.Mesh(
      new THREE.PlaneGeometry(6, 6),
      new THREE.ShaderMaterial({
        uniforms: { uI: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
        fragmentShader: `uniform float uI; varying vec2 vUv; void main(){ vec2 p=vUv-0.5; float d=length(p);
          float g = exp(-d*d*120.0)*1.4 + exp(-d*14.0)*0.35 + exp(-abs(p.y)*90.0)*exp(-abs(p.x)*5.0)*0.5;
          gl_FragColor=vec4(vec3(0.85,0.93,1.25)*g*uI,1.0);} `,
      })
    );
    flare.position.copy(LAMP);
    scene.add(flare);

    // Rolling sea.
    const waves = /* glsl */ `
      float waveH(vec2 p, float t){
        return sin(p.x * 0.35 + t * 0.9) * 0.18 + sin(p.y * 0.5 - t * 1.1 + p.x * 0.2) * 0.14
             + sin((p.x + p.y) * 1.3 + t * 1.7) * 0.05 + sin((p.x * 0.7 - p.y) * 2.1 - t * 2.3) * 0.025;
      }`;
    const sea = new THREE.Mesh(
      new THREE.PlaneGeometry(260, 160, 220, 140).rotateX(-Math.PI / 2),
      new THREE.ShaderMaterial({
        uniforms: shared,
        vertexShader: /* glsl */ `uniform float uTime; varying vec3 vW; ${waves}
          void main(){ vec4 w = modelMatrix * vec4(position, 1.0); w.y += waveH(w.xz, uTime); vW = w.xyz;
            gl_Position = projectionMatrix * viewMatrix * w; }`,
        fragmentShader: /* glsl */ `uniform float uTime; uniform vec3 uGlow; varying vec3 vW; ${waves} ${beamLight}
          void main(){
            float e = 0.08; float h0 = waveH(vW.xz, uTime);
            vec3 N = normalize(vec3(h0 - waveH(vW.xz + vec2(e, 0.0), uTime), e, h0 - waveH(vW.xz + vec2(0.0, e), uTime)));
            vec3 V = normalize(cameraPosition - vW); vec3 Rf = reflect(-V, N);
            float fr = 0.02 + 0.98 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
            vec3 skyC = mix(vec3(0.12, 0.2, 0.4), vec3(0.015, 0.03, 0.08), smoothstep(0.0, 0.3, Rf.y));
            vec3 col = vec3(0.004, 0.01, 0.022) + skyC * fr * 0.45;
            vec3 toMoon = normalize(vec3(0.45, 0.35, -1.0));
            col += vec3(0.7, 0.85, 1.2) * pow(max(dot(Rf, toMoon), 0.0), 500.0) * 0.6;
            vec3 L = normalize(uLamp - vW);
            col += uGlow * pow(max(dot(Rf, L), 0.0), 400.0) * 1.2 / (1.0 + length(uLamp - vW) * 0.08);
            col += uGlow * beamAt(vW, 40.0) * (0.015 + fr * 0.12);
            col = mix(col, vec3(0.09, 0.16, 0.31), smoothstep(40.0, 120.0, length(vW.xz - cameraPosition.xz)) * 0.8);
            gl_FragColor = vec4(col, 1.0);
          }`,
      })
    );
    scene.add(sea);

    // Fog banks: soft noisy layers lit where the beam passes.
    const fogMat = new THREE.ShaderMaterial({
      uniforms: shared, transparent: true, depthWrite: false,
      vertexShader: `varying vec2 vUv; varying vec3 vW; void main(){ vUv=uv; vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
      fragmentShader: /* glsl */ `uniform float uTime; uniform vec3 uGlow; varying vec2 vUv; varying vec3 vW;
        ${glsl.noise} ${beamLight}
        void main(){
          float n = snoise(vec3(vW.x * 0.08 + uTime * 0.05, vW.y * 0.3, vW.z * 0.1 + uTime * 0.02)) * 0.5 + 0.5;
          n += snoise(vec3(vW.x * 0.25 - uTime * 0.08, vW.y * 0.6, vW.z * 0.2)) * 0.25;
          float band = smoothstep(0.0, 0.35, vUv.y) * smoothstep(1.0, 0.25, vUv.y) * smoothstep(0.0, 0.15, vUv.x) * smoothstep(1.0, 0.85, vUv.x);
          float a = clamp(n, 0.0, 1.0) * band;
          vec3 col = vec3(0.1, 0.17, 0.33) + uGlow * beamAt(vW, 30.0) * 0.7;
          gl_FragColor = vec4(col, a * 0.45);
        }`,
    });
    [[-20, 1.0, 4.0], [-9, 0.9, 3.0], [0.5, 0.55, 1.6]].forEach(([z, y, h]) => {
      const f = new THREE.Mesh(new THREE.PlaneGeometry(90, h), fogMat);
      f.position.set(0, y, z);
      scene.add(f);
    });

    const ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 4), hit = new THREE.Vector3();
    const aim = new THREE.Vector3(1, -0.05, 0.3).normalize(), want = new THREE.Vector3(), X = new THREE.Vector3(1, 0, 0);
    return (t) => {
      shared.uTime.value = t;
      // Aim toward the pointer, with an idle sweep layered on top.
      ray.setFromCamera(pointer, camera);
      if (ray.ray.intersectPlane(plane, hit)) {
        want.copy(hit).sub(LAMP);
        want.x += Math.sin(t * 0.45) * 7;
        want.z += Math.cos(t * 0.45) * 6 - 4;
        want.y = THREE.MathUtils.clamp(want.y * 0.15, -0.8, 0.6) - 0.5;
        want.normalize();
        aim.lerp(want, 0.04).normalize();
      }
      beamDir.copy(aim);
      beamDir2.copy(aim).multiplyScalar(-1);
      beamDir2.y = aim.y;
      beams.quaternion.setFromUnitVectors(X, aim);
      const toCam = camera.position.clone().sub(LAMP).normalize();
      flare.material.uniforms.uI.value = 0.35 + Math.pow(Math.max(aim.dot(toCam), 0), 6) * 1.6;
      flare.lookAt(camera.position);
    };
  },
};
