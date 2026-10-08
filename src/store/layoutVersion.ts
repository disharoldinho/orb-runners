import type { GhostReplayData, LegacyLevelProgress, LevelProgress, MedalTier } from '../types/game';

/**
 * Stage layout versions vs saved records.
 *
 * When a stage is rebuilt its `layoutVersion` is bumped. Personal bests, medals, splits and
 * ghosts recorded on another layout are then not comparable (the course is different), but
 * players earned them, so nothing is deleted:
 *  - progress: the old entry moves to `legacy` and the stage starts fresh (no PB, no medal
 *    shown, no split comparison). Medal counts (cosmetic unlocks) still credit the best of
 *    the current and legacy medal, so an unlock is never revoked.
 *  - ghosts: an old-layout ghost is moved to a separate archive storage key and is no longer
 *    raced or used for splits.
 * Migration is a pure function of the stored data and the map list, so it is recomputed on
 * every load and is idempotent.
 */

export const MEDAL_RANK: Record<MedalTier, number> = {
  none: 0,
  bronze: 1,
  silver: 2,
  gold: 3,
  author: 4,
};

export const bestMedal = (a: MedalTier, b: MedalTier): MedalTier =>
  MEDAL_RANK[b] > MEDAL_RANK[a] ? b : a;

/** Layout version of a stage (missing = 1). `undefined` level = unknown id. */
export const layoutVersionOf = (level: { layoutVersion?: number } | undefined): number =>
  level?.layoutVersion ?? 1;

/** Medal that counts toward unlocks: best of the current layout and any earlier layout. */
export const countedMedal = (p: LevelProgress): MedalTier =>
  bestMedal(p.medal, p.legacy?.medal ?? 'none');

type VersionLookup = (levelId: number) => number | undefined;

/**
 * Re-bases every progress entry recorded on a different layout version. Unknown level ids
 * (lookup returns undefined) are left untouched.
 */
export function migrateProgress(
  progress: Record<number, LevelProgress>,
  versionOf: VersionLookup,
): { progress: Record<number, LevelProgress>; migrated: number[] } {
  const out: Record<number, LevelProgress> = {};
  const migrated: number[] = [];
  for (const [key, entry] of Object.entries(progress ?? {})) {
    const id = Number(key);
    const current = versionOf(id);
    const recorded = entry?.layoutVersion ?? 1;
    if (!entry || current === undefined || recorded === current) {
      out[id] = entry;
      continue;
    }
    const hadRecords = entry.bestTimeMs !== null || entry.clears > 0 || entry.medal !== 'none';
    let legacy: LegacyLevelProgress | undefined = entry.legacy;
    if (hadRecords) {
      legacy = {
        layoutVersion: recorded,
        bestTimeMs: entry.bestTimeMs,
        medal: bestMedal(entry.medal, entry.legacy?.medal ?? 'none'),
        clears: entry.clears + (entry.legacy?.clears ?? 0),
        ...(entry.bestCheckpointSplitsMs
          ? { bestCheckpointSplitsMs: entry.bestCheckpointSplitsMs }
          : {}),
      };
    }
    out[id] = {
      bestTimeMs: null,
      medal: 'none',
      clears: 0,
      layoutVersion: current,
      ...(legacy ? { legacy } : {}),
    };
    migrated.push(id);
  }
  return { progress: out, migrated };
}

/** Archive key for a ghost: `<levelId>@v<layoutVersion>`. */
export const ghostArchiveKey = (levelId: number, version: number) => `${levelId}@v${version}`;

/**
 * Splits ghosts into ones recorded on the current layout and stale ones (merged into the
 * archive, keeping the faster ghost per level+version).
 */
export function partitionGhosts(
  ghosts: Record<number, GhostReplayData>,
  archive: Record<string, GhostReplayData>,
  versionOf: VersionLookup,
): {
  ghosts: Record<number, GhostReplayData>;
  archive: Record<string, GhostReplayData>;
  archived: number[];
} {
  const current: Record<number, GhostReplayData> = {};
  const nextArchive: Record<string, GhostReplayData> = { ...(archive ?? {}) };
  const archived: number[] = [];
  for (const [key, ghost] of Object.entries(ghosts ?? {})) {
    const id = Number(key);
    const version = versionOf(id);
    const recorded = ghost?.layoutVersion ?? 1;
    if (!ghost || version === undefined || recorded === version) {
      current[id] = ghost;
      continue;
    }
    const k = ghostArchiveKey(id, recorded);
    const prev = nextArchive[k];
    if (!prev || ghost.bestTimeMs < prev.bestTimeMs) nextArchive[k] = ghost;
    archived.push(id);
  }
  return { ghosts: current, archive: nextArchive, archived };
}
