import type { LevelData, StaticBlockDef } from '../types/level';
import { BlockPartKind, blockVisualParts } from './blockParts';
import { aabbOverlap, boxPart, coplanarOverlap, Face, objectMatrix, Part } from './faceGeometry';

/**
 * Depth-bias layers for blocks whose drawn parts genuinely share a surface with another
 * block (a camp plaza and the road piece running onto it, a wall flush with a railed deck,
 * a sunk pad block, ...). Moving those would change colliders, so instead one of the two is
 * drawn with a small polygonOffset and wins the depth test cleanly. Coplanar faces that
 * render identically (same material and, for the patterned body, the same world-anchored
 * pattern) need no bias. Everything else stays at layer 0 (no polygonOffset).
 */
export const COPLANAR_EPS = 0.003;
export const MIN_OVERLAP_M2 = 0.0025;

export function isHiddenBlock(id: string) {
  return id.startsWith('sum-core') || /^sum-s9-decor-/.test(id);
}

const NATURAL = new Set(['citadel', 'storm', 'forest', 'sand', 'crystal', 'ice', 'lava', 'cloud']);

function sameFrame(a: StaticBlockDef, b: StaticBlockDef) {
  const ra = a.rotation ?? [0, 0, 0];
  const rb = b.rotation ?? [0, 0, 0];
  return ra.every((v, i) => Math.abs(v - rb[i]) < 1e-6);
}

export function rendersIdentically(a: StaticBlockDef, b: StaticBlockDef) {
  return (
    (a.theme ?? 'meadow') === (b.theme ?? 'meadow') &&
    (a.surface ?? 'normal') === (b.surface ?? 'normal') &&
    sameFrame(a, b)
  );
}

/**
 * True if two coplanar faces of block parts produce the same pixels, so their overlap cannot
 * be seen. `worldAnchored` = the body pattern is anchored to the block frame's world
 * position (current renderer) rather than restarting in each block (legacy renderer).
 */
export function facesRenderIdentically(
  a: StaticBlockDef,
  ak: BlockPartKind,
  fa: Face,
  b: StaticBlockDef,
  bk: BlockPartKind,
  fb: Face,
  worldAnchored: boolean,
) {
  if (ak !== bk) return false;
  const theme = (x: StaticBlockDef) => x.theme ?? 'meadow';
  const patterned = ak === 'body' || (ak === 'hull' && NATURAL.has(theme(a)));
  if (!patterned) return theme(a) === theme(b);
  if (!worldAnchored || !rendersIdentically(a, b)) return false;
  const top = fa.axis === 1 && fa.sign === 1 && fb.axis === 1 && fb.sign === 1;
  if (ak === 'body' && top) return true;
  // side lips / strata follow each face's own height range
  return Math.abs(a.position[1] - b.position[1]) < 1e-4 && Math.abs(a.size[1] - b.size[1]) < 1e-4;
}

export interface LookPart extends Part {
  kind: BlockPartKind;
  block: number;
}

export function blockLookParts(blocks: StaticBlockDef[]): LookPart[] {
  const out: LookPart[] = [];
  blocks.forEach((b, i) => {
    const m = objectMatrix(b.position, b.rotation);
    for (const p of blockVisualParts(b))
      out.push({ ...boxPart(m, p.offset, p.size), kind: p.kind, block: i });
  });
  return out;
}

export interface PartConflict {
  a: LookPart;
  b: LookPart;
  area: number;
  at: Face;
}

/** Visibly z-fighting face pairs between parts of different blocks. */
export function findPartConflicts(
  blocks: StaticBlockDef[],
  parts: LookPart[],
  worldAnchored = true,
): PartConflict[] {
  const order = parts.map((_, i) => i).sort((i, j) => parts[i].min.x - parts[j].min.x);
  const out: PartConflict[] = [];
  for (let oi = 0; oi < order.length; oi++) {
    const A = parts[order[oi]];
    for (let oj = oi + 1; oj < order.length; oj++) {
      const B = parts[order[oj]];
      if (B.min.x > A.max.x + 0.01) break;
      if (A.block === B.block || !aabbOverlap(A, B)) continue;
      let area = 0;
      let at: Face | null = null;
      for (const fa of A.faces)
        for (const fb of B.faces) {
          const ov = coplanarOverlap(fa, fb, COPLANAR_EPS);
          if (ov < MIN_OVERLAP_M2) continue;
          const ba = blocks[A.block];
          const bb = blocks[B.block];
          if (facesRenderIdentically(ba, A.kind, fa, bb, B.kind, fb, worldAnchored)) continue;
          area += ov;
          at = at ?? fa;
        }
      if (at && area >= MIN_OVERLAP_M2) out.push({ a: A, b: B, area, at });
    }
  }
  return out;
}

const cache = new WeakMap<LevelData, Map<string, number>>();

/** Block id -> layer (absent = 0, no bias). Larger decks stay at 0; the smaller piece is lifted. */
export function getBlockLayers(level: LevelData): Map<string, number> {
  const hit = cache.get(level);
  if (hit) return hit;
  const blocks = level.blocks.filter((b) => !isHiddenBlock(b.id));
  const conflicts = findPartConflicts(blocks, blockLookParts(blocks));
  const nbrs = new Map<number, Set<number>>();
  for (const c of conflicts) {
    if (!nbrs.has(c.a.block)) nbrs.set(c.a.block, new Set());
    if (!nbrs.has(c.b.block)) nbrs.set(c.b.block, new Set());
    nbrs.get(c.a.block)!.add(c.b.block);
    nbrs.get(c.b.block)!.add(c.a.block);
  }
  const areaOf = (b: StaticBlockDef) => b.size[0] * b.size[2];
  const idx = [...nbrs.keys()].sort((i, j) => areaOf(blocks[j]) - areaOf(blocks[i]) || i - j);
  const layer = new Map<number, number>();
  for (const i of idx) {
    const used = new Set([...nbrs.get(i)!].filter((j) => layer.has(j)).map((j) => layer.get(j)));
    let l = 0;
    while (used.has(l)) l++;
    layer.set(i, l);
  }
  const out = new Map<string, number>();
  layer.forEach((l, i) => {
    if (l > 0) out.set(blocks[i].id, l);
  });
  cache.set(level, out);
  return out;
}

/** Block layers never exceed this in the shipped maps (the lint enforces it). */
export const MAX_LAYER = 2;
/** Moving platforms dock flush with decks: they always draw in front of block layers. */
export const PLATFORM_LAYER = 3;
