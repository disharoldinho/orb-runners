import * as THREE from 'three';
import { GLSL_NOISE, sharedUniforms } from './shaderLib';
import { GraphicsQuality } from './quality';

/**
 * Altitude-banded mountain shader. Every Summit stage has its own ground cover (flat
 * faces) and rock (steep faces), blended with noise at the band edges:
 * lowland pines -> meadow -> forest moss -> amethyst -> red canyon strata -> snowfields
 * -> wind-scoured rock -> basalt with glowing lava cracks -> storm slate -> summit snow.
 */
const BANDS: { y: number; ground: string; rock: string }[] = [
  { y: -1e4, ground: '#3f6b35', rock: '#4a5160' }, // lowland forest floor
  { y: -4, ground: '#6fb24a', rock: '#6b6f7a' }, // meadow
  { y: 25, ground: '#3d7a2f', rock: '#5a4a3c' }, // forest
  { y: 50, ground: '#6a4aa3', rock: '#34264f' }, // crystal
  { y: 78, ground: '#e0a864', rock: '#b25a2b' }, // canyon
  { y: 106, ground: '#eef5fc', rock: '#6f84a0' }, // frost
  { y: 134, ground: '#dbe3ee', rock: '#57606f' }, // gale
  { y: 164, ground: '#332b27', rock: '#1b1716' }, // caldera
  { y: 192, ground: '#46505f', rock: '#262d38' }, // storm
  { y: 220, ground: '#ffffff', rock: '#8e90a6' }, // crown
];

