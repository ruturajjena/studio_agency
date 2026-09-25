// 20 — Aurora Lake: auroral curtains rippling over a mountain lake that mirrors them.
export default {
  id: "20",
  name: "Aurora Lake",
  blurb: "Curtains of aurora ripple above a still mountain lake that mirrors them. Your cursor pushes the light.",
  bloom: { strength: 0.7, radius: 0.6, threshold: 0.75 },
  exposure: 1.0,
  background: "#020510",

  setup({ THREE, scene, pointer, onResize }) {
    const uniforms = { uTime: { value: 0 }, uAspect: { value: 1 }, uPtr: { value: new THREE.Vector2() } };
    onResize((s) => (uniforms.uAspect.value = s.aspect));

    const mat = new THREE.ShaderMaterial({
      uniforms, depthTest: false, depthWrite: false,
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
      fragmentShader: /* glsl */ `
        precision highp float;
        uniform float uTime, uAspect; uniform vec2 uPtr; varying vec2 vUv;
        float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
        mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, s, -s, c); }
        float tri(float x){ return clamp(abs(fract(x) - 0.5), 0.01, 0.49); }
        vec2 tri2(vec2 p){ return vec2(tri(p.x) + tri(p.y), tri(p.y + tri(p.x))); }
        // Layered triangle-wave noise gives the folded, streaky curtain texture.
        float curtain(vec2 p){
          float z = 1.8, z2 = 2.5, rz = 0.0;
          p *= rot(p.x * 0.06);
          vec2 bp = p;
          for (int i = 0; i < 5; i++){
            vec2 dg = tri2(bp * 1.85) * 0.75;
            dg *= rot(uTime * 0.07);
            p -= dg / z2;
            bp *= 1.3; z2 *= 0.45; z *= 0.42;
            p *= 1.21 + (rz - 1.0) * 0.02;
            rz += tri(p.x + tri(p.y)) * z;
            p *= -mat2(0.95534, 0.29552, -0.29552, 0.95534);
          }
          return clamp(1.0 / pow(rz * 29.0, 1.3), 0.0, 0.55);
        }
        vec3 aurora(vec3 rd){
          vec3 col = vec3(0.0), avg = vec3(0.0);
          float jit = hash(gl_FragCoord.xy);
          for (int i = 0; i < 36; i++){
            float fi = float(i);
            float pt = (0.8 + pow(fi, 1.4) * 0.002) / (rd.y * 2.0 + 0.4) - 0.006 * jit * smoothstep(0.0, 15.0, fi);
            vec2 p = (pt * rd).zx + vec2(uTime * 0.03, 0.0) + uPtr;
            float n = curtain(p);
            vec3 c = mix(vec3(0.45, 1.0, 1.15), vec3(0.4, 0.55, 1.2), smoothstep(4.0, 22.0, fi));
            c = mix(c, vec3(0.6, 0.4, 1.2), smoothstep(18.0, 35.0, fi));
            avg = mix(avg, c * n, 0.5);
            col += avg * exp2(-fi * 0.065 - 2.5) * smoothstep(0.0, 5.0, fi);
          }
          return col * clamp(rd.y * 15.0 + 0.4, 0.0, 1.0) * smoothstep(0.85, 0.2, rd.y) * 1.9;
        }
        float ridge(float az){
          return 0.04 + 0.03 * sin(az * 3.1 + 1.3) + 0.014 * sin(az * 7.3 + 0.4) + 0.006 * sin(az * 17.0) + 0.003 * sin(az * 41.0);
        }
        vec3 sky(vec3 rd){
          vec3 col = mix(vec3(0.02, 0.04, 0.1), vec3(0.003, 0.006, 0.02), smoothstep(0.0, 0.5, rd.y));
          vec2 sp = vec2(atan(rd.x, rd.z), rd.y) * 160.0;
          vec2 c = floor(sp); vec2 f = fract(sp) - 0.5;
          float h = hash(c);
          col += vec3(0.8, 0.9, 1.3) * step(0.985, h) * smoothstep(0.2, 0.0, length(f)) * (0.5 + 0.5 * sin(uTime * 2.0 + h * 50.0));
          vec3 a = aurora(rd);
          col = col * (1.0 - clamp(length(a), 0.0, 1.0) * 0.6) + a;
          return col;
        }
        void main(){
          vec2 uv = (vUv * 2.0 - 1.0) * vec2(uAspect, 1.0);
          vec3 rd = normalize(vec3(uv.x, uv.y + 0.22, 1.5));
          rd.xz *= rot(uPtr.x * 0.12);
          float az = atan(rd.x, rd.z);
          bool lake = rd.y < 0.0;
          // Below the horizon, trace the mirrored ray (with a faint ripple) instead.
          vec3 sr = rd;
          if (lake){
            float dist = min(1.0 / max(-rd.y, 0.001), 60.0);
            sr = vec3(rd.x, -rd.y, rd.z);
            sr.x += sin(dist * 1.3 + uTime * 0.8) * 0.0012 * dist / 30.0;
            sr.y += sin(dist * 2.1 - uTime * 1.1 + rd.x * 20.0) * 0.001;
            sr = normalize(sr);
          }
          float m = ridge(az);
          vec3 col = sky(sr);
          if (sr.y < m) col = lake ? vec3(0.003, 0.006, 0.015) : mix(vec3(0.004, 0.008, 0.02), vec3(0.02, 0.04, 0.09), smoothstep(m - 0.004, m, sr.y));
          if (lake){
            float fres = 0.35 + 0.55 * pow(1.0 - clamp(-rd.y * 4.0, 0.0, 1.0), 3.0);
            col = col * fres + vec3(0.002, 0.004, 0.01);
            col += vec3(0.1, 0.18, 0.4) * exp(rd.y * 90.0) * 0.25;
          }
          col += vec3(0.08, 0.14, 0.3) * exp(-abs(rd.y) * 45.0) * 0.5;
          // Colours above are authored in display space; convert to linear for the tone-mapped pipeline.
          gl_FragColor = vec4(pow(max(col, 0.0), vec3(2.2)) * 1.15, 1.0);
        }`,
    });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
    quad.frustumCulled = false;
    scene.add(quad);

    return (t) => {
      uniforms.uTime.value = t;
      uniforms.uPtr.value.set(pointer.x * 1.2, pointer.y * 0.8);
    };
  },
};
