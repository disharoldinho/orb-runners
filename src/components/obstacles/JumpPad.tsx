import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CylinderCollider, RigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import { JumpPadDef } from '../../types/level';
import { spawnParticleBurst, spawnShockwave } from '../game/ParticleFX';
import { soundFX } from '../ui/SoundManager';

export function JumpPad({
  position,
  radius = 1.25,
  upwardImpulse,
  impulseY,
  forwardImpulse = 0,
  direction = [0, 0, -1],
  targetPosition,
  arcHeight = 3.2,
  color = '#f72585',
}: JumpPadDef) {
  const springGroupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const lastLaunchTime = useRef(0);
  const launchImpulseY = upwardImpulse ?? impulseY ?? 14.5;

  useFrame((state) => {
    if (ringRef.current) {
      const s = 0.92 + Math.sin(state.clock.elapsedTime * 6) * 0.08;
      ringRef.current.scale.set(s, s, 1);
    }
    if (springGroupRef.current) {
      const elapsed = performance.now() - lastLaunchTime.current;
      if (elapsed < 380) {
        const lift = Math.sin((elapsed / 380) * Math.PI) * 0.45;
        springGroupRef.current.position.y = lift;
      } else {
        springGroupRef.current.position.y = 0;
      }
    }
  });

  return (
    <RigidBody
      type="fixed"
      position={position}
      colliders={false}
      sensor
      onIntersectionEnter={({ other }) => {
        if (other.rigidBodyObject?.name === 'player-orb' && other.rigidBody) {
          const now = performance.now();
          if (now - lastLaunchTime.current < 320) return;
          lastLaunchTime.current = now;

          soundFX.playJumpPad();

          if (targetPosition) {
            // Deterministic ballistic solver compensating for gravity (20.5) & linearDamping (0.34)
            const g = 20.5;
            const damping = 0.34;
            const curPos = other.rigidBody.translation();
            const dx = targetPosition[0] - curPos.x;
            const dy = targetPosition[1] + 0.65 - curPos.y;
            const dz = targetPosition[2] - curPos.z;

            const peakAboveStart = Math.max(dy + arcHeight, arcHeight);
            const peakAboveTarget = Math.max(0.8, peakAboveStart - dy);

            const tUp = Math.sqrt((2 * peakAboveStart) / g);
            const tDown = Math.sqrt((2 * peakAboveTarget) / g);
            const totalTime = Math.max(0.35, tUp + tDown);

            // Compensate vertical & horizontal velocities for Rapier linearDamping (0.34)
            const vy = Math.sqrt(2 * g * peakAboveStart) * (1 + 0.21 * damping * totalTime);
            const horizFactor = (1 + 0.54 * damping * totalTime) / totalTime;
            const vx = dx * horizFactor;
            const vz = dz * horizFactor;

            other.rigidBody.setLinvel({ x: vx, y: vy, z: vz }, true);
          } else {
            const len = Math.hypot(direction[0], direction[1], direction[2]) || 1;
            const nx = direction[0] / len;
            const nz = direction[2] / len;
            const v = other.rigidBody.linvel();
            const vy = Math.max(12.5, launchImpulseY * 1.08);
            const boostFwd = forwardImpulse > 0 ? forwardImpulse : 5.5;
            other.rigidBody.setLinvel(
              {
                x: v.x * 0.65 + nx * boostFwd,
                y: vy,
                z: v.z * 0.65 + nz * boostFwd,
              },
              true
            );
          }

          spawnParticleBurst(
            [position[0], position[1] + 0.3, position[2]],
            color,
            28,
            8.5,
            0.16
          );
          spawnShockwave(
            [position[0], position[1] + 0.08, position[2]],
            '#facc15',
            3.2,
            0.45
          );
        }
      }}
    >
      <CylinderCollider args={[0.35, radius * 0.92]} position={[0, 0.25, 0]} />

      {/* Outer Metallic Housing */}
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <cylinderGeometry args={[radius, radius * 1.1, 0.1, 28]} />
        <meshStandardMaterial color="#1e293b" metalness={0.85} roughness={0.2} />
      </mesh>

      {/* Pneumatic Spring Plate */}
      <group ref={springGroupRef}>
        <mesh position={[0, 0.12, 0]} castShadow>
          <cylinderGeometry args={[radius * 0.82, radius * 0.88, 0.12, 28]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.65}
            roughness={0.2}
          />
        </mesh>
        <mesh
          ref={ringRef}
          position={[0, 0.19, 0]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <torusGeometry args={[radius * 0.56, 0.07, 12, 28]} />
          <meshStandardMaterial
            color="#fde047"
            emissive="#facc15"
            emissiveIntensity={0.95}
          />
        </mesh>
      </group>
    </RigidBody>
  );
}
