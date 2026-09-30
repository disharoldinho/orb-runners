import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GLSL_NOISE, sharedUniforms } from '../../graphics/shaderLib';
import { SkyLook } from './skyLook';

/** ~1.2 s colour cross-fade when the Summit stage (and its sky) changes. */
const FADE = 2.5;

/**
 * Procedural sky dome: zenith/horizon/ground gradient, sun disc with glow, twinkling
 * stars, drifting fbm clouds, aurora curtains and storm lightning. Lives inside the
 * horizon group (follows the orb, tilts with the board) so it reads as infinitely far.
 */
export function SkyDome({
  look,
  radius,
  quality,
}: {
  look: SkyLook;
  radius: number;
  quality: string;
}) {
  const mat = useMemo(() => {
    const m = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      defines: quality === 'low' ? { SKY_LOW: 1 } : {},
      uniforms: {
        uTime: sharedUniforms.uTime,
        uFlash: sharedUniforms.uFlash,
        uZenith: { value: new THREE.Color(look.zenith) },
        uHorizon: { value: new THREE.Color(look.horizon) },
        uGround: { value: new THREE.Color(look.ground) },
        uSun: { value: new THREE.Color(look.sun) },
        uSunDir: { value: new THREE.Vector3(...look.sunDir).normalize() },
        uSunSize: { value: look.sunSize },
        uStars: { value: look.stars },
        uClouds: { value: look.clouds },
        uCloudTint: { value: new THREE.Color(look.cloudTint) },
        uAurora: { value: look.aurora },
        uAuroraColor: { value: new THREE.Color(look.auroraColor) },
      },
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          gl_Position = p.xyww; // pinned to the far plane
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform float uFlash;
        uniform vec3 uZenith, uHorizon, uGround, uSun, uSunDir, uCloudTint, uAuroraColor;
        uniform float uSunSize, uStars, uClouds, uAurora;
        varying vec3 vDir;
        ${GLSL_NOISE}
        void main() {
          vec3 dir = normalize(vDir);
          float h = dir.y;
          vec3 col = h > 0.0
            ? mix(uHorizon, uZenith, pow(clamp(h, 0.0, 1.0), 0.55))
            : mix(uHorizon, uGround, pow(clamp(-h * 2.5, 0.0, 1.0), 0.7));
          // horizon haze band
          col = mix(col, uHorizon * 1.08, exp(-abs(h) * 14.0) * 0.45);

          // Sun: disc + soft corona + wide scattering glow
          float sd = max(dot(dir, uSunDir), 0.0);
          float disc = smoothstep(1.0 - 0.0009 * uSunSize, 1.0 - 0.0005 * uSunSize, sd);
          col += uSun * (pow(sd, 18.0 / uSunSize) * 0.45 + pow(sd, 260.0 / uSunSize) * 1.2);
          col = mix(col, uSun * 3.2, disc);

          // Stars (fade in with uStars, only above the horizon, hidden behind the sun glow)
          if (uStars > 0.01 && h > 0.0) {
            vec3 cell = floor(dir * 180.0);
            float s = orbHash13(cell);
            float tw = 0.6 + 0.4 * sin(uTime * (1.5 + s * 3.0) + s * 40.0);
            float star = step(0.9965, s) * tw * smoothstep(0.0, 0.25, h) * (1.0 - pow(sd, 6.0));
            col += vec3(star) * uStars * 1.4;
          }

          // Aurora curtains
          if (uAurora > 0.01 && h > 0.05) {
            float ang = atan(dir.z, dir.x);
            float band = orbFbm(vec2(ang * 3.0 + uTime * 0.03, h * 3.0 - uTime * 0.05));
            float curtain = smoothstep(0.45, 0.85, band) * smoothstep(0.05, 0.3, h) * smoothstep(0.75, 0.35, h);
            col += uAuroraColor * curtain * uAurora * 0.9;
          }

          // Clouds: fbm projected on a virtual cloud deck
          if (uClouds > 0.01 && h > -0.02) {
            vec2 uv = dir.xz / (h + 0.18) * 1.3;
            vec2 drift = vec2(uTime * 0.012, uTime * 0.005);
            #ifdef SKY_LOW
              float n = orbFbm(uv + drift);
            #else
              float n = orbFbm(uv + drift + 0.35 * orbFbm(uv * 2.0 - drift));
            #endif
            float cover = smoothstep(1.0 - uClouds * 0.75, 1.15 - uClouds * 0.55, n);
            cover *= smoothstep(-0.02, 0.12, h);
            float lit = 0.75 + 0.35 * pow(sd, 3.0) + 0.2 * (n - 0.5);
            vec3 cloudCol = mix(uCloudTint, uSun, 0.15) * lit;
            col = mix(col, cloudCol, cover * 0.85);
            col += uSun * cover * pow(sd, 24.0) * 0.8; // silver lining near the sun
          }

          col += vec3(0.75, 0.85, 1.0) * uFlash * (0.6 + 0.4 * max(h, 0.0));
          gl_FragColor = vec4(col, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,
    });
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quality]);

  const targets = useMemo(
    () => ({
      zenith: new THREE.Color(),
      horizon: new THREE.Color(),
      ground: new THREE.Color(),
      sun: new THREE.Color(),
      cloud: new THREE.Color(),
      aurora: new THREE.Color(),
      sunDir: new THREE.Vector3(),
    }),
    [],
  );

  useFrame((_, delta) => {
    const k = 1 - Math.exp(-FADE * Math.min(delta, 0.5));
    const u = mat.uniforms;
    targets.zenith.set(look.zenith);
    targets.horizon.set(look.horizon);
    targets.ground.set(look.ground);
    targets.sun.set(look.sun);
    targets.cloud.set(look.cloudTint);
    targets.aurora.set(look.auroraColor);
    targets.sunDir.set(...look.sunDir).normalize();
    u.uZenith.value.lerp(targets.zenith, k);
    u.uHorizon.value.lerp(targets.horizon, k);
    u.uGround.value.lerp(targets.ground, k);
    u.uSun.value.lerp(targets.sun, k);
    u.uCloudTint.value.lerp(targets.cloud, k);
    u.uAuroraColor.value.lerp(targets.aurora, k);
    (u.uSunDir.value as THREE.Vector3).lerp(targets.sunDir, k).normalize();
    u.uSunSize.value += (look.sunSize - u.uSunSize.value) * k;
    u.uStars.value += (look.stars - u.uStars.value) * k;
    u.uClouds.value += (look.clouds - u.uClouds.value) * k;
    u.uAurora.value += (look.aurora - u.uAurora.value) * k;
  });

  return (
    <mesh material={mat} renderOrder={-10} frustumCulled={false}>
      <sphereGeometry args={[radius, 48, 24]} />
    </mesh>
  );
}
