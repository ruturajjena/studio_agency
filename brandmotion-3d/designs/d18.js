// 18 — Voxel Wave: a disc of cubes rising and falling in interference waves; the cursor drops in a new source.
export default {
  id: "18",
  name: "Voxel Wave",
  blurb: "A field of cubes rides crossing waves, crests lit like glass. Your cursor adds a new wave source.",
  camera: { fov: 32, position: [0, 9.5, 15.5], target: [0, -1.1, 0] },
  bloom: { strength: 0.85, radius: 0.5, threshold: 0.78 },
  exposure: 1.0,
  background: "#030713",

  setup({ THREE, scene, camera, pointer, sky }) {
    sky({ top: "#02050d", mid: "#060f26", horizon: "#16295a", below: "#030713", haze: 0.2 });
    const R = 27, S = 0.32;
    const cells = [];
    for (let i = -R; i <= R; i++) for (let j = -R; j <= R; j++) if (i * i + j * j <= R * R) cells.push(i * S, j * S);
    const count = cells.length / 2;

    const geo = new THREE.InstancedBufferGeometry().copy(new THREE.BoxGeometry(0.27, 0.27, 0.27));
    geo.setAttribute("aGrid", new THREE.InstancedBufferAttribute(new Float32Array(cells), 2));
    geo.instanceCount = count;

    const uniforms = {
      uTime: { value: 0 },
      uPtr: { value: new THREE.Vector3(0, 0, 0) }, // xz + amplitude
      uSrc: { value: [new THREE.Vector2(), new THREE.Vector2()] },
      uR: { value: R * S },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: /* glsl */ `
        uniform float uTime, uR; uniform vec3 uPtr; uniform vec2 uSrc[2];
        attribute vec2 aGrid; varying vec3 vN; varying vec2 vUv; varying float vH, vR, vY;
        float wave(vec2 p, vec2 s, float k, float w, float a){ float d = length(p - s); return a * sin(d * k - uTime * w) / (1.0 + d * 0.28); }
        void main(){
          float h = wave(aGrid, uSrc[0], 1.6, 1.9, 0.55) + wave(aGrid, uSrc[1], 1.35, 1.6, 0.5)
                  + wave(aGrid, uPtr.xy, 2.2, 3.0, uPtr.z);
          vH = h; vN = normal; vUv = uv; vY = position.y / 0.27 + 0.5;
          vR = length(aGrid) / uR;
          vec3 p = position + vec3(aGrid.x, h * 0.9, aGrid.y);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        varying vec3 vN; varying vec2 vUv; varying float vH, vR, vY;
        void main(){
          float lift = smoothstep(-0.4, 0.9, vH);
          vec3 side = mix(vec3(0.002, 0.004, 0.012), vec3(0.02, 0.04, 0.11), vY * lift);
          side *= 0.6 + 0.4 * max(dot(vN, normalize(vec3(-0.4, 0.3, 0.8))), 0.0);
          vec2 e = abs(vUv - 0.5) * 2.0;
          float rim = smoothstep(0.78, 0.96, max(e.x, e.y));
          vec3 top = mix(vec3(0.006, 0.012, 0.035), vec3(0.08, 0.15, 0.4), lift);
          top += vec3(0.9, 1.15, 1.7) * pow(lift, 5.0) * 1.2;
          top += vec3(0.25, 0.4, 0.95) * rim * (0.08 + lift * lift * 0.6);
          vec3 col = vN.y > 0.5 ? top : side;
          col *= smoothstep(1.0, 0.55, vR);
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false;
    scene.add(mesh);

    const ray = new THREE.Raycaster();
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const hit = new THREE.Vector3();
    return (t) => {
      uniforms.uTime.value = t;
      uniforms.uSrc.value[0].set(Math.cos(t * 0.13) * 5.5, Math.sin(t * 0.13) * 5.5);
      uniforms.uSrc.value[1].set(Math.cos(t * 0.11 + 2.6) * 6, Math.sin(t * 0.11 + 2.6) * 6);
      ray.setFromCamera(pointer, camera);
      if (ray.ray.intersectPlane(plane, hit)) {
        uniforms.uPtr.value.x += (hit.x - uniforms.uPtr.value.x) * 0.1;
        uniforms.uPtr.value.y += (hit.z - uniforms.uPtr.value.y) * 0.1;
      }
      uniforms.uPtr.value.z = 0.75;
    };
  },
};
