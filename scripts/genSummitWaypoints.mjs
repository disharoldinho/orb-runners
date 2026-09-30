// Regenerates server/summitWaypoints.json from src/levels/summitMap.ts so the server-side
// AI Climber Bots follow exactly the same spiral route players ride.
// Run after every change to summitMap.ts:  npm run summit:waypoints
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSummit } from './loadSummit.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const m = await loadSummit();
const waypoints = m.SUMMIT_BOT_WAYPOINTS.map((p) => p.map((n) => Math.round(n * 100) / 100));
let length = 0;
for (let i = 1; i < waypoints.length; i++) {
  const [a, b] = [waypoints[i - 1], waypoints[i]];
  length += Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
}
const out = {
  generatedFrom: 'src/levels/summitMap.ts',
  targetAltitudeM: m.SUMMIT_TARGET_ALTITUDE_M,
  routeLengthM: Math.round(length),
  // Base Camp altitudes (stage boundaries), useful for bot status / debugging.
  campAltitudesM: m.SUMMIT_PHASES.slice(1).map((p) => p.minAltitudeM),
  waypoints,
};
const file = path.join(root, 'server', 'summitWaypoints.json');
fs.writeFileSync(file, JSON.stringify(out) + '\n');
console.log(
  `wrote ${path.relative(root, file)}: ${waypoints.length} waypoints, ${out.routeLengthM} m`,
);
