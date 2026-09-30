import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { CuboidCollider, RigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import { useGameStore } from '../../store/useGameStore';
import { CheckpointDef } from '../../types/level';
import { spawnParticleBurst, spawnShockwave } from '../game/ParticleFX';

export function CheckpointGate({
  id,
  order,
  position,
  rotation = [0, 0, 0],
  respawnYaw = 0,
  label,
  width = 3.7,
}: CheckpointDef) {
  const half = width / 2;
  const isCrossed = useGameStore((s) => s.crossedCheckpoints.includes(id));
  const crossCheckpoint = useGameStore((s) => s.crossCheckpoint);
  const curtainRef = useRef<THREE.Mesh>(null);
  const beaconRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (curtainRef.current) {
      const mat = curtainRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = isCrossed
        ? 0.1 + Math.sin(state.clock.elapsedTime * 3) * 0.03
        : 0.22 + Math.sin(state.clock.elapsedTime * 5) * 0.06;
    }
    if (beaconRef.current) {
      beaconRef.current.rotation.y += delta * 2.5;
    }
  });

  const activeColor = isCrossed ? '#10b981' : '#38bdf8';

  return (
    <RigidBody
      type="fixed"
      position={position}
      rotation={rotation}
      colliders={false}
    >
      {/* Left & Right Gantry Pillars (Physical Colliders outside track width) */}
      <CuboidCollider args={[0.22, 1.5, 0.22]} position={[-half, 1.5, 0]} />
      <CuboidCollider args={[0.22, 1.5, 0.22]} position={[half, 1.5, 0]} />

      {/* Sensor Trigger Zone across the Archway */}
      <CuboidCollider
        args={[half - 0.2, 1.4, 0.45]}
        position={[0, 1.4, 0]}
        sensor
        onIntersectionEnter={({ other }) => {
          if (other.rigidBodyObject?.name === 'player-orb') {
            if (!useGameStore.getState().crossedCheckpoints.includes(id)) {
              spawnParticleBurst(
                [position[0], position[1] + 1.2, position[2]],
                '#38bdf8',
                28,
                8.0,
                0.15
              );
              spawnShockwave(
                [position[0], position[1] + 0.08, position[2]],
                '#10b981',
                3.6,
                0.48
              );
            }
            crossCheckpoint(id, order, position, respawnYaw);
          }
        }}
      />

      {/* Left & Right Sleek Stadium Pillars */}
      {[-half, half].map((xPos, idx) => (
        <group key={idx} position={[xPos, 1.5, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.32, 3.0, 0.36]} />
            <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.2} />
          </mesh>
          {/* Neon Vertical Accent Strip */}
          <mesh position={[idx === 0 ? 0.17 : -0.17, 0, 0]}>
            <boxGeometry args={[0.04, 2.7, 0.18]} />
            <meshStandardMaterial
              color={activeColor}
              emissive={activeColor}
              emissiveIntensity={0.9}
            />
          </mesh>
        </group>
      ))}

      {/* Top Trackmania Sector Gantry Beam */}
      <mesh position={[0, 3.05, 0]} castShadow>
        <boxGeometry args={[width + 0.45, 0.48, 0.44]} />
        <meshStandardMaterial color="#0f172a" metalness={0.85} roughness={0.2} />
      </mesh>
      <mesh position={[0, 3.05, 0]}>
        <boxGeometry args={[width + 0.52, 0.1, 0.48]} />
        <meshStandardMaterial
          color={activeColor}
          emissive={activeColor}
          emissiveIntensity={0.85}
        />
      </mesh>

      {/* Digital Sector Sign */}
      <Text
        position={[0, 3.05, 0.25]}
        fontSize={label ? (width > 6 ? 0.34 : 0.22) : 0.26}
        color={isCrossed ? '#6ee7b7' : '#e0f2fe'}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.022}
        outlineColor="#090d16"
      >
        {label
          ? isCrossed
            ? `✓ ${label}`
            : label
          : isCrossed
            ? `✓ CP 0${order}`
            : `CHECKPOINT 0${order}`}
      </Text>

      {/* Holographic Laser Curtain */}
      <mesh ref={curtainRef} position={[0, 1.42, 0]}>
        <planeGeometry args={[width - 0.35, 2.75]} />
        <meshBasicMaterial
          color={activeColor}
          transparent
          opacity={0.22}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Floor Threshold Strip */}
      <mesh position={[0, 0.03, 0]}>
        <boxGeometry args={[width - 0.3, 0.04, 0.28]} />
        <meshStandardMaterial
          color={activeColor}
          emissive={activeColor}
          emissiveIntensity={0.75}
        />
      </mesh>

      {/* Overhead Rotating Diamond Beacon */}
      <mesh ref={beaconRef} position={[0, 3.58, 0]}>
        <octahedronGeometry args={[0.26, 0]} />
        <meshStandardMaterial
          color={activeColor}
          emissive={activeColor}
          emissiveIntensity={0.9}
          metalness={0.8}
          roughness={0.1}
        />
      </mesh>
    </RigidBody>
  );
}
