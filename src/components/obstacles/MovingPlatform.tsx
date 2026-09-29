import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RapierRigidBody, RigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import { MovingPlatformDef } from '../../types/level';
import { getCheckerTexture, getTileBumpMap } from './StaticBlock';

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

  const checkerTex = useMemo(() => getCheckerTexture(theme, sx, sz), [theme, sx, sz]);
  const bumpTex = useMemo(() => getTileBumpMap(sx, sz), [sx, sz]);

  useFrame((state) => {
    const rb = bodyRef.current;
    if (!rb) return;

    const t = state.clock.elapsedTime * speed + phaseOffset;
    const factor = (1 - Math.cos(t)) * 0.5;

    const x = THREE.MathUtils.lerp(start[0], end[0], factor);
    const y = THREE.MathUtils.lerp(start[1], end[1], factor);
    const z = THREE.MathUtils.lerp(start[2], end[2], factor);

    rb.setNextKinematicTranslation({ x, y, z });

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
      <mesh receiveShadow castShadow>
        <boxGeometry args={[sx, sy, sz]} />
        <meshStandardMaterial
          map={checkerTex}
          bumpMap={bumpTex}
          bumpScale={0.015}
          roughness={0.3}
          metalness={0.25}
        />
      </mesh>

      {/* Glowing Hazard Rim */}
      <mesh position={[0, -0.04, 0]}>
        <boxGeometry args={[sx + 0.14, sy * 0.65, sz + 0.14]} />
        <meshStandardMaterial
          color="#f97316"
          emissive="#f97316"
          emissiveIntensity={0.5}
          metalness={0.5}
          roughness={0.2}
        />
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
