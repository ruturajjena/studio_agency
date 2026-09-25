// 19 — Event Horizon: a black hole bending light from its white-blue accretion disk into a halo.
export default {
  id: "19",
  name: "Event Horizon",
  blurb: "A black hole wrapped in a lensed accretion disk of white-blue fire. Move to orbit the view.",
  bloom: { strength: 0.7, radius: 0.45, threshold: 0.85 },
  exposure: 1.0,
  background: "#010208",

  setup({ THREE, scene, pointer, glsl, onResize }) {
    const uniforms = { uTime: { value: 0 }, uAspect: { value: 1 }, uCam: { value: new THREE.Vector3(0, 2, 15) } };
    onResize((s) => (uniforms.uAspect.value = s.aspect));

    const mat = new THREE.ShaderMaterial({
      uniforms, depthTest: false, depthWrite: false,
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
      fragmentShader: /* glsl */ `
        precision highp float;
        uniform float uTime, uAspect; uniform vec3 uCam; varying vec2 vUv;
        ${glsl.noise}
        float hash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
        vec3 stars(vec3 d){
          vec3 col = vec3(0.001, 0.002, 0.007) + vec3(0.008, 0.016, 0.045) * smoothstep(0.2, 0.9, snoise(d * 2.2) * 0.5 + 0.5);
          vec2 sp = vec2(atan(d.z, d.x), asin(clamp(d.y, -1.0, 1.0))) * 70.0;
          vec2 c = floor(sp);
          float h = hash(vec3(c, 7.0));
          vec2 f = fract(sp) - 0.5 - (vec2(hash(vec3(c, 1.0)), hash(vec3(c, 2.0))) - 0.5) * 0.5;
          col += vec3(0.8, 0.9, 1.3) * step(0.982, h) * smoothstep(0.1, 0.0, length(f)) * (0.3 + 1.2 * fract(h * 91.0));
          return col;
        }
        vec4 disk(vec3 p, vec3 rd){
          float r = length(p.xz);
          if (r < 2.4 || r > 9.5) return vec4(0.0);
          float a = atan(p.z, p.x) + uTime * 2.2 / pow(r, 1.5);
          vec2 q = vec2(cos(a), sin(a)) * r;
          float n = snoise(vec3(q * 0.9, uTime * 0.1)) * 0.5 + snoise(vec3(q * 2.3, 1.7)) * 0.3 + snoise(vec3(r * 3.5, 0.0, 3.0)) * 0.45;
          float dens = smoothstep(2.4, 2.9, r) * smoothstep(9.5, 5.0, r) * clamp(0.55 + n * 0.6, 0.0, 1.0);
          vec3 vel = normalize(vec3(-p.z, 0.0, p.x));
          float beam = pow(1.0 + 0.45 * dot(vel, -rd), 2.2);
          float heat = smoothstep(9.0, 2.6, r);
          vec3 col = mix(vec3(0.06, 0.12, 0.45), vec3(1.0, 1.2, 1.7), heat * heat) * (0.25 + 0.9 * heat) * beam;
          return vec4(col * dens, dens * 0.85);
        }
        void main(){
          vec2 uv = (vUv * 2.0 - 1.0) * vec2(uAspect, 1.0);
          uv.y -= 0.12;
          vec3 fw = normalize(-uCam);
          vec3 rt = normalize(cross(fw, vec3(0.0, 1.0, 0.0)));
          vec3 up = cross(rt, fw);
          vec3 v = normalize(fw * 1.9 + uv.x * rt + uv.y * up);
          vec3 p = uCam;
          float h2 = dot(cross(p, v), cross(p, v));
          vec3 col = vec3(0.0); float trans = 1.0; bool hole = false; float glow = 0.0;
          // Disk crossings are recorded in the loop and shaded afterwards (keeps the loop body small).
          vec3 cpA = vec3(0.0), cpB = vec3(0.0), cpC = vec3(0.0), dA = vec3(0.0), dB = vec3(0.0), dC = vec3(0.0); int nc = 0;
          for (int i = 0; i < 80; i++){
            float r = length(p);
            float dt = clamp(0.11 * r, 0.03, 1.6);
            vec3 acc = -1.5 * h2 * p / pow(r, 5.0);
            vec3 np = p + v * dt;
            v += acc * dt;
            if (sign(np.y) != sign(p.y)){
              vec3 cp = mix(p, np, p.y / (p.y - np.y));
              if (nc == 0) { cpA = cp; dA = v; } else if (nc == 1) { cpB = cp; dB = v; } else if (nc == 2) { cpC = cp; dC = v; }
              nc++;
            }
            p = np;
            r = length(p);
            glow += exp(-pow((r - 1.6) * 2.5, 2.0)) * dt;
            if (r < 1.0){ hole = true; break; }
            if (r > 40.0) break;
          }
          if (nc > 0) { vec4 d = disk(cpA, normalize(dA)); col += d.rgb * trans; trans *= 1.0 - d.a; }
          if (nc > 1) { vec4 d = disk(cpB, normalize(dB)); col += d.rgb * trans; trans *= 1.0 - d.a; }
          if (nc > 2) { vec4 d = disk(cpC, normalize(dC)); col += d.rgb * trans; trans *= 1.0 - d.a; }
          if (!hole) col += stars(normalize(v)) * trans;
          if (!hole) col += vec3(0.2, 0.35, 0.9) * glow * 0.03 * trans;
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
    quad.frustumCulled = false;
    scene.add(quad);

    return (t) => {
      uniforms.uTime.value = t;
      const yaw = t * 0.05 + pointer.x * 1.1;
      const el = 0.13 + pointer.y * 0.35;
      const d = 13;
      uniforms.uCam.value.set(Math.sin(yaw) * Math.cos(el) * d, Math.sin(el) * d, Math.cos(yaw) * Math.cos(el) * d);
    };
  },
};
