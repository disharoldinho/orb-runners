import { Suspense, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { DISPLAY_FONT_URL } from '../../graphics/stickerLabels';
import { CuboidCollider, RigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import { useGameStore } from '../../store/useGameStore';
import { CheckpointDef } from '../../types/level';
import { spawnParticleBurst, spawnShockwave } from '../game/ParticleFX';
import { getBeamMaterial, getCurtainMaterial } from '../../graphics/fxMaterials';

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
    if (beaconRef.current) {
      beaconRef.current.rotation.y += delta * 2.5;
      beaconRef.current.position.y = 3.58 + Math.sin(state.clock.elapsedTime * 2.2) * 0.08;
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
            <boxGeometry args={[0.35, 3.0, 0.41]} />
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
      {/* drei <Text> suspends while troika loads the font and builds glyphs: keep that
          local so the course (and the run timer) never waits on the gate label. */}
      <Suspense fallback={null}>
        <Text
          font={DISPLAY_FONT_URL}
          position={[0, 3.05, 0.25]}
          fontSize={label ? (width > 6 ? 0.36 : 0.24) : 0.28}
          color={isCrossed ? '#25d49b' : '#fff3dc'}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.03}
          outlineColor="#1d1433"
          maxWidth={Math.max(2, width - 0.5)}
          textAlign="center"
        >
          {label
            ? isCrossed
              ? `${label} · CLEAR`
              : label
            : isCrossed
              ? `CP ${order} · CLEAR`
              : `CHECKPOINT ${order}`}
        </Text>
      </Suspense>

      {/* Holographic energy curtain (animated shader) */}
      <mesh
        ref={curtainRef}
        position={[0, 1.42, 0]}
        material={getCurtainMaterial(activeColor, isCrossed ? 0.45 : 1)}
      >
        <planeGeometry args={[width - 0.35, 2.75]} />
      </mesh>

      {/* Landmark light beam over the next (not yet crossed) gate */}
      {!isCrossed && (
        <mesh position={[0, 3.3 + 28, 0]} material={getBeamMaterial(activeColor)}>
          <cylinderGeometry args={[0.55, 0.55, 56, 16, 1, true]} />
        </mesh>
      )}

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
