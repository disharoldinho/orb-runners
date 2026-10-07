import type { GhostFrame } from '../../types/game';

/** Frames (20 Hz) searched behind / ahead of the last match: 1 s back, 4 s forward. */
const SEARCH_BACK = 20;
const SEARCH_AHEAD = 80;

/** Past this distance from the ghost's line the PB comparison is meaningless, so hide it. */
export const GHOST_MATCH_MAX_DIST = 8;

/** A match this close to the previous one is trusted without checking the whole line. */
const LOCAL_TRUST_DIST = 3;

export interface GhostProgressMatch {
  /** Ghost timestamp (its own clock) at the point of its line closest to the player. */
  timeMs: number;
  /** Segment index (frames[index] -> frames[index + 1]); pass back as the next hint. */
  index: number;
  /** 3D distance from the player to that point, in metres. */
  distance: number;
}

function scan(
  frames: GhostFrame[],
  lo: number,
  hi: number,
  px: number,
  py: number,
  pz: number,
): GhostProgressMatch | null {
  let best: GhostProgressMatch | null = null;
  let bestD2 = Infinity;
  for (let i = lo; i <= hi; i++) {
    const a = frames[i];
    const b = frames[i + 1];
    const sx = b[1] - a[1];
    const sy = b[2] - a[2];
    const sz = b[3] - a[3];
    const len2 = sx * sx + sy * sy + sz * sz;
    let t = len2 > 1e-9 ? ((px - a[1]) * sx + (py - a[2]) * sy + (pz - a[3]) * sz) / len2 : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const dx = a[1] + sx * t - px;
    const dy = a[2] + sy * t - py;
    const dz = a[3] + sz * t - pz;
    const d2 = dx * dx + dy * dy + dz * dz;
    if (d2 < bestD2) {
      bestD2 = d2;
      best = { timeMs: a[0] + (b[0] - a[0]) * t, index: i, distance: 0 };
    }
  }
  if (best) best.distance = Math.sqrt(bestD2);
  return best;
}

/**
 * Where along the PB ghost's recorded line the player currently is.
 *
 * Searches a short window around the previous match first, so loops, hairpins and the
 * Summit spiral can't match a spot the ghost passed much earlier or later. Falls back to
 * the whole line when the player is more than a few metres from that window (checkpoint
 * respawn, shortcut).
 */
export function matchGhostProgress(
  frames: GhostFrame[],
  px: number,
  py: number,
  pz: number,
  hintIndex: number,
): GhostProgressMatch | null {
  const lastSeg = frames.length - 2;
  if (lastSeg < 0) return null;
  const hint = Math.min(Math.max(0, Math.floor(hintIndex)), lastSeg);
  const local = scan(
    frames,
    Math.max(0, hint - SEARCH_BACK),
    Math.min(lastSeg, hint + SEARCH_AHEAD),
    px,
    py,
    pz,
  );
  if (local && local.distance <= LOCAL_TRUST_DIST) return local;
  const global = scan(frames, 0, lastSeg, px, py, pz);
  return global && local && local.distance <= global.distance ? local : global;
}
