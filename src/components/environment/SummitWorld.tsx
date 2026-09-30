import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GraphicsQuality } from '../../graphics/quality';
import {
  buildTerrainGeometry,
  fbm2,
  getSummitTerrain,
  SummitTerrain,
} from '../../graphics/summitTerrain';
import { makeTerrainMaterial } from '../../graphics/terrainMaterial';
import { DecorKind } from '../../graphics/decorGeometry';
import { SUMMIT_BOT_WAYPOINTS, SUMMIT_MAP } from '../../levels/summitMap';
import { livePhysics } from '../../store/useGameStore';
import { CloudPuffs, Puff } from './CloudPuffs';
import { DecorInstance, InstancedDecor } from './InstancedDecor';

const TERRAIN_CELL: Record<GraphicsQuality, number> = { low: 2.2, medium: 1.6, high: 1.25 };
const DECOR_DENSITY: Record<GraphicsQuality, number> = { low: 0.3, medium: 0.65, high: 1 };
const DECOR_NEAR: Record<GraphicsQuality, number> = { low: 70, medium: 120, high: 170 };
const DECOR_FAR: Record<GraphicsQuality, number> = { low: 260, medium: 420, high: 600 };
const PUFFS: Record<GraphicsQuality, number> = { low: 26, medium: 55, high: 80 };

export function getSummitTerrainFor(quality: GraphicsQuality): SummitTerrain {
  return getSummitTerrain(SUMMIT_MAP, SUMMIT_BOT_WAYPOINTS, TERRAIN_CELL[quality]);
}

/** Deterministic PRNG so the scenery is identical every run / on every device. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Pick = [DecorKind, number][];
function bandPalette(y: number): Pick {
  if (y < -4)
    return [
      ['pine', 0.72],
      ['rock', 0.14],
      ['birch', 0.14],
    ];
  if (y < 25)
    return [
      ['birch', 0.3],
      ['pine', 0.25],
      ['rock', 0.2],
      ['tuft', 0.25],
    ];
  if (y < 50)
    return [
      ['pine', 0.55],
      ['birch', 0.3],
      ['tuft', 0.15],
    ];
  if (y < 78)
    return [
      ['crystal', 0.55],
      ['rock', 0.45],
    ];
  if (y < 106)
    return [
      ['cactus', 0.45],
      ['rock', 0.55],
    ];
  if (y < 134)
    return [
      ['snowpine', 0.45],
      ['ice', 0.35],
      ['rock', 0.2],
    ];
  if (y < 164)
    return [
      ['rock', 0.6],
      ['snowpine', 0.2],
      ['ice', 0.2],
    ];
  if (y < 192)
    return [
      ['basalt', 0.6],
      ['deadtree', 0.25],
      ['rock', 0.15],
    ];
  if (y < 220)
    return [
      ['deadtree', 0.4],
      ['rock', 0.6],
    ];
  return [
    ['ice', 0.4],
    ['rock', 0.35],
    ['crystal', 0.25],
  ];
}
const MAX_SLOPE: Record<DecorKind, number> = {
  pine: 0.85,
  snowpine: 0.85,
  birch: 0.7,
  tuft: 0.6,
  cactus: 0.7,
  deadtree: 1.0,
  rock: 1.6,
  crystal: 1.4,
  ice: 1.4,
  basalt: 1.2,
};

function scatterDecor(t: SummitTerrain, density: number): DecorInstance[] {
  const rnd = mulberry32(1337);
  const out: DecorInstance[] = [];
  const [cx, cz] = t.center;
  const [ax, az] = t.halfExtent;
  const attempt = (x: number, z: number) => {
    const y = t.sample(x, z);
    if (y < -72) return; // hidden under the cloud sea
    // keep 3 m+ from any road deck, gap or lava pool
    if (t.flagAt(x, z)) return;
    for (let a = 0; a < 6; a++) {
      const ang = (a / 6) * Math.PI * 2;
      if (t.flagAt(x + Math.cos(ang) * 3.2, z + Math.sin(ang) * 3.2)) return;
    }
    const gx = (t.sample(x + 1.5, z) - t.sample(x - 1.5, z)) / 3;
    const gz = (t.sample(x, z + 1.5) - t.sample(x, z - 1.5)) / 3;
    const slope = Math.hypot(gx, gz);
    const pal = bandPalette(y);
    let r = rnd();
    let kind: DecorKind = pal[0][0];
    for (const [k, w] of pal) {
      if (r < w) {
        kind = k;
        break;
      }
      r -= w;
    }
    if (slope > MAX_SLOPE[kind]) return;
    // clumping: forests grow in patches
    if ((kind === 'pine' || kind === 'birch') && fbm2(x * 0.02, z * 0.02) < 0.42) return;
    const scale =
      kind === 'tuft' ? 0.8 + rnd() * 0.8 : kind === 'rock' ? 0.7 + rnd() * 2.2 : 0.8 + rnd() * 0.7;
    out.push({
      kind,
      x,
      y: y - 0.15 - slope * 0.4,
      z,
      rotY: rnd() * Math.PI * 2,
      scale: y < -4 && kind === 'pine' ? scale * 1.6 : scale,
      tint: 0.85 + rnd() * 0.3,
    });
  };
  // Dense around (and on) the mountain, sparser on the far massif.
  const nNear = Math.round(9000 * density);
  for (let i = 0; i < nNear; i++) {
    attempt(cx + (rnd() * 2 - 1) * (ax + 90), cz + (rnd() * 2 - 1) * (az + 90));
  }
  const nFar = Math.round(6000 * density);
  for (let i = 0; i < nFar; i++) {
    const ang = rnd() * Math.PI * 2;
    const d = Math.max(ax, az) + 60 + Math.sqrt(rnd()) * 420;
    attempt(cx + Math.cos(ang) * d, cz + Math.sin(ang) * d);
  }
  return out;
}

function cloudBelt(t: SummitTerrain, count: number): Puff[] {
  const rnd = mulberry32(4242);
  const [cx, cz] = t.center;
  const R = Math.max(...t.halfExtent);
  const out: Puff[] = [];
  let guard = 0;
  while (out.length < count && guard++ < count * 20) {
    const ang = rnd() * Math.PI * 2;
    const band = rnd();
    const y = band < 0.4 ? -55 + rnd() * 45 : band < 0.8 ? 118 + rnd() * 55 : 226 + rnd() * 40;
    const d = R + 28 + rnd() * (band < 0.4 ? 260 : 150);
    const x = cx + Math.cos(ang) * d;
    const z = cz + Math.sin(ang) * d;
    const s = band < 0.4 ? 30 + rnd() * 40 : 16 + rnd() * 26;
    // never on or right next to the road
    let ok = true;
    for (const w of SUMMIT_BOT_WAYPOINTS) {
      if (Math.abs(w[1] - y) < s * 0.6 + 8 && Math.hypot(w[0] - x, w[2] - z) < s * 0.9 + 14) {
        ok = false;
        break;
      }
    }
    if (ok && y > t.sample(x, z) - s * 0.3) out.push([x, y, z, s]);
  }
  return out;
}

/**
 * The Summit's world: a procedural mountain carved around the spiral road, instanced
 * scenery by altitude band, and cumulus belts. All visual, no colliders.
 */
