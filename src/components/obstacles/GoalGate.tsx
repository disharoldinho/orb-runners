import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { BallCollider, CuboidCollider, RapierRigidBody, RigidBody } from '@react-three/rapier';
import confetti from 'canvas-confetti';
import * as THREE from 'three';
import { useGameStore } from '../../store/useGameStore';
import { CollectibleGemDef, Vec3 } from '../../types/level';
import { spawnParticleBurst, spawnShockwave } from '../game/ParticleFX';

interface GoalGateProps {
  position: Vec3;
  rotation?: Vec3;
  movingRange?: Vec3;
  movingSpeed?: number;
}

export function GoalGate({
  position,
  rotation = [0, 0, 0],
  movingRange,
  movingSpeed = 1.5,
}: GoalGateProps) {
  const gateBodyRef = useRef<RapierRigidBody>(null);
  const starRef = useRef<THREE.Group>(null);
  const portalRef = useRef<THREE.Mesh>(null);
  const triggerGoal = useGameStore((s) => s.triggerGoal);
  const playPhase = useGameStore((s) => s.playPhase);

  useFrame((state, delta) => {
    if (starRef.current) {
      starRef.current.rotation.y += delta * 2.4;
    }
    if (portalRef.current) {
      const mat = portalRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.24 + Math.sin(state.clock.elapsedTime * 5) * 0.08;
    }

    if (movingRange && gateBodyRef.current) {
      const t = state.clock.elapsedTime * movingSpeed;
      const offset = Math.sin(t);
      gateBodyRef.current.setNextKinematicTranslation({
        x: position[0] + movingRange[0] * offset,
        y: position[1] + movingRange[1] * offset,
        z: position[2] + movingRange[2] * offset,
      });
    }
  });

  const handleGoalEnter = () => {
    if (useGameStore.getState().playPhase !== 'playing') return;
    spawnParticleBurst([position[0], position[1] + 1.5, position[2]], '#fde047', 45, 10, 0.2);
    spawnShockwave([position[0], position[1] + 0.1, position[2]], '#00f5d4', 5.0, 0.65);
    triggerGoal();
    try {
      confetti({
        particleCount: 95,
        spread: 80,
        origin: { y: 0.55 },
      });
    } catch {
      // ignore if confetti fails
    }
  };

  return (
    <RigidBody
      ref={gateBodyRef}
      type={movingRange ? 'kinematicPosition' : 'fixed'}
      position={position}
      rotation={rotation}
      colliders={false}
    >
      {/* Left & Right Archway Pillars (Physical Colliders) */}
      <CuboidCollider args={[0.25, 1.6, 0.25]} position={[-1.6, 1.6, 0]} />
      <CuboidCollider args={[0.25, 1.6, 0.25]} position={[1.6, 1.6, 0]} />

      {/* Goal Trigger Sensor Zone inside Archway */}
      <CuboidCollider
        args={[1.3, 1.4, 0.5]}
        position={[0, 1.4, 0]}
        sensor
        onIntersectionEnter={({ other }) => {
          if (other.rigidBodyObject?.name === 'player-orb') {
            handleGoalEnter();
          }
        }}
      />

      {/* Left & Right Pillar Visuals with Glowing Neon Rings */}
      {[-1.6, 1.6].map((xPos, i) => (
        <group key={i} position={[xPos, 1.6, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.22, 0.3, 3.2, 20]} />
            <meshStandardMaterial color="#fbbf24" metalness={0.8} roughness={0.15} />
          </mesh>
          {[-0.9, 0, 0.9].map((yRing, rIdx) => (
            <mesh key={rIdx} position={[0, yRing, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.28, 0.04, 10, 24]} />
              <meshStandardMaterial
                color="#00f5d4"
                emissive="#00f5d4"
                emissiveIntensity={0.85}
              />
            </mesh>
          ))}
        </group>
      ))}

      {/* Top Crossbar Archway */}
      <mesh position={[0, 3.3, 0]} castShadow>
        <boxGeometry args={[3.9, 0.62, 0.52]} />
        <meshStandardMaterial color="#e11d48" metalness={0.4} roughness={0.25} />
      </mesh>
      <mesh position={[0, 3.3, 0]}>
        <boxGeometry args={[4.0, 0.14, 0.58]} />
        <meshStandardMaterial color="#fde047" metalness={0.85} roughness={0.15} />
      </mesh>

      {/* 3D "GOAL" Text on Front & Back of Archway */}
      <Text
        position={[0, 3.3, 0.28]}
        fontSize={0.38}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.03}
        outlineColor="#090d16"
      >
        GOAL
      </Text>

      {/* Glowing Inner Energy Portal Curtain */}
      {playPhase !== 'goal' && (
        <mesh ref={portalRef} position={[0, 1.5, 0]}>
          <planeGeometry args={[2.85, 2.85]} />
          <meshBasicMaterial
            color="#00f5d4"
            transparent
            opacity={0.26}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Spinning Crown Star & Orbiting Satellites Above Goal */}
      <group ref={starRef} position={[0, 4.2, 0]}>
        <mesh>
          <octahedronGeometry args={[0.56, 0]} />
          <meshStandardMaterial
            color="#fde047"
            emissive="#facc15"
            emissiveIntensity={0.9}
            metalness={0.85}
            roughness={0.1}
          />
        </mesh>
        <mesh rotation={[Math.PI / 3, 0, 0]}>
          <torusGeometry args={[0.85, 0.03, 10, 32]} />
          <meshBasicMaterial color="#00f5d4" />
        </mesh>
      </group>
    </RigidBody>
  );
}

export function CollectibleGem({ id, position, timeBonusMs = 1500 }: CollectibleGemDef) {
  const isCollected = useGameStore((s) => s.collectedGems.includes(id));
  const collectGem = useGameStore((s) => s.collectGem);
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 3.0;
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 4 + position[0]) * 0.14;
    }
  });

  if (isCollected) return null;

  return (
    <RigidBody
      type="fixed"
      position={position}
      colliders={false}
      sensor
      onIntersectionEnter={({ other }) => {
        if (other.rigidBodyObject?.name === 'player-orb') {
          spawnParticleBurst(position, '#00f5d4', 24, 7.0, 0.14);
          spawnShockwave(position, '#00f5d4', 2.2, 0.38);
          collectGem(id, timeBonusMs);
        }
      }}
    >
      <BallCollider args={[0.58]} />
      <group ref={groupRef}>
        <mesh castShadow>
          <octahedronGeometry args={[0.38, 0]} />
          <meshStandardMaterial
            color="#00f5d4"
            emissive="#00bbf9"
            emissiveIntensity={0.85}
            metalness={0.8}
            roughness={0.08}
          />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.52, 0.02, 8, 24]} />
          <meshBasicMaterial color="#fde047" transparent opacity={0.65} />
        </mesh>
      </group>
    </RigidBody>
  );
}
