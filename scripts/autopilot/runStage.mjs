#!/usr/bin/env node
/**
 * Campaign autopilot: drives the real game (Vite dev build, headless Chrome) along a scripted
 * racing line and reports the run time the game itself measured.
 *
 *   node scripts/autopilot/runStage.mjs <stage...> [--profile author|steady|all] [--runs N]
 *        [--json out.json] [--shot dir]
 *
 * How it stays faithful: scripts/autopilot/simClock.js gives the page a virtual 60 fps clock
 * (every frame advances time by exactly 1/60 s, regardless of how slow software rendering
 * is), and the pilot only moves the on-screen joystick input (touchInput), so steering goes
 * through TiltController's smoothing, the chase camera, Rapier (fixed 1/120 s steps) and the
 * store's run timer (simulated time minus gem bonuses) exactly as for a player at 60 fps.
 * Routes and pilot profiles live in scripts/autopilot/routes.mjs.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';
import { ROUTES, PROFILES } from './routes.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};
const stages = args.filter((a, i) => /^\d+$/.test(a) && !args[i - 1]?.startsWith('--')).map(Number);
const profileArg = opt('profile', 'all');
const runs = Number(opt('runs', 1));
const jsonOut = opt('json', null);
const chrome = process.env.CHROME_PATH || '/usr/bin/google-chrome';
const port = Number(process.env.AUTOPILOT_PORT || 5851);

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
  executablePath: chrome,
  headless: true,
  args: [
    '--no-sandbox',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist',
    '--window-size=480,320',
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows',
  ],
});
const simClock = fs.readFileSync(path.join(here, 'simClock.js'), 'utf8');
const pilotSrc = fs.readFileSync(path.join(here, 'pilot.js'), 'utf8');

async function runOnce(stageId, route, profile) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message || e)));
  await page.setViewport({ width: 480, height: 320 });
  await page.evaluateOnNewDocument(simClock);
  await page.evaluateOnNewDocument(() => {
    try {
      localStorage.setItem('orb_runners_graphics_v1', 'low');
    } catch {}
  });
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => document.querySelector('#root')?.children.length > 0, {
    timeout: 120000,
  });
  await page.evaluate(pilotSrc);
  await page.evaluate((id, r, o) => window.__startPilot(id, r, o), stageId, route, profile);
  const t0 = Date.now();
  let res = null;
  while (Date.now() - t0 < 15 * 60 * 1000) {
    await new Promise((r) => setTimeout(r, 1000));
    res = await page.evaluate(() => (window.__pilotResult?.done ? window.__pilotResult : null));
    if (res) break;
  }
  await ctx.close();
  if (!res) res = { done: false, success: false, reason: 'harness timeout' };
  res.realS = Math.round((Date.now() - t0) / 1000);
  res.errors = errors.slice(0, 3);
  return res;
}

const report = [];
for (const stageId of stages) {
  const route = ROUTES[stageId];
  if (!route) {
    console.log(`stage ${stageId}: no route`);
    continue;
  }
  const profiles = profileArg === 'all' ? Object.keys(PROFILES) : profileArg.split(',');
  for (const pname of profiles) {
    const variants = pname === 'author' ? (route.variants ?? [{}]) : [{}];
    for (const variant of variants) {
      for (let i = 0; i < runs; i++) {
        // variants (author line sweeps) scale the profile's pace rather than replace it
        const base = { ...PROFILES[pname], ...(route.profiles?.[pname] ?? {}) };
        const profile = {
          ...base,
          ...variant,
          speedScale: (base.speedScale ?? 1) * (variant.speedScale ?? 1),
        };
        const r = await runOnce(stageId, route, profile);
        const line = {
          stage: stageId,
          profile: pname,
          variant: variant.name ?? '',
          success: r.success,
          timeMs: r.elapsedMs,
          runClockMs: r.runClockMs,
          gems: r.gems !== undefined ? `${r.gems}/${r.totalGems ?? '?'}` : undefined,
          checkpoints: r.checkpoints,
          missedGems: r.missedGems?.length ? r.missedGems : undefined,
          bumps: r.bumps,
          saved: r.saved ?? undefined,
          falls: r.falls,
          simS: r.simS,
          reason: r.reason,
          pos: r.pos,
          realS: r.realS,
          errors: r.errors,
        };
        report.push({ ...line, trace: r.trace });
        console.log(JSON.stringify(line));
      }
    }
  }
}
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(report, null, 1));
await browser.close();
await vite.close();
