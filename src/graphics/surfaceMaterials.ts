import * as THREE from 'three';
import type { BlockTheme } from '../types/level';
import type { GraphicsQuality } from './quality';
import { GLSL_NOISE, sharedUniforms } from './shaderLib';

/**
 * Procedural, art-directed surface materials for level blocks and platforms.
 *
 * Every block of a theme shares ONE material (instead of a material + canvas texture per
 * mesh), and the pattern is computed in the fragment shader from the block's local
 * coordinates, so tiles stay fixed to moving platforms and ramps and there are no texture
 * uploads. The standard PBR chain (lights, shadows, fog, IBL) is kept via onBeforeCompile.
 * Purely visual: geometry and colliders are untouched.
 */

type Style =
  | 'stadium'
  | 'cyber'
  | 'stone'
  | 'storm'
  | 'moss'
  | 'sand'
  | 'crystal'
  | 'ice'
  | 'basalt'
  | 'marble';

const THEME_STYLE: Record<BlockTheme, Style> = {
  meadow: 'stadium',
  cobalt: 'stadium',
  sunset: 'stadium',
  warning: 'stadium',
  gold: 'stadium',
  cyber: 'cyber',
  citadel: 'stone',
  storm: 'storm',
  forest: 'moss',
  sand: 'sand',
  crystal: 'crystal',
  ice: 'ice',
  lava: 'basalt',
  cloud: 'marble',
};

/** Natural (non-stadium) styles get rocky sides/undersides instead of tech panels. */
export function isNaturalTheme(theme: BlockTheme) {
  const s = THEME_STYLE[theme];
  return s !== 'stadium' && s !== 'cyber';
}

export interface SurfacePalette {
  c1: string;
  c2: string;
  trim: string;
  glow: string;
}

