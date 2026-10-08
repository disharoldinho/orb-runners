#!/usr/bin/env node
/**
 * Campaign stage screenshots (headless Chrome, software WebGL).
 *   node scripts/autopilot/shots.mjs <outDir> <suffix> <stage...>
 * Writes <outDir>/<NN>-<suffix>.png (elevated 3/4 overview of the whole course, rendered with
 * the game's own scene) and <NN>-<suffix>-chase.png (the player's view at the start line).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const [outDir, suffix, ...ids] = process.argv.slice(2);
const stages = ids.map(Number);
const port = Number(process.env.SHOTS_PORT || 5852);
fs.mkdirSync(outDir, { recursive: true });

const { createServer } = await import(
  pathToFileURL(path.join(root, 'node_modules/vite/dist/node/index.js')).href
);
const vite = await createServer({
  root,
  configFile: path.join(root, 'vite.config.ts'),
  server: { port, strictPort: true, host: '127.0.0.1', hmr: false },
  logLevel: 'error',
});
await vite.listen();
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome',
  headless: true,
  args: [
    '--no-sandbox',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist',
    '--window-size=1280,720',
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
  ],
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

for (const id of stages) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  await page.evaluateOnNewDocument(() => localStorage.setItem('orb_runners_graphics_v1', 'medium'));
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => document.querySelector('#root')?.children.length > 0, {
    timeout: 120000,
  });
  await page.evaluate(async (stageId) => {
    const { useGameStore } = await import('/src/store/useGameStore.ts');
    useGameStore.getState().selectLevel(stageId);
  }, id);
  await page.waitForFunction(
    async () => {
      const { useGameStore } = await import('/src/store/useGameStore.ts');
      return useGameStore.getState().playPhase === 'playing';
    },
    { timeout: 120000, polling: 500 },
  );
  await sleep(2500);
  const nn = String(id).padStart(2, '0');
  await page.screenshot({ path: path.join(outDir, `${nn}-${suffix}-chase.png`) });
  const dataUrl = await page.evaluate(async (stageId) => {
    const fiberUrl = performance
      .getEntriesByType('resource')
      .map((e) => e.name)
      .find((n) => n.includes('/deps/@react-three_fiber.js'));
    const { _roots } = await import(fiberUrl);
    const THREE = await import(
      performance
        .getEntriesByType('resource')
        .map((e) => e.name)
        .find((n) => n.includes('/deps/three.js'))
    );
    const { getLevelById } = await import('/src/store/useGameStore.ts');
    const level = getLevelById(stageId);
    const canvas = document.querySelector('canvas');
    const st = _roots.get(canvas).store.getState();
    // course bounds from solid blocks + goal
    const box = new THREE.Box3();
    for (const b of level.blocks) {
      if (b.decorative) continue;
      const [x, y, z] = b.position;
      const [sx, sy, sz] = b.size;
      box.expandByPoint(new THREE.Vector3(x - sx / 2, y - sy / 2, z - sz / 2));
      box.expandByPoint(new THREE.Vector3(x + sx / 2, y + sy / 2, z + sz / 2));
    }
    for (const p of level.movingPlatforms ?? []) {
      box.expandByPoint(new THREE.Vector3(...p.start));
      box.expandByPoint(new THREE.Vector3(...p.end));
    }
    box.expandByPoint(new THREE.Vector3(...level.goalPosition));
    const c = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const span = Math.max(size.x, size.z, 20);
    const cam = new THREE.PerspectiveCamera(42, canvas.width / canvas.height, 0.5, 2000);
    // from behind the start, high and to the right, looking down the course
    const dir = new THREE.Vector3(0.55, 0.95, 0.75).normalize();
    cam.position.copy(c).addScaledVector(dir, span * 1.25);
    cam.lookAt(c);
    cam.updateProjectionMatrix();
    st.gl.render(st.scene, cam);
    return canvas.toDataURL('image/png');
  }, id);
  fs.writeFileSync(
    path.join(outDir, `${nn}-${suffix}.png`),
    Buffer.from(dataUrl.split(',')[1], 'base64'),
  );
  console.log(`stage ${id}: ok`);
  await ctx.close();
}
await browser.close();
await vite.close();
