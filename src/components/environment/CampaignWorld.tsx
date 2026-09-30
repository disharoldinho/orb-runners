import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { GraphicsQuality } from '../../graphics/quality';
import { DecorKind } from '../../graphics/decorGeometry';
import { LevelData, SkyPreset } from '../../types/level';
import { CloudPuffs, Puff } from './CloudPuffs';
import { DecorInstance, InstancedDecor } from './InstancedDecor';

interface IslandStyle {
  top: string;
  rock: string;
  rockDeep: string;
  flora: [DecorKind, number][];
}

const STYLES: Record<string, IslandStyle> = {
  day: {
    top: '#5fb043',
    rock: '#7b6a58',
    rockDeep: '#4a4038',
    flora: [
      ['pine', 0.4],
      ['birch', 0.35],
      ['rock', 0.1],
      ['tuft', 0.15],
    ],
  },
  sunset: {
    top: '#c9a043',
    rock: '#8a4b32',
    rockDeep: '#4a2418',
    flora: [
      ['birch', 0.5],
      ['pine', 0.2],
      ['rock', 0.3],
    ],
  },
  neon: {
    top: '#3b2f7a',
    rock: '#1f1b3d',
    rockDeep: '#0d0b1f',
    flora: [
      ['crystal', 0.7],
      ['rock', 0.3],
    ],
  },
  aurora: {
    top: '#e6f2f8',
    rock: '#51606f',
    rockDeep: '#27313b',
    flora: [
      ['snowpine', 0.6],
      ['ice', 0.25],
      ['rock', 0.15],
    ],
  },
  citadel: {
    top: '#3a2e25',
    rock: '#2a211b',
    rockDeep: '#120d0a',
    flora: [
      ['basalt', 0.5],
      ['crystal', 0.2],
      ['deadtree', 0.3],
    ],
  },
};

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function colored(g: THREE.BufferGeometry, fn: (y: number) => THREE.Color) {
  const geo = (g.index ? g.toNonIndexed() : g) as THREE.BufferGeometry;
  geo.deleteAttribute('uv');
  const pos = geo.getAttribute('position');
  const col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const c = fn(pos.getY(i));
    col.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}

/**
 * Floating sky islands around a campaign course: jagged rock undersides with grassy
 * (or snowy / crystal) tops and instanced flora. Placed clear of the track; one merged
 * mesh for all islands plus instanced props. Purely visual.
 */
export function CampaignWorld({
  level,
  preset,
  quality,
  cloudColor,
  cloudShade,
}: {
  level: LevelData;
  preset: SkyPreset;
  quality: GraphicsQuality;
  cloudColor: string;
  cloudShade: string;
}) {
  const style = STYLES[preset] ?? STYLES.day;
  const { geo, decor, puffs } = useMemo(() => {
    const rnd = rng(level.id * 7919 + 17);
    const solid = level.blocks.filter((b) => !b.decorative);
    const box = new THREE.Box3();
    for (const b of solid) box.expandByPoint(new THREE.Vector3(...b.position));
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const R = Math.max(size.x, size.z) / 2;
    const minY = box.min.y;
    const count = quality === 'low' ? 9 : quality === 'medium' ? 15 : 22;
    const parts: THREE.BufferGeometry[] = [];
    const decor: DecorInstance[] = [];
    const cTop = new THREE.Color(style.top);
    const cRock = new THREE.Color(style.rock);
    const cDeep = new THREE.Color(style.rockDeep);
    const tmpC = new THREE.Color();
    let guard = 0;
    let placed = 0;
    while (placed < count && guard++ < count * 30) {
      const ang = rnd() * Math.PI * 2;
      const dist = R + 30 + rnd() * 130;
      const x = center.x + Math.cos(ang) * dist;
      const z = center.z + Math.sin(ang) * dist;
      const r = 5 + rnd() * 11;
      const y = minY - 22 + rnd() * 40;
      // keep clear of the course
      let clear = true;
      for (const b of solid) {
        if (
          Math.hypot(b.position[0] - x, b.position[2] - z) <
          r + Math.max(b.size[0], b.size[2]) / 2 + 12
        ) {
          clear = false;
          break;
        }
      }
      if (!clear) continue;
      placed++;
      const depth = r * (1.4 + rnd() * 0.8);
      const segs = 9;
      const topGeo = new THREE.CylinderGeometry(r, r * 0.92, 1.4, segs, 1);
      topGeo.translate(0, -0.7, 0);
      const under = new THREE.ConeGeometry(r * 0.95, depth, segs, 3);
      under.rotateX(Math.PI);
      under.translate(0, -1.4 - depth / 2, 0);
      // jag the underside
      const up = under.getAttribute('position');
      for (let i = 0; i < up.count; i++) {
        const vy = up.getY(i);
        if (vy > -1.5) continue;
        const k = 0.75 + rnd() * 0.5;
        up.setX(i, up.getX(i) * k);
        up.setZ(i, up.getZ(i) * k);
        up.setY(i, vy + (rnd() - 0.5) * 1.5);
      }
      const island = mergeGeometries(
        [
          colored(topGeo, (vy) => (vy > -0.3 ? cTop : tmpC.copy(cTop).lerp(cRock, 0.6))),
          colored(under, (vy) => tmpC.copy(cRock).lerp(cDeep, Math.min(1, -vy / depth))),
        ],
        false,
      )!;
      island.rotateY(rnd() * Math.PI);
      island.translate(x, y, z);
      parts.push(island);
      // flora on top
      const n = Math.round(r * (quality === 'low' ? 0.6 : quality === 'medium' ? 1.2 : 1.8));
      for (let i = 0; i < n; i++) {
        const a = rnd() * Math.PI * 2;
        const d = Math.sqrt(rnd()) * (r - 1.5);
        let pick = rnd();
        let kind: DecorKind = style.flora[0][0];
        for (const [k, w] of style.flora) {
          if (pick < w) {
            kind = k;
            break;
          }
          pick -= w;
        }
        decor.push({
          kind,
          x: x + Math.cos(a) * d,
          y,
          z: z + Math.sin(a) * d,
          rotY: rnd() * 6.28,
          scale: kind === 'rock' ? 0.6 + rnd() * 1.2 : 0.8 + rnd() * 0.6,
          tint: 0.85 + rnd() * 0.3,
        });
      }
    }
    const geo = parts.length ? mergeGeometries(parts, false)! : new THREE.BufferGeometry();
    geo.computeVertexNormals();
    geo.computeBoundingSphere();
    // cumulus around and below the course
    const puffs: Puff[] = [];
    const np = quality === 'low' ? 14 : quality === 'medium' ? 26 : 38;
    for (let i = 0; i < np; i++) {
      const a = rnd() * Math.PI * 2;
      const d = R + 25 + rnd() * 170;
      puffs.push([
        center.x + Math.cos(a) * d,
        minY - 30 + rnd() * 50,
        center.z + Math.sin(a) * d,
        14 + rnd() * 26,
      ]);
    }
    return { geo, decor, puffs };
  }, [level, style, quality]);

  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true }),
    [],
  );
  useEffect(() => () => geo.dispose(), [geo]);

  return (
    <group>
      <mesh geometry={geo} material={mat} />
      <InstancedDecor
        items={decor}
        nearDist={quality === 'low' ? 60 : 110}
        farDist={400}
        chunk={200}
      />
      <CloudPuffs puffs={puffs} color={cloudColor} shade={cloudShade} opacity={0.85} />
    </group>
  );
}
