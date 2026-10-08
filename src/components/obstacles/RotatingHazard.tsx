import { useRef } from 'react';
import {
  CuboidCollider,
  RapierRigidBody,
  RigidBody,
  useBeforePhysicsStep,
} from '@react-three/rapier';
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

  const isBridge = type !== 'hazard';
  // Visual arm length of the cross bar on each side of the primary bar. The cross bar used
  // to be a second full-length box whose top face coincided with the primary bar's over the
  // hub square and z-fought there; it is now drawn as two arms that stop at the primary bar.
  const armLen = Math.max(0, (sz - sx) / 2);

  return (
    <RigidBody
      ref={bodyRef}
      type="kinematicPosition"
      position={position}
      colliders={false}
      friction={type === 'hazard' ? 0.3 : 0.95}
      restitution={type === 'hazard' ? 0.65 : 0.15}
    >
      {/* Colliders are explicit and match the old auto-generated bar cuboids exactly. */}
      <CuboidCollider args={[sx / 2, sy / 2, sz / 2]} />
      {type === 'cross-bridge' && (
        <CuboidCollider args={[sx / 2, sy / 2, sz / 2]} rotation={[0, Math.PI / 2, 0]} />
      )}
      {/* Hazard bars keep their raised hub as part of the obstacle. On bridges it used to be a
          0.33 m bump in the middle of the deck; it is now a flush, collider-free medallion,
          so the hub is somewhere you can stop and ride. */}
      {!isBridge && <CuboidCollider args={[0.55, sy * 0.4, 0.55]} position={[0, sy * 0.65, 0]} />}

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

      {/* Secondary Cross Bar for 4-way Windmill Bridges (two arms, see armLen) */}
      {type === 'cross-bridge' &&
        armLen > 0 &&
        [-1, 1].map((side) => (
          <mesh
            key={side}
            castShadow
            receiveShadow
            position={[side * (sx / 2 + armLen / 2), 0, 0]}
            rotation={[0, Math.PI / 2, 0]}
          >
            <boxGeometry args={[sx, sy, armLen]} />
            <meshStandardMaterial color={barColor} roughness={0.3} metalness={0.25} />
          </mesh>
        ))}

      {/* Center Hub Cap */}
      {isBridge ? (
        <mesh position={[0, sy / 2 + 0.0125, 0]}>
          <cylinderGeometry args={[0.55, 0.55, 0.025, 24]} />
          <meshStandardMaterial color="#facc15" metalness={0.6} roughness={0.2} />
        </mesh>
      ) : (
        <mesh position={[0, sy * 0.65, 0]}>
          <cylinderGeometry args={[0.45, 0.55, sy * 0.8, 16]} />
          <meshStandardMaterial color="#facc15" metalness={0.6} roughness={0.2} />
        </mesh>
      )}
    </RigidBody>
  );
}
