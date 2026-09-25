// 15 — Liquid Metaballs: raymarched chrome droplets that merge, stretch and split; one rides the cursor.
export default {
  id: "15",
  name: "Liquid Metaballs",
  blurb: "Raymarched droplets of liquid chrome merge and split. One of them follows your cursor.",
  bloom: { strength: 0.7, radius: 0.5, threshold: 0.82 },
  exposure: 1.0,

  setup({ THREE, scene, pointer, size, onResize }) {
    const uniforms = {
      uTime: { value: 0 },
      uAspect: { value: 1 },
      uPtr: { value: new THREE.Vector3() },
    };
    onResize((s) => (uniforms.uAspect.value = s.aspect));

    const mat = new THREE.ShaderMaterial({
      uniforms, depthTest: false, depthWrite: false,
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
      fragmentShader: /* glsl */ `
        precision highp float;
        uniform float uTime, uAspect; uniform vec3 uPtr; varying vec2 vUv;
        vec3 B[7];
        float smin(float a, float b, float k){ float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0); return mix(b, a, h) - k * h * (1.0 - h); }
        float map(vec3 p){
          float d = length(p - uPtr) - 0.52;
          for (int i = 0; i < 7; i++) d = smin(d, length(p - B[i]) - (0.42 + 0.05 * float(i % 3)), 0.55);
          return d;
        }
        vec3 nrm(vec3 p){
          vec2 e = vec2(0.0015, 0.0);
          return normalize(vec3(map(p + e.xyy) - map(p - e.xyy), map(p + e.yxy) - map(p - e.yxy), map(p + e.yyx) - map(p - e.yyx)));
        }
        // Procedural studio environment: dark gradient with luminous softbox strips.
        vec3 env(vec3 r){
          vec3 c = mix(vec3(0.01, 0.02, 0.05), vec3(0.05, 0.1, 0.24), smoothstep(-0.6, 0.8, r.y));
          c += vec3(2.6, 2.9, 3.4) * smoothstep(0.84, 0.9, r.y) * smoothstep(0.35, 0.0, abs(r.x));
          c += vec3(0.6, 1.2, 3.2) * smoothstep(0.08, 0.0, abs(r.x + 0.7)) * smoothstep(-0.3, 0.2, r.y);
          c += vec3(1.3, 1.0, 3.0) * smoothstep(0.06, 0.0, abs(r.x - 0.75)) * smoothstep(-0.4, 0.1, r.y) * 0.8;
          c += vec3(0.2, 0.55, 1.3) * smoothstep(-0.55, -0.9, r.y);
          c += vec3(1.8, 2.0, 2.4) * smoothstep(0.93, 0.98, dot(r, normalize(vec3(0.3, 0.35, 1.0))));
          return c;
        }
        void main(){
          float t = uTime;
          for (int i = 0; i < 7; i++){
            float f = float(i);
            B[i] = vec3(sin(t * (0.31 + f * 0.07) + f * 1.7) * (1.25 + 0.2 * f / 7.0) * min(uAspect, 1.8) * 0.9,
                        cos(t * (0.27 + f * 0.05) + f * 2.3) * 0.72 + 0.5,
                        sin(t * (0.23 + f * 0.04) + f * 0.9) * 0.7);
          }
          vec2 uv = (vUv * 2.0 - 1.0) * vec2(uAspect, 1.0);
          vec3 ro = vec3(0.0, 0.25, 6.0);
          vec3 rd = normalize(vec3(uv, -2.6));
          float d = 0.0, h = 1.0, mh = 1e3;
          for (int i = 0; i < 72; i++){
            h = map(ro + rd * d); mh = min(mh, h);
            if (h < 0.001 || d > 10.0) break;
            d += h * 0.9;
          }
          // Background: deep navy with a soft centre glow.
          vec3 col = mix(vec3(0.006, 0.014, 0.04), vec3(0.02, 0.045, 0.12), exp(-dot(uv - vec2(0.0, 0.25), uv - vec2(0.0, 0.25)) * 0.9));
          float glow = 0.0;
          if (h < 0.01){
            vec3 p = ro + rd * d;
            vec3 n = nrm(p);
            vec3 r = reflect(rd, n);
            float fr = 0.25 + 0.75 * pow(1.0 - max(dot(n, -rd), 0.0), 4.0);
            vec3 tint = vec3(0.7, 0.8, 1.0);
            col = env(r) * tint * (0.35 + 0.65 * fr);
            col += vec3(0.25, 0.5, 1.4) * pow(1.0 - max(dot(n, -rd), 0.0), 3.0) * 0.8;
            float ao = clamp(map(p + n * 0.25) / 0.25, 0.0, 1.0);
            col *= 0.5 + 0.5 * ao;
          } else {
            // Faint halo around the metaballs using the closest distance reached.
            glow = exp(-max(mh, 0.0) * 5.0);
          }
          col += vec3(0.08, 0.16, 0.42) * glow * 0.25;
          float vig = smoothstep(1.9, 0.4, length(uv * vec2(0.7, 1.0)));
          gl_FragColor = vec4(col * mix(0.6, 1.0, vig), 1.0);
        }`,
    });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
    quad.frustumCulled = false;
    scene.add(quad);

    const p = new THREE.Vector3();
    return (t) => {
      uniforms.uTime.value = t;
      // Map the cursor onto the z=0.3 plane of the raymarch camera (ro.z = 6, focal 2.6).
      p.set(pointer.x * size.aspect * (5.7 / 2.6), pointer.y * (5.7 / 2.6) + 0.25, 0.3);
      uniforms.uPtr.value.lerp(p, 0.12);
    };
  },
};
