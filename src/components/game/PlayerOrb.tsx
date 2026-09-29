import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BallCollider, RapierRigidBody, RigidBody, useRapier } from '@react-three/rapier';
import * as THREE from 'three';
import { livePhysics, useGameStore } from '../../store/useGameStore';
import { OrbShellStyle } from '../../types/avatar';
import { CharacterModel } from './CharacterModel';
import { spawnParticleBurst, spawnShockwave } from './ParticleFX';

export const ORB_RADIUS = 0.56;

function lerpAngle(current: number, target: number, t: number): number {
  const diff = THREE.MathUtils.euclideanModulo(target - current + Math.PI, Math.PI * 2) - Math.PI;
  return current + diff * t;
}

interface OrbShellProps {
  style: OrbShellStyle;
  primaryColor: string;
}

export function OrbShell({ style, primaryColor }: OrbShellProps) {
  const ringColor =
    style === 'neon'
      ? '#00f5d4'
      : style === 'starlight'
      ? '#fbbf24'
      : style === 'candy'
      ? '#ff4d6d'
      : primaryColor;

  const shellTint =
    style === 'neon'
      ? '#a5f3fc'
      : style === 'starlight'
      ? '#fef9c3'
      : style === 'candy'
      ? '#ffe4e6'
      : '#f0f9ff';

  return (
    <group>
      {/* Primary Optical Refractive Fresnel Glass Sphere */}
      <mesh>
        <sphereGeometry args={[ORB_RADIUS, 48, 48]} />
        <meshPhysicalMaterial
          color={shellTint}
          transparent
          opacity={0.34}
          transmission={0.88}
          ior={1.45}
          thickness={0.38}
          roughness={0.03}
          metalness={0.04}
          iridescence={0.38}
          iridescenceIOR={1.3}
          clearcoat={1}
          clearcoatRoughness={0.02}
          envMapIntensity={2.4}
          specularIntensity={1}
          depthWrite={false}
        />
      </mesh>

      {/* Inner Backface Specular Rim Highlight Layer */}
      <mesh scale={[0.985, 0.985, 0.985]}>
        <sphereGeometry args={[ORB_RADIUS, 32, 32]} />
        <meshPhysicalMaterial
          color={ringColor}
          transparent
          opacity={0.09}
          roughness={0.1}
          metalness={0.2}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>

      {/* Equatorial Seam Ring (makes ball spin clearly visible!) */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[ORB_RADIUS + 0.005, 0.018, 14, 56]} />
        <meshStandardMaterial
          color={ringColor}
          emissive={ringColor}
          emissiveIntensity={style === 'neon' || style === 'starlight' ? 0.75 : 0.28}
          roughness={0.18}
          metalness={0.65}
        />
      </mesh>

      {/* Secondary Meridian Ring */}
      {(style === 'candy' || style === 'neon' || style === 'starlight') && (
        <mesh>
          <torusGeometry args={[ORB_RADIUS + 0.004, 0.014, 14, 56]} />
          <meshStandardMaterial
            color={style === 'candy' ? '#ffffff' : ringColor}
            emissive={ringColor}
            emissiveIntensity={style === 'neon' ? 0.65 : 0.2}
            roughness={0.22}
            metalness={0.5}
          />
        </mesh>
      )}

      {/* Polar Cap Badges (Super Monkey Ball style top/bottom caps) */}
      <mesh position={[0, ORB_RADIUS - 0.018, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.145, 0.017, 12, 28]} />
        <meshStandardMaterial color={ringColor} metalness={0.5} roughness={0.2} />
      </mesh>
      <mesh position={[0, -ORB_RADIUS + 0.018, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.145, 0.017, 12, 28]} />
        <meshStandardMaterial color={ringColor} metalness={0.5} roughness={0.2} />
      </mesh>
    </group>
  );
}

interface PlayerOrbProps {
  spawnPosition: [number, number, number];
  killPlaneY: number;
  /** Also fall out when this far below the current respawn point (Summit). */
  respawnFallDepth?: number;
}