const SURFACE_FRAGMENT = /* glsl */ `
uniform vec3 uC1;
uniform vec3 uC2;
uniform vec3 uTrim;
uniform vec3 uGlow;
uniform float uTime;
varying vec3 vOrbLocal;
varying vec3 vOrbLocalN;
varying vec2 vOrbUv;
${GLSL_NOISE}

// Voronoi returning (distance to nearest edge, hash of the nearest cell).
vec2 orbVoronoi(vec2 p) {
  vec2 n = floor(p), f = fract(p);
  vec2 mg, mr;
  float md = 8.0;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 g = vec2(float(i), float(j));
    vec2 r = g + orbHash22(n + g) - f;
    float d = dot(r, r);
    if (d < md) { md = d; mr = r; mg = g; }
  }
  float cell = orbHash12(n + mg);
#ifdef ORB_LOW
  // Cheap approximation on Low: F1 based edge.
  return vec2(0.5 - sqrt(md) * 0.7, cell);
#else
  md = 8.0;
  for (int j = -2; j <= 2; j++) for (int i = -2; i <= 2; i++) {
    vec2 g = mg + vec2(float(i), float(j));
    vec2 r = g + orbHash22(n + g) - f;
    if (dot(mr - r, mr - r) > 0.00001) md = min(md, dot(0.5 * (mr + r), normalize(r - mr)));
  }
  return vec2(md, cell);
#endif
}

struct OrbSurf { vec3 col; float rough; vec3 emi; vec2 bump; float metal; };

// Square tiles of size s: x = metres to nearest edge, yz = inward direction, w = id hash.
vec4 orbTile(vec2 p, float s, out vec2 id) {
  vec2 q = p / s;
  id = floor(q);
  vec2 f = fract(q);
  vec2 e2 = min(f, 1.0 - f) * s;
  vec2 dir = vec2(f.x < 0.5 ? 1.0 : -1.0, f.y < 0.5 ? 1.0 : -1.0);
  vec2 inward = e2.x < e2.y ? vec2(dir.x, 0.0) : vec2(0.0, dir.y);
  return vec4(min(e2.x, e2.y), inward, orbHash12(id));
}

// Running-bond bricks/flagstones.
vec4 orbBricks(vec2 p, vec2 size, out vec2 id) {
  vec2 q = p / size;
  float row = floor(q.y);
  q.x += mod(row, 2.0) * 0.5;
  id = floor(q);
  vec2 f = fract(q);
  vec2 e2 = min(f, 1.0 - f) * size;
  vec2 dir = vec2(f.x < 0.5 ? 1.0 : -1.0, f.y < 0.5 ? 1.0 : -1.0);
  vec2 inward = e2.x < e2.y ? vec2(dir.x, 0.0) : vec2(0.0, dir.y);
  return vec4(min(e2.x, e2.y), inward, orbHash12(id + 3.1));
}

float orbBevel(float e, float w) { return 1.0 - smoothstep(0.0, w, e); }

OrbSurf orbTop(vec2 p) {
  OrbSurf s;
  s.emi = vec3(0.0);
  s.bump = vec2(0.0);
  s.metal = -1.0;
  vec2 id;
  float grain = orbNoise(p * 38.0) * 0.05 + orbFbm3(p * 2.7) * 0.09;
#if defined(STYLE_STADIUM) || defined(STYLE_CYBER)
  vec4 t = orbTile(p, 1.0, id);
  float checker = mod(id.x + id.y, 2.0);
  vec3 base = mix(uC1, uC2, checker) * (1.0 + (t.w - 0.5) * 0.09);
  vec2 f = fract(p);
  base *= 1.07 - 0.16 * length(f - 0.5);
  float grout = orbBevel(t.x, 0.03);
  float bevel = smoothstep(0.02, 0.04, t.x) * (1.0 - smoothstep(0.05, 0.1, t.x));
  float inset = 1.0 - smoothstep(0.0, 0.006, abs(t.x - 0.13));
  s.col = base * (0.94 + grain);
  s.col = mix(s.col, s.col * 0.32, grout);
  s.col += bevel * 0.07;
  s.col *= 1.0 - inset * 0.14;
  s.rough = 0.3 + grout * 0.4 + grain * 0.5;
  s.bump = t.yz * orbBevel(t.x, 0.07);
#ifdef STYLE_CYBER
  s.col *= 0.55;
  float scan = 0.55 + 0.45 * sin(uTime * 2.2 - (p.x + p.y) * 0.35);
  s.emi = uGlow * (grout * 2.4 + inset * 0.6) * scan;
  s.rough = 0.22 + grain * 0.3;
#endif
#elif defined(STYLE_STONE) || defined(STYLE_STORM) || defined(STYLE_MOSS)
  vec4 t = orbBricks(p, vec2(1.55, 0.95), id);
  vec3 stoneA = uC1, stoneB = uC2;
#ifdef STYLE_MOSS
  stoneA = vec3(0.44, 0.41, 0.36); stoneB = vec3(0.33, 0.3, 0.26);
#endif
  vec3 base = mix(stoneA, stoneB, t.w) * (0.86 + orbFbm3(p * 1.7 + t.w * 9.0) * 0.3);
  float grout = orbBevel(t.x, 0.05);
  s.col = mix(base * (0.95 + grain), base * 0.3, grout);
  s.rough = 0.62 + grout * 0.25 + grain;
  s.bump = t.yz * orbBevel(t.x, 0.12);
#ifdef STYLE_STORM
  float wet = smoothstep(0.35, 0.7, orbFbm3(p * 0.45 + 3.0));
  s.col *= 1.0 - wet * 0.25;
  s.rough = mix(s.rough, 0.1, wet);
  s.emi = uGlow * grout * 0.35;
#endif
#ifdef STYLE_MOSS
  float moss = smoothstep(0.42, 0.72, orbFbm(p * 0.55)) + grout * 0.8;
  vec3 mossCol = mix(uC1, uC1 * 1.5 + vec3(0.05, 0.08, 0.0), orbNoise(p * 9.0));
  s.col = mix(s.col, mossCol, clamp(moss, 0.0, 1.0) * 0.85);
  s.rough = mix(s.rough, 0.9, clamp(moss, 0.0, 1.0));
#endif
#elif defined(STYLE_SAND)
  vec4 t = orbTile(p, 2.0, id);
  float ripple = sin(p.x * 5.0 + orbFbm3(p * 0.8) * 6.0 + p.y * 1.3) * 0.5 + 0.5;
  vec3 base = mix(uC1, uC2, ripple * 0.35 + (t.w - 0.5) * 0.3 + orbFbm3(p * 0.3) * 0.4);
  float speck = step(0.93, orbHash12(floor(p * 26.0))) * 0.12;
  float grout = orbBevel(t.x, 0.04);
  s.col = mix(base * (0.95 + grain - speck), base * 0.55, grout);
  s.rough = 0.85;
  s.bump = t.yz * orbBevel(t.x, 0.14) + vec2(ripple - 0.5) * 0.06;
#elif defined(STYLE_CRYSTAL)
  vec2 v = orbVoronoi(p * 0.95);
  float edge = 1.0 - smoothstep(0.0, 0.06, v.x);
  vec3 base = mix(uC2, uC1, v.y) * (0.75 + 0.45 * smoothstep(0.0, 0.5, v.x));
  s.col = mix(base, uGlow * 0.8, edge * 0.5);
  s.rough = 0.08 + (1.0 - v.x) * 0.08;
  float pulse = 0.65 + 0.35 * sin(uTime * 1.6 + v.y * 6.283);
  s.emi = uGlow * edge * 1.5 * pulse;
  float glint = step(0.992, orbHash12(floor(p * 16.0)));
  s.emi += vec3(1.0) * glint * (0.5 + 0.5 * sin(uTime * 5.0 + orbHash12(floor(p * 16.0)) * 40.0)) * 2.2;
  s.bump = vec2(orbNoise(p * 3.0) - 0.5, orbNoise(p * 3.0 + 7.0) - 0.5) * 0.5;
#elif defined(STYLE_ICE)
  vec2 v = orbVoronoi(p * 0.55);
  float crack = 1.0 - smoothstep(0.0, 0.035, v.x);
  float depth = orbFbm(p * 0.35);
  vec3 base = mix(uC2, uC1, depth) * (0.85 + v.y * 0.2);
  float frost = smoothstep(0.55, 0.85, orbFbm(p * 1.3 + 11.0));
  s.col = mix(base, vec3(0.92, 0.97, 1.0), crack * 0.75 + frost * 0.55);
  s.rough = 0.04 + frost * 0.35 + crack * 0.2;
  s.emi = uGlow * crack * 0.25;
#elif defined(STYLE_BASALT)
  vec2 v = orbVoronoi(p * 1.05);
  float crack = 1.0 - smoothstep(0.0, 0.07, v.x);
  vec3 base = mix(uC1, uC2, v.y) * (0.8 + orbFbm3(p * 3.0) * 0.4);
  float flow = orbFbm(p * 0.7 + vec2(uTime * 0.12, -uTime * 0.09));
  vec3 hot = mix(vec3(1.0, 0.25, 0.03), vec3(1.0, 0.72, 0.2), flow);
  s.col = mix(base, hot * 0.4, crack);
  s.rough = 0.72 - crack * 0.4;
  s.emi = hot * crack * (1.2 + 3.2 * flow * flow);
  s.bump = vec2(v.y - 0.5, orbHash12(vec2(v.y, 3.0)) - 0.5) * 0.25 * (1.0 - crack);
#elif defined(STYLE_MARBLE)
  vec4 t = orbTile(p, 2.0, id);
  float veins = abs(sin((p.x * 0.9 + p.y * 0.6) + orbFbm(p * 0.6 + t.w * 5.0) * 7.0));
  float vein = 1.0 - smoothstep(0.0, 0.07, veins);
  vec3 base = mix(uC1, uC2, t.w * 0.6) * (0.97 + grain * 0.5);
  s.col = mix(base, vec3(0.7, 0.68, 0.78), vein * 0.55);
  float grout = orbBevel(t.x, 0.045);
  s.col = mix(s.col, uTrim, grout);
  s.rough = mix(0.18, 0.3, grout);
  s.metal = grout;
  s.emi = uTrim * grout * 0.35;
  s.bump = t.yz * orbBevel(t.x, 0.09);
#endif
  return s;
}

// Sides and undersides: tech panels for stadium styles, rock strata for natural styles.
OrbSurf orbSide(vec2 p, float v, float bottom) {
  OrbSurf s;
  s.emi = vec3(0.0);
  s.bump = vec2(0.0);
  s.metal = -1.0;
  float n = orbFbm3(vec2(p.x * 0.7, p.y * 2.6));
#if defined(STYLE_STADIUM) || defined(STYLE_CYBER)
  float seam = 1.0 - smoothstep(0.0, 0.02, abs(fract(p.x * 0.5) - 0.5) - 0.48);
  s.col = uC2 * (0.55 + n * 0.15) * (1.0 - seam * 0.4);
  float lip = smoothstep(0.82, 0.9, v);
  s.col = mix(s.col, uTrim * 0.8, lip * 0.6);
  s.rough = 0.4;
#ifdef STYLE_CYBER
  s.emi = uGlow * lip * 0.8;
#endif
#else
  vec3 rock = vec3(0.3, 0.27, 0.24);
#if defined(STYLE_MOSS)
  rock = vec3(0.3, 0.21, 0.13);
#elif defined(STYLE_SAND)
  rock = uC2 * 0.8;
#elif defined(STYLE_CRYSTAL)
  rock = vec3(0.14, 0.09, 0.22);
#elif defined(STYLE_ICE)
  rock = vec3(0.75, 0.86, 0.95);
#elif defined(STYLE_BASALT)
  rock = vec3(0.1, 0.085, 0.08);
#elif defined(STYLE_MARBLE)
  rock = vec3(0.9, 0.9, 0.93);
#elif defined(STYLE_STORM) || defined(STYLE_STONE)
  rock = mix(uC2, vec3(0.25), 0.4);
#endif
  float strata = sin(p.y * 7.0 + n * 5.0) * 0.5 + 0.5;
  s.col = rock * (0.72 + n * 0.35 + strata * 0.12);
  s.rough = 0.85;
#if defined(STYLE_MOSS)
  float grassLip = smoothstep(0.7 - orbNoise(vec2(p.x * 3.0, 1.0)) * 0.25, 0.8, v);
  s.col = mix(s.col, uC1 * 1.2, grassLip);
#elif defined(STYLE_CRYSTAL)
  float vein = 1.0 - smoothstep(0.0, 0.05, abs(orbNoise(p * 1.5) - 0.5));
  s.emi = uGlow * vein * 0.9;
#elif defined(STYLE_BASALT)
  float seam = 1.0 - smoothstep(0.0, 0.05, abs(orbNoise(vec2(p.x * 1.2, p.y * 3.0)) - 0.5));
  float flow = orbFbm3(p * 0.9 + vec2(0.0, -uTime * 0.2));
  s.emi = vec3(1.0, 0.35, 0.05) * seam * (0.6 + 2.2 * flow);
#elif defined(STYLE_ICE)
  s.rough = 0.25;
  s.col = mix(s.col, vec3(0.45, 0.7, 0.9), strata * 0.25);
#elif defined(STYLE_MARBLE)
  s.rough = 0.25;
#endif
#endif
  s.col *= mix(1.0, 0.55, bottom);
  return s;
}
`;

