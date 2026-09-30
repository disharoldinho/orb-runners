import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { sharedUniforms } from '../../graphics/shaderLib';
import { GraphicsQuality } from '../../graphics/quality';
import { ParticleKind } from './skyLook';

interface KindSpec {
  count: number; // at High; Medium 60 %, Low 30 %
  size: number;
  vel: [number, number, number];
  sway: number;
  additive: boolean;
  shape: 0 | 1 | 2 | 3; // 0 soft dot, 1 leaf, 2 streak (rain), 3 sparkle star
  opacity: number;
}

const KINDS: Record<Exclude<ParticleKind, 'none'>, KindSpec> = {
  pollen: {
    count: 700,
    size: 0.16,
    vel: [0.25, 0.12, 0.1],
    sway: 0.6,
    additive: true,
    shape: 0,
    opacity: 0.85,
  },
  petals: {
    count: 520,
    size: 0.3,
    vel: [0.6, -0.5, 0.2],
    sway: 1.1,
    additive: false,
    shape: 1,
    opacity: 0.95,
  },
  leaves: {
    count: 520,
    size: 0.34,
    vel: [0.7, -0.8, 0.3],
    sway: 1.3,
    additive: false,
    shape: 1,
    opacity: 0.95,
  },
  sparkles: {
    count: 650,
    size: 0.3,
    vel: [0, 0.25, 0],
    sway: 0.35,
    additive: true,
    shape: 3,
    opacity: 1,
  },
  dust: {
    count: 900,
    size: 0.12,
    vel: [2.6, 0.05, 0.9],
    sway: 0.4,
    additive: false,
    shape: 0,
    opacity: 0.55,
  },
  snow: {
    count: 1500,
    size: 0.17,
    vel: [0.35, -1.3, 0.15],
    sway: 0.7,
    additive: false,
    shape: 0,
    opacity: 0.95,
  },
  embers: {
    count: 800,
    size: 0.17,
    vel: [0.25, 1.6, 0.1],
    sway: 0.8,
    additive: true,
    shape: 0,
    opacity: 1,
  },
  rain: {
    count: 2400,
    size: 0.9,
    vel: [1.2, -24, 0.4],
    sway: 0,
    additive: false,
    shape: 2,
    opacity: 0.5,
  },
  gold: {
    count: 600,
    size: 0.26,
    vel: [0.1, 0.35, 0],
    sway: 0.5,
    additive: true,
    shape: 3,
    opacity: 1,
  },
};

const TIER_SCALE: Record<GraphicsQuality, number> = { low: 0.3, medium: 0.6, high: 1 };
const BOX = new THREE.Vector3(64, 36, 64);

/**
 * Themed ambient particles (pollen, leaves, snow, embers, sparkles, rain...). A fixed
 * cloud of points is wrapped around the camera in the vertex shader, so it costs a
 * single draw call and never runs out wherever the orb goes.
 */
