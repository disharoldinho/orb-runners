import { useRef } from 'react';
import { RapierRigidBody, RigidBody, useBeforePhysicsStep } from '@react-three/rapier';
import * as THREE from 'three';
import { RotatingHazardDef } from '../../types/level';

export function RotatingHazard({
  position,
  size,
  angularVelocity,
  type,
  color,
}: RotatingHazardDef) {
  const bodyRef = useRef<RapierRigidBody>(null);
  const eulerRef = useRef(new THREE.Euler(0, 0, 0));
  const quatRef = useRef(new THREE.Quaternion());

  const [sx, sy, sz] = size;
  const barColor =
    color || (type === 'hazard' ? '#ef4444' : type === 'cross-bridge' ? '#38bdf8' : '#a855f7');

  // Rotate per physics sub-step so the bar sweeps smoothly regardless of frame rate.
  useBeforePhysicsStep((world) => {
    const rb = bodyRef.current;
    if (!rb) return;
    const dt = world.timestep;

    eulerRef.current.x += angularVelocity[0] * dt;
    eulerRef.current.y += angularVelocity[1] * dt;
    eulerRef.current.z += angularVelocity[2] * dt;

    quatRef.current.setFromEuler(eulerRef.current);
    rb.setNextKinematicRotation(quatRef.current);
  });

  return (
    <RigidBody
      ref={bodyRef}
      type="kinematicPosition"
      position={position}
      friction={type === 'hazard' ? 0.3 : 0.95}
      restitution={type === 'hazard' ? 0.65 : 0.15}
    >
      {/* Primary Bar */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[sx, sy, sz]} />
        <meshStandardMaterial
          color={barColor}
          roughness={0.3}
          metalness={0.25}
          emissive={barColor}
          emissiveIntensity={type === 'hazard' ? 0.22 : 0.08}
        />
      </mesh>

      {/* Secondary Cross Bar for 4-way Windmill Bridges */}
      {type === 'cross-bridge' && (
        <mesh castShadow receiveShadow rotation={[0, Math.PI / 2, 0]}>
          <boxGeometry args={[sx, sy, sz]} />
          <meshStandardMaterial color={barColor} roughness={0.3} metalness={0.25} />
        </mesh>
      )}

      {/* Center Hub Cap */}
      <mesh position={[0, sy * 0.65, 0]}>
        <cylinderGeometry args={[0.45, 0.55, sy * 0.8, 16]} />
        <meshStandardMaterial color="#facc15" metalness={0.6} roughness={0.2} />
      </mesh>
    </RigidBody>
  );
}
