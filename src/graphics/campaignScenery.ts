import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { LevelData } from '../types/level';
import type { GraphicsQuality } from './quality';
import { DECOR_RADIUS, makeSpacing } from './decorGeometry';
import type { DecorInstance, DecorKind, Puff } from './decorGeometry';

/**
 * Campaign scenery (floating islands, their flora, cumulus). Pure data + geometry, no React,
 * so the map lint (scripts/checkMapVisuals.mjs) checks exactly what the game draws.
 */

export interface IslandStyle {
  top: string;
  rock: string;
  rockDeep: string;
  flora: [DecorKind, number][];
}

export const CAMPAIGN_STYLES: Record<string, IslandStyle> = {
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

/** Vertex colours by height. Keeps the geometry indexed so it can be smooth-shaded. */
function colored(g: THREE.BufferGeometry, fn: (y: number) => THREE.Color) {
  const geo = g;
  geo.deleteAttribute('uv');
  geo.deleteAttribute('normal');
  const pos = geo.getAttribute('position');
  const col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const c = fn(pos.getY(i));
    col.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}

export function buildCampaignScenery(
  level: LevelData,
  style: IslandStyle,
  quality: GraphicsQuality,
) {
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
  const islands: { x: number; y: number; z: number; r: number }[] = [];
  const cTop = new THREE.Color(style.top);
  const cRock = new THREE.Color(style.rock);
  const cDeep = new THREE.Color(style.rockDeep);
  const tmpC = new THREE.Color();
  let guard = 0;
  const spacing = makeSpacing(0.5);
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
    // three r169's ConeGeometry (radiusTop 0) drops one triangle of every quad in every row
    // when heightSegments > 1, so the old undersides were half holes (the sky showed through
    // as white shards). A cylinder with a 5 cm tip keeps every face. Weld it before jagging:
    // its UV seam is a duplicated vertex column that used to tear open.
    const cone = new THREE.CylinderGeometry(0.05, r * 0.95, depth, segs, 3);
    cone.deleteAttribute('uv');
    cone.deleteAttribute('normal');
    const under = mergeVertices(cone);
    under.rotateX(Math.PI);
    under.translate(0, -1.4 - depth / 2, 0);
    // gentle jag of the underside (the old +-25% / 1.5 m jitter read as noisy shards)
    const up = under.getAttribute('position');
    for (let i = 0; i < up.count; i++) {
      const vy = up.getY(i);
      if (vy > -1.5) continue;
      const k = 0.86 + rnd() * 0.28;
      up.setX(i, up.getX(i) * k);
      up.setZ(i, up.getZ(i) * k);
      up.setY(i, vy + (rnd() - 0.5) * 0.8);
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
      let pick = rnd();
      let kind: DecorKind = style.flora[0][0];
      for (const [k, w] of style.flora) {
        if (pick < w) {
          kind = k;
          break;
        }
        pick -= w;
      }
      const scale = kind === 'rock' ? 0.6 + rnd() * 1.2 : 0.8 + rnd() * 0.6;
      const rotY = rnd() * 6.28;
      const tint = 0.85 + rnd() * 0.3;
      // stay on the (9-sided) island top, and out of the other props
      const maxD = r * Math.cos(Math.PI / 9) - DECOR_RADIUS[kind] * scale * 0.7;
      if (maxD <= 0) continue;
      for (let tries = 0; tries < 5; tries++) {
        const a = rnd() * Math.PI * 2;
        const d = Math.sqrt(rnd()) * maxD;
        const px = x + Math.cos(a) * d;
        const pz = z + Math.sin(a) * d;
        if (!spacing.fits(kind, px, pz, scale)) continue;
        spacing.add(kind, px, pz, scale);
        decor.push({ kind, x: px, y, z: pz, rotY, scale, tint });
        break;
      }
    }
  }
  const geo = parts.length ? mergeGeometries(parts, false)! : new THREE.BufferGeometry();
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  // cumulus around and below the course
  const puffs: Puff[] = [];
  const np = quality === 'low' ? 14 : quality === 'medium' ? 26 : 38;
  // Billboards are depth-tested flat quads: one that crosses the course (or an island) cuts a
  // hard line through it, so puffs are kept clear of both.
  const solids = solid.map((b) => ({ p: b.position, r: Math.hypot(...b.size) / 2 + 2 }));
  const blocked = (px: number, py: number, pz: number, s: number) =>
    solids.some(
      (o) =>
        Math.abs(o.p[0] - px) < 0.8 * s + o.r &&
        Math.abs(o.p[2] - pz) < 0.8 * s + o.r &&
        Math.abs(o.p[1] - py) < 0.5 * s + o.r,
    ) ||
    islands.some(
      (i) =>
        Math.hypot(i.x - px, i.z - pz) < i.r + 0.6 * s &&
        py + 0.5 * s > i.y - i.r * 2.2 - 2 &&
        py - 0.5 * s < i.y + 7,
    );
  for (let i = 0, tries = 0; i < np && tries < np * 12; tries++) {
    const a = rnd() * Math.PI * 2;
    const d = R + 25 + rnd() * 170;
    const p: Puff = [
      center.x + Math.cos(a) * d,
      minY - 30 + rnd() * 50,
      center.z + Math.sin(a) * d,
      14 + rnd() * 26,
    ];
    if (blocked(p[0], p[1], p[2], p[3])) continue;
    puffs.push(p);
    i++;
  }
  return { geo, decor, puffs, islands };
}
