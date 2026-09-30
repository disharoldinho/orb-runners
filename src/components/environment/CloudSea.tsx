import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GLSL_NOISE, sharedUniforms } from '../../graphics/shaderLib';
import { makeWaterMaterial } from '../../graphics/fluidMaterials';
import { SkyLook } from './skyLook';

const FADE = 2.5;

/**
 * Soft sea of clouds below the course: two parallax fbm layers with lit tops.
 * World-space height, follows the camera horizontally (so it never ends).
 */
export function CloudSea({ look, y, quality }: { look: SkyLook; y: number; quality: string }) {
  const groupRef = useRef<THREE.Group>(null);
  const mats = useMemo(
    () =>
      [0, 1].map(
        (layer) =>
          new THREE.ShaderMaterial({
            transparent: true,
            depthWrite: false,
            fog: false,
            defines: quality === 'low' ? { CLOUD_LOW: 1 } : {},
            uniforms: {
              uTime: sharedUniforms.uTime,
              uFlash: sharedUniforms.uFlash,
              uColor: { value: new THREE.Color(look.cloudSea) },
              uHorizon: { value: new THREE.Color(look.horizon) },
              uLayer: { value: layer },
            },
            vertexShader: /* glsl */ `
              varying vec3 vWorld;
              void main() {
                vec4 wp = modelMatrix * vec4(position, 1.0);
                vWorld = wp.xyz;
                gl_Position = projectionMatrix * viewMatrix * wp;
              }
            `,
            fragmentShader: /* glsl */ `
              uniform float uTime, uFlash, uLayer;
              uniform vec3 uColor, uHorizon;
              varying vec3 vWorld;
              ${GLSL_NOISE}
              void main() {
                vec2 p = vWorld.xz * (0.006 + uLayer * 0.004) + vec2(uTime * 0.004, uTime * 0.002) * (1.0 + uLayer);
                #ifdef CLOUD_LOW
                  float n = orbFbm(p * 3.0);
                #else
                  float n = orbFbm(p * 3.0 + orbFbm(p * 6.0 + uLayer * 3.1) * 0.6);
                #endif
                float a = smoothstep(0.36, 0.74, n) * (0.9 - uLayer * 0.35);
                float dist = length(vWorld.xz - cameraPosition.xz);
                a *= smoothstep(1350.0, 700.0, dist);
                vec3 col = mix(mix(uColor, uHorizon, 0.45) * 0.7, uColor * 1.12, smoothstep(0.4, 0.9, n));
                col = mix(col, uHorizon, smoothstep(250.0, 1100.0, dist) * 0.8);
                col += vec3(0.6, 0.7, 0.9) * uFlash * 0.5;
                gl_FragColor = vec4(col, a);
                #include <tonemapping_fragment>
                #include <colorspace_fragment>
              }
            `,
          }),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [quality],
  );
  const tc = useMemo(() => new THREE.Color(), []);
  const th = useMemo(() => new THREE.Color(), []);
  useFrame(({ camera }, delta) => {
    if (groupRef.current) groupRef.current.position.set(camera.position.x, y, camera.position.z);
    const k = 1 - Math.exp(-FADE * Math.min(delta, 0.5));
    tc.set(look.cloudSea);
    th.set(look.horizon);
    for (const m of mats) {
      m.uniforms.uColor.value.lerp(tc, k);
      m.uniforms.uHorizon.value.lerp(th, k);
    }
  });
  return (
    <group ref={groupRef}>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        material={mats[0]}
        renderOrder={-2}
        frustumCulled={false}
      >
        <planeGeometry args={[2800, 2800]} />
      </mesh>
      {quality !== 'low' && (
        <mesh
          position={[0, 9, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          material={mats[1]}
          renderOrder={-1}
          frustumCulled={false}
        >
          <planeGeometry args={[2800, 2800]} />
        </mesh>
      )}
    </group>
  );
}

/** Wavy ocean far below the campaign courses (visible through the cloud gaps). */
export function Ocean({ look, y }: { look: SkyLook; y: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const mat = useMemo(
    () =>
      makeWaterMaterial({
        deep: '#0b3a66',
        shallow: '#1f8fbf',
        sky: look.horizon,
        waveHeight: 1.2,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const th = useMemo(() => new THREE.Color(), []);
  useFrame(({ camera }, delta) => {
    if (ref.current) ref.current.position.set(camera.position.x, y, camera.position.z);
    th.set(look.horizon);
    mat.uniforms.uSky.value.lerp(th, 1 - Math.exp(-FADE * Math.min(delta, 0.5)));
  });
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} material={mat} frustumCulled={false}>
      <planeGeometry args={[2400, 2400, 96, 96]} />
    </mesh>
  );
}
