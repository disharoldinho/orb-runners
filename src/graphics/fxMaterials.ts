import * as THREE from 'three';
import { GLSL_NOISE, sharedUniforms } from './shaderLib';

/**
 * Animated gate effects: holographic energy curtains, landmark light beams and the
 * goal vortex. Additive, depth-tested, no depth writes; cached per colour.
 */
const cache = new Map<string, THREE.ShaderMaterial>();

function cached(key: string, make: () => THREE.ShaderMaterial) {
  let m = cache.get(key);
  if (!m) {
    m = make();
    cache.set(key, m);
  }
  return m;
}

const VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorld;
  void main() {
    vUv = uv;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorld = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

/** Holographic curtain: rising scanlines, hex shimmer and bright edges. */
export function getCurtainMaterial(color: string, intensity = 1): THREE.ShaderMaterial {
  return cached(
    `curtain|${color}|${intensity}`,
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: sharedUniforms.uTime,
          uColor: { value: new THREE.Color(color) },
          uI: { value: intensity },
        },
        vertexShader: VERT,
        fragmentShader: /* glsl */ `
        uniform float uTime, uI;
        uniform vec3 uColor;
        varying vec2 vUv;
        varying vec3 vWorld;
        ${GLSL_NOISE}
        void main() {
          float scan = 0.5 + 0.5 * sin((vUv.y * 26.0 - uTime * 3.0));
          scan = pow(scan, 6.0);
          float sweep = smoothstep(0.08, 0.0, abs(fract(vUv.y - uTime * 0.35) - 0.5) - 0.42);
          float shimmer = orbNoise(vUv * vec2(18.0, 10.0) + vec2(0.0, uTime * 1.5));
          float edge = smoothstep(0.1, 0.0, min(vUv.x, 1.0 - vUv.x)) + smoothstep(0.08, 0.0, 1.0 - vUv.y) * 0.6;
          float fadeBottom = smoothstep(0.0, 0.18, vUv.y);
          float a = (0.1 + 0.25 * scan + 0.35 * sweep + 0.12 * shimmer + edge * 0.7) * fadeBottom * uI;
          gl_FragColor = vec4(uColor * a * 1.6, a);
        }
      `,
      }),
  );
}

/** Tall soft light beam (open cylinder) marking the next gate from far away. */
export function getBeamMaterial(color: string): THREE.ShaderMaterial {
  return cached(
    `beam|${color}`,
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        uniforms: { uTime: sharedUniforms.uTime, uColor: { value: new THREE.Color(color) } },
        vertexShader: /* glsl */ `
        varying vec2 vUv;
        varying vec3 vN;
        varying vec3 vView;
        void main() {
          vUv = uv;
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vN = normalize(mat3(modelMatrix) * normal);
          vView = normalize(cameraPosition - wp.xyz);
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
        fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform vec3 uColor;
        varying vec2 vUv;
        varying vec3 vN;
        varying vec3 vView;
        void main() {
          float facing = abs(dot(normalize(vN), normalize(vView)));
          float core = pow(facing, 2.5);
          float fade = (1.0 - vUv.y) * smoothstep(0.0, 0.04, vUv.y);
          float pulse = 0.75 + 0.25 * sin(vUv.y * 40.0 - uTime * 4.0);
          float a = core * fade * pulse * 0.55;
          gl_FragColor = vec4(uColor * a * 1.8, a);
        }
      `,
      }),
  );
}

/** Goal vortex: swirling spiral arms, bright rim, pulsing core. Use on a circle/plane. */
export function getVortexMaterial(colorA: string, colorB: string): THREE.ShaderMaterial {
  return cached(
    `vortex|${colorA}|${colorB}`,
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: sharedUniforms.uTime,
          uA: { value: new THREE.Color(colorA) },
          uB: { value: new THREE.Color(colorB) },
        },
        vertexShader: VERT,
        fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform vec3 uA, uB;
        varying vec2 vUv;
        ${GLSL_NOISE}
        void main() {
          vec2 p = vUv * 2.0 - 1.0;
          float r = length(p);
          if (r > 1.0) discard;
          float ang = atan(p.y, p.x);
          float arms = 0.5 + 0.5 * sin(ang * 4.0 + r * 9.0 - uTime * 4.0);
          arms = pow(arms, 3.0);
          float n = orbNoise(vec2(ang * 3.0, r * 6.0 - uTime * 2.0));
          float rim = smoothstep(0.82, 0.97, r) * smoothstep(1.0, 0.95, r);
          float core = smoothstep(0.45, 0.0, r) * (0.7 + 0.3 * sin(uTime * 5.0));
          vec3 col = mix(uA, uB, arms * 0.8 + n * 0.2);
          float a = (arms * 0.45 + n * 0.12) * smoothstep(1.0, 0.6, r) + rim * 0.9 + core * 0.6;
          gl_FragColor = vec4(col * a * 1.5, a);
        }
      `,
      }),
  );
}

/** Additive fresnel rim shell for the glass orb (cheap on every tier). */
export function makeFresnelMaterial(
  color: string,
  power = 2.6,
  strength = 0.9,
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uPow: { value: power },
      uStr: { value: strength },
    },
    vertexShader: /* glsl */ `
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vN = normalize(mat3(modelMatrix) * normal);
        vV = normalize(cameraPosition - wp.xyz);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uPow, uStr;
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        float f = pow(1.0 - clamp(dot(normalize(vN), normalize(vV)), 0.0, 1.0), uPow);
        // a soft top highlight band (sky reflection)
        float sky = smoothstep(0.35, 1.0, normalize(vN).y) * 0.18;
        float a = f * uStr + sky;
        gl_FragColor = vec4(uColor * a, a);
      }
    `,
  });
}
