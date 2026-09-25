// 01 — Liquid Monolith: a tall slab whose surface ripples like liquid chrome.
export default {
  id: "01",
  name: "Liquid Monolith",
  blurb: "A standing slab of liquid chrome. Ripples chase your cursor across its face.",
  theme: "prism",
  camera: { fov: 35, position: [0, 0.6, 9], target: [0, 0.4, 0] },
  bloom: { strength: 0.6, radius: 0.6, threshold: 0.88 },
  exposure: 1.0,

  setup({ THREE, scene, sky, renderer, pointer, glsl, palette }) {
    const skyMesh = sky({ haze: 0.35 });

    // Reflections come from the sky itself.
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envScene = new THREE.Scene();
    envScene.add(skyMesh.clone());
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(40, 3), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 3.4, 4) }));
    glow.position.set(0, 2, -60);
    envScene.add(glow);
    scene.environment = pmrem.fromScene(envScene, 0.01, 0.1, 500).texture;

    const uniforms = { uTime: { value: 0 }, uPointer: { value: new THREE.Vector2() } };
    const mat = new THREE.MeshPhysicalMaterial({ color: 0x9fb6e0, metalness: 1, roughness: 0.08, clearcoat: 1 });
    mat.onBeforeCompile = (s) => {
      Object.assign(s.uniforms, uniforms);
      s.vertexShader = s.vertexShader
        .replace("#include <common>", `#include <common>\nuniform float uTime; uniform vec2 uPointer;\n${glsl.noise}
          float surf(vec3 p){
            float d = distance(p.xy, uPointer * vec2(1.2, 2.4));
            return snoise(vec3(p.xy * 0.9, uTime * 0.35)) * 0.06 + sin(d * 9.0 - uTime * 4.0) * 0.035 * exp(-d * 1.2);
          }`)
        .replace("#include <beginnormal_vertex>", `#include <beginnormal_vertex>
          float e = 0.02; float h0 = surf(position);
          vec3 nd = normalize(vec3(h0 - surf(position + vec3(e,0,0)), h0 - surf(position + vec3(0,e,0)), 0.0) * vec3(1.0/e) * 0.6 + objectNormal);
          objectNormal = mix(objectNormal, nd, step(0.5, abs(objectNormal.z)));`)
        .replace("#include <begin_vertex>", `#include <begin_vertex>\n transformed += normal * surf(position) * step(0.5, abs(normal.z));`);
    };
    const slab = new THREE.Mesh(new THREE.BoxGeometry(2.2, 4.6, 0.35, 120, 240, 1), mat);
    slab.position.y = 0.5;
    scene.add(slab);

    // Glowing base line where the slab meets the floor.
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(80, 64),
      new THREE.MeshStandardMaterial({ color: palette.ink, metalness: 0.6, roughness: 0.35 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.8;
    scene.add(floor);
    const seam = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.02, 0.6), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.3, 1.6, 2.2), toneMapped: false }));
    seam.position.y = -1.79;
    scene.add(seam);

    return (t) => {
      uniforms.uTime.value = t;
      uniforms.uPointer.value.copy(pointer);
      slab.rotation.y = Math.sin(t * 0.25) * 0.35 + pointer.x * 0.4;
    };
  },
};
