import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';
import { currentRunGhostBuffer, getLevelById, livePhysics, useGameStore } from '../../store/useGameStore';
import { CharacterModel } from './CharacterModel';
import { ORB_RADIUS } from './PlayerOrb';

export function GhostOrb() {
  const currentLevelId = useGameStore((s) => s.currentLevelId);
  const runAttemptId = useGameStore((s) => s.runAttemptId);
  const showGhost = useGameStore((s) => s.showGhost);
  const ghostData = useGameStore((s) => s.ghosts[s.currentLevelId]);

  const ghostGroupRef = useRef<THREE.Group>(null);
  const outerRingRef = useRef<THREE.Group>(null);
  const lastSampleMs = useRef(0);

  const level = getLevelById(currentLevelId);

  useEffect(() => {
    lastSampleMs.current = 0;
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
    let idx = 0;
    while (idx < frames.length - 2 && frames[idx + 1][0] < elapsed) {
      idx++;
    }

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

    // 3. Compute live split delta vs Ghost based on distance to Goal Gate
    if (state.playPhase === 'playing' && elapsed > 600) {
      const [goalX, , goalZ] = level.goalPosition;
      const playerDist = Math.hypot(bx - goalX, bz - goalZ);

      // Find the frame where the ghost was at a similar distance to the goal
      let closestTime = f0[0];
      let minDiff = Infinity;
      for (let i = 0; i < frames.length; i++) {
        const d = Math.hypot(frames[i][1] - goalX, frames[i][3] - goalZ);
        const diff = Math.abs(d - playerDist);
        if (diff < minDiff) {
          minDiff = diff;
          closestTime = frames[i][0];
        }
      }
      // Negative = player reached this point faster than PB ghost!
      livePhysics.ghostDeltaMs = elapsed - closestTime;
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
