import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CuboidCollider, RigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import { BoostPadDef } from '../../types/level';
import { spawnParticleBurst, spawnShockwave } from '../game/ParticleFX';
import { soundFX } from '../ui/SoundManager';

export function BoostPad({
  position,
  rotation = [0, 0, 0],
  size = [2.8, 0.08, 4.2],
  direction,
  impulse,
  force,
  color = '#00f5d4',
}: BoostPadDef) {
  const chevronsRef = useRef<THREE.Group>(null);
  const lastTriggerTime = useRef(0);
  const sx = size[0];
  const sy = size.length === 2 ? 0.08 : size[1];
  const sz = size.length === 2 ? size[1] : size[2];
  const boostPower = force ?? impulse ?? 16;

  useFrame((state) => {
    if (chevronsRef.current) {
      const t = (state.clock.elapsedTime * 3.5) % 1;
      chevronsRef.current.position.z = -t * 0.8 + 0.4;
    }
  });

  return (
    <RigidBody
      type="fixed"
      position={position}
      rotation={rotation}
      colliders={false}
      sensor
      onIntersectionEnter={({ other }) => {
        if (other.rigidBodyObject?.name === 'player-orb' && other.rigidBody) {
          const now = performance.now();
          if (now - lastTriggerTime.current < 240) return;
          lastTriggerTime.current = now;

          soundFX.playBoostPad();
          let nx = 0;
          let ny = 0;
          let nz = -1;
          if (direction) {
            const len = Math.hypot(direction[0], direction[1], direction[2]) || 1;
            nx = direction[0] / len;
            ny = direction[1] / len;
            nz = direction[2] / len;
          } else {
            const euler = new THREE.Euler(rotation[0] || 0, rotation[1] || 0, rotation[2] || 0, 'XYZ');
            const fwd = new THREE.Vector3(0, 0, -1).applyEuler(euler).normalize();
            nx = fwd.x;
            ny = fwd.y;
            nz = fwd.z;
          }

          other.rigidBody.applyImpulse(
            {
              x: nx * boostPower,
              y: ny * boostPower + 0.5,
              z: nz * boostPower,
            },
            true
          );

          spawnParticleBurst(
            [position[0], position[1] + 0.25, position[2]],
            color,
            26,
            9.5,
            0.16
          );
          spawnShockwave(
            [position[0], position[1] + 0.05, position[2]],
            color,
            2.8,
            0.38
          );
        }
      }}
    >
      <CuboidCollider args={[sx * 0.48, 0.35, sz * 0.48]} position={[0, 0.3, 0]} />

      {/* Glowing Base Pad */}
      <mesh receiveShadow>
        <boxGeometry args={[sx, sy, sz]} />
        <meshStandardMaterial
          color="#0f172a"
          metalness={0.85}
          roughness={0.2}
        />
      </mesh>

      {/* Side Energy Rails */}
      <mesh position={[-sx / 2 + 0.08, 0.05, 0]}>
        <boxGeometry args={[0.14, 0.06, sz]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.9} />
      </mesh>
      <mesh position={[sx / 2 - 0.08, 0.05, 0]}>
        <boxGeometry args={[0.14, 0.06, sz]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.9} />
      </mesh>

      {/* Scrolling Trackmania Turbo Chevrons */}
      <group ref={chevronsRef} position={[0, 0.05, 0]}>
        {[-1.1, -0.35, 0.4, 1.15].map((zOff, idx) => (
          <group key={idx} position={[0, 0, zOff]}>
            <mesh position={[-0.45, 0, 0]} rotation={[0, 0.55, 0]}>
              <boxGeometry args={[1.05, 0.03, 0.22]} />
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={1.1}
              />
            </mesh>
            <mesh position={[0.45, 0, 0]} rotation={[0, -0.55, 0]}>
              <boxGeometry args={[1.05, 0.03, 0.22]} />
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={1.1}
              />
            </mesh>
          </group>
        ))}
      </group>
    </RigidBody>
  );
}
