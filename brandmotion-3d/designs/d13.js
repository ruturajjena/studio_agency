// 13 — Warp Tunnel: flying through a curving corridor of light rings and speed streaks.
export default {
  id: "13",
  name: "Warp Tunnel",
  blurb: "A light-speed run through rings and streaks. Steer the tunnel's curve with your cursor.",
  camera: { fov: 68, position: [0, 0, 0], target: [0, 0, -1] },
  bloom: { strength: 0.9, radius: 0.55, threshold: 0.75 },
  exposure: 1.0,
  background: "#02050d",

  setup({ THREE, scene, camera, pointer, rand }) {
    const L = 70; // visible tunnel length
    const uniforms = { uTravel: { value: 0 }, uBend: { value: new THREE.Vector2() }, uTime: { value: 0 } };

    // Shared GLSL: tunnel centre-line at depth d ahead of the camera.
    const path = /* glsl */ `
      uniform float uTravel, uTime; uniform vec2 uBend;
      vec2 wig(float z){ return vec2(sin(z * 0.045) * 3.0 + sin(z * 0.11) * 0.8, cos(z * 0.06) * 2.0); }
      vec2 centre(float d){ return wig(d + uTravel) - wig(uTravel) + uBend * d * d; }
      float fade(float d){ return smoothstep(${L.toFixed(1)}, ${(L * 0.6).toFixed(1)}, d) * smoothstep(0.0, 4.0, d) * exp(-d * 0.055); }
    `;

    // Rings: instanced thin tori, each at a looping depth.
    const RINGS = 44;
    const ringGeo = new THREE.InstancedBufferGeometry().copy(new THREE.TorusGeometry(2.4, 0.018, 6, 128));
    const rOff = new Float32Array(RINGS), rKind = new Float32Array(RINGS);
    const rr = rand(13);
    for (let i = 0; i < RINGS; i++) { rOff[i] = (i / RINGS) * L; rKind[i] = rr(); }
    ringGeo.setAttribute("aOff", new THREE.InstancedBufferAttribute(rOff, 1));
    ringGeo.setAttribute("aKind", new THREE.InstancedBufferAttribute(rKind, 1));
    ringGeo.instanceCount = RINGS;
    const rings = new THREE.Mesh(ringGeo, new THREE.ShaderMaterial({
      uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
      vertexShader: `${path}
        attribute float aOff, aKind; varying float vA, vAng, vKind;
        void main(){
          float d = mod(aOff - uTravel, ${L.toFixed(1)});
          vec2 c = centre(d);
          vec2 slope = (centre(d + 0.5) - c) / 0.5;
          vec3 p = position;
          p.z -= dot(p.xy, slope);            // tilt ring to follow the curve
          vec3 w = vec3(p.xy + c, -d + p.z);
          vA = fade(d); vKind = aKind; vAng = atan(position.y, position.x);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(w, 1.0);
        }`,
      fragmentShader: `uniform float uTime; varying float vA, vAng, vKind;
        void main(){
          vec3 col = vec3(0.5, 0.68, 1.45);
          if (vKind > 0.86) col = vec3(0.35, 1.1, 1.6);
          else if (vKind > 0.78) col = vec3(0.7, 0.6, 1.7);
          float seg = vKind > 0.5 ? step(0.35, fract(vAng * 6.0 / 6.2832 * (vKind > 0.7 ? 4.0 : 1.0) + uTime * 0.2)) : 1.0;
          gl_FragColor = vec4(col * vA * (0.2 + 0.8 * seg) * 1.1, 1.0);
        }`,
    }));
    rings.frustumCulled = false;
    scene.add(rings);

    // Streaks: instanced quads laid along the tunnel wall, rushing past.
    const STREAKS = 900;
    const sGeo = new THREE.InstancedBufferGeometry();
    sGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array([-0.5, 0, 0, 0.5, 0, 0, 0.5, 1, 0, -0.5, 1, 0]), 3));
    sGeo.setIndex([0, 1, 2, 0, 2, 3]);
    const sAttr = new Float32Array(STREAKS * 4);
    for (let i = 0; i < STREAKS; i++) {
      sAttr.set([rr() * Math.PI * 2, 1.1 + rr() * 1.2, rr() * L, 0.8 + rr() * 1.6], i * 4);
    }
    sGeo.setAttribute("aS", new THREE.InstancedBufferAttribute(sAttr, 4));
    sGeo.instanceCount = STREAKS;
    const streaks = new THREE.Mesh(sGeo, new THREE.ShaderMaterial({
      uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
      vertexShader: `${path}
        attribute vec4 aS; varying float vA, vY;
        void main(){
          float d = mod(aS.z - uTravel * aS.w, ${L.toFixed(1)});
          float len = 1.2 + aS.w * 1.6;
          float dd = d + position.y * len;
          vec2 dir = vec2(cos(aS.x), sin(aS.x));
          vec2 tang = vec2(-dir.y, dir.x);
          vec3 w = vec3(centre(dd) + dir * aS.y + tang * position.x * 0.018 * (1.0 + d * 0.03), -dd);
          vA = fade(d) * (0.4 + 0.6 * aS.w / 2.4); vY = position.y;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(w, 1.0);
        }`,
      fragmentShader: `varying float vA, vY;
        void main(){ float head = pow(1.0 - vY, 2.0); gl_FragColor = vec4(vec3(0.6, 0.78, 1.5) * vA * head * 0.9, 1.0); }`,
    }));
    streaks.frustumCulled = false;
    scene.add(streaks);

    // Vanishing-point glow at the end of the tunnel.
    const coreMat = new THREE.ShaderMaterial({
      uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
      vertexShader: `${path} varying vec2 vUv;
        void main(){ vUv = uv; vec2 c = centre(${(L * 0.8).toFixed(1)});
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position + vec3(c, -${(L * 0.8).toFixed(1)}), 1.0); }`,
      fragmentShader: `varying vec2 vUv; void main(){ float d = length(vUv - 0.5) * 2.0;
        float g = exp(-d * d * 30.0) * 1.2 + pow(max(1.0 - d, 0.0), 4.0) * 0.18;
        gl_FragColor = vec4(vec3(0.5, 0.7, 1.4) * g, 1.0); }`,
    });
    const core = new THREE.Mesh(new THREE.PlaneGeometry(22, 22), coreMat);
    core.frustumCulled = false;
    scene.add(core);

    return (t, dt) => {
      uniforms.uTime.value = t;
      uniforms.uTravel.value += dt * 14;
      uniforms.uBend.value.set(pointer.x * 0.006, pointer.y * 0.004);
      camera.rotation.set(pointer.y * 0.06, -pointer.x * 0.08, -pointer.x * 0.22 + Math.sin(t * 0.4) * 0.03);
    };
  },
};
