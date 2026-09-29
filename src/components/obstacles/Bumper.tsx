import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CylinderCollider, RigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import { livePhysics } from '../../store/useGameStore';
import { BumperDef } from '../../types/level';
import { spawnParticleBurst, spawnShockwave } from '../game/ParticleFX';
import { soundFX } from '../ui/SoundManager';

export function Bumper({
  position,
  radius = 0.75,
  height = 0.9,
  bounceImpulse = 13.5,
}: BumperDef) {
  const visualGroupRef = useRef<THREE.Group>(null);
  const starRef = useRef<THREE.Mesh>(null);
  const lastHitLocal = useRef(0);

  useFrame((_, delta) => {
    if (starRef.current) {
      starRef.current.rotation.y += delta * 2.0;
    }
    if (!visualGroupRef.current) return;
    const elapsed = performance.now() - lastHitLocal.current;
    if (elapsed < 340) {
      const pulse = Math.sin((elapsed / 340) * Math.PI) * 0.38;
      visualGroupRef.current.scale.set(1 + pulse, 1 - pulse * 0.35, 1 + pulse);
    } else {
      visualGroupRef.current.scale.set(1, 1, 1);
    }
  });

  return (
    <RigidBody
      type="fixed"
      position={position}
      colliders={false}
      restitution={1.08}
      friction={0.1}
      onCollisionEnter={({ other }) => {
        if (other.rigidBodyObject?.name === 'player-orb' && other.rigidBody) {
          lastHitLocal.current = performance.now();
          livePhysics.lastBumperHitTime = performance.now();
          soundFX.playBumperBoing();

          const ballPos = other.rigidBody.translation();
          const dx = ballPos.x - position[0];
          const dz = ballPos.z - position[2];
          const len = Math.hypot(dx, dz) || 1;
          const nx = dx / len;
          const nz = dz / len;

          other.rigidBody.applyImpulse(
            { x: nx * bounceImpulse, y: 2.0, z: nz * bounceImpulse },
            true
          );

          // Spawn 3D impact sparks & expanding shockwave ring!
          spawnParticleBurst(
            [position[0] + nx * radius, position[1] + 0.1, position[2] + nz * radius],
            '#facc15',
            26,
            8.0,
            0.16
          );
          spawnShockwave([position[0], position[1] - height * 0.35, position[2]], '#f43f5e', 3.0, 0.45);
        }
      }}
    >
      <CylinderCollider args={[height / 2, radius]} />
      <group ref={visualGroupRef}>
        {/* Metallic Chrome Base Pedestal */}
        <mesh position={[0, -height * 0.32, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[radius * 0.95, radius * 1.05, height * 0.35, 24]} />
          <meshStandardMaterial color="#1e293b" metalness={0.85} roughness={0.15} />
        </mesh>

        {/* Glossy Arcade Dome */}
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[radius * 0.9, radius * 0.82, height * 0.85, 28]} />
          <meshStandardMaterial color="#e11d48" roughness={0.15} metalness={0.45} />
        </mesh>

        {/* Dual Neon Plasma Bounce Rings */}
        <mesh position={[0, 0.08, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[radius * 0.95, 0.11, 14, 32]} />
          <meshStandardMaterial
            color="#fde047"
            emissive="#facc15"
            emissiveIntensity={0.9}
            roughness={0.15}
          />
        </mesh>
        <mesh position={[0, -0.14, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[radius * 0.92, 0.06, 12, 32]} />
          <meshStandardMaterial
            color="#38bdf8"
            emissive="#38bdf8"
            emissiveIntensity={0.75}
          />
        </mesh>

        {/* Top Crown Cap & Spinning Star */}
        <mesh position={[0, height * 0.44, 0]}>
          <cylinderGeometry args={[radius * 0.65, radius * 0.78, 0.1, 20]} />
          <meshStandardMaterial color="#ffffff" metalness={0.3} roughness={0.15} />
        </mesh>
        <mesh ref={starRef} position={[0, height * 0.56, 0]}>
          <octahedronGeometry args={[radius * 0.28, 0]} />
          <meshStandardMaterial
            color="#fde047"
            emissive="#facc15"
            emissiveIntensity={0.6}
            metalness={0.8}
            roughness={0.1}
          />
        </mesh>
      </group>
    </RigidBody>
  );
}