export function SummitWorld({
  quality,
  cloudColor,
  cloudShade,
}: {
  quality: GraphicsQuality;
  cloudColor: string;
  cloudShade: string;
}) {
  const terrain = useMemo(() => getSummitTerrainFor(quality), [quality]);
  const geo = useMemo(() => buildTerrainGeometry(terrain), [terrain]);
  const mat = useMemo(
    () => makeTerrainMaterial(quality, terrain.center, terrain.halfExtent),
    [quality, terrain],
  );
  const decor = useMemo(() => scatterDecor(terrain, DECOR_DENSITY[quality]), [terrain, quality]);
  const puffs = useMemo(() => cloudBelt(terrain, PUFFS[quality]), [terrain, quality]);
  useEffect(() => () => geo.dispose(), [geo]);
  useEffect(() => () => mat.dispose(), [mat]);

  return (
    <group>
      <mesh geometry={geo} material={mat} receiveShadow={quality !== 'low'} />
      <InstancedDecor
        items={decor}
        nearDist={DECOR_NEAR[quality]}
        farDist={DECOR_FAR[quality]}
        castShadow={quality === 'high'}
      />
      <CloudPuffs puffs={puffs} color={cloudColor} shade={cloudShade} opacity={0.88} />
    </group>
  );
}

/**
 * Keeps the chase camera above the (collider-less) mountain surface. Must be mounted
 * after MonkeyCamera so it runs after the camera has been placed for the frame.
 */
export function TerrainCameraGuard({ quality }: { quality: GraphicsQuality }) {
  const terrain = useMemo(() => getSummitTerrainFor(quality), [quality]);
  const ball = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera }) => {
    const h = terrain.sample(camera.position.x, camera.position.z) + 1.6;
    if (camera.position.y < h) {
      camera.position.y = h;
      const [bx, by, bz] = livePhysics.ballPosition;
      camera.lookAt(ball.set(bx, by + 0.6, bz));
    }
  });
  return null;
}
