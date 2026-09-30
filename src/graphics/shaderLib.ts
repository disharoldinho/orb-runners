import { useFrame } from '@react-three/fiber';

/**
 * Shared uniforms for every procedural shader (materials, sky, particles, lava).
 * One object so a single per-frame update drives all animated surfaces.
 */
export const sharedUniforms = {
  uTime: { value: 0 },
  /** 0..1 storm lightning flash, read by the sky and terrain shaders. */
  uFlash: { value: 0 },
};

/** Advances the shared shader clock. Mount once inside the Canvas. */
export function ShaderClock() {
  useFrame((_, delta) => {
    sharedUniforms.uTime.value += Math.min(delta, 0.1);
    sharedUniforms.uFlash.value = Math.max(0, sharedUniforms.uFlash.value - delta * 3.2);
  });
  return null;
}

/** Hash / value-noise / fbm helpers shared by all procedural shaders. */
export const GLSL_NOISE = /* glsl */ `
float orbHash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float orbHash13(vec3 p3) {
  p3 = fract(p3 * 0.1031);
  p3 += dot(p3, p3.zyx + 31.32);
  return fract((p3.x + p3.y) * p3.z);
}
vec2 orbHash22(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}
float orbNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(orbHash12(i), orbHash12(i + vec2(1.0, 0.0)), u.x),
             mix(orbHash12(i + vec2(0.0, 1.0)), orbHash12(i + vec2(1.0, 1.0)), u.x), u.y);
}
float orbNoise3(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  vec3 u = f * f * (3.0 - 2.0 * f);
  float n000 = orbHash13(i), n100 = orbHash13(i + vec3(1, 0, 0));
  float n010 = orbHash13(i + vec3(0, 1, 0)), n110 = orbHash13(i + vec3(1, 1, 0));
  float n001 = orbHash13(i + vec3(0, 0, 1)), n101 = orbHash13(i + vec3(1, 0, 1));
  float n011 = orbHash13(i + vec3(0, 1, 1)), n111 = orbHash13(i + vec3(1, 1, 1));
  return mix(mix(mix(n000, n100, u.x), mix(n010, n110, u.x), u.y),
             mix(mix(n001, n101, u.x), mix(n011, n111, u.x), u.y), u.z);
}
float orbFbm(vec2 p) {
  float v = 0.0, a = 0.5;
  mat2 r = mat2(0.8, -0.6, 0.6, 0.8);
  for (int i = 0; i < 5; i++) { v += a * orbNoise(p); p = r * p * 2.03 + 17.1; a *= 0.5; }
  return v;
}
float orbFbm3(vec2 p) {
  float v = 0.0, a = 0.5;
  mat2 r = mat2(0.8, -0.6, 0.6, 0.8);
  for (int i = 0; i < 3; i++) { v += a * orbNoise(p); p = r * p * 2.03 + 17.1; a *= 0.5; }
  return v;
}
/** Distance to the nearest cell edge of a Voronoi pattern (cracks, crystal facets). */
float orbVoronoiEdge(vec2 p) {
  vec2 n = floor(p), f = fract(p);
  vec2 mg, mr;
  float md = 8.0;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 g = vec2(float(i), float(j));
    vec2 o = orbHash22(n + g);
    vec2 r = g + o - f;
    float d = dot(r, r);
    if (d < md) { md = d; mr = r; mg = g; }
  }
  md = 8.0;
  for (int j = -2; j <= 2; j++) for (int i = -2; i <= 2; i++) {
    vec2 g = mg + vec2(float(i), float(j));
    vec2 o = orbHash22(n + g);
    vec2 r = g + o - f;
    if (dot(mr - r, mr - r) > 0.00001) md = min(md, dot(0.5 * (mr + r), normalize(r - mr)));
  }
  return md;
}
`;
