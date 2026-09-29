import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { livePhysics, useGameStore } from '../../store/useGameStore';
import { ORB_RADIUS } from './PlayerOrb';
import { spawnParticleBurst } from './ParticleFX';

const TRAIL_SEGMENTS = 28;

export function OrbSpeedTrail() {
  const avatar = useGameStore((s) => s.avatar);
  const runAttemptId = useGameStore((s) => s.runAttemptId);
  const playPhase = useGameStore((s) => s.playPhase);

  const meshRef = useRef<THREE.Mesh>(null);
  const sparkTimer = useRef(0);
  const wasAirborne = useRef(false);

  // History of [centerPos, rightVec] for the ribbon
  const history = useRef<{ pos: THREE.Vector3; right: THREE.Vector3 }[]>(
    Array.from({ length: TRAIL_SEGMENTS }, () => ({
      pos: new THREE.Vector3(0, -100, 0),
      right: new THREE.Vector3(1, 0, 0),
    }))
  );

  const { geometry, positions } = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const posArr = new Float32Array(TRAIL_SEGMENTS * 2 * 3);
    const uvs = new Float32Array(TRAIL_SEGMENTS * 2 * 2);
    const indices: number[] = [];

    for (let i = 0; i < TRAIL_SEGMENTS; i++) {
      const v = 1 - i / (TRAIL_SEGMENTS - 1);
      uvs[i * 4 + 0] = 0;
      uvs[i * 4 + 1] = v;
      uvs[i * 4 + 2] = 1;
      uvs[i * 4 + 3] = v;

      if (i < TRAIL_SEGMENTS - 1) {
        const a = i * 2;
        const b = i * 2 + 1;
        const c = (i + 1) * 2;
        const d = (i + 1) * 2 + 1;
        indices.push(a, b, c, b, d, c);
      }
    }

    geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    return { geometry: geo, positions: posArr };
  }, []);

  useEffect(() => {
    const [bx, by, bz] = livePhysics.ballPosition;
    for (let i = 0; i < TRAIL_SEGMENTS; i++) {
      history.current[i].pos.set(bx, by - 0.15, bz);
      history.current[i].right.set(1, 0, 0);
    }
  }, [runAttemptId]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const [bx, by, bz] = livePhysics.ballPosition;
    const [vx, vy, vz] = livePhysics.ballVelocity;
    const speed = livePhysics.ballSpeed;
    const horizSpeed = Math.hypot(vx, vz);

    // Emit landing burst when touching down from a jump/drop
    if (!livePhysics.isGrounded && Math.abs(vy) > 3.8) {
      wasAirborne.current = true;
    } else if (livePhysics.isGrounded && wasAirborne.current) {
      wasAirborne.current = false;
      spawnParticleBurst([bx, by - ORB_RADIUS + 0.05, bz], '#38bdf8', 14, 4.5, 0.1);
    }

    // Emit subtle high-speed rolling sparks
    if (playPhase === 'playing' && livePhysics.isGrounded && speed > 7.5) {
      sparkTimer.current += dt;
      if (sparkTimer.current > 0.065) {
        sparkTimer.current = 0;
        spawnParticleBurst(
          [bx, by - ORB_RADIUS + 0.05, bz],
          avatar.orbStyle === 'starlight' ? '#fde047' : avatar.primaryColor,
          2,
          2.8,
          0.07
        );
      }
    }

    // Shift ribbon history back
    for (let i = TRAIL_SEGMENTS - 1; i > 0; i--) {
      history.current[i].pos.copy(history.current[i - 1].pos);
      history.current[i].right.copy(history.current[i - 1].right);
    }

    // Compute current ribbon head position & perpendicular right vector
    history.current[0].pos.set(bx, by - 0.12, bz);
    if (horizSpeed > 0.4) {
      history.current[0].right.set(-vz / horizSpeed, 0, vx / horizSpeed);
    }

    // Width scales dynamically with speed
    const speedFactor = THREE.MathUtils.clamp((speed - 1.2) / 10.0, 0.05, 1.0);
    const maxHalfWidth = 0.36 * speedFactor;

    for (let i = 0; i < TRAIL_SEGMENTS; i++) {
      const t = 1 - i / (TRAIL_SEGMENTS - 1);
      const halfW = maxHalfWidth * Math.pow(t, 1.35);
      const p = history.current[i].pos;
      const r = history.current[i].right;

      const idx = i * 6;
      positions[idx + 0] = p.x - r.x * halfW;
      positions[idx + 1] = p.y;
      positions[idx + 2] = p.z - r.z * halfW;

      positions[idx + 3] = p.x + r.x * halfW;
      positions[idx + 4] = p.y;
      positions[idx + 5] = p.z + r.z * halfW;
    }

    geometry.attributes.position.needsUpdate = true;

    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = THREE.MathUtils.clamp((speed - 1.5) / 8.0, 0, 0.52);
    }
  });

  const trailColor =
    avatar.orbStyle === 'neon'
      ? '#00f5d4'
      : avatar.orbStyle === 'starlight'
      ? '#fde047'
      : avatar.orbStyle === 'candy'
      ? '#ff4d6d'
      : avatar.primaryColor;

  return (
    <mesh ref={meshRef} geometry={geometry} frustumCulled={false}>
      <meshBasicMaterial
        color={trailColor}
        transparent
        opacity={0.4}
        side={THREE.DoubleSide}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}
