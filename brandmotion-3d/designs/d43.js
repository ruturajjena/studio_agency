// 43 — Mandelbulb: a raymarched Mandelbulb in deep blue whose edges burn white, slowly morphing its power.
export default {
  id: "43",
  name: "Mandelbulb",
  blurb: "A living 3D fractal, morphing as it breathes. Move your cursor to orbit around it.",
  bloom: { strength: 0.85, radius: 0.6, threshold: 0.7 },
  exposure: 1.0,

  setup({ THREE, scene, pointer, size, onResize, renderer, composer }) {
    // Raymarching is fill-rate bound: cap the pixel ratio.
    const pr = Math.min(window.devicePixelRatio, 1);
    renderer.setPixelRatio(pr);
    composer.setPixelRatio(pr);
    const uniforms = {
      uTime: { value: 0 },
      uPower: { value: 8 },
      uRes: { value: new THREE.Vector2(1, 1) },
      uCam: { value: new THREE.Vector3() },
      uRot: { value: new THREE.Matrix3() },
    };
    const setRes = () => uniforms.uRes.value.set(size.width, size.height);
    onResize(setRes);
    setRes();

    const mat = new THREE.ShaderMaterial({
      uniforms, depthWrite: false, depthTest: false, toneMapped: false,
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
      fragmentShader: /* glsl */ `
        precision highp float;
        uniform float uTime, uPower; uniform vec2 uRes; uniform vec3 uCam; uniform mat3 uRot;
        varying vec2 vUv;

        float map(vec3 p, out vec4 trap){
          vec3 w = p; float m = dot(w, w); float dz = 1.0;
          trap = vec4(abs(w), m);
          for (int i = 0; i < 5; i++){
            float r = sqrt(m);
            dz = uPower * pow(r, uPower - 1.0) * dz + 1.0;
            float b = uPower * acos(clamp(w.y / r, -1.0, 1.0));
            float a = uPower * atan(w.x, w.z);
            w = p + pow(r, uPower) * vec3(sin(b) * sin(a), cos(b), sin(b) * cos(a));
            trap = min(trap, vec4(abs(w), m));
            m = dot(w, w);
            if (m > 64.0) break;
          }
          return 0.25 * log(m) * sqrt(m) / dz;
        }
        float mapD(vec3 p){ vec4 t; return map(p, t); }
        vec3 calcNormal(vec3 p, float e){
          vec2 k = vec2(1.0, -1.0);
          return normalize(k.xyy * mapD(p + k.xyy * e) + k.yyx * mapD(p + k.yyx * e) +
                           k.yxy * mapD(p + k.yxy * e) + k.xxx * mapD(p + k.xxx * e));
        }
        vec2 sphere(vec3 ro, vec3 rd, float r){
          float b = dot(ro, rd); float c = dot(ro, ro) - r * r; float h = b * b - c;
          if (h < 0.0) return vec2(-1.0); h = sqrt(h); return vec2(-b - h, -b + h);
        }

        void main(){
          vec2 uv = (vUv * 2.0 - 1.0) * vec2(uRes.x / uRes.y, 1.0);
          uv.y -= 0.12;                                     // lift the subject above the HUD
          vec3 ro = uCam;
          vec3 rd = normalize(uRot * vec3(uv, -2.4));

          // background: ink with a soft blue halo behind the bulb
          float vig = length(uv);
          vec3 bg = mix(vec3(0.02, 0.045, 0.11), vec3(0.004, 0.01, 0.025), smoothstep(0.0, 1.6, vig));
          vec3 col = bg;

          vec2 bs = sphere(ro, rd, 1.25);
          float glow = 0.0; bool hitAny = false;
          if (bs.y > 0.0){
            float t = max(bs.x, 0.0);
            vec4 trap; float d; bool hit = false; int steps = 0;
            for (int i = 0; i < 80; i++){
              vec3 p = ro + rd * t;
              d = map(p, trap);
              glow += exp(-d * 40.0) * 0.012;
              float eps = 0.0012 * t;
              if (d < eps){ hit = true; break; }
              t += d * 0.9;
              steps = i;
              if (t > bs.y) break;
            }
            hitAny = hit;
            if (hit){
              vec3 p = ro + rd * t;
              vec3 n = calcNormal(p, 0.0015 * t);
              vec3 L = normalize(vec3(0.6, 0.8, 0.4));
              float dif = clamp(dot(n, L), 0.0, 1.0);
              float ao = clamp(trap.w * 1.2, 0.0, 1.0);
              float fr = pow(1.0 - clamp(dot(n, -rd), 0.0, 1.0), 3.0);
              vec3 base = mix(vec3(0.02, 0.05, 0.16), vec3(0.09, 0.2, 0.52), clamp(trap.y * 1.4, 0.0, 1.0));
              base = mix(base, vec3(0.28, 0.55, 1.0), clamp(pow(trap.z, 3.0) * 0.8, 0.0, 1.0));
              col = base * (0.1 + 0.9 * dif) * (0.2 + 0.8 * ao);
              col += vec3(0.5, 0.72, 1.35) * fr * ao * 1.1;                      // luminous edges
              vec3 h = normalize(L - rd);
              col += vec3(0.8, 0.9, 1.2) * pow(clamp(dot(n, h), 0.0, 1.0), 40.0) * dif * ao;
              col += vec3(0.12, 0.55, 1.0) * pow(1.0 - ao, 3.0) * 0.5;                // cyan light pooled in crevices
              col = mix(col, bg, 1.0 - exp(-0.02 * t * t));
            }
          }
          col += vec3(0.25, 0.42, 1.0) * glow * (hitAny ? 0.15 : 0.6);
          col += vec3(0.06, 0.12, 0.3) * exp(-vig * vig * 1.5) * 0.35;
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
    quad.frustumCulled = false;
    scene.add(quad);

    const cam = new THREE.Vector3();
    const m4 = new THREE.Matrix4();
    const up = new THREE.Vector3(0, 1, 0), origin = new THREE.Vector3();
    return (t) => {
      uniforms.uTime.value = t;
      uniforms.uPower.value = 8.0 + Math.sin(t * 0.12) * 2.2;
      const yaw = t * 0.1 + pointer.x * 1.6;
      const pitch = 0.25 + pointer.y * 0.7;
      const dist = 3.8 + Math.sin(t * 0.17) * 0.15;
      cam.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)).multiplyScalar(dist);
      m4.lookAt(cam, origin, up);
      uniforms.uRot.value.setFromMatrix4(m4);
      uniforms.uCam.value.copy(cam);
    };
  },
};
