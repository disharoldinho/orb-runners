import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GLSL_NOISE, sharedUniforms } from '../../graphics/shaderLib';

export type Puff = [x: number, y: number, z: number, scale: number];

/**
 * Soft "volumetric-looking" cumulus puffs: camera-facing instanced quads with an fbm
 * billow mask, lit from above (bright crowns, shaded bellies). One draw call.
 */
export function CloudPuffs({
  puffs,
  color = '#ffffff',
  shade = '#9fb3c8',
  opacity = 0.9,
}: {
  puffs: Puff[];
  color?: string;
  shade?: string;
  opacity?: number;
}) {
  const geo = useMemo(() => {
    const g = new THREE.InstancedBufferGeometry();
    const quad = new THREE.PlaneGeometry(1, 1);
    g.index = quad.index;
    g.setAttribute('position', quad.getAttribute('position'));
    g.setAttribute('uv', quad.getAttribute('uv'));
    const off = new Float32Array(puffs.length * 4);
    puffs.forEach((p, i) => off.set(p, i * 4));
    g.setAttribute('aPuff', new THREE.InstancedBufferAttribute(off, 4));
    g.instanceCount = puffs.length;
    // conservative bounds for frustum culling of the whole batch
    const box = new THREE.Box3();
    puffs.forEach((p) => box.expandByPoint(new THREE.Vector3(p[0], p[1], p[2])));
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    sphere.radius += Math.max(0, ...puffs.map((p) => p[3]));
    g.boundingSphere = sphere;
    return g;
  }, [puffs]);

  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        fog: true,
        uniforms: THREE.UniformsUtils.merge([
          THREE.UniformsLib.fog,
          {
            uTime: sharedUniforms.uTime,
            uFlash: sharedUniforms.uFlash,
            uColor: { value: new THREE.Color(color) },
            uShade: { value: new THREE.Color(shade) },
            uOpacity: { value: opacity },
          },
        ]),
        vertexShader: /* glsl */ `
          #include <common>
          #include <fog_pars_vertex>
          attribute vec4 aPuff;
          varying vec2 vUv;
          varying float vSeed;
          void main() {
            vUv = uv;
            vSeed = fract(aPuff.x * 0.137 + aPuff.z * 0.071);
            vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
            vec3 up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
            vec3 wp = aPuff.xyz + (right * position.x * 1.6 + up * position.y) * aPuff.w;
            vec4 mvPosition = viewMatrix * vec4(wp, 1.0);
            gl_Position = projectionMatrix * mvPosition;
            #include <fog_vertex>
          }
        `,
        fragmentShader: /* glsl */ `
          #include <common>
          #include <fog_pars_fragment>
          uniform float uTime, uFlash, uOpacity;
          uniform vec3 uColor, uShade;
          varying vec2 vUv;
          varying float vSeed;
          ${GLSL_NOISE}
          void main() {
            vec2 p = vUv * 2.0 - 1.0;
            p.x *= 1.6;
            // lumpy billow outline: several overlapping blobs + fbm erosion
            float d = length(p * vec2(0.62, 1.0) + vec2(0.0, 0.25));
            d = min(d, length(p - vec2(-0.55, -0.05)) * 1.25);
            d = min(d, length(p - vec2(0.6, 0.0)) * 1.35);
            d = min(d, length(p - vec2(0.1, 0.32)) * 1.2);
            float n = orbFbm(p * 2.2 + vec2(vSeed * 9.0 + uTime * 0.02, vSeed * 3.0));
            float a = smoothstep(1.0, 0.55, d + (n - 0.5) * 0.55);
            a *= smoothstep(-0.95, -0.55, p.y); // flat-ish bottom
            float lit = smoothstep(-0.7, 0.8, p.y + n * 0.4);
            vec3 col = mix(uShade, uColor, lit);
            col += uFlash * vec3(0.6, 0.7, 0.9) * 0.6;
            gl_FragColor = vec4(col, a * uOpacity);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
            #include <fog_fragment>
          }
        `,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const tc = useMemo(() => new THREE.Color(), []);
  const ts = useMemo(() => new THREE.Color(), []);
  useFrame((_, delta) => {
    const k = 1 - Math.exp(-2.5 * Math.min(delta, 0.5));
    tc.set(color);
    ts.set(shade);
    mat.uniforms.uColor.value.lerp(tc, k);
    mat.uniforms.uShade.value.lerp(ts, k);
  });

  useEffect(() => () => geo.dispose(), [geo]);
  if (puffs.length === 0) return null;
  return <mesh geometry={geo} material={mat} renderOrder={3} />;
}
