import { useMemo, useRef } from 'react';
import { livePhysics } from '../../store/useGameStore';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SkyLook } from './skyLook';

const FADE = 2.5;

/** Ridge profile: layered sines + sharp peaks, deterministic per layer. */
function ridgeHeight(t: number, layer: number): number {
  const a = t * Math.PI * 2;
  let h = 0;
  h += Math.sin(a * 3 + layer * 1.7) * 0.35;
  h += Math.sin(a * 7 + layer * 2.9) * 0.22;
  h += Math.sin(a * 13 + layer * 0.6) * 0.12;
  h += Math.sin(a * 29 + layer * 4.1) * 0.05;
  // sharpened peaks
  const peaks = Math.pow(Math.abs(Math.sin(a * 5 + layer)), 6) * 0.55;
  return 0.5 + h * 0.6 + peaks;
}

function buildRing(radius: number, baseY: number, height: number, layer: number, segs: number) {
  const pos: number[] = [];
  const hgt: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const a = t * Math.PI * 2;
    const x = Math.cos(a) * radius;
    const z = Math.sin(a) * radius;
    const top = baseY + ridgeHeight(t, layer) * height;
    pos.push(x, baseY - 40, z, x, top, z);
    hgt.push(0, 1);
    if (i < segs) {
      const k = i * 2;
      idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aTop', new THREE.Float32BufferAttribute(hgt, 1));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}

/**
 * Three layered silhouette rings of distant mountains (atmospheric perspective: the
 * farther the paler), with optional snow caps. Inside the horizon group, so they never
 * get closer however far the orb travels.
 */
export function DistantMountains({
  look,
  baseY = -95,
  scale = 1,
  worldY,
}: {
  look: SkyLook;
  baseY?: number;
  /** Radius and height multiplier (the Summit uses much larger, taller ranges). */
  scale?: number;
  /** If set, the ranges stay at this world height instead of following the orb vertically. */
  worldY?: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const layers = useMemo(
    () =>
      [
        { r: 300, h: 95, fade: 0.25, seed: 1 },
        { r: 340, h: 130, fade: 0.55, seed: 2 },
        { r: 380, h: 165, fade: 0.8, seed: 3 },
      ].map((l) => {
        const geo = buildRing(l.r * scale, baseY, l.h * scale, l.seed, 256);
        const mat = new THREE.ShaderMaterial({
          depthWrite: true,
          fog: false,
          uniforms: {
            uNear: { value: new THREE.Color(look.ridgeNear) },
            uFar: { value: new THREE.Color(look.ridgeFar) },
            uHorizon: { value: new THREE.Color(look.horizon) },
            uSnow: { value: look.snow },
            uFade: { value: l.fade },
            uBase: { value: baseY },
            uH: { value: l.h * scale },
          },
          vertexShader: /* glsl */ `
            attribute float aTop;
            varying float vTop;
            varying vec3 vPos;
            void main() {
              vTop = aTop;
              vPos = position;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `,
          fragmentShader: /* glsl */ `
            uniform vec3 uNear, uFar, uHorizon;
            uniform float uSnow, uFade, uBase, uH;
            varying float vTop;
            varying vec3 vPos;
            void main() {
              float rel = clamp((vPos.y - uBase) / uH, 0.0, 1.5);
              vec3 col = mix(uNear, uFar, uFade);
              // snow caps on the upper third, streaky
              float streak = 0.5 + 0.5 * sin(vPos.x * 0.21 + vPos.z * 0.17) * sin(vPos.x * 0.05 - vPos.z * 0.07);
              float snow = smoothstep(0.62, 0.8, rel + streak * 0.12) * uSnow;
              col = mix(col, mix(vec3(0.95, 0.97, 1.0), uFar, uFade * 0.6), snow);
              // haze toward the base, and overall atmospheric perspective
              col = mix(col, uHorizon, clamp(1.0 - rel * 1.4, 0.0, 1.0) * 0.85);
              col = mix(col, uHorizon, uFade * 0.35);
              gl_FragColor = vec4(col, 1.0);
              #include <tonemapping_fragment>
              #include <colorspace_fragment>
            }
          `,
        });
        return { geo, mat };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [baseY, scale],
  );

  const tNear = useMemo(() => new THREE.Color(), []);
  const tFar = useMemo(() => new THREE.Color(), []);
  const tHor = useMemo(() => new THREE.Color(), []);
  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.position.y = worldY === undefined ? 0 : worldY - livePhysics.ballPosition[1];
    }
    const k = 1 - Math.exp(-FADE * Math.min(delta, 0.5));
    tNear.set(look.ridgeNear);
    tFar.set(look.ridgeFar);
    tHor.set(look.horizon);
    for (const l of layers) {
      const u = l.mat.uniforms;
      u.uNear.value.lerp(tNear, k);
      u.uFar.value.lerp(tFar, k);
      u.uHorizon.value.lerp(tHor, k);
      u.uSnow.value += (look.snow - u.uSnow.value) * k;
    }
  });

  return (
    <group ref={groupRef}>
      {layers.map((l, i) => (
        <mesh
          key={i}
          geometry={l.geo}
          material={l.mat}
          renderOrder={-9 + i}
          frustumCulled={false}
        />
      ))}
    </group>
  );
}
