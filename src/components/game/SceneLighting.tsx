import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { livePhysics } from '../../store/useGameStore';
import { GraphicsPreset } from '../../graphics/quality';

/** Same sun direction as the original fixed light at [26, 52, 24]. */
const SUN_OFFSET = new THREE.Vector3(26, 52, 24).normalize().multiplyScalar(70);
/** Rotation-only basis of the sun's view, used to snap the shadow frustum to texels. */
const SUN_BASIS = new THREE.Matrix4().lookAt(SUN_OFFSET, new THREE.Vector3(), new THREE.Vector3(0, 1, 0));
const SUN_BASIS_INV = SUN_BASIS.clone().invert();

/** ~1.2 s colour cross-fade, matching the CSS sky-gradient transition. */
const COLOR_FADE_RATE = 2.5;

interface SunLightProps {
  preset: GraphicsPreset;
  sunColor: string;
  skyColor: string;
  groundColor: string;
}

/**
 * Key sun light whose orthographic shadow frustum follows the orb, so shadows
 * work along the whole 2 km Summit climb instead of only near the origin.
 * The focus point is snapped to shadow-map texels in light space to prevent
 * shadow-edge shimmering while rolling.
 */
export function SunLight({ preset, sunColor, skyColor, groundColor }: SunLightProps) {
  const lightRef = useRef<THREE.DirectionalLight>(null);
  const hemiRef = useRef<THREE.HemisphereLight>(null);
  const scene = useThree((s) => s.scene);
  const focus = useMemo(() => new THREE.Vector3(), []);
  const targets = useMemo(
    () => ({ sun: new THREE.Color(), sky: new THREE.Color(), ground: new THREE.Color() }),
    []
  );

  const castShadow = preset.shadowMapSize > 0;
  const extent = preset.shadowExtent;

  targets.sun.set(sunColor);
  targets.sky.set(skyColor);
  targets.ground.set(groundColor);

  // The light target must live in the scene graph for its matrix to update.
  useEffect(() => {
    const light = lightRef.current;
    if (!light) return;
    scene.add(light.target);
    return () => {
      scene.remove(light.target);
    };
  }, [scene]);

  // Re-allocate the shadow map when the quality tier changes its size.
  useEffect(() => {
    const light = lightRef.current;
    if (!light || !castShadow) return;
    const shadow = light.shadow;
    shadow.mapSize.set(preset.shadowMapSize, preset.shadowMapSize);
    const cam = shadow.camera;
    cam.left = -extent;
    cam.right = extent;
    cam.top = extent;
    cam.bottom = -extent;
    cam.near = 1;
    cam.far = 170;
    cam.updateProjectionMatrix();
    if (shadow.map) {
      shadow.map.dispose();
      shadow.map = null;
    }
  }, [castShadow, preset.shadowMapSize, extent]);

  useFrame((_, delta) => {
    const light = lightRef.current;
    if (!light) return;
    const dt = Math.min(delta, 0.05);

    const [bx, by, bz] = livePhysics.ballPosition;
    focus.set(bx, by, bz).applyMatrix4(SUN_BASIS_INV);
    if (castShadow) {
      const texel = (extent * 2) / preset.shadowMapSize;
      focus.x = Math.round(focus.x / texel) * texel;
      focus.y = Math.round(focus.y / texel) * texel;
    }
    focus.applyMatrix4(SUN_BASIS);

    light.target.position.copy(focus);
    light.target.updateMatrixWorld();
    light.position.copy(focus).add(SUN_OFFSET);

    const k = 1 - Math.exp(-COLOR_FADE_RATE * dt);
    light.color.lerp(targets.sun, k);
    if (hemiRef.current) {
      hemiRef.current.color.lerp(targets.sky, k);
      hemiRef.current.groundColor.lerp(targets.ground, k);
    }
  });

  return (
    <>
      <directionalLight
        ref={lightRef}
        castShadow={castShadow}
        position={SUN_OFFSET.toArray()}
        intensity={2.4}
        color={sunColor}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
      />
      <hemisphereLight ref={hemiRef} args={[skyColor, groundColor, 0.5]} />
      <ambientLight intensity={0.3} />
    </>
  );
}

interface AtmosphereFogProps {
  color: string;
  density: number;
}

/**
 * Exponential height-less fog tinted to the sky gradient's horizon colour so
 * distant platforms and sky islands fade into the backdrop. Colour and
 * density cross-fade when the Summit changes phase.
 */
export function AtmosphereFog({ color, density }: AtmosphereFogProps) {
  const scene = useThree((s) => s.scene);
  // Created once; colour/density are then eased towards the props each frame.
  const [fog] = useState(() => new THREE.FogExp2(color, density));
  const targetColor = useMemo(() => new THREE.Color(), []);
  targetColor.set(color);

  useEffect(() => {
    const prev = scene.fog;
    scene.fog = fog;
    return () => {
      scene.fog = prev;
    };
  }, [scene, fog]);

  useFrame((_, delta) => {
    const k = 1 - Math.exp(-COLOR_FADE_RATE * Math.min(delta, 0.05));
    fog.color.lerp(targetColor, k);
    fog.density += (density - fog.density) * k;
  });

  return null;
}

/**
 * Camera-relative back/rim light (no shadows): places a soft light behind and above
 * the orb as seen from the camera, so the character, orb glass and block edges get a
 * bright separating rim against the scenery. Medium/High only.
 */
export function RimLight({ color }: { color: string }) {
  const lightRef = useRef<THREE.DirectionalLight>(null);
  const scene = useThree((s) => s.scene);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  useEffect(() => {
    const light = lightRef.current;
    if (!light) return;
    scene.add(light.target);
    return () => {
      scene.remove(light.target);
    };
  }, [scene]);
  useFrame(({ camera }) => {
    const light = lightRef.current;
    if (!light) return;
    const [bx, by, bz] = livePhysics.ballPosition;
    tmp.set(bx - camera.position.x, 0, bz - camera.position.z).normalize();
    light.position.set(bx + tmp.x * 12, by + 2.2, bz + tmp.z * 12);
    light.target.position.set(bx, by, bz);
    light.target.updateMatrixWorld();
  });
  return <directionalLight ref={lightRef} color={color} intensity={0.9} />;
}
