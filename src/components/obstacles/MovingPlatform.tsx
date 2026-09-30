import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RapierRigidBody, RigidBody, useBeforePhysicsStep } from '@react-three/rapier';
import * as THREE from 'three';
import { MovingPlatformDef } from '../../types/level';
import { THEME_PALETTES } from './StaticBlock';
import { getSharedMaterial, getSurfaceMaterial } from '../../graphics/surfaceMaterials';
import { useGameStore } from '../../store/useGameStore';
import { PLATFORM_LAYER } from '../../levels/visualLayers';

export function MovingPlatform({
  start,
  end,
  size,
  speed,
  phaseOffset = 0,
  theme = 'warning',
}: MovingPlatformDef) {
  const bodyRef = useRef<RapierRigidBody>(null);
  const thrusterRingRef = useRef<THREE.Mesh>(null);
  const [sx, sy, sz] = size;

  const quality = useGameStore((st) => st.graphicsQuality);
  // Same procedural surface as the static blocks (the old canvas checker was UV-stretched on
  // the sides), riding with the platform. PLATFORM_LAYER: platforms dock flush with decks, so they
  // win the depth test instead of z-fighting at the stops.
  const deckMat = useMemo(
    () =>
      getSurfaceMaterial(theme, 'normal', THEME_PALETTES[theme] ?? THEME_PALETTES.meadow, quality, {
        anchor: 'local',
        layer: PLATFORM_LAYER,
      }),
    [theme, quality]
  );
  const rimMat = useMemo(
    () =>
      getSharedMaterial(
        'platform-rim',
        () =>
          new THREE.MeshStandardMaterial({
            color: '#f97316',
            emissive: '#f97316',
            emissiveIntensity: 0.45,
            metalness: 0.4,
            roughness: 0.3,
          }),
        PLATFORM_LAYER
      ),
    []
  );

  // Drive the kinematic body once per physics sub-step (not once per rendered frame):
  // at low frame rates a per-frame target makes the platform cover a whole frame of travel
  // in a single 1/120 s step, which kicks a riding orb into the air.
  const physicsTime = useRef(0);
  useBeforePhysicsStep((world) => {
    const rb = bodyRef.current;
    if (!rb) return;
    physicsTime.current += world.timestep;

    const t = physicsTime.current * speed + phaseOffset;
    const factor = (1 - Math.cos(t)) * 0.5;

    const x = THREE.MathUtils.lerp(start[0], end[0], factor);
    const y = THREE.MathUtils.lerp(start[1], end[1], factor);
    const z = THREE.MathUtils.lerp(start[2], end[2], factor);

    rb.setNextKinematicTranslation({ x, y, z });
  });

  useFrame((state) => {
    if (thrusterRingRef.current) {
      const pulse = 0.92 + Math.sin(state.clock.elapsedTime * 10) * 0.08;
      thrusterRingRef.current.scale.set(pulse, pulse, 1);
    }
  });

  return (
    <RigidBody
      ref={bodyRef}
      type="kinematicPosition"
      position={start}
      friction={1.0}
      restitution={0.15}
    >
      {/* Main Beveled Deck */}
      <mesh receiveShadow castShadow material={deckMat}>
        <boxGeometry args={[sx, sy, sz]} />
      </mesh>

      {/* Glowing Hazard Rim */}
      <mesh position={[0, -0.04, 0]} material={rimMat}>
        <boxGeometry args={[sx + 0.14, sy * 0.65, sz + 0.14]} />
      </mesh>

      {/* Hover Thruster Pod Underneath */}
      <mesh position={[0, -sy / 2 - 0.18, 0]}>
        <cylinderGeometry args={[Math.min(sx, sz) * 0.35, Math.min(sx, sz) * 0.22, 0.32, 16]} />
        <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh
        ref={thrusterRingRef}
        position={[0, -sy / 2 - 0.35, 0]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <torusGeometry args={[Math.min(sx, sz) * 0.28, 0.06, 10, 24]} />
        <meshBasicMaterial color="#38bdf8" />
      </mesh>
    </RigidBody>
  );
}
