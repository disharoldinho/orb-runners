import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Lightformer, SoftShadows, Sparkles, Stars } from '@react-three/drei';
import { Physics } from '@react-three/rapier';
import * as THREE from 'three';
import { getSummitStageByCamps } from '../../levels/summitMap';
import { getLevelById, livePhysics, useGameStore } from '../../store/useGameStore';
import { LevelData, SkyPreset } from '../../types/level';
import { GhostOrb } from './GhostOrb';
import { MonkeyCamera } from './MonkeyCamera';
import { OrbSpeedTrail } from './OrbSpeedTrail';
import { ParticleFX } from './ParticleFX';
import { PlayerOrb } from './PlayerOrb';
import { StageBuilder } from './StageBuilder';
import { SummitMultiplayer } from './SummitMultiplayer';
import { TiltController } from './TiltController';

const SKY_THEMES: Record<
  SkyPreset,
  {
    bgTop: string;
    bgBottom: string;
    ringColor: string;
    islandTop: string;
    islandRock: string;
    sunColor: string;
    sparkleColor: string;
    fogColor: string;
  }
> = {
  day: {
    bgTop: '#0284c7',
    bgBottom: '#bae6fd',
    ringColor: '#38bdf8',
    islandTop: '#14b8a6',
    islandRock: '#334155',
    sunColor: '#fef08a',
    sparkleColor: '#ffffff',
    fogColor: '#38bdf8',
  },
  sunset: {
    bgTop: '#3b0764',
    bgBottom: '#fb923c',
    ringColor: '#f43f5e',
    islandTop: '#f97316',
    islandRock: '#451a03',
    sunColor: '#fde047',
    sparkleColor: '#fed7aa',
    fogColor: '#7c2d12',
  },
  neon: {
    bgTop: '#050811',
    bgBottom: '#1e1b4b',
    ringColor: '#00f5d4',
    islandTop: '#4f46e5',
    islandRock: '#0f172a',
    sunColor: '#f72585',
    sparkleColor: '#00f5d4',
    fogColor: '#0f172a',
  },
  aurora: {
    bgTop: '#022c22',
    bgBottom: '#0f172a',
    ringColor: '#10b981',
    islandTop: '#059669',
    islandRock: '#1e293b',
    sunColor: '#6ee7b7',
    sparkleColor: '#34d399',
    fogColor: '#064e3b',
  },
  citadel: {
    bgTop: '#090d16',
    bgBottom: '#451a03',
    ringColor: '#fbbf24',
    islandTop: '#d97706',
    islandRock: '#18181b',
    sunColor: '#fde047',
    sparkleColor: '#fde047',
    fogColor: '#1c1917',
  },
  // --- Summit stage skies ---
  forest: {
    bgTop: '#14532d',
    bgBottom: '#bbf7d0',
    ringColor: '#84cc16',
    islandTop: '#4d7c0f',
    islandRock: '#422006',
    sunColor: '#fef9c3',
    sparkleColor: '#d9f99d',
    fogColor: '#3f6212',
  },
  cave: {
    bgTop: '#0b0618',
    bgBottom: '#3b0764',
    ringColor: '#d946ef',
    islandTop: '#7c3aed',
    islandRock: '#1e1b4b',
    sunColor: '#e9d5ff',
    sparkleColor: '#f0abfc',
    fogColor: '#2e1065',
  },
  desert: {
    bgTop: '#c2410c',
    bgBottom: '#fde68a',
    ringColor: '#f59e0b',
    islandTop: '#d97706',
    islandRock: '#78350f',
    sunColor: '#fff7ed',
    sparkleColor: '#fed7aa',
    fogColor: '#fdba74',
  },
  glacier: {
    bgTop: '#0c4a6e',
    bgBottom: '#e0f2fe',
    ringColor: '#7dd3fc',
    islandTop: '#e0f2fe',
    islandRock: '#475569',
    sunColor: '#f0f9ff',
    sparkleColor: '#ffffff',
    fogColor: '#bae6fd',
  },
  gale: {
    bgTop: '#1e3a8a',
    bgBottom: '#cbd5e1',
    ringColor: '#93c5fd',
    islandTop: '#64748b',
    islandRock: '#1e293b',
    sunColor: '#e0e7ff',
    sparkleColor: '#e2e8f0',
    fogColor: '#94a3b8',
  },
  volcano: {
    bgTop: '#1c0a05',
    bgBottom: '#9a3412',
    ringColor: '#f97316',
    islandTop: '#292524',
    islandRock: '#0c0a09',
    sunColor: '#fdba74',
    sparkleColor: '#fb923c',
    fogColor: '#431407',
  },
  storm: {
    bgTop: '#0f172a',
    bgBottom: '#475569',
    ringColor: '#67e8f9',
    islandTop: '#334155',
    islandRock: '#0f172a',
    sunColor: '#cffafe',
    sparkleColor: '#a5f3fc',
    fogColor: '#1e293b',
  },
  summit: {
    bgTop: '#1e1b4b',
    bgBottom: '#fcd34d',
    ringColor: '#fbbf24',
    islandTop: '#f8fafc',
    islandRock: '#a16207',
    sunColor: '#fff7d6',
    sparkleColor: '#fde68a',
    fogColor: '#fde68a',
  },
};