export function ThemeParticles({
  kind,
  color,
  quality,
}: {
  kind: ParticleKind;
  color: string;
  quality: GraphicsQuality;
}) {
  const spec = kind === 'none' ? null : KINDS[kind];
  const count = spec ? Math.round(spec.count * TIER_SCALE[quality]) : 0;
  const dpr = useThree((s) => s.viewport.dpr);

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const base = new Float32Array(count * 3);
    const seed = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      base[i * 3] = Math.random() * BOX.x;
      base[i * 3 + 1] = Math.random() * BOX.y;
      base[i * 3 + 2] = Math.random() * BOX.z;
      seed[i] = Math.random();
    }
    g.setAttribute('position', new THREE.BufferAttribute(base, 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
    return g;
  }, [count]);

  const mat = useMemo(() => {
    if (!spec) return null;
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: spec.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      uniforms: {
        uTime: sharedUniforms.uTime,
        uFlash: sharedUniforms.uFlash,
        uCam: { value: new THREE.Vector3() },
        uBox: { value: BOX.clone() },
        uVel: { value: new THREE.Vector3(...spec.vel) },
        uSway: { value: spec.sway },
        uSize: { value: spec.size },
        uColor: { value: new THREE.Color(color) },
        uOpacity: { value: spec.opacity },
        uPx: { value: 1 },
      },
      defines: { SHAPE: spec.shape },
      vertexShader: /* glsl */ `
        attribute float aSeed;
        uniform float uTime, uSway, uSize, uPx;
        uniform vec3 uCam, uBox, uVel;
        varying float vSeed;
        varying float vFade;
        void main() {
          vSeed = aSeed;
          float t = uTime * (0.7 + aSeed * 0.6);
          vec3 p = position + uVel * t;
          p.x += sin(t * 0.9 + aSeed * 30.0) * uSway;
          p.z += cos(t * 0.7 + aSeed * 17.0) * uSway;
          // wrap into a box centred on the camera
          vec3 rel = mod(p - uCam + uBox * 0.5, uBox) - uBox * 0.5;
          vec3 wp = uCam + rel;
          vec3 edge = abs(rel) / (uBox * 0.5);
          vFade = 1.0 - smoothstep(0.7, 1.0, max(max(edge.x, edge.y), edge.z));
          vec4 mv = viewMatrix * vec4(wp, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = uSize * uPx * (340.0 / max(-mv.z, 0.5));
          vFade *= smoothstep(0.6, 2.5, -mv.z); // no giant sprites in the lens
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        uniform float uOpacity, uTime, uFlash;
        varying float vSeed;
        varying float vFade;
        void main() {
          vec2 uv = gl_PointCoord * 2.0 - 1.0;
          float a;
          vec3 col = uColor;
          #if SHAPE == 0
            a = smoothstep(1.0, 0.1, length(uv));
          #elif SHAPE == 1
            float ang = vSeed * 6.283 + uTime * (0.8 + vSeed);
            vec2 r = mat2(cos(ang), -sin(ang), sin(ang), cos(ang)) * uv;
            a = smoothstep(1.0, 0.8, length(r * vec2(1.0, 2.2)));
            col *= 0.75 + 0.5 * vSeed + 0.2 * r.x;
          #elif SHAPE == 2
            a = smoothstep(0.14, 0.0, abs(uv.x)) * smoothstep(1.0, 0.4, abs(uv.y));
            col += uFlash * 0.8;
          #else
            float d = length(uv);
            float star = max(smoothstep(0.16, 0.0, abs(uv.x)) , smoothstep(0.16, 0.0, abs(uv.y))) * smoothstep(1.0, 0.0, d);
            a = max(star, smoothstep(0.45, 0.0, d));
            a *= 0.55 + 0.45 * sin(uTime * 4.0 + vSeed * 50.0);
          #endif
          gl_FragColor = vec4(col, a * uOpacity * vFade);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  useEffect(() => () => mat?.dispose(), [mat]);
  useEffect(() => () => geo.dispose(), [geo]);

  useFrame(({ camera }) => {
    if (!mat) return;
    mat.uniforms.uCam.value.copy(camera.position);
    mat.uniforms.uPx.value = dpr;
    mat.uniforms.uColor.value.set(color);
  });

  if (!mat || count === 0) return null;
  return <points geometry={geo} material={mat} frustumCulled={false} renderOrder={5} />;
}

/** Storm lightning: random double-flash pulses of the sky, clouds, rain and a fill light. */
export function StormLightning({ active }: { active: boolean }) {
  const lightRef = useRef<THREE.HemisphereLight>(null);
  const next = useRef(3);
  const second = useRef(-1);
  useFrame((_, delta) => {
    if (!active) {
      if (lightRef.current) lightRef.current.intensity = 0;
      return;
    }
    next.current -= delta;
    if (second.current > 0) {
      second.current -= delta;
      if (second.current <= 0) sharedUniforms.uFlash.value = 0.8;
    }
    if (next.current <= 0) {
      sharedUniforms.uFlash.value = 1;
      second.current = 0.12 + Math.random() * 0.1;
      next.current = 4 + Math.random() * 7;
    }
    if (lightRef.current) lightRef.current.intensity = sharedUniforms.uFlash.value * 2.4;
  });
  return <hemisphereLight ref={lightRef} args={['#dbeafe', '#1e293b', 0]} />;
}
