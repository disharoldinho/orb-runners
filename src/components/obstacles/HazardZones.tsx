import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CuboidCollider, RapierRigidBody, RigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import { useGameStore } from '../../store/useGameStore';
import { KillZoneDef, WindZoneDef } from '../../types/level';

/**
 * Kill volume: touching it sends the orb back to its last checkpoint (same flow
 * as falling below the kill plane). Used for lava moats and under shortcuts.
 */
export function KillZone({ position, size, visual = 'none' }: KillZoneDef) {
  const lavaRef = useRef<THREE.MeshStandardMaterial>(null);
  const [sx, sy, sz] = size;

  useFrame((state) => {
    if (lavaRef.current) {
      lavaRef.current.emissiveIntensity = 1.1 + Math.sin(state.clock.elapsedTime * 2.2) * 0.25;
    }
  });

  return (
    <RigidBody
      type="fixed"
      position={position}
      colliders={false}
      sensor
      onIntersectionEnter={({ other }) => {
        if (other.rigidBodyObject?.name === 'player-orb') {
          useGameStore.getState().triggerFallout();
        }
      }}
    >
      <CuboidCollider args={[sx / 2, sy / 2, sz / 2]} sensor />
      {visual === 'lava' && (
        <mesh position={[0, sy / 2 - 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[sx, sz]} />
          <meshStandardMaterial
            ref={lavaRef}
            color="#7c2d12"
            emissive="#f97316"
            emissiveIntensity={1.1}
            roughness={0.6}
          />
        </mesh>
      )}
    </RigidBody>
  );
}

// ---------------------------------------------------------------------------
// Wind: zones register their current acceleration here; the orb gets one
// persistent Rapier force equal to the sum (frame-rate independent).
// ---------------------------------------------------------------------------
const activeWind = new Map<string, THREE.Vector3>();
let windBody: RapierRigidBody | null = null;

function syncWindForce() {
  const rb = windBody;
  if (!rb) return;
  try {
    rb.resetForces(true);
    if (activeWind.size === 0) return;
    const sum = new THREE.Vector3();
    activeWind.forEach((a) => sum.add(a));
    const m = rb.mass();
    rb.addForce({ x: sum.x * m, y: sum.y * m, z: sum.z * m }, true);
  } catch {
    // body was removed (run reset); nothing to do
    windBody = null;
  }
}

const STREAKS = 14;

export function WindZone({
  id,
  position,
  size,
  force,
  gustPeriod,
  gustPhase = 0,
  color = '#e0f2fe',
}: WindZoneDef) {
  const inside = useRef(false);
  const blowing = useRef(!gustPeriod);
  const streakRefs = useRef<(THREE.Mesh | null)[]>([]);
  const [sx, sy, sz] = size;
  const accel = useMemo(() => new THREE.Vector3(...force), [force]);
  const dir = useMemo(() => accel.clone().normalize(), [accel]);
  const extent = Math.abs(dir.x) * sx + Math.abs(dir.y) * sy + Math.abs(dir.z) * sz;

  // Deterministic streak layout across the zone.
  const streaks = useMemo(
    () =>
      Array.from({ length: STREAKS }, (_, i) => ({
        u: ((i * 0.618) % 1) - 0.5,
        v: ((i * 0.382 + 0.2) % 1) * 0.8 + 0.1,
        w: ((i * 0.754) % 1) - 0.5,
        offset: (i * 0.137) % 1,
      })),
    [],
  );

  const quat = useMemo(
    () => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir),
    [dir],
  );

  useEffect(() => {
    return () => {
      activeWind.delete(id);
      syncWindForce();
    };
  }, [id]);

  const update = () => {
    const on = inside.current && blowing.current;
    const had = activeWind.has(id);
    if (on && !had) activeWind.set(id, accel);
    if (!on && had) activeWind.delete(id);
    if (on !== had) syncWindForce();
  };

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    let strength = 1;
    let telegraph = false;
    if (gustPeriod) {
      const cyc = (((t + gustPhase) % gustPeriod) + gustPeriod) % gustPeriod;
      const onTime = gustPeriod * 0.5;
      const isOn = cyc < onTime;
      telegraph = !isOn && cyc > gustPeriod - 0.6;
      strength = isOn ? 1 : telegraph ? 0.35 : 0.06;
      if (isOn !== blowing.current) {
        blowing.current = isOn;
        update();
      }
    }

    streakRefs.current.forEach((m, i) => {
      if (!m) return;
      const s = streaks[i];
      const travel = ((t * (0.35 + strength * 0.9) + s.offset) % 1) - 0.5;
      const along = dir.clone().multiplyScalar(travel * extent);
      m.position.set(s.u * sx + along.x, (s.v - 0.5) * sy + along.y, s.w * sz + along.z);
      const mat = m.material as THREE.MeshBasicMaterial;
      mat.opacity = telegraph ? 0.45 : strength * 0.55;
    });
  });

  return (
    <RigidBody
      type="fixed"
      position={position}
      colliders={false}
      sensor
      onIntersectionEnter={({ other }) => {
        if (other.rigidBodyObject?.name === 'player-orb' && other.rigidBody) {
          windBody = other.rigidBody;
          inside.current = true;
          update();
        }
      }}
      onIntersectionExit={({ other }) => {
        if (other.rigidBodyObject?.name === 'player-orb') {
          inside.current = false;
          update();
        }
      }}
    >
      <CuboidCollider args={[sx / 2, sy / 2, sz / 2]} sensor />
      {streaks.map((_, i) => (
        <mesh
          key={i}
          ref={(m) => {
            streakRefs.current[i] = m;
          }}
          quaternion={quat}
        >
          <boxGeometry args={[1.6, 0.05, 0.05]} />
          <meshBasicMaterial color={color} transparent opacity={0.5} depthWrite={false} />
        </mesh>
      ))}
    </RigidBody>
  );
}