function HorizonEnvironment({ preset }: { preset: LevelData['skyPreset'] }) {
  const horizonRef = useRef<THREE.Group>(null);
  const outerOrbitalRef = useRef<THREE.Group>(null);
  const theme = SKY_THEMES[preset] || SKY_THEMES.day;

  const islands = useMemo(() => {
    const items: {
      angle: number;
      dist: number;
      height: number;
      radius: number;
      depth: number;
      hasCrystal: boolean;
    }[] = [];
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      items.push({
        angle,
        dist: 72 + (i % 3) * 18,
        height: -10 + Math.sin(i * 2.3) * 14,
        radius: 4.5 + (i % 4) * 2.2,
        depth: 6 + (i % 3) * 3.5,
        hasCrystal: i % 2 === 0,
      });
    }
    return items;
  }, []);

  useFrame((_, delta) => {
    if (outerOrbitalRef.current) {
      outerOrbitalRef.current.rotation.y += delta * 0.08;
    }
    if (!horizonRef.current) return;
    const [bx, by, bz] = livePhysics.ballPosition;
    const yaw = livePhysics.cameraYaw;
    const pitch = livePhysics.tiltPitch;
    const roll = livePhysics.tiltRoll;

    horizonRef.current.position.set(bx, by, bz);

    const qYaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    const qYawInv = qYaw.clone().invert();
    const qTilt = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(pitch * 0.42, 0, -roll * 0.36, 'YXZ')
    );
    const targetQ = qYaw.multiply(qTilt).multiply(qYawInv);
    horizonRef.current.quaternion.slerp(targetQ, 0.15);
  });

  return (
    <group ref={horizonRef}>
      <Stars radius={125} depth={50} count={2200} factor={4} saturation={0.6} fade speed={1.2} />

      {/* Upgraded Celestial Sun & Volumetric-Style Corona Glow Rings */}
      <group position={[0, 34, -135]}>
        <mesh>
          <sphereGeometry args={[14, 32, 32]} />
          <meshBasicMaterial color={theme.sunColor} />
        </mesh>
        <mesh>
          <sphereGeometry args={[17.5, 32, 32]} />
          <meshBasicMaterial color={theme.sunColor} transparent opacity={0.22} />
        </mesh>
        <mesh rotation={[Math.PI / 3, 0.3, 0]}>
          <torusGeometry args={[22, 0.5, 12, 64]} />
          <meshBasicMaterial color={theme.ringColor} transparent opacity={0.65} />
        </mesh>
        <mesh rotation={[-Math.PI / 4, -0.2, 0]}>
          <torusGeometry args={[28, 0.28, 12, 64]} />
          <meshBasicMaterial color={theme.sunColor} transparent opacity={0.4} />
        </mesh>
      </group>

      {/* True-Horizon Equatorial Reference Rings */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[95, 0.38, 10, 96]} />
        <meshBasicMaterial color={theme.ringColor} transparent opacity={0.45} />
      </mesh>
      <mesh position={[0, -16, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[78, 0.24, 10, 96]} />
        <meshBasicMaterial color={theme.ringColor} transparent opacity={0.28} />
      </mesh>

      {/* Multi-Tiered 3D Floating Sky Islands */}
      <group ref={outerOrbitalRef}>
        {islands.map((isl, idx) => {
          const x = Math.cos(isl.angle) * isl.dist;
          const z = Math.sin(isl.angle) * isl.dist;
          return (
            <group key={idx} position={[x, isl.height, z]}>
              <mesh position={[0, -isl.depth * 0.5, 0]} rotation={[Math.PI, 0, 0]}>
                <coneGeometry args={[isl.radius, isl.depth, 7]} />
                <meshStandardMaterial color={theme.islandRock} roughness={0.75} metalness={0.2} />
              </mesh>
              <mesh position={[0, 0.3, 0]}>
                <cylinderGeometry args={[isl.radius * 1.04, isl.radius * 0.95, 0.8, 7]} />
                <meshStandardMaterial color={theme.islandTop} roughness={0.4} metalness={0.2} />
              </mesh>
              {isl.hasCrystal && (
                <mesh position={[0, 2.2, 0]}>
                  <octahedronGeometry args={[1.35, 0]} />
                  <meshStandardMaterial
                    color={theme.ringColor}
                    emissive={theme.ringColor}
                    emissiveIntensity={0.85}
                    roughness={0.12}
                  />
                </mesh>
              )}
            </group>
          );
        })}
      </group>
    </group>
  );
}

