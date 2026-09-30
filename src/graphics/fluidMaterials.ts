import * as THREE from 'three';
import { GLSL_NOISE, sharedUniforms } from './shaderLib';

/**
 * Animated lava: domain-warped fbm flowing in world space, crusted plates with
 * glowing cracks. Unlit (emissive) so bloom picks it up; supports scene fog.
 */
let lavaMat: THREE.ShaderMaterial | null = null;
export function getLavaMaterial(): THREE.ShaderMaterial {
  if (lavaMat) return lavaMat;
  lavaMat = new THREE.ShaderMaterial({
    fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uTime: sharedUniforms.uTime }]),
    vertexShader: /* glsl */ `
      #include <common>
      #include <fog_pars_vertex>
      varying vec3 vWorld;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorld = wp.xyz;
        vec4 mvPosition = viewMatrix * wp;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: /* glsl */ `
      #include <common>
      #include <fog_pars_fragment>
      uniform float uTime;
      varying vec3 vWorld;
      ${GLSL_NOISE}
      void main() {
        vec2 p = vWorld.xz * 0.16;
        float t = uTime * 0.11;
        vec2 warp = vec2(orbFbm(p + vec2(t, -t * 0.6)), orbFbm(p + vec2(4.2 - t * 0.7, 1.3 + t)));
        float n = orbFbm(p * 1.6 + warp * 2.2 + vec2(0.0, -t * 1.4));
        float crust = smoothstep(0.42, 0.62, n);
        float cracks = 1.0 - orbVoronoiEdge(p * 2.3 + warp * 0.8);
        cracks = smoothstep(0.82, 0.99, cracks);
        float pulse = 0.85 + 0.15 * sin(uTime * 2.2 + n * 6.0);
        vec3 hot = mix(vec3(1.0, 0.36, 0.04), vec3(1.0, 0.82, 0.3), smoothstep(0.2, 0.0, n));
        vec3 crustCol = vec3(0.16, 0.05, 0.03);
        vec3 col = mix(hot * 2.2 * pulse, crustCol, crust * (1.0 - cracks));
        col += cracks * crust * vec3(1.4, 0.45, 0.08) * pulse;
        gl_FragColor = vec4(col, 1.0);
        #include <fog_fragment>
      }
    `,
  });
  return lavaMat;
}

/**
 * Stylised water / ocean: layered moving waves, fresnel sky tint and sparkle.
 * Vertex waves are cheap sines; colour and opacity are uniforms per instance.
 */
export function makeWaterMaterial(opts: {
  deep: string;
  shallow: string;
  sky: string;
  opacity?: number;
  waveHeight?: number;
}): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    fog: true,
    transparent: (opts.opacity ?? 1) < 1,
    depthWrite: (opts.opacity ?? 1) >= 1,
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        uTime: sharedUniforms.uTime,
        uDeep: { value: new THREE.Color(opts.deep) },
        uShallow: { value: new THREE.Color(opts.shallow) },
        uSky: { value: new THREE.Color(opts.sky) },
        uOpacity: { value: opts.opacity ?? 1 },
        uWave: { value: opts.waveHeight ?? 0.6 },
      },
    ]),
    vertexShader: /* glsl */ `
      #include <common>
      #include <fog_pars_vertex>
      uniform float uTime;
      uniform float uWave;
      varying vec3 vWorld;
      varying float vCrest;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        float w = sin(wp.x * 0.05 + uTime * 0.7) * 0.6 + sin(wp.z * 0.07 - uTime * 0.9) * 0.4
                + sin((wp.x + wp.z) * 0.13 + uTime * 1.3) * 0.25;
        wp.y += w * uWave;
        vCrest = w;
        vWorld = wp.xyz;
        vec4 mvPosition = viewMatrix * wp;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: /* glsl */ `
      #include <common>
      #include <fog_pars_fragment>
      uniform float uTime;
      uniform vec3 uDeep;
      uniform vec3 uShallow;
      uniform vec3 uSky;
      uniform float uOpacity;
      varying vec3 vWorld;
      varying float vCrest;
      ${GLSL_NOISE}
      void main() {
        vec3 V = normalize(cameraPosition - vWorld);
        float fres = pow(1.0 - clamp(V.y, 0.0, 1.0), 3.0);
        vec2 p = vWorld.xz * 0.08;
        float n = orbNoise(p + vec2(uTime * 0.05, uTime * 0.03)) * 0.5
                + orbNoise(p * 2.7 - vec2(uTime * 0.08, 0.0)) * 0.5;
        vec3 col = mix(uDeep, uShallow, clamp(vCrest * 0.35 + 0.45 + n * 0.25, 0.0, 1.0));
        col = mix(col, uSky, fres * 0.7);
        float sparkle = smoothstep(0.86, 0.95, orbNoise(vWorld.xz * 0.9 + uTime * 0.6)) * (0.3 + fres);
        col += sparkle * 0.6;
        float foam = smoothstep(0.9, 1.25, vCrest + n * 0.3);
        col = mix(col, vec3(0.92, 0.97, 1.0), foam * 0.5);
        gl_FragColor = vec4(col, uOpacity);
        #include <fog_fragment>
      }
    `,
  });
}
