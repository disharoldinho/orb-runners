// Bundles src/levels/summitMap.ts (with three) via esbuild and imports it, so
// Node scripts use exactly the same level data as the game.
import { build } from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export async function loadSummit() {
  const result = await build({
    entryPoints: [path.join(root, 'src/levels/summitMap.ts')],
    bundle: true,
    format: 'esm',
    platform: 'node',
    write: false,
    logLevel: 'silent',
  });
  const code = result.outputFiles[0].text;
  return import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
}