export function PlayerOrb({ spawnPosition, killPlaneY, respawnFallDepth }: PlayerOrbProps) {
  const bodyRef = useRef<RapierRigidBody>(null);
  const characterGroupRef = useRef<THREE.Group>(null);
  const shadowGroupRef = useRef<THREE.Group>(null);
  const orbLightRef = useRef<THREE.PointLight>(null);

  const avatar = useGameStore((s) => s.avatar);
  const playPhase = useGameStore((s) => s.playPhase);
  const runAttemptId = useGameStore((s) => s.runAttemptId);
  const checkpointRespawnTick = useGameStore((s) => s.checkpointRespawnTick);
  const activeSpawnPosition = useGameStore((s) => s.activeSpawnPosition);
  const activeSpawnYaw = useGameStore((s) => s.activeSpawnYaw);
  const triggerFallout = useGameStore((s) => s.triggerFallout);

  const charYaw = useRef((livePhysics.cameraYaw ?? 0) + Math.PI);

  // Full start-line reset
  useEffect(() => {
    const rb = bodyRef.current;
    if (!rb) return;
    rb.setTranslation(
      { x: spawnPosition[0], y: spawnPosition[1], z: spawnPosition[2] },
      true
    );
    rb.setLinvel({ x: 0, y: 0, z: 0 }, true);
    rb.setAngvel({ x: 0, y: 0, z: 0 }, true);
    rb.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
    charYaw.current = (livePhysics.cameraYaw ?? 0) + Math.PI;
  }, [runAttemptId, spawnPosition]);

  // Spawn guard: on slow devices the (big) level can finish mounting right as the countdown
  // ends, and the first physics frame then drops the orb before the floor colliders exist.
  // Hold the orb at spawn until a ray finds the floor under it (max ~4 s, then let go).
  // (named so it can coexist with other useRapier() users in this component)
  const spawnGuardPhysics = useRapier();
  const floorReady = useRef(false);
  const floorWaitS = useRef(0);
  useEffect(() => {
    floorReady.current = false;
    floorWaitS.current = 0;
  }, [runAttemptId, spawnPosition]);

  // Trackmania Standing Checkpoint Respawn (C / Backspace / Gamepad B)
  useEffect(() => {
    if (checkpointRespawnTick === 0) return;
    const rb = bodyRef.current;
    if (!rb) return;
    rb.setTranslation(
      {
        x: activeSpawnPosition[0],
        y: activeSpawnPosition[1],
        z: activeSpawnPosition[2],
      },
      true
    );
    rb.setLinvel({ x: 0, y: 0, z: 0 }, true);
    rb.setAngvel({ x: 0, y: 0, z: 0 }, true);
    rb.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
    charYaw.current = activeSpawnYaw + Math.PI;

    spawnParticleBurst(activeSpawnPosition, '#10b981', 20, 6.0, 0.14);
    spawnShockwave(
      [activeSpawnPosition[0], activeSpawnPosition[1] - 0.4, activeSpawnPosition[2]],
      '#10b981',
      2.6,
      0.4
    );
  }, [checkpointRespawnTick, activeSpawnPosition, activeSpawnYaw]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const rb = bodyRef.current;
    if (!rb) return;

    if (!floorReady.current) {
      floorWaitS.current += dt;
      const ray = new spawnGuardPhysics.rapier.Ray(
        { x: spawnPosition[0], y: spawnPosition[1], z: spawnPosition[2] },
        { x: 0, y: -1, z: 0 }
      );
      const hit = spawnGuardPhysics.world.castRay(ray, 4, true, undefined, undefined, undefined, rb);
      if (hit || floorWaitS.current > 4) floorReady.current = true;
    }

    if (playPhase === 'countdown' || (!floorReady.current && playPhase === 'playing')) {
      rb.setTranslation(
        { x: spawnPosition[0], y: spawnPosition[1], z: spawnPosition[2] },
        true
      );
      rb.setLinvel({ x: 0, y: 0, z: 0 }, true);
      rb.setAngvel({ x: 0, y: 0, z: 0 }, true);
    } else if (playPhase === 'goal') {
      const v = rb.linvel();
      rb.setLinvel({ x: v.x * 0.92, y: v.y * 0.92, z: v.z * 0.92 }, true);
    }

    const pos = rb.translation();
    const vel = rb.linvel();
    const speed = Math.hypot(vel.x, vel.y, vel.z);
    const horizSpeed = Math.hypot(vel.x, vel.z);

    livePhysics.ballPosition = [pos.x, pos.y, pos.z];
    livePhysics.ballVelocity = [vel.x, vel.y, vel.z];
    livePhysics.ballSpeed = speed;
    livePhysics.isGrounded = Math.abs(vel.y) < 2.2;

    const altM = Math.max(0, pos.y - spawnPosition[1]);
    livePhysics.currentAltitudeM = altM;
    if (altM > livePhysics.peakAltitudeM) {
      livePhysics.peakAltitudeM = altM;
    }

    const fallLimitY =
      respawnFallDepth !== undefined
        ? Math.max(killPlaneY, activeSpawnPosition[1] - respawnFallDepth)
        : killPlaneY;
    if (playPhase === 'playing' && pos.y < fallLimitY) {
      triggerFallout();
    }

    if (characterGroupRef.current) {
      characterGroupRef.current.position.set(pos.x, pos.y, pos.z);

      if (playPhase === 'goal') {
        charYaw.current += dt * 2.2;
      } else if (horizSpeed > 0.55) {
        const targetYaw = Math.atan2(vel.x, vel.z);
        charYaw.current = lerpAngle(charYaw.current, targetYaw, 1 - Math.exp(-8.5 * dt));
      } else {
        const forwardYaw = livePhysics.cameraYaw + Math.PI;
        charYaw.current = lerpAngle(charYaw.current, forwardYaw, 1 - Math.exp(-5 * dt));
      }

      const leanPitch = THREE.MathUtils.clamp(horizSpeed * 0.028, 0, 0.22);
      const leanRoll = -livePhysics.tiltRoll * 0.35;

      const euler = new THREE.Euler(leanPitch, charYaw.current, leanRoll, 'YXZ');
      characterGroupRef.current.quaternion.slerp(
        new THREE.Quaternion().setFromEuler(euler),
        1 - Math.exp(-10 * dt)
      );
    }

    // Softened multi-ring ground contact shadow & dynamic bounce point light
    if (shadowGroupRef.current) {
      shadowGroupRef.current.position.set(pos.x, pos.y - ORB_RADIUS + 0.015, pos.z);
    }
    if (orbLightRef.current) {
      orbLightRef.current.position.set(pos.x, pos.y + 0.2, pos.z);
    }
  });

  return (
    <>
      <RigidBody
        ref={bodyRef}
        position={spawnPosition}
        colliders={false}
        ccd={true}
        restitution={0.22}
        friction={0.95}
        linearDamping={0.34}
        angularDamping={0.42}
        mass={1.8}
        name="player-orb"
      >
        <BallCollider args={[ORB_RADIUS]} />
        <OrbShell style={avatar.orbStyle} primaryColor={avatar.primaryColor} />
      </RigidBody>

      {/* Decoupled upright inner character rig */}
      <group ref={characterGroupRef} position={spawnPosition}>
        <CharacterModel config={avatar} />
      </group>

      {/* Real-time subtle point light illuminating the track beneath the orb */}
      <pointLight
        ref={orbLightRef}
        color={avatar.orbStyle === 'neon' ? '#00f5d4' : avatar.primaryColor}
        intensity={1.1}
        distance={4.5}
        decay={2}
      />

      {/* Softened Multi-Layer Grounding Contact Shadow */}
      <group ref={shadowGroupRef} rotation={[-Math.PI / 2, 0, 0]}>
        <mesh>
          <circleGeometry args={[0.26, 28]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.32} depthWrite={false} />
        </mesh>
        <mesh>
          <ringGeometry args={[0.26, 0.44, 28]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.16} depthWrite={false} />
        </mesh>
        <mesh>
          <ringGeometry args={[0.44, 0.56, 28]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.18} depthWrite={false} />
        </mesh>
      </group>
    </>
  );
}
