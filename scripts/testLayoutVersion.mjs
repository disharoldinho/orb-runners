// Unit checks for src/store/layoutVersion.ts (stale PB / ghost handling for rebuilt stages).
//   node scripts/testLayoutVersion.mjs
import { build } from 'esbuild';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = await build({
  entryPoints: [path.join(root, 'src/store/layoutVersion.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
  logLevel: 'silent',
});
const L = await import(
  'data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64')
);

const versions = { 1: 1, 2: 2, 3: 2 };
const versionOf = (id) => versions[id];

// progress
{
  const stored = {
    1: { bestTimeMs: 8000, medal: 'author', clears: 3 }, // v1 stage, v1 record: untouched
    2: { bestTimeMs: 9000, medal: 'gold', clears: 5, bestCheckpointSplitsMs: { a: 1 } }, // rebuilt
    3: { bestTimeMs: 21000, medal: 'silver', clears: 1, layoutVersion: 2 }, // already current
    77: { bestTimeMs: 1, medal: 'bronze', clears: 1 }, // unknown id: untouched
  };
  const { progress, migrated } = L.migrateProgress(stored, versionOf);
  assert.deepEqual(migrated, [2]);
  assert.deepEqual(progress[1], stored[1]);
  assert.deepEqual(progress[3], stored[3]);
  assert.deepEqual(progress[77], stored[77]);
  assert.deepEqual(progress[2], {
    bestTimeMs: null,
    medal: 'none',
    clears: 0,
    layoutVersion: 2,
    legacy: {
      layoutVersion: 1,
      bestTimeMs: 9000,
      medal: 'gold',
      clears: 5,
      bestCheckpointSplitsMs: { a: 1 },
    },
  });
  // idempotent
  assert.deepEqual(L.migrateProgress(progress, versionOf).progress, progress);
  // counted medal keeps the unlock
  assert.equal(L.countedMedal(progress[2]), 'gold');
  // a new-layout medal better than legacy wins; worse keeps legacy
  assert.equal(L.countedMedal({ ...progress[2], medal: 'author' }), 'author');
  assert.equal(L.countedMedal({ ...progress[2], medal: 'bronze' }), 'gold');
  // a second rebuild folds the best medal of all earlier layouts into legacy
  const again = L.migrateProgress(
    {
      2: {
        bestTimeMs: 30000,
        medal: 'bronze',
        clears: 2,
        layoutVersion: 2,
        legacy: progress[2].legacy,
      },
    },
    () => 3,
  ).progress[2];
  assert.equal(again.legacy.medal, 'gold');
  assert.equal(again.legacy.layoutVersion, 2);
  assert.equal(again.legacy.bestTimeMs, 30000);
  assert.equal(again.legacy.clears, 7);
  // an untouched entry on a rebuilt stage keeps no empty legacy
  assert.deepEqual(
    L.migrateProgress({ 2: { bestTimeMs: null, medal: 'none', clears: 0 } }, versionOf).progress[2],
    {
      bestTimeMs: null,
      medal: 'none',
      clears: 0,
      layoutVersion: 2,
    },
  );
}

// ghosts
{
  const g = (t, v) => ({
    bestTimeMs: t,
    avatar: {},
    frames: [],
    ...(v ? { layoutVersion: v } : {}),
  });
  const stored = { 1: g(8000), 2: g(9000), 3: g(20000, 2) };
  const archive = { '2@v1': g(9500) };
  const r = L.partitionGhosts(stored, archive, versionOf);
  assert.deepEqual(Object.keys(r.ghosts).sort(), ['1', '3']);
  assert.deepEqual(r.archived, [2]);
  assert.equal(r.archive['2@v1'].bestTimeMs, 9000); // faster one kept
  const r2 = L.partitionGhosts({ 2: g(9900) }, r.archive, versionOf);
  assert.equal(r2.archive['2@v1'].bestTimeMs, 9000);
}
console.log('layoutVersion: all checks passed');
