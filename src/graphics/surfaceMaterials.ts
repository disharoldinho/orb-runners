import * as THREE from 'three';
import type { BlockTheme } from '../types/level';
import type { GraphicsQuality } from './quality';
import { GLSL_NOISE, sharedUniforms } from './shaderLib';

/**
 * Procedural, art-directed surface materials for level blocks and platforms.
 *
 * Every block of a theme shares ONE material (instead of a material + canvas texture per
 * mesh) and the pattern is computed in the fragment shader, anchored to the world position
 * in the block's own axes: tiles have the same metric size on every block and line up
 * across joins (moving platforms use mesh-local coordinates so the pattern rides along).
 * Lines are derivative-filtered and fine detail fades out with distance, so nothing
 * shimmers. The standard PBR chain (lights, shadows, fog, IBL) is kept via onBeforeCompile.
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
varying vec3 vOrbMesh;
varying vec3 vOrbHalf;
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

// Anti-aliased line: 1 inside |dist| < halfWidth, filtered over aa (pixel footprint).
float orbLine(float dist, float halfWidth, float aa) {
  return 1.0 - smoothstep(halfWidth - aa, halfWidth + aa, dist);
}
// 1 while a pattern cell of size 'cell' spans several pixels, fading to 0 as it shrinks
// towards a pixel, so fine lines never shimmer or moire in the distance.
float orbDetail(vec2 p, float cell) {
  vec2 fw = fwidth(p);
  return 1.0 - smoothstep(0.06, 0.3, max(fw.x, fw.y) / cell);
}

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

// Running-bond flagstones.
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

// Tops: big, flat, clearly outlined tiles (Sticker Rally look). No per-pixel grain.
OrbSurf orbTop(vec2 p) {
  OrbSurf s;
  s.emi = vec3(0.0);
  s.bump = vec2(0.0);
  s.metal = -1.0;
  vec2 id;
  vec2 fw = fwidth(p);
  float aa = max(fw.x, fw.y) * 0.75 + 1e-4;
#if defined(STYLE_STADIUM) || defined(STYLE_CYBER)
  vec4 t = orbTile(p, 2.0, id);
  float det = orbDetail(p, 2.0);
  float checker = mod(id.x + id.y, 2.0);
  vec3 base = mix(uC1, uC2, checker) * (1.0 + (t.w - 0.5) * 0.05);
  float grout = orbLine(t.x, 0.035, aa) * det;
  float rim = (smoothstep(0.035, 0.07, t.x) - smoothstep(0.07, 0.18, t.x)) * det;
  s.col = base + rim * 0.05;
  s.col = mix(s.col, base * 0.32, grout);
  s.rough = 0.42 + grout * 0.3;
  s.bump = t.yz * orbBevel(t.x, 0.07) * det * 0.6;
#ifdef STYLE_CYBER
  s.col *= 0.6;
  float pulse = 0.8 + 0.2 * sin(uTime * 1.2 - (p.x + p.y) * 0.08);
  s.emi = uGlow * grout * 1.6 * pulse;
  s.rough = 0.3;
#endif
#elif defined(STYLE_STONE) || defined(STYLE_STORM) || defined(STYLE_MOSS)
  vec4 t = orbBricks(p, vec2(2.0, 1.25), id);
  float det = orbDetail(p, 1.25);
  vec3 stoneA = uC1, stoneB = uC2;
#ifdef STYLE_MOSS
  stoneA = vec3(0.44, 0.41, 0.36); stoneB = vec3(0.35, 0.32, 0.28);
#endif
  vec3 base = mix(stoneA, stoneB, t.w * 0.8) * (0.94 + orbFbm3(p * 0.4 + t.w * 9.0) * 0.12);
  float grout = orbLine(t.x, 0.045, aa) * det;
  s.col = mix(base, base * 0.35, grout);
  s.rough = 0.7 + grout * 0.2;
  s.bump = t.yz * orbBevel(t.x, 0.1) * det * 0.6;
#ifdef STYLE_STORM
  float wet = smoothstep(0.45, 0.75, orbFbm3(p * 0.22 + 3.0));
  s.col *= 1.0 - wet * 0.18;
  s.rough = mix(s.rough, 0.18, wet);
  s.emi = uGlow * grout * 0.25;
#endif
#ifdef STYLE_MOSS
  float moss = smoothstep(0.5, 0.75, orbFbm3(p * 0.2));
  s.col = mix(s.col, uC1 * 0.85, grout * 0.7);
  s.col = mix(s.col, uC1 * 1.1, moss * 0.75);
  s.rough = mix(s.rough, 0.9, moss);
#endif
#elif defined(STYLE_SAND)
  vec4 t = orbTile(p, 4.0, id);
  float det = orbDetail(p, 4.0);
  float rdet = orbDetail(p, 2.8);
  float ripple = sin(p.x * 2.2 + p.y * 0.6 + orbFbm3(p * 0.25) * 4.0) * 0.5 + 0.5;
  vec3 base = mix(uC1, uC2, 0.25 + (t.w - 0.5) * 0.15 + (ripple - 0.5) * 0.2 * rdet);
  float grout = orbLine(t.x, 0.04, aa) * det;
  s.col = mix(base, base * 0.6, grout);
  s.rough = 0.88;
  s.bump = t.yz * orbBevel(t.x, 0.12) * det * 0.5 + vec2(ripple - 0.5) * 0.04 * rdet;
#elif defined(STYLE_CRYSTAL)
  vec2 v = orbVoronoi(p * 0.45);
  float det = orbDetail(p * 0.45, 1.0);
  float edge = orbLine(v.x, 0.035, aa * 0.45) * det;
  vec3 base = mix(uC2, uC1, 0.35 + v.y * 0.5);
  s.col = mix(base, mix(uGlow, vec3(1.0), 0.3), edge * 0.7);
  s.rough = 0.2;
  float pulse = 0.85 + 0.15 * sin(uTime * 0.9 + v.y * 6.283);
  s.emi = uGlow * edge * 0.55 * pulse;
  s.bump = vec2(orbHash12(vec2(v.y, 1.0)) - 0.5, orbHash12(vec2(v.y, 2.0)) - 0.5) * 0.35 * det;
#elif defined(STYLE_ICE)
  vec2 v = orbVoronoi(p * 0.35);
  float det = orbDetail(p * 0.35, 1.0);
  float crack = orbLine(v.x, 0.02, aa * 0.35) * det;
  vec3 base = mix(uC2, uC1, 0.45 + v.y * 0.35);
  float frost = smoothstep(0.55, 0.8, orbFbm3(p * 0.3 + 11.0));
  s.col = mix(base, vec3(0.92, 0.97, 1.0), crack * 0.6 + frost * 0.35);
  s.rough = 0.08 + frost * 0.3 + crack * 0.2;
  s.emi = uGlow * crack * 0.12;
#elif defined(STYLE_BASALT)
  vec2 v = orbVoronoi(p * 0.55);
  float det = orbDetail(p * 0.55, 1.0);
  float crack = orbLine(v.x, 0.03, aa * 0.55) * det;
  vec3 base = mix(uC1, uC2, v.y) * 1.05;
  float flow = orbFbm3(p * 0.3 + vec2(uTime * 0.05, -uTime * 0.04));
  vec3 hot = mix(vec3(1.0, 0.3, 0.05), vec3(1.0, 0.65, 0.2), flow);
  s.col = mix(base, hot * 0.45, crack);
  s.rough = 0.75 - crack * 0.35;
  s.emi = hot * crack * (0.9 + 0.9 * flow);
  s.bump = vec2(orbHash12(vec2(v.y, 3.0)) - 0.5, orbHash12(vec2(v.y, 5.0)) - 0.5) * 0.2 * det * (1.0 - crack);
#elif defined(STYLE_MARBLE)
  vec4 t = orbTile(p, 2.0, id);
  float det = orbDetail(p, 2.0);
  float veins = abs(sin((p.x * 0.7 + p.y * 0.45) + orbFbm3(p * 0.35 + t.w * 5.0) * 5.0));
  float vein = orbLine(veins, 0.05, fwidth(veins) + 1e-4) * orbDetail(p, 3.0);
  vec3 base = mix(uC1, uC2, t.w * 0.4);
  s.col = mix(base, vec3(0.74, 0.72, 0.82), vein * 0.3);
  float grout = orbLine(t.x, 0.04, aa) * det;
  s.col = mix(s.col, uTrim, grout);
  s.rough = mix(0.22, 0.3, grout);
  s.metal = grout * 0.8;
  s.emi = uTrim * grout * 0.2;
  s.bump = t.yz * orbBevel(t.x, 0.08) * det * 0.6;
#endif
  return s;
}

// Sides and undersides. topDist = metres below the face's top edge (world-constant lip on
// every block height, instead of a UV fraction that was fat on walls and thin on decks).
OrbSurf orbSide(vec2 p, float topDist, float bottom) {
  OrbSurf s;
  s.emi = vec3(0.0);
  s.bump = vec2(0.0);
  s.metal = -1.0;
  vec2 fw = fwidth(p);
  float aa = max(fw.x, fw.y) * 0.75 + 1e-4;
  float n = orbFbm3(vec2(p.x * 0.35, p.y * 1.2));
#ifdef ORB_HULL
  float lip = 0.0;
#else
  float lip = orbLine(topDist, 0.09, aa) * (1.0 - bottom);
#endif
#if defined(STYLE_STADIUM) || defined(STYLE_CYBER)
  float sd = min(fract(p.x * 0.5), 1.0 - fract(p.x * 0.5)) * 2.0;
  float seam = orbLine(sd, 0.02, aa) * orbDetail(p, 2.0);
  s.col = uC2 * 0.62 * (1.0 - seam * 0.35);
  s.col = mix(s.col, uTrim * 0.85, lip * 0.75);
  s.rough = 0.45;
#ifdef STYLE_CYBER
  s.emi = uGlow * lip * 0.7;
#endif
#else
  vec3 rock = vec3(0.3, 0.27, 0.24);
#if defined(STYLE_MOSS)
  rock = vec3(0.3, 0.21, 0.13);
#elif defined(STYLE_SAND)
  rock = uC2 * 0.8;
#elif defined(STYLE_CRYSTAL)
  rock = vec3(0.16, 0.11, 0.25);
#elif defined(STYLE_ICE)
  rock = vec3(0.75, 0.86, 0.95);
#elif defined(STYLE_BASALT)
  rock = vec3(0.11, 0.095, 0.09);
#elif defined(STYLE_MARBLE)
  rock = vec3(0.9, 0.9, 0.93);
#elif defined(STYLE_STORM) || defined(STYLE_STONE)
  rock = mix(uC2, vec3(0.25), 0.4);
#endif
  float strata = sin(p.y * 3.0 + n * 2.0) * 0.5 + 0.5;
  s.col = rock * (0.85 + n * 0.15 + strata * 0.06);
  s.rough = 0.85;
#if defined(STYLE_MOSS)
  float grassLip = orbLine(topDist, 0.12 + orbNoise(vec2(p.x * 1.5, 1.0)) * 0.08, aa);
  s.col = mix(s.col, uC1 * 1.15, grassLip * (1.0 - bottom));
#elif defined(STYLE_CRYSTAL)
  s.emi = uGlow * lip * 0.5;
#elif defined(STYLE_BASALT)
  s.emi = vec3(1.0, 0.35, 0.05) * lip * 0.6;
#elif defined(STYLE_ICE)
  s.rough = 0.25;
  s.col = mix(s.col, vec3(0.9, 0.96, 1.0), lip * 0.6);
#elif defined(STYLE_MARBLE)
  s.rough = 0.25;
  s.col = mix(s.col, uTrim, lip * 0.5);
#else
  s.col = mix(s.col, s.col * 1.25, lip * 0.5);
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

export interface SurfaceOptions {
  /**
   * Depth-bias layer (levels/visualLayers): > 0 draws this surface slightly in front so a
   * genuinely coplanar neighbour cannot z-fight with it. 0 = no polygonOffset.
   */
  layer?: number;
  /**
   * 'world' (static blocks): the pattern is anchored to the world position expressed in the
   * block's own axes, so tiles line up across joins and identical overlapping surfaces match
   * pixel for pixel. 'local' (moving platforms): the pattern rides with the mesh.
   */
  anchor?: 'world' | 'local';
  /** Under-hull variant: no top-edge lip. */
  hull?: boolean;
}