const materialCache = new Map<string, THREE.Material>();

function styleFor(theme: BlockTheme, surface: 'normal' | 'ice'): Style {
  return surface === 'ice' ? 'ice' : (THEME_STYLE[theme] ?? 'stadium');
}

/**
 * Shared procedural material for a block/platform body. `palette` supplies the theme colours;
 * `quality` picks physical (iridescent / clear-coated) variants on Medium+ and cheaper
 * pattern code on Low.
 */
export function getSurfaceMaterial(
  theme: BlockTheme,
  surface: 'normal' | 'ice',
  palette: SurfacePalette,
  quality: GraphicsQuality,
): THREE.Material {
  const style = styleFor(theme, surface);
  const key = `${theme}|${style}|${quality}`;
  const cached = materialCache.get(key);
  if (cached) return cached;

  const physical =
    quality !== 'low' && (style === 'crystal' || style === 'ice' || theme === 'gold');
  const params = {
    color: '#ffffff',
    roughness: 1,
    metalness:
      theme === 'gold' ? 0.65 : style === 'cyber' ? 0.35 : style === 'crystal' ? 0.15 : 0.05,
  };
  const mat: THREE.MeshStandardMaterial = physical
    ? new THREE.MeshPhysicalMaterial({
        ...params,
        clearcoat: style === 'ice' ? 1 : 0.6,
        clearcoatRoughness: 0.06,
        iridescence: style === 'crystal' ? 0.9 : style === 'ice' ? 0.25 : 0,
        iridescenceIOR: 1.6,
        iridescenceThicknessRange: [180, 620],
        envMapIntensity: 1.4,
      })
    : new THREE.MeshStandardMaterial(params);

  const uniforms = {
    uC1: { value: new THREE.Color(palette.c1) },
    uC2: { value: new THREE.Color(palette.c2) },
    uTrim: { value: new THREE.Color(palette.trim) },
    uGlow: { value: new THREE.Color(palette.glow) },
    uTime: sharedUniforms.uTime,
  };

  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.defines = shader.defines || {};
    shader.defines[`STYLE_${style.toUpperCase()}`] = '';
    if (quality === 'low') shader.defines.ORB_LOW = '';

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nvarying vec3 vOrbLocal;\nvarying vec3 vOrbLocalN;\nvarying vec2 vOrbUv;\nvarying vec3 vOrbT;\nvarying vec3 vOrbB;',
      )
      .replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nvOrbLocal = position;\nvOrbLocalN = normal;\nvOrbUv = uv;\nvOrbT = normalize(normalMatrix * vec3(1.0, 0.0, 0.0));\nvOrbB = normalize(normalMatrix * vec3(0.0, 0.0, 1.0));',
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>\nvarying vec3 vOrbT;\nvarying vec3 vOrbB;\n${SURFACE_FRAGMENT}`,
      )
      .replace(
        '#include <color_fragment>',
        /* glsl */ `#include <color_fragment>
        vec3 orbAN = abs(vOrbLocalN);
        float orbIsTop = step(0.5, vOrbLocalN.y);
        float orbIsBottom = step(0.5, -vOrbLocalN.y);
        vec2 orbP = orbAN.y > 0.5 ? vOrbLocal.xz : (orbAN.x > 0.5 ? vOrbLocal.zy : vOrbLocal.xy);
        OrbSurf orbS;
        if (orbIsTop > 0.5) orbS = orbTop(orbP); else orbS = orbSide(orbP, vOrbUv.y, orbIsBottom);
        diffuseColor.rgb = orbS.col;`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        '#include <roughnessmap_fragment>\nroughnessFactor = clamp(orbS.rough, 0.03, 1.0);',
      )
      .replace(
        '#include <metalnessmap_fragment>',
        '#include <metalnessmap_fragment>\nif (orbS.metal >= 0.0) metalnessFactor = mix(metalnessFactor, 1.0, orbS.metal);',
      )
      .replace(
        '#include <normal_fragment_maps>',
        /* glsl */ `#include <normal_fragment_maps>
        if (orbIsTop > 0.5) {
          vec3 orbT = normalize(vOrbT);
          vec3 orbB = normalize(vOrbB);
          normal = normalize(normal - (orbT * orbS.bump.x + orbB * orbS.bump.y) * 0.45);
        }`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        '#include <emissivemap_fragment>\ntotalEmissiveRadiance += orbS.emi;',
      );
  };
  mat.customProgramCacheKey = () => `orb-surface-${style}-${quality}-${physical ? 'p' : 's'}`;
  materialCache.set(key, mat);
  return mat;
}

const simpleCache = new Map<string, THREE.Material>();

/** Shared simple materials (rails, glow strips, trims, hulls) keyed by their parameters. */
export function getSharedMaterial(key: string, make: () => THREE.Material): THREE.Material {
  let m = simpleCache.get(key);
  if (!m) {
    m = make();
    simpleCache.set(key, m);
  }
  return m;
}
