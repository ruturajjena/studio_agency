// 05 — Wireframe Ridges: an endless moonlit flyover of hidden-line mountain ridges.
export default {
  id: "05",
  name: "Wireframe Ridges",
  blurb: "An endless night flight over glowing wireframe mountains beneath a full moon. Your cursor banks the camera.",
  camera: { fov: 55, position: [0, 4.2, 10], target: [0, 2.6, -30] },
  bloom: { strength: 0.8, radius: 0.5, threshold: 0.72 },
  exposure: 1.0,

  setup({ THREE, scene, camera, sky, pointer, palette, glsl, rand, target }) {
    const FOG = new THREE.Color("#10224a");
    sky({ top: "#01030a", mid: "#081733", horizon: "#1a3266", below: "#10224a", haze: 0.45 });

    const uniforms = {
      uTime: { value: 0 },
      uFog: { value: FOG },
      uLine: { value: new THREE.Color(palette.ice) },
      uHot: { value: new THREE.Color(palette.glow) },
    };
    const W = 90, D = 130;
    const geo = new THREE.PlaneGeometry(W, D, 220, 280);
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, 0, -D / 2 + 12);
    const terrain = new THREE.Mesh(
      geo,
      new THREE.ShaderMaterial({
        uniforms,
        vertexShader: /* glsl */ `
          uniform float uTime; varying vec2 vW; varying float vH; varying float vDist;
          ${glsl.noise}
          float ridged(vec2 p){ float s=0.0, a=0.55; for(int i=0;i<4;i++){ float n=1.0-abs(snoise(vec3(p,1.7))); s+=n*n*a; p=p*2.07+vec2(3.1,1.3); a*=0.48; } return s; }
          void main(){
            vec3 p = position;
            vec2 w = vec2(p.x, p.z - uTime * 7.0);
            float cx = sin(w.y * 0.035) * 3.0;               // meandering valley
            float valley = smoothstep(1.8, 11.0, abs(p.x - cx));
            float h = ridged(w * 0.055) * 9.0 * valley + snoise(vec3(w * 0.12, 0.0)) * 0.35;
            h *= smoothstep(-128.0, -80.0, p.z) * 0.6 + 0.4; // lower far skyline
            p.y = h - 0.6;
            vW = w; vH = h;
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            vDist = -mv.z;
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uFog, uLine, uHot; varying vec2 vW; varying float vH; varying float vDist;
          float grid(vec2 p){ vec2 g = abs(fract(p - 0.5) - 0.5) / fwidth(p); return 1.0 - min(min(g.x, g.y), 1.0); }
          void main(){
            float l = grid(vW * 1.25);
            float ridge = smoothstep(2.0, 9.0, vH);
            vec3 fill = mix(vec3(0.008, 0.016, 0.04), vec3(0.03, 0.06, 0.14), ridge);
            vec3 line = mix(uLine * 0.2, uHot * 2.0, ridge * ridge);
            float near = smoothstep(3.0, 16.0, vDist);          // soften lines right under the camera
            vec3 col = fill + line * l * (0.2 + 0.8 * near);
            float fog = 1.0 - exp(-pow(vDist / 95.0, 2.2) * 2.5);
            gl_FragColor = vec4(mix(col, uFog, fog), 1.0);
          }`,
      })
    );
    terrain.frustumCulled = false;
    scene.add(terrain);

    // Moon with a soft halo, sitting over the valley.
    const moon = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
        vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
        fragmentShader: `${glsl.noise}
          varying vec2 vUv;
          void main(){ vec2 p=(vUv-0.5)*2.0; float r=length(p);
            float disc=smoothstep(0.25,0.245,r);
            float mare=snoise(vec3(p*9.0,2.0))*0.5+snoise(vec3(p*22.0,5.0))*0.25;
            vec3 moon=vec3(0.82,0.9,1.08)*(0.62+0.38*mare)*(1.0-0.3*pow(r/0.25,4.0));
            float halo=(exp(-max(r-0.24,0.0)*10.0)*0.3+exp(-r*3.0)*0.12)*smoothstep(1.0,0.55,r);
            gl_FragColor=vec4(moon*disc+vec3(0.5,0.65,1.0)*halo*(1.0-disc),1.0);}`,
      })
    );
    moon.position.set(-14, 34, -170);
    moon.scale.setScalar(80);
    scene.add(moon);

    // Stars.
    const R = rand(5), n = 1500, sp = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = R() * Math.PI * 2, e = 0.05 + Math.pow(R(), 0.7) * 1.4;
      sp.set([Math.cos(a) * Math.cos(e) * 250, Math.sin(e) * 250, Math.sin(a) * Math.cos(e) * 250], i * 3);
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute("position", new THREE.BufferAttribute(sp, 3));
    scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: palette.glow, size: 0.7, transparent: true, opacity: 0.75, depthWrite: false, fog: false })));

    const look = new THREE.Vector3();
    return (t) => {
      uniforms.uTime.value = t;
      moon.lookAt(camera.position);
      camera.position.set(pointer.x * 2.2, 4.2 + pointer.y * 1.2 + Math.sin(t * 0.5) * 0.15, 10);
      look.set(target.x + pointer.x * 6, target.y + pointer.y * 4, target.z);
      camera.lookAt(look);
      camera.rotateZ(-pointer.x * 0.2 + Math.sin(t * 0.3) * 0.02);
    };
  },
};
