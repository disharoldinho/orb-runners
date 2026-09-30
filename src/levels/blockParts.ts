import type { StaticBlockDef, Vec3 } from '../types/level';

/**
 * Box parts that make up a StaticBlock, in the block's local frame. Shared by the renderer
 * (components/obstacles/StaticBlock) and the map lint (scripts/checkMapVisuals.mjs), so the
 * lint always checks exactly what is drawn.
 *
 * COLLIDER parts are frozen: the fixed RigidBody derives its cuboid colliders from them, so
 * they must never change (physics, anti-skip). VISUAL parts are free to differ.
 */
export type BlockPartKind = 'body' | 'trim' | 'curb' | 'hull' | 'rail' | 'railGlow';

export interface BlockPart {
  kind: BlockPartKind;
  size: Vec3;
  offset: Vec3;
}

export const RAIL_THICKNESS = 0.24;
/** Visual-only inset (m) that keeps drawn rails/curbs off neighbouring blocks' planes. */
const VISUAL_INSET = 0.004;

function railParts(def: StaticBlockDef, side: -1 | 1): BlockPart[] {
  const [sx, sy, sz] = def.size;
  const h = def.railHeight ?? 0.45;
  const x = side * (sx / 2 - RAIL_THICKNESS / 2);
  return [
    { kind: 'rail', size: [RAIL_THICKNESS, h, sz], offset: [x, sy / 2 + h / 2, 0] },
    { kind: 'railGlow', size: [RAIL_THICKNESS * 0.6, 0.04, sz], offset: [x, sy / 2 + h + 0.02, 0] },
  ];
}

export function hasRail(def: StaticBlockDef, side: -1 | 1) {
  const r = def.rails ?? 'none';
  return r === 'both' || (side < 0 ? r === 'left' : r === 'right');
}

/** The original mesh list. Physics depends on it: do not edit. */
export function blockColliderParts(def: StaticBlockDef): BlockPart[] {
  const [sx, sy, sz] = def.size;
  const parts: BlockPart[] = [
    { kind: 'body', size: [sx, sy, sz], offset: [0, 0, 0] },
    { kind: 'trim', size: [sx + 0.1, 0.1, sz + 0.08], offset: [0, -sy * 0.2, 0] },
    { kind: 'curb', size: [0.18, 0.024, sz], offset: [-sx / 2 + 0.09, sy / 2 + 0.012, 0] },
    { kind: 'curb', size: [0.18, 0.024, sz], offset: [sx / 2 - 0.09, sy / 2 + 0.012, 0] },
    { kind: 'hull', size: [sx * 0.88, 0.34, sz * 0.94], offset: [0, -sy / 2 - 0.18, 0] },
  ];
  if (hasRail(def, -1)) parts.push(...railParts(def, -1));
  if (hasRail(def, 1)) parts.push(...railParts(def, 1));
  return parts;
}

/**
 * What is drawn. Same silhouette as the collider list, minus its self-overlaps:
 *  - no curb strip under a rail (the curb's outer and end faces sat exactly on the rail's
 *    faces and z-fought along every railed edge),
 *  - the glow trim is split into side and end strips that stop 5 cm short of the corners
 *    and straddle the block's faces (half embedded), so no trim face lies on the joint
 *    plane of an abutting block and trims of neighbours never overlap.
 */
export function blockVisualParts(def: StaticBlockDef): BlockPart[] {
  const [sx, sy, sz] = def.size;
  const ty = -sy * 0.2;
  const parts: BlockPart[] = [
    { kind: 'body', size: [sx, sy, sz], offset: [0, 0, 0] },
    { kind: 'trim', size: [0.05, 0.1, Math.max(0.05, sz - 0.1)], offset: [-sx / 2, ty, 0] },
    { kind: 'trim', size: [0.05, 0.1, Math.max(0.05, sz - 0.1)], offset: [sx / 2, ty, 0] },
    { kind: 'trim', size: [Math.max(0.05, sx - 0.1), 0.1, 0.04], offset: [0, ty, -sz / 2] },
    { kind: 'trim', size: [Math.max(0.05, sx - 0.1), 0.1, 0.04], offset: [0, ty, sz / 2] },
    { kind: 'hull', size: [sx * 0.88, 0.34, sz * 0.94], offset: [0, -sy / 2 - 0.18, 0] },
  ];
  for (const side of [-1, 1] as const) {
    if (hasRail(def, side)) {
      // drawn rail sits 4 mm inside the deck edge so walls built flush against the deck
      // (and their trims) never share its outer plane
      for (const p of railParts(def, side)) {
        const w = p.size[0] - VISUAL_INSET;
        parts.push({
          ...p,
          size: [w, p.size[1], p.size[2]],
          offset: [p.offset[0] - side * (VISUAL_INSET / 2), p.offset[1], p.offset[2]],
        });
      }
    } else {
      const w = 0.18 - 2 * VISUAL_INSET;
      parts.push({
        kind: 'curb',
        size: [w, 0.024, sz],
        offset: [side * (sx / 2 - 2 * VISUAL_INSET - w / 2), sy / 2 + 0.012, 0],
      });
    }
  }
  return parts;
}