export function makeTerrainMaterial(
  quality: GraphicsQuality,
  center: [number, number],
  half: [number, number],
): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.92, metalness: 0.02 });
  const uniforms = {
    uTime: sharedUniforms.uTime,
    uFlash: sharedUniforms.uFlash,
    uBandY: { value: BANDS.map((b) => b.y) },
    uGround: { value: BANDS.map((b) => new THREE.Color(b.ground)) },
    uRock: { value: BANDS.map((b) => new THREE.Color(b.rock)) },
    uCenter: { value: new THREE.Vector2(...center) },
    uHalf: { value: new THREE.Vector2(...half) },
  };
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    if (quality === 'low') shader.defines = { ...(shader.defines ?? {}), TERRAIN_LOW: 1 };
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nvarying vec3 vTWorld;\nvarying vec3 vTNormal;',
      )
      .replace(
        '#include <worldpos_vertex>',
        `#include <worldpos_vertex>
         vTWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
         vTNormal = normalize(mat3(modelMatrix) * objectNormal);`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
         varying vec3 vTWorld;
         varying vec3 vTNormal;
         uniform float uTime;
         uniform float uFlash;
         uniform float uBandY[10];
         uniform vec3 uGround[10];
         uniform vec3 uRock[10];
         uniform vec2 uCenter;
         uniform vec2 uHalf;
         ${GLSL_NOISE}
         float gTerrainRough = 0.9;
         vec3 gTerrainEmissive = vec3(0.0);`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
         {
           vec3 wp = vTWorld;
           vec3 N = normalize(vTNormal);
           float flat01 = smoothstep(0.55, 0.85, N.y);
           float n1 = orbNoise(wp.xz * 0.11);
           float n2 = orbNoise(wp.xz * 0.9 + wp.y * 0.1);
           float yb = wp.y + (n1 - 0.5) * 7.0;
           vec3 ground = uGround[0];
           vec3 rock = uRock[0];
           int band = 0;
           for (int i = 1; i < 10; i++) {
             float k = smoothstep(uBandY[i] - 2.5, uBandY[i] + 2.5, yb);
             ground = mix(ground, uGround[i], k);
             rock = mix(rock, uRock[i], k);
             if (yb > uBandY[i]) band = i;
           }
           // Stage colours belong to the horn the road wraps; the surrounding massif,
           // arêtes and satellite peaks use a natural alpine palette.
           vec2 dq = abs(wp.xz - uCenter) / (uHalf + 6.0);
           float rq = pow(pow(dq.x, 4.0) + pow(dq.y, 4.0), 0.25);
           float natural = smoothstep(1.02, 1.2, rq + (n1 - 0.5) * 0.1);
           float ya = wp.y + (n1 - 0.5) * 16.0;
           vec3 nrHorn = mix(vec3(0.42, 0.4, 0.4), vec3(0.6, 0.6, 0.64), smoothstep(0.0, 240.0, ya));
           // horn faces: natural stone carrying a tint of the stage colour
           rock = mix(rock, nrHorn * (0.75 + 0.5 * rock / max(max(rock.r, rock.g), max(rock.b, 0.05))), 0.55);
           if (natural > 0.0) {
             vec3 ng = mix(vec3(0.24, 0.42, 0.2), vec3(0.42, 0.55, 0.26), smoothstep(-60.0, 10.0, ya));
             ng = mix(ng, vec3(0.5, 0.47, 0.34), smoothstep(40.0, 80.0, ya));
             ng = mix(ng, vec3(0.94, 0.96, 1.0), smoothstep(88.0, 105.0, ya));
             vec3 nr = mix(vec3(0.36, 0.35, 0.37), vec3(0.47, 0.45, 0.46), smoothstep(0.0, 120.0, ya));
             nr = mix(nr, vec3(0.78, 0.8, 0.86), smoothstep(150.0, 190.0, ya) * 0.7);
             ground = mix(ground, ng, natural);
             rock = mix(rock, nr, natural);
             band = natural > 0.5 ? (ya > 95.0 ? 5 : 0) : band;
           }
           // rock strata + grain (world-space, so cliffs never stretch)
           float strata = orbNoise(vec2(wp.y * 0.7 + orbNoise(wp.xz * 0.05) * 3.0, 0.5));
           #ifdef TERRAIN_LOW
             float grain = n2;
           #else
             float grain = orbNoise3(wp * 0.35) * 0.6 + orbNoise3(wp * 1.1) * 0.4;
           #endif
           rock *= 0.72 + 0.35 * strata + 0.2 * (grain - 0.5);
           // ground cover: tufts / snow sparkle / sand ripples
           float tuft = orbNoise(wp.xz * 2.3);
           ground *= 0.86 + 0.24 * tuft + 0.12 * (n1 - 0.5);
           if (band == 4) ground *= 0.92 + 0.12 * sin(wp.x * 1.3 + wp.z * 0.6 + n1 * 6.0); // canyon ripples
           // snowline dusting on shallow ledges of the upper mountain
           float snowDust = smoothstep(0.8, 0.95, N.y) * smoothstep(100.0, 112.0, wp.y) * (1.0 - step(163.0, wp.y) * step(wp.y, 221.0) * (1.0 - natural));
           vec3 col = mix(rock, ground, flat01);
           col = mix(col, vec3(0.95, 0.97, 1.0), snowDust * 0.6);
           // soft darkening at the foot of cliffs for depth
           col *= 0.85 + 0.15 * smoothstep(0.1, 0.6, N.y + n2 * 0.3);
           diffuseColor.rgb = col;
           gTerrainRough = mix(0.95, 0.5, step(105.0, yb) * step(yb, 164.0) * flat01); // glossy snow/ice
           // caldera: glowing lava veins in the basalt
           if (band == 7) {
             float vein = 1.0 - orbVoronoiEdge(wp.xz * 0.12 + vec2(wp.y * 0.05));
             vein = smoothstep(0.9, 0.99, vein) * (0.7 + 0.3 * sin(uTime * 2.0 + wp.x * 0.2));
             gTerrainEmissive = vec3(1.0, 0.35, 0.05) * vein * 1.6;
           }
           // crystal band: faint amethyst glints
           if (band == 3) {
             float glint = smoothstep(0.93, 1.0, orbNoise(wp.xz * 1.7 + wp.y));
             gTerrainEmissive += vec3(0.8, 0.3, 1.0) * glint * 0.8;
           }
           gTerrainEmissive += vec3(0.5, 0.6, 0.8) * uFlash * 0.25;
         }`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        '#include <roughnessmap_fragment>\nroughnessFactor = gTerrainRough;',
      )
      .replace(
        '#include <emissivemap_fragment>',
        '#include <emissivemap_fragment>\ntotalEmissiveRadiance += gTerrainEmissive;',
      );
  };
  mat.customProgramCacheKey = () => `orb-terrain2-${quality}`;
  return mat;
}
