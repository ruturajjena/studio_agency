/**
 * SIGNATURE ELEMENT #2 — WebGL image hover-distortion shaders.
 *
 * A textured plane that, on hover, warps toward the cursor with a liquid ripple
 * and a tasteful RGB split. Everything is scaled by `uHover` (0→1, eased in JS)
 * so on mouse-leave it settles smoothly back to a clean image.
 *
 * Kept as exported strings so it works without a GLSL loader; the webpack rule
 * in next.config.mjs also lets buyers move these into .glsl files if preferred.
 */

export const vertexShader = /* glsl */ `
  varying vec2 vUv;

  uniform float uHover;
  uniform vec2  uMouse;
  uniform float uTime;

  void main() {
    vUv = uv;

    // A gentle bulge toward the cursor gives the flat plane a sense of depth.
    vec3 pos = position;
    float d = distance(uv, uMouse);
    float bulge = smoothstep(0.45, 0.0, d) * uHover;
    pos.z += bulge * 0.18;
    pos.z += sin(uv.x * 6.0 + uTime) * 0.01 * uHover;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

export const fragmentShader = /* glsl */ `
  precision highp float;

  varying vec2 vUv;

  uniform sampler2D uTexture;
  uniform vec2  uMouse;        // pointer in plane space (0..1)
  uniform float uHover;        // eased hover amount 0..1
  uniform float uTime;
  uniform float uImageAspect;  // texture width / height
  uniform float uPlaneAspect;  // plane  width / height
  uniform vec3  uAccent;       // accent colour for the bloom tint

  // background-cover style UV so the image never squashes.
  vec2 coverUv(vec2 uv) {
    vec2 ratio = vec2(
      min(uPlaneAspect / uImageAspect, 1.0),
      min((1.0 / uPlaneAspect) / (1.0 / uImageAspect), 1.0)
    );
    return vec2(
      uv.x * ratio.x + (1.0 - ratio.x) * 0.5,
      uv.y * ratio.y + (1.0 - ratio.y) * 0.5
    );
  }

  void main() {
    vec2 uv = coverUv(vUv);

    // Radial falloff around the cursor — strongest under the pointer.
    vec2 dir = vUv - uMouse;
    float dist = length(dir);
    float falloff = smoothstep(0.55, 0.0, dist);
    float amt = uHover * falloff;

    // Liquid ripple travelling out from the cursor.
    float ripple = sin(dist * 22.0 - uTime * 3.2) * 0.5 + 0.5;

    // Warp UVs toward the cursor + a soft ambient wobble while hovered.
    vec2 warp = dir * amt * 0.16;
    warp += vec2(
      sin(vUv.y * 12.0 + uTime * 1.2),
      cos(vUv.x * 12.0 + uTime * 1.2)
    ) * 0.004 * uHover;
    vec2 sUv = uv - warp;

    // RGB split scaled by proximity to the cursor.
    float shift = amt * 0.018 + ripple * amt * 0.004;
    float r = texture2D(uTexture, sUv + vec2(shift, 0.0)).r;
    float g = texture2D(uTexture, sUv).g;
    float b = texture2D(uTexture, sUv - vec2(shift, 0.0)).b;
    vec3 col = vec3(r, g, b);

    // A whisper of accent bloom where the ripple crests near the cursor.
    col += uAccent * ripple * amt * 0.05;

    gl_FragColor = vec4(col, 1.0);
  }
`;
