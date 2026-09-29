import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import {
  Environment,
  Lightformer,
  PerformanceMonitor,
  SoftShadows,
  Sparkles,
  Stars,
} from '@react-three/drei';
import { Physics } from '@react-three/rapier';
import * as THREE from 'three';
import { getSummitPhaseForAltitude } from '../../levels/summitMap';
import { getLevelById, livePhysics, useGameStore } from '../../store/useGameStore';
import { GRAPHICS_PRESETS } from '../../graphics/quality';
import { LevelData } from '../../types/level';
import { GhostOrb } from './GhostOrb';
import { MonkeyCamera } from './MonkeyCamera';
import { OrbSpeedTrail } from './OrbSpeedTrail';
import { ParticleFX } from './ParticleFX';
import { PlayerOrb } from './PlayerOrb';
import { PostFX } from './PostFX';
import { AtmosphereFog, SunLight } from './SceneLighting';
import { StageBuilder } from './StageBuilder';
import { SummitMultiplayer } from './SummitMultiplayer';
import { TiltController } from './TiltController';

const SKY_THEMES: Record<
  LevelData['skyPreset'],
  {
    bgTop: string;
    bgBottom: string;
    ringColor: string;
    islandTop: string;
    islandRock: string;
    sunColor: string;
    sparkleColor: string;
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
  },
  sunset: {
    bgTop: '#3b0764',
    bgBottom: '#fb923c',
    ringColor: '#f43f5e',
    islandTop: '#f97316',
    islandRock: '#451a03',
    sunColor: '#fde047',
    sparkleColor: '#fed7aa',
  },
  neon: {
    bgTop: '#050811',
    bgBottom: '#1e1b4b',
    ringColor: '#00f5d4',
    islandTop: '#4f46e5',
    islandRock: '#0f172a',
    sunColor: '#f72585',
    sparkleColor: '#00f5d4',
  },
  aurora: {
    bgTop: '#022c22',
    bgBottom: '#0f172a',
    ringColor: '#10b981',
    islandTop: '#059669',
    islandRock: '#1e293b',
    sunColor: '#6ee7b7',
    sparkleColor: '#34d399',
  },
  citadel: {
    bgTop: '#090d16',
    bgBottom: '#451a03',
    ringColor: '#fbbf24',
    islandTop: '#d97706',
    islandRock: '#18181b',
    sunColor: '#fde047',
    sparkleColor: '#fde047',
  },
};

function HorizonEnvironment({
  preset,
  starCount,
}: {
  preset: LevelData['skyPreset'];
  starCount: number;
}) {
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
      <Stars radius={125} depth={50} count={starCount} factor={4} saturation={0.6} fade speed={1.2} />

      {/* Upgraded Celestial Sun & Volumetric-Style Corona Glow Rings */}
      <group position={[0, 34, -135]}>
        <mesh>
          <sphereGeometry args={[14, 32, 32]} />
          <meshBasicMaterial color={theme.sunColor} fog={false} />
        </mesh>
        <mesh>
          <sphereGeometry args={[17.5, 32, 32]} />
          <meshBasicMaterial color={theme.sunColor} transparent opacity={0.22} fog={false} />
        </mesh>
        <mesh rotation={[Math.PI / 3, 0.3, 0]}>
          <torusGeometry args={[22, 0.5, 12, 64]} />
          <meshBasicMaterial color={theme.ringColor} transparent opacity={0.65} fog={false} />
        </mesh>
        <mesh rotation={[-Math.PI / 4, -0.2, 0]}>
          <torusGeometry args={[28, 0.28, 12, 64]} />
          <meshBasicMaterial color={theme.sunColor} transparent opacity={0.4} fog={false} />
        </mesh>
      </group>

      {/* True-Horizon Equatorial Reference Rings */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[95, 0.38, 10, 96]} />
        <meshBasicMaterial color={theme.ringColor} transparent opacity={0.45} fog={false} />
      </mesh>
      <mesh position={[0, -16, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[78, 0.24, 10, 96]} />
        <meshBasicMaterial color={theme.ringColor} transparent opacity={0.28} fog={false} />
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

  const [summitSkyPreset, setSummitSkyPreset] = useState<LevelData['skyPreset']>('day');

  useEffect(() => {
    if (!level.isSummitMode) return;
    const syncPhaseSky = () => {
      const phase = getSummitPhaseForAltitude(livePhysics.currentAltitudeM);
      setSummitSkyPreset((prev) => (prev === phase.skyPreset ? prev : phase.skyPreset));
    };
    syncPhaseSky();
    const id = window.setInterval(syncPhaseSky, 300);
    return () => window.clearInterval(id);
  }, [level.isSummitMode, runAttemptId]);

  const activePreset = level.isSummitMode ? summitSkyPreset : level.skyPreset;
  const sky = SKY_THEMES[activePreset] || SKY_THEMES.day;

  const graphicsQuality = useGameStore((s) => s.graphicsQuality);
  const gfx = GRAPHICS_PRESETS[graphicsQuality];

  // Adaptive resolution: PerformanceMonitor lowers `perfFactor` when the frame
  // rate drops, scaling the DPR between the tier's min and max.
  const [perfFactor, setPerfFactor] = useState(1);
  const deviceDpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const maxDpr = Math.min(deviceDpr, gfx.maxDpr);
  const minDpr = Math.min(maxDpr, gfx.minDpr);
  const dpr = Math.round((minDpr + (maxDpr - minDpr) * perfFactor) * 100) / 100;

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
        dpr={dpr}
        camera={{ fov: 52, near: 0.1, far: 420, position: [0, 4, 8] }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.15,
        }}
      >
        <PerformanceMonitor
          factor={1}
          flipflops={3}
          onChange={({ factor }) => setPerfFactor(factor)}
          onFallback={() => setPerfFactor(0)}
        />

        {/* Percentage-Closer Soft Shadows (High only: patches every lit shader) */}
        {gfx.softShadows && <SoftShadows size={18} samples={12} focus={0.5} />}

        {/* Atmospheric depth fog tinted to the sky gradient's horizon colour. With post-FX
            the fog is blended in linear HDR before the tone-mapping pass (instead of after
            per-material tone mapping), so it reads stronger; compensate to keep the same look. */}
        <AtmosphereFog
          color={sky.bgBottom}
          density={(level.isSummitMode ? 0.0026 : 0.0036) * (gfx.postFX ? 0.5 : 1)}
        />

        {/* High-Res Studio & Skybox IBL Environment for Glass Refraction & PBR reflections */}
        <Environment resolution={gfx.envResolution}>
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

        <SunLight
          preset={gfx}
          sunColor={sky.sunColor}
          skyColor={sky.sunColor}
          groundColor={sky.bgTop}
        />

        <Sparkles
          count={gfx.sparkleCount}
          scale={[38, 18, 78]}
          position={[0, 2, -28]}
          size={3.4}
          speed={0.45}
          opacity={0.6}
          color={sky.sparkleColor}
        />

        <HorizonEnvironment preset={activePreset} starCount={gfx.starCount} />
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
            />
            <StageBuilder level={level} />
          </Physics>
        </Suspense>

        {gfx.postFX && <PostFX preset={gfx} />}
      </Canvas>
    </div>
  );
}