export function GameCanvas() {
  const currentLevelId = useGameStore((s) => s.currentLevelId);
  const runAttemptId = useGameStore((s) => s.runAttemptId);

  const level = useMemo(
    () => getLevelById(currentLevelId),
    [currentLevelId]
  );

  // Summit sky follows the stage you are in: Base Camps passed in order (never raw altitude,
  // so falling back down a stage keeps its sky and bouncing high can't flash the next one).
  const summitCampsCrossed = useGameStore((s) => s.crossedCheckpoints.length);
  const summitSkyPreset = getSummitStageByCamps(summitCampsCrossed).skyPreset;

  const activePreset = level.isSummitMode ? summitSkyPreset : level.skyPreset;
  const sky = SKY_THEMES[activePreset] || SKY_THEMES.day;

  return (
    <div
      className="game-canvas-wrapper"
      style={{
        background: `linear-gradient(180deg, ${sky.bgTop} 0%, ${sky.bgBottom} 100%)`,
        transition: 'background 1.2s ease',
      }}
    >
      <Canvas
        shadows
        camera={{ fov: 52, near: 0.1, far: 420, position: [0, 4, 8] }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.15,
        }}
      >
        {/* Percentage-Closer Soft Shadows for smooth penumbra edges */}
        <SoftShadows size={18} samples={16} focus={0.5} />

        {/* Subtle Atmospheric Depth Fog */}
        <fogExp2 attach="fog" args={[sky.fogColor, level.isSummitMode ? 0.0014 : 0.0028]} />

        {/* Upgraded High-Res Studio & Skybox IBL Environment for Glass Refraction */}
        <Environment resolution={512}>
          <group rotation={[-Math.PI / 3, 0, 1]}>
            <Lightformer
              form="circle"
              intensity={4.2}
              rotation-x={Math.PI / 2}
              position={[0, 6, -8]}
              scale={5}
            />
            <Lightformer
              form="ring"
              color={sky.ringColor}
              intensity={3.0}
              rotation-y={Math.PI / 2}
              position={[-6, 3, -1]}
              scale={5.5}
            />
            <Lightformer
              form="rect"
              color={sky.sunColor}
              intensity={2.6}
              rotation-y={-Math.PI / 2}
              position={[10, 3, 0]}
              scale={[14, 5, 1]}
            />
            <Lightformer
              form="rect"
              color="#ffffff"
              intensity={1.5}
              rotation-x={-Math.PI / 2}
              position={[0, -6, 0]}
              scale={[12, 12, 1]}
            />
          </group>
        </Environment>

        <ambientLight intensity={0.58} />
        <directionalLight
          castShadow
          position={[26, 52, 24]}
          intensity={1.65}
          color={sky.sunColor}
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-48}
          shadow-camera-right={48}
          shadow-camera-top={48}
          shadow-camera-bottom={-48}
          shadow-bias={-0.0005}
        />
        <hemisphereLight args={[sky.sunColor, sky.bgTop, 0.55]} />

        <Sparkles
          count={140}
          scale={[38, 18, 78]}
          position={[0, 2, -28]}
          size={3.4}
          speed={0.45}
          opacity={0.6}
          color={sky.sparkleColor}
        />

        <HorizonEnvironment preset={activePreset} />
        <ParticleFX />
        <OrbSpeedTrail />
        <GhostOrb />
        <SummitMultiplayer />

        <Suspense fallback={null}>
          <Physics
            key={`level_${level.id}_attempt_${runAttemptId}`}
            gravity={[0, -20.5, 0]}
            timeStep={1 / 120}
            interpolate={true}
          >
            <TiltController />
            <MonkeyCamera />
            <PlayerOrb
              spawnPosition={level.spawnPosition}
              killPlaneY={level.killPlaneY}
              respawnFallDepth={level.respawnFallDepth}
            />
            <StageBuilder level={level} />
          </Physics>
        </Suspense>
      </Canvas>
    </div>
  );
}
