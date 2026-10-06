import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { currentRunGhostBuffer, livePhysics, useGameStore } from '../../store/useGameStore';
import { CharacterModel } from './CharacterModel';
import { ORB_RADIUS } from './PlayerOrb';
import { NameTag } from './StickerTags';

/** The PB delta chip only shows while you are within this distance of the ghost's path. */
const GHOST_MATCH_RADIUS_M = 4.5;
const GHOST_TAG = { name: 'PB Ghost', accent: '#38bdf8', fill: '#dff7ff' };

export function GhostOrb() {
  const currentLevelId = useGameStore((s) => s.currentLevelId);
  const runAttemptId = useGameStore((s) => s.runAttemptId);
  const showGhost = useGameStore((s) => s.showGhost);
  const ghostData = useGameStore((s) => s.ghosts[s.currentLevelId]);

  const ghostGroupRef = useRef<THREE.Group>(null);
  const outerRingRef = useRef<THREE.Group>(null);
  const lastSampleMs = useRef(0);
  /** Playback cursor into the ghost frames (monotonic within a run). */
  const playIdx = useRef(0);
  /** Index of the ghost frame last matched to the player's position. */
  const matchIdx = useRef(0);
  const frameNo = useRef(0);


  useEffect(() => {
    lastSampleMs.current = 0;
    playIdx.current = 0;
    matchIdx.current = 0;
    currentRunGhostBuffer.frames = [];
    livePhysics.ghostDeltaMs = null;
  }, [runAttemptId, currentLevelId]);

  useFrame((_, delta) => {
    const state = useGameStore.getState();
    const elapsed = state.elapsedMs;
    const [bx, by, bz] = livePhysics.ballPosition;

    // 1. Record 20Hz keyframes during active play
    if (state.playPhase === 'playing') {
      if (elapsed - lastSampleMs.current >= 50 || currentRunGhostBuffer.frames.length === 0) {
        lastSampleMs.current = elapsed;
        currentRunGhostBuffer.frames.push([
          Math.round(elapsed),
          Number(bx.toFixed(2)),
          Number(by.toFixed(2)),
          Number(bz.toFixed(2)),
          Number((livePhysics.cameraYaw + Math.PI).toFixed(2)),
        ]);
      }
    }

    // 2. Interpolate & render saved Personal Best Ghost
    if (!ghostData || !ghostGroupRef.current || !showGhost) {
      if (ghostGroupRef.current) ghostGroupRef.current.visible = false;
      livePhysics.ghostDeltaMs = null;
      return;
    }

    const frames = ghostData.frames;
    if (frames.length < 2) {
      ghostGroupRef.current.visible = false;
      return;
    }

    ghostGroupRef.current.visible =
      state.playPhase === 'playing' || state.playPhase === 'countdown';

    // Find bounding keyframes for current elapsedMs
    // (gem bonuses can move the clock back, so rewind the cursor when needed)
    let idx = Math.min(playIdx.current, frames.length - 2);
    while (idx > 0 && frames[idx][0] > elapsed) idx--;
    while (idx < frames.length - 2 && frames[idx + 1][0] < elapsed) {
      idx++;
    }
    playIdx.current = idx;

    const f0 = frames[idx];
    const f1 = frames[idx + 1];
    const span = Math.max(1, f1[0] - f0[0]);
    const t = THREE.MathUtils.clamp((elapsed - f0[0]) / span, 0, 1);

    const gx = THREE.MathUtils.lerp(f0[1], f1[1], t);
    const gy = THREE.MathUtils.lerp(f0[2], f1[2], t);
    const gz = THREE.MathUtils.lerp(f0[3], f1[3], t);
    const gyaw = THREE.MathUtils.lerp(f0[4], f1[4], t);

    ghostGroupRef.current.position.set(gx, gy, gz);
    ghostGroupRef.current.rotation.set(0, gyaw, 0);

    if (outerRingRef.current) {
      outerRingRef.current.rotation.x += delta * 2.2;
      outerRingRef.current.rotation.z += delta * 1.4;
    }

    // 3. Live split vs the ghost: find where the ghost was when it passed the player's
    // current spot (nearest point on its recorded path, searched in a window around the
    // last match so switchbacks and spiral loops never snap to the wrong part of the
    // course) and compare the clocks. Negative = ahead of the PB.
    frameNo.current++;
    if (state.playPhase === 'playing' && elapsed > 600) {
      const r2 = GHOST_MATCH_RADIUS_M * GHOST_MATCH_RADIUS_M;
      const nearest = (lo: number, hi: number) => {
        let best = -1;
        let bestD = Infinity;
        for (let i = lo; i <= hi; i++) {
          const f = frames[i];
          const d = (f[1] - bx) ** 2 + (f[2] - by) ** 2 + (f[3] - bz) ** 2;
          if (d < bestD) {
            bestD = d;
            best = i;
          }
        }
        return { best, bestD };
      };
      const m = matchIdx.current;
      let hit = nearest(Math.max(0, m - 40), Math.min(frames.length - 1, m + 200));
      // Lost the path (respawn, shortcut): full re-scan a few times per second.
      if (hit.bestD > r2 && frameNo.current % 15 === 0) hit = nearest(0, frames.length - 1);
      if (hit.best >= 0 && hit.bestD <= r2) {
        matchIdx.current = hit.best;
        livePhysics.ghostDeltaMs = elapsed - frames[hit.best][0];
      } else {
        livePhysics.ghostDeltaMs = null;
      }
    } else if (state.playPhase !== 'goal') {
      livePhysics.ghostDeltaMs = null;
    }
  });

  if (!ghostData || !showGhost) return null;

  return (
    <group ref={ghostGroupRef}>
      {/* Holographic Ghost Inner Character */}
      <group scale={[0.96, 0.96, 0.96]}>
        <CharacterModel
          config={{
            ...ghostData.avatar,
            primaryColor: '#38bdf8',
            secondaryColor: '#bae6fd',
          }}
          isPreview
        />
      </group>

      {/* Translucent Hologram Sphere & Rings */}
      <group ref={outerRingRef}>
        <mesh>
          <sphereGeometry args={[ORB_RADIUS, 24, 24]} />
          <meshStandardMaterial
            color="#00f5d4"
            emissive="#00bbf9"
            emissiveIntensity={0.65}
            transparent
            opacity={0.22}
            roughness={0.1}
            depthWrite={false}
          />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[ORB_RADIUS + 0.01, 0.015, 10, 36]} />
          <meshBasicMaterial color="#00f5d4" transparent opacity={0.55} />
        </mesh>
      </group>

      {/* Sticker tag */}
      <NameTag position={[0, ORB_RADIUS + 0.45, 0]} spec={GHOST_TAG} worldHeight={0.3} />
    </group>
  );
}
