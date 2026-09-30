import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer, PerformanceMonitor, SoftShadows } from '@react-three/drei';
import { Physics } from '@react-three/rapier';
import * as THREE from 'three';
import { getSummitStageByCamps } from '../../levels/summitMap';
import { getLevelById, livePhysics, useGameStore } from '../../store/useGameStore';
import { GRAPHICS_PRESETS, GraphicsQuality } from '../../graphics/quality';
import { ShaderClock } from '../../graphics/shaderLib';
import { CampaignWorld } from '../environment/CampaignWorld';
import { CloudSea, Ocean } from '../environment/CloudSea';
import { DevPhotoCamera } from '../environment/DevPhotoCamera';
import { DistantMountains } from '../environment/DistantMountains';
import { SkyDome } from '../environment/SkyDome';
import { SKY_LOOKS } from '../environment/skyLook';
import { SummitWorld, TerrainCameraGuard } from '../environment/SummitWorld';
import { StormLightning, ThemeParticles } from '../environment/ThemeParticles';
import { LevelData, SkyPreset } from '../../types/level';
import { GhostOrb } from './GhostOrb';
import { MonkeyCamera } from './MonkeyCamera';
import { OrbSpeedTrail } from './OrbSpeedTrail';
import { ParticleFX } from './ParticleFX';
import { PlayerOrb } from './PlayerOrb';
import { PostFX } from './PostFX';
import { AtmosphereFog, RimLight, SunLight } from './SceneLighting';
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
  // --- Summit stage skies ---
  forest: {
    bgTop: '#14532d',
    bgBottom: '#bbf7d0',
    ringColor: '#84cc16',
    islandTop: '#4d7c0f',
    islandRock: '#422006',
    sunColor: '#fef9c3',
    sparkleColor: '#d9f99d',
  },
  cave: {
    bgTop: '#0b0618',
    bgBottom: '#3b0764',
    ringColor: '#d946ef',
    islandTop: '#7c3aed',
    islandRock: '#1e1b4b',
    sunColor: '#e9d5ff',
    sparkleColor: '#f0abfc',
  },
  desert: {
    bgTop: '#c2410c',
    bgBottom: '#fde68a',
    ringColor: '#f59e0b',
    islandTop: '#d97706',
    islandRock: '#78350f',
    sunColor: '#fff7ed',
    sparkleColor: '#fed7aa',
  },
  glacier: {
    bgTop: '#0c4a6e',
    bgBottom: '#e0f2fe',
    ringColor: '#7dd3fc',
    islandTop: '#e0f2fe',
    islandRock: '#475569',
    sunColor: '#f0f9ff',
    sparkleColor: '#ffffff',
  },
  gale: {
    bgTop: '#1e3a8a',
    bgBottom: '#cbd5e1',
    ringColor: '#93c5fd',
    islandTop: '#64748b',
    islandRock: '#1e293b',
    sunColor: '#e0e7ff',
    sparkleColor: '#e2e8f0',
  },
  volcano: {
    bgTop: '#1c0a05',
    bgBottom: '#9a3412',
    ringColor: '#f97316',
    islandTop: '#292524',
    islandRock: '#0c0a09',
    sunColor: '#fdba74',
    sparkleColor: '#fb923c',
  },
  storm: {
    bgTop: '#0f172a',
    bgBottom: '#475569',
    ringColor: '#67e8f9',
    islandTop: '#334155',
    islandRock: '#0f172a',
    sunColor: '#cffafe',
    sparkleColor: '#a5f3fc',
  },
  summit: {
    bgTop: '#1e1b4b',
    bgBottom: '#fcd34d',
    ringColor: '#fbbf24',
    islandTop: '#f8fafc',
    islandRock: '#a16207',
    sunColor: '#fff7d6',
    sparkleColor: '#fde68a',
  },
};

/**
 * Sky + far horizon. The group follows the orb and leans with the board tilt (the tilt
 * cue), so everything inside reads as infinitely far away.
 */
function HorizonEnvironment({
  preset,
  quality,
  summit,
}: {
  preset: LevelData['skyPreset'];
  quality: GraphicsQuality;
  summit: boolean;
}) {
  const horizonRef = useRef<THREE.Group>(null);
  const look = SKY_LOOKS[preset] || SKY_LOOKS.day;

  useFrame((_, delta) => {
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
    // Frame-rate independent follow (same as PR #2): equivalent to the previous fixed
    // 0.15/frame slerp at 60 fps (rate = -60 * ln(0.85) ~= 9.75/s).
    const dt = Math.min(delta, 0.05);
    horizonRef.current.quaternion.slerp(targetQ, 1 - Math.exp(-9.75 * dt));
  });

  return (
    <group ref={horizonRef}>
      <SkyDome look={look} radius={1400} quality={quality} />
      {summit ? (
        <DistantMountains look={look} baseY={-230} scale={2.6} worldY={0} />
      ) : (
        <DistantMountains look={look} baseY={-110} />
      )}
    </group>
  );
}

/** Raises the far plane for the big vistas (sky dome, ranges, massif). */
function CameraFar({ far }: { far: number }) {
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    if ((camera as THREE.PerspectiveCamera).far !== far) {
      (camera as THREE.PerspectiveCamera).far = far;
      camera.updateProjectionMatrix();
    }
  }, [camera, far]);
  return null;
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
  const look = SKY_LOOKS[activePreset] || SKY_LOOKS.day;

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
        camera={{ fov: 52, near: 0.1, far: 1600, position: [0, 4, 8] }}
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
          color={look.horizon}
          density={(level.isSummitMode ? 0.0019 : 0.0036) * (gfx.postFX ? 0.5 : 1)}
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

        <ShaderClock />
        {graphicsQuality !== 'low' && <RimLight color={look.sun} />}
        <CameraFar far={1600} />
        <HorizonEnvironment
          preset={activePreset}
          quality={graphicsQuality}
          summit={!!level.isSummitMode}
        />
        <CloudSea
          look={look}
          y={level.isSummitMode ? -70 : level.killPlaneY - 30}
          quality={graphicsQuality}
        />
        {!level.isSummitMode && look.ocean && graphicsQuality !== 'low' && (
          <Ocean look={look} y={level.killPlaneY - 95} />
        )}
        {level.isSummitMode ? (
          <SummitWorld
            quality={graphicsQuality}
            cloudColor={look.cloudSea}
            cloudShade={look.ridgeFar}
          />
        ) : (
          <CampaignWorld
            level={level}
            preset={activePreset}
            quality={graphicsQuality}
            cloudColor={look.cloudSea}
            cloudShade={look.ridgeFar}
          />
        )}
        <ThemeParticles kind={look.particles} color={look.particleColor} quality={graphicsQuality} />
        <StormLightning active={activePreset === 'storm'} />
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
            {level.isSummitMode && <TerrainCameraGuard quality={graphicsQuality} />}
            {import.meta.env.DEV && <DevPhotoCamera />}
            <PlayerOrb
              spawnPosition={level.spawnPosition}
              killPlaneY={level.killPlaneY}
              respawnFallDepth={level.respawnFallDepth}
            />
            <StageBuilder level={level} />
          </Physics>
        </Suspense>

        {gfx.postFX && <PostFX preset={gfx} />}
      </Canvas>
    </div>
  );
}
