import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';
import { currentRunGhostBuffer, livePhysics, useGameStore } from '../../store/useGameStore';
import { CharacterModel } from './CharacterModel';
import { GHOST_MATCH_MAX_DIST, matchGhostProgress } from './ghostProgress';
import { ORB_RADIUS } from './PlayerOrb';

export function GhostOrb() {
  const currentLevelId = useGameStore((s) => s.currentLevelId);
  const runAttemptId = useGameStore((s) => s.runAttemptId);
  const showGhost = useGameStore((s) => s.showGhost);
  const ghostData = useGameStore((s) => s.ghosts[s.currentLevelId]);

  const ghostGroupRef = useRef<THREE.Group>(null);
  const outerRingRef = useRef<THREE.Group>(null);
  const lastSampleMs = useRef(0);
  /** Playback keyframe cursor, so each frame doesn't rescan the whole replay. */
  const playbackIdx = useRef(0);
  /** Last matched segment of the ghost's line, for the live PB delta. */
  const progressIdx = useRef(0);

  useEffect(() => {
    lastSampleMs.current = 0;
    playbackIdx.current = 0;
    progressIdx.current = 0;
    currentRunGhostBuffer.frames = [];
    livePhysics.ghostDeltaMs = null;
  }, [runAttemptId, currentLevelId]);

  useFrame((_, delta) => {
    const state = useGameStore.getState();
    const runMs = state.runClockMs;
    const [bx, by, bz] = livePhysics.ballPosition;

    // 1. Record 20Hz keyframes during active play, stamped with the run clock. The displayed
    // timer jumps back on every gem bonus, which used to stall recording until it caught up
    // (a 1 s gem left a ~1 s hole the ghost slid straight across).
    if (state.playPhase === 'playing') {
      if (runMs - lastSampleMs.current >= 50 || currentRunGhostBuffer.frames.length === 0) {
        lastSampleMs.current = runMs;
        currentRunGhostBuffer.frames.push([
          Math.round(runMs),
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

    // New ghosts are stamped with the run clock; older saved ghosts with the displayed timer.
    const elapsed = ghostData.clock === 'run' ? runMs : state.elapsedMs;
    const frames = ghostData.frames;
    if (frames.length < 2) {
      ghostGroupRef.current.visible = false;
      return;
    }

    ghostGroupRef.current.visible =
      state.playPhase === 'playing' || state.playPhase === 'countdown';

    // Find bounding keyframes for the current time (time only moves forward within a run)
    let idx = Math.min(playbackIdx.current, frames.length - 2);
    if (frames[idx][0] > elapsed) idx = 0;
    while (idx < frames.length - 2 && frames[idx + 1][0] < elapsed) {
      idx++;
    }

    playbackIdx.current = idx;
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

    // 3. Live delta vs PB: when did the ghost pass the point of its line nearest to the player?
    // (Matching by distance-to-goal broke on any winding stage: hairpins, loops and the Summit
    // spiral put far-apart parts of the course at the same distance from the goal.)
    if (state.playPhase === 'playing' && elapsed > 600) {
      const match = matchGhostProgress(frames, bx, by, bz, progressIdx.current);
      if (match && match.distance <= GHOST_MATCH_MAX_DIST) {
        progressIdx.current = match.index;
        // Negative = player reached this point faster than PB ghost!
        livePhysics.ghostDeltaMs = elapsed - match.timeMs;
      } else {
        // Off the ghost's line (different route): no comparison beats a wrong one.
        livePhysics.ghostDeltaMs = null;
      }
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

      {/* Floating Billboard Tag */}
      <Billboard position={[0, ORB_RADIUS + 0.42, 0]}>
        <Text
          fontSize={0.2}
          color="#00f5d4"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.025}
          outlineColor="#090d16"
        >
          PB GHOST
        </Text>
      </Billboard>
    </group>
  );
}
