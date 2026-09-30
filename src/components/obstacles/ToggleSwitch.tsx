import { useRef } from 'react';
import {
  CylinderCollider,
  RapierRigidBody,
  RigidBody,
  useBeforePhysicsStep,
} from '@react-three/rapier';
import * as THREE from 'three';
import { useGameStore } from '../../store/useGameStore';
import { SwitchBridgeDef } from '../../types/level';
import { spawnParticleBurst, spawnShockwave } from '../game/ParticleFX';

export function ToggleSwitch({
  id,
  switchPosition,
  bridgePosition,
  bridgeSize,
  bridgeRotation = [0, 0, 0],
  color = '#10b981',
}: SwitchBridgeDef) {
  const isActivated = useGameStore((s) => Boolean(s.activatedSwitches[id]));
  const activateSwitch = useGameStore((s) => s.activateSwitch);
  const bridgeBodyRef = useRef<RapierRigidBody>(null);
  const currentBridgeY = useRef(bridgePosition[1] - 6.5);

  // Raise/lower the bridge per physics sub-step (smooth at any frame rate).
  useBeforePhysicsStep((world) => {
    const rb = bridgeBodyRef.current;
    if (!rb) return;
    const dt = world.timestep;

    const targetY = isActivated ? bridgePosition[1] : bridgePosition[1] - 6.5;
    currentBridgeY.current = THREE.MathUtils.lerp(
      currentBridgeY.current,
      targetY,
      1 - Math.exp(-10 * dt)
    );

    rb.setNextKinematicTranslation({
      x: bridgePosition[0],
      y: currentBridgeY.current,
      z: bridgePosition[2],
    });
  });

  const [bx, by, bz] = bridgeSize;

  return (
    <>
      {/* Floor Button */}
      <RigidBody
        type="fixed"
        position={switchPosition}
        colliders={false}
        sensor
        onIntersectionEnter={({ other }) => {
          if (other.rigidBodyObject?.name === 'player-orb') {
            if (!useGameStore.getState().activatedSwitches[id]) {
              spawnParticleBurst(switchPosition, '#10b981', 28, 7.5, 0.16);
              spawnShockwave(switchPosition, '#10b981', 3.5, 0.5);
            }
            activateSwitch(id);
          }
        }}
      >
        <CylinderCollider args={[0.25, 0.75]} />
        {/* Button Rim */}
        <mesh position={[0, 0.04, 0]}>
          <cylinderGeometry args={[0.88, 0.98, 0.09, 24]} />
          <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.2} />
        </mesh>
        {/* Glowing Plunger */}
        <mesh position={[0, isActivated ? 0.07 : 0.16, 0]}>
          <cylinderGeometry args={[0.7, 0.74, 0.14, 24]} />
          <meshStandardMaterial
            color={isActivated ? '#10b981' : '#f59e0b'}
            emissive={isActivated ? '#10b981' : '#f59e0b'}
            emissiveIntensity={0.85}
            roughness={0.15}
          />
        </mesh>
      </RigidBody>

      {/* Deployable Bridge */}
      <RigidBody
        ref={bridgeBodyRef}
        type="kinematicPosition"
        position={[bridgePosition[0], bridgePosition[1] - 6.5, bridgePosition[2]]}
        rotation={bridgeRotation}
        friction={0.95}
      >
        <mesh castShadow receiveShadow>
          <boxGeometry args={[bx, by, bz]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={isActivated ? 0.35 : 0.08}
            transparent={!isActivated}
            opacity={isActivated ? 1 : 0.35}
            roughness={0.25}
            metalness={0.35}
          />
        </mesh>
      </RigidBody>
    </>
  );
}