/**
 * Shared procedural material for a block/platform body. `palette` supplies the theme colours;
 * `quality` picks physical (clear-coated) variants on Medium+ and cheaper pattern code on Low.
 */
export function getSurfaceMaterial(
  theme: BlockTheme,
  surface: 'normal' | 'ice',
  palette: SurfacePalette,
  quality: GraphicsQuality,
  opts: SurfaceOptions = {},
): THREE.Material {
  const style = styleFor(theme, surface);
  const layer = Math.max(0, Math.min(3, Math.round(opts.layer ?? 0)));
  const anchor = opts.anchor ?? 'world';
  const hull = !!opts.hull;
  const key = `${theme}|${style}|${quality}|${layer}|${anchor}|${hull ? 'h' : 'b'}`;
  const cached = materialCache.get(key);
  if (cached) return cached;

  const physical =
    quality !== 'low' && (style === 'crystal' || style === 'ice' || theme === 'gold');
  const params = {
    color: '#ffffff',
    roughness: 1,
    metalness:
      theme === 'gold' ? 0.6 : style === 'cyber' ? 0.3 : style === 'crystal' ? 0.1 : 0.04,
  };
  const mat: THREE.MeshStandardMaterial = physical
    ? new THREE.MeshPhysicalMaterial({
        ...params,
        clearcoat: style === 'ice' ? 0.8 : 0.5,
        clearcoatRoughness: 0.12,
        // strong thin-film iridescence shimmered and swam at grazing angles: keep a hint
        iridescence: style === 'crystal' ? 0.3 : style === 'ice' ? 0.1 : 0,
        iridescenceIOR: 1.5,
        iridescenceThicknessRange: [200, 500],
        envMapIntensity: 1.0,
      })
    : new THREE.MeshStandardMaterial(params);
  if (layer > 0) {
    mat.polygonOffset = true;
    mat.polygonOffsetFactor = -layer;
    mat.polygonOffsetUnits = -4 * layer;
  }

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
    if (anchor === 'world') shader.defines.ORB_WORLD_ANCHOR = '';
    if (hull) shader.defines.ORB_HULL = '';

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nvarying vec3 vOrbLocal;\nvarying vec3 vOrbLocalN;\nvarying vec3 vOrbMesh;\nvarying vec3 vOrbHalf;\nvarying vec3 vOrbT;\nvarying vec3 vOrbB;',
      )
      .replace(
        '#include <begin_vertex>',
        /* glsl */ `#include <begin_vertex>
        #ifdef ORB_WORLD_ANCHOR
          // world position in the block's own axes: R^T (R p + t) = p + R^T t
          vOrbLocal = position + transpose(mat3(modelMatrix)) * modelMatrix[3].xyz;
        #else
          vOrbLocal = position;
        #endif
        vOrbLocalN = normal;
        vOrbMesh = position;
        vOrbHalf = abs(position);
        vOrbT = normalize(normalMatrix * vec3(1.0, 0.0, 0.0));
        vOrbB = normalize(normalMatrix * vec3(0.0, 0.0, 1.0));`,
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
        if (orbIsTop > 0.5) orbS = orbTop(orbP);
        else orbS = orbSide(orbP, max(vOrbHalf.y - vOrbMesh.y, 0.0), orbIsBottom);
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
  mat.customProgramCacheKey = () =>
    `orb-surface2-${style}-${quality}-${physical ? 'p' : 's'}-${anchor}-${hull ? 'h' : 'b'}`;
  materialCache.set(key, mat);
  return mat;
}

const simpleCache = new Map<string, THREE.Material>();

/**
 * Shared simple materials (rails, glow strips, trims, hulls) keyed by their parameters, with
 * an optional depth-bias layer (see getSurfaceMaterial).
 */
export function getSharedMaterial(
  key: string,
  make: () => THREE.Material,
  layer = 0,
): THREE.Material {
  const l = Math.max(0, Math.min(3, Math.round(layer)));
  const k = `${key}|L${l}`;
  let m = simpleCache.get(k);
  if (!m) {
    m = make();
    if (l > 0) {
      m.polygonOffset = true;
      m.polygonOffsetFactor = -l;
      m.polygonOffsetUnits = -4 * l;
    }
    simpleCache.set(k, m);
  }
  return m;
}
