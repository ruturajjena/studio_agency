// 45 — Kaleido Tunnel: a flight through a mirrored crystal tunnel folded into kaleidoscopic symmetry.
export default {
  id: "45",
  name: "Kaleido Tunnel",
  blurb: "A kaleidoscopic tunnel of mirrored crystal. Your cursor turns the prism and changes its symmetry.",
  bloom: { strength: 0.9, radius: 0.55, threshold: 0.65 },
  exposure: 1.0,

  setup({ THREE, scene, pointer, size, onResize, renderer, composer }) {
    const pr = Math.min(window.devicePixelRatio, 1);
    renderer.setPixelRatio(pr);
    composer.setPixelRatio(pr);

    const uniforms = {
      uTime: { value: 0 },
      uRes: { value: new THREE.Vector2(1, 1) },
      uN: { value: 6 },
      uRot: { value: 0 },
      uTilt: { value: new THREE.Vector2() },
    };
    const setRes = () => uniforms.uRes.value.set(size.width, size.height);
    onResize(setRes);
    setRes();

    const mat = new THREE.ShaderMaterial({
      uniforms, depthWrite: false, depthTest: false, toneMapped: false,
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
      fragmentShader: /* glsl */ `
        precision highp float;
        uniform float uTime, uN, uRot; uniform vec2 uRes, uTilt; varying vec2 vUv;
        #define PI 3.14159265
        mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
        float sdOct(vec3 p, float s){ p = abs(p); return (p.x + p.y + p.z - s) * 0.57735027; }
        float sdBox(vec3 p, vec3 b){ vec3 q = abs(p) - b; return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0); }

        // Fold into one mirrored wedge of an N-fold kaleidoscope.
        vec3 fold(vec3 p, float n, float a0){
          float a = atan(p.y, p.x) + a0 + p.z * 0.06;
          float seg = 2.0 * PI / n;
          a = mod(a, seg) - 0.5 * seg;
          a = abs(a);
          float r = length(p.xy);
          return vec3(cos(a) * r, sin(a) * r, p.z);
        }
        float cellId, matId; vec3 local;
        float map(vec3 p){
          vec3 q = fold(p, uN, uRot);
          float wall = 2.2 - q.x;                                          // N-gon tunnel wall
          float per = 1.6;
          cellId = floor(q.z / per);
          vec3 c = vec3(q.x - 1.55, q.y, mod(q.z, per) - 0.5 * per);
          c.xz *= rot(cellId * 0.7 + uTime * 0.3);
          c.xy *= rot(0.6);
          float crystal = sdOct(c, 0.42 + 0.1 * sin(cellId * 1.7));
          vec3 b = vec3(q.x - 2.05, q.y - 0.18, mod(q.z + 0.8, per) - 0.5 * per);
          b.yz *= rot(0.785);
          float beam = sdBox(b, vec3(0.12, 0.05, 0.05)) - 0.01;
          float d = min(wall, beam);
          matId = beam < wall ? 2.0 : 0.0;
          if (crystal < d){ d = crystal; matId = 1.0; local = c; }
          return d;
        }
        vec3 normal(vec3 p){
          vec2 e = vec2(0.002, 0.0);
          return normalize(vec3(map(p + e.xyy) - map(p - e.xyy), map(p + e.yxy) - map(p - e.yxy), map(p + e.yyx) - map(p - e.yyx)));
        }

        void main(){
          vec2 uv = (vUv * 2.0 - 1.0) * vec2(uRes.x / uRes.y, 1.0);
          uv.y -= 0.1;
          float z0 = uTime * 1.6;
          vec3 ro = vec3(0.0, 0.0, z0);
          vec3 rd = normalize(vec3(uv, 1.6));
          rd.yz *= rot(uTilt.y * 0.25);
          rd.xz *= rot(uTilt.x * 0.25);
          rd.xy *= rot(uTime * 0.05);

          float t = 0.0, d = 1.0;
          for (int i = 0; i < 72; i++){
            vec3 p = ro + rd * t;
            d = map(p);
            if (d < 0.001 * (1.0 + t) || t > 30.0) break;
            t += d * 0.85;
          }
          vec3 col = vec3(0.004, 0.008, 0.02);
          vec3 p = ro + rd * t;
          float fog = exp(-t * 0.085);
          if (t < 30.0){
            vec3 n = normal(p);
            map(p);
            vec3 q = fold(p, uN, uRot);
            // lights: a cold beacon at the end of the tunnel and a lamp at the camera
            vec3 l = normalize(vec3(0.0, 0.0, z0 + 14.0) - p);
            float dif = max(dot(n, l), 0.0);
            float head = max(dot(n, -rd), 0.0);
            float fr = pow(1.0 - head, 4.0);
            float hue = fract(cellId * 0.137);
            vec3 accent = hue < 0.15 ? vec3(0.25, 0.85, 1.2) : hue < 0.25 ? vec3(0.55, 0.45, 1.3) : vec3(0.6, 0.78, 1.3);
            vec3 h = normalize(l - rd);
            float spec = pow(max(dot(n, h), 0.0), 60.0);
            float pulse = 0.5 + 0.5 * sin(q.z * 0.8 - uTime * 4.0);
            if (matId > 0.5 && matId < 1.5){
              // crystal: dark glassy facets with burning edges
              vec3 a = abs(local);
              float edge = smoothstep(0.035, 0.0, min(a.x, min(a.y, a.z)));
              col = mix(vec3(0.015, 0.035, 0.1), vec3(0.08, 0.18, 0.45), head) * (0.25 + dif);
              col += accent * (fr * 0.45 + edge * (0.7 + 0.8 * pulse));
              col += vec3(0.8, 0.9, 1.3) * spec * 1.2;
            } else if (matId > 1.5){
              col = accent * 0.9 * (0.3 + 0.7 * pulse);                        // lit beams
            } else {
              // wall: near-black tiles with etched rings and mirror seams
              col = vec3(0.01, 0.02, 0.055) * (0.4 + dif) + vec3(0.1, 0.18, 0.4) * spec * 0.4;
              float ring = smoothstep(0.025, 0.0, abs(mod(q.z, 1.6) - 0.8));
              float seam = smoothstep(0.02, 0.0, q.y);
              col += vec3(0.4, 0.6, 1.3) * (ring * (0.25 + 1.2 * pulse) + seam * 0.5);
            }
          }
          col = mix(vec3(0.012, 0.028, 0.075), col, fog);
          // bright vanishing point
          float c = length(uv - vec2(-uTilt.x, -uTilt.y) * 0.4);
          col += vec3(0.6, 0.78, 1.3) * exp(-c * 12.0) * (1.0 - fog) * 0.9;
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
    quad.frustumCulled = false;
    scene.add(quad);

    let rot = 0, n = 6;
    return (t, dt) => {
      uniforms.uTime.value = t;
      // Horizontal position picks the fold count (5–9), vertical spins the prism.
      const target = 7 + Math.round(pointer.x * 2);
      n += (target - n) * Math.min(1, dt * 4);
      uniforms.uN.value = Math.round(n);
      rot += dt * (0.12 + pointer.y * 0.9);
      uniforms.uRot.value = rot;
      uniforms.uTilt.value.copy(pointer);
    };
  },
};
