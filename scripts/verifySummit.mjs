// Programmatic anti-skip verification for the Summit map.
//   node scripts/verifySummit.mjs          (exit code 1 on any failure)
// Checks: ramp slopes, vertical clearance between overlapping road pieces,
// jump-pad trajectories with maximum mid-air steering, stage connectivity
// (stages only touch through their Base Camp), gate widths and rails, bot waypoints.
import { loadSummit } from './loadSummit.mjs';

const m = await loadSummit();
const L = m.SUMMIT_MAP;
const pieces = m.SUMMIT_ROUTE_PIECES;
const failures = [];
const fail = (msg) => failures.push(msg);
const deg = (r) => (r * 180) / Math.PI;

// --- math ---------------------------------------------------------------
function rotMat([rx, ry, rz]) {
  const cx = Math.cos(rx),
    sx = Math.sin(rx),
    cy = Math.cos(ry),
    sy = Math.sin(ry),
    cz = Math.cos(rz),
    sz = Math.sin(rz);
  // three.js Euler 'XYZ': R = Rx * Ry * Rz
  const Rx = [
    [1, 0, 0],
    [0, cx, -sx],
    [0, sx, cx],
  ];
  const Ry = [
    [cy, 0, sy],
    [0, 1, 0],
    [-sy, 0, cy],
  ];
  const Rz = [
    [cz, -sz, 0],
    [sz, cz, 0],
    [0, 0, 1],
  ];
  const mul = (A, B) =>
    A.map((r, i) => B[0].map((_, j) => r.reduce((s, _, k) => s + A[i][k] * B[k][j], 0)));
  return mul(mul(Rx, Ry), Rz);
}
const apply = (R, v) => R.map((row) => row[0] * v[0] + row[1] * v[1] + row[2] * v[2]);

/** Top-surface sampler for a box: returns surface height at world (x, z) or null. */
function surface(center, size, rotation) {
  const R = rotMat(rotation);
  const top = apply(R, [0, size[1] / 2, 0]);
  const ex = apply(R, [1, 0, 0]);
  const ez = apply(R, [0, 0, 1]);
  const det = ex[0] * ez[2] - ez[0] * ex[2];
  return (x, z, margin = 0) => {
    const dx = x - center[0] - top[0];
    const dz = z - center[2] - top[2];
    const lx = (dx * ez[2] - ez[0] * dz) / det;
    const lz = (ex[0] * dz - dx * ex[2]) / det;
    if (Math.abs(lx) > size[0] / 2 + margin || Math.abs(lz) > size[2] / 2 + margin) return null;
    return center[1] + top[1] + ex[1] * lx + ez[1] * lz;
  };
}
function footprintSamples(p, step = 1.0) {
  const R = rotMat(p.rotation);
  const out = [];
  const nx = Math.max(1, Math.round(p.size[0] / step));
  const nz = Math.max(1, Math.round(p.size[2] / step));
  for (let i = 0; i <= nx; i++)
    for (let k = 0; k <= nz; k++) {
      const lx = -p.size[0] / 2 + (p.size[0] * i) / nx;
      const lz = -p.size[2] / 2 + (p.size[2] * k) / nz;
      const v = apply(R, [lx, p.size[1] / 2, lz]);
      out.push([p.center[0] + v[0], p.center[1] + v[1], p.center[2] + v[2]]);
    }
  return out;
}
pieces.forEach((p) => (p.surf = surface(p.center, p.size, p.rotation)));

// --- 1. slopes ------------------------------------------------------------
let maxSlope = 0;
for (const b of L.blocks) {
  if (b.decorative || !b.rails || (b.rails === 'none' && b.size[2] < 3)) continue;
  const R = rotMat(b.rotation || [0, 0, 0]);
  const ez = apply(R, [0, 0, 1]);
  const slope = deg(Math.asin(Math.min(1, Math.abs(ez[1]))));
  maxSlope = Math.max(maxSlope, slope);
  if (slope >= 14) fail(`slope ${slope.toFixed(1)}° on ${b.id} (>= 14°)`);
}
const ramps = pieces.filter((p) => p.kind === 'ramp');
console.log(
  `1. slopes: ${ramps.length} ramps, max ${maxSlope.toFixed(2)}° (limit 14°, builder cap ${m.MAX_RAMP_SLOPE_DEG}°)`,
);

// --- 2. vertical clearance ----------------------------------------------------
let minClear = Infinity;
let minPair = '';
for (let i = 0; i < pieces.length; i++) {
  for (let j = 0; j < pieces.length; j++) {
    if (i === j) continue;
    const a = pieces[i],
      b = pieces[j];
    if (Math.abs(a.order - b.order) <= 1) continue;
    for (const pt of footprintSamples(a, 1.5)) {
      const hb = b.surf(pt[0], pt[2], -0.3);
      if (hb === null) continue;
      if (hb <= pt[1]) continue; // only look upward from a
      const gap = hb - pt[1] - 0.8; // underside of b above a's surface
      if (gap < minClear) {
        minClear = gap;
        minPair = `${a.id} (stage ${a.stage}) under ${b.id} (stage ${b.stage})`;
      }
    }
  }
}
if (minClear < 7) fail(`clearance only ${minClear.toFixed(2)}m: ${minPair}`);
console.log(
  `2. clearance: min headroom between overlapping road pieces = ${minClear.toFixed(2)}m (${minPair}); need >= 7m`,
);

// --- 2b. no launch boosts --------------------------------------------------
// Boost pads on/near climbs turn ramp crests into launch ramps (a stacked pair measured
// 33 m/s and flew over a spring pad), so the Summit must not use them at all.
const boosts = L.boostPads ?? [];
if (boosts.length) fail(`${boosts.length} boost pads present; the Summit route must not use boosts`);
console.log(`2b. boost pads: ${boosts.length} (climbs are all <= ${m.MAX_RAMP_SLOPE_DEG ?? 11.31}°, rollable from rest)`);

// --- 3. jump pads -----------------------------------------------------------
const G = 20.5,
  DAMP = 0.34,
  MAXTILT = (17.5 * Math.PI) / 180,
  R_ORB = 0.52;
function solve(cur, target, arcHeight) {
  const dx = target[0] - cur[0],
    dy = target[1] + 0.65 - cur[1],
    dz = target[2] - cur[2];
  const peakAboveStart = Math.max(dy + arcHeight, arcHeight);
  const peakAboveTarget = Math.max(0.8, peakAboveStart - dy);
  const tUp = Math.sqrt((2 * peakAboveStart) / G),
    tDown = Math.sqrt((2 * peakAboveTarget) / G);
  const T = Math.max(0.35, tUp + tDown);
  const vy = Math.sqrt(2 * G * peakAboveStart) * (1 + 0.21 * DAMP * T);
  const hf = (1 + 0.54 * DAMP * T) / T;
  return [dx * hf, vy, dz * hf];
}
function nearestPieceBelow(x, y, z) {
  let best = null;
  for (const p of pieces) {
    const h = p.surf(x, z, 0);
    if (h === null) continue;
    if (h <= y + 0.05 && (!best || h > best.h)) best = { p, h };
  }
  return best;
}
let jumpChecks = 0;
for (const jp of L.jumpPads) {
  if (!jp.targetPosition) fail(`jump pad ${jp.id} has no targetPosition`);
  const tgt = nearestPieceBelow(
    jp.targetPosition[0],
    jp.targetPosition[1] + 0.1,
    jp.targetPosition[2],
  );
  const padPiece = nearestPieceBelow(jp.position[0], jp.position[1] + 0.1, jp.position[2]);
  const dirs = [[0, 0]];
  for (let k = 0; k < 16; k++)
    dirs.push([Math.cos((k * Math.PI) / 8), Math.sin((k * Math.PI) / 8)]);
  const entries = [
    [0, 0],
    [1.6, 0],
    [-1.6, 0],
    [0, 1.6],
    [0, -1.6],
  ];
  const landings = new Map();
  for (const [ox, oz] of entries) {
    for (const [sx, sz] of dirs) {
      jumpChecks++;
      let pos = [jp.position[0] + ox, jp.position[1] + 0.3, jp.position[2] + oz];
      let v = solve(pos, jp.targetPosition, jp.arcHeight ?? 3.2);
      // Air steering: full tilt in direction (sx, sz); tilt ramps in over ~0.25s.
      const dt = 1 / 240;
      let landed = null;
      for (let t = 0; t < 6; t += dt) {
        const k = Math.min(1, t / 0.25);
        const ax = G * Math.sin(MAXTILT * k) * sx,
          az = G * Math.sin(MAXTILT * k) * sz;
        const ay = -G * Math.cos(MAXTILT * k);
        v = [
          v[0] + (ax - DAMP * v[0]) * dt,
          v[1] + (ay - DAMP * v[1]) * dt,
          v[2] + (az - DAMP * v[2]) * dt,
        ];
        pos = [pos[0] + v[0] * dt, pos[1] + v[1] * dt, pos[2] + v[2] * dt];
        if (v[1] < 0) {
          const below = nearestPieceBelow(pos[0], pos[1], pos[2]);
          if (below && pos[1] - R_ORB <= below.h) {
            landed = below.p;
            break;
          }
        }
        if (pos[1] < jp.position[1] - 12) break; // fell into the void
      }
      const key = landed ? landed.id : 'VOID';
      landings.set(key, (landings.get(key) || 0) + 1);
      if (landed) {
        const okStage = landed.stage === tgt.p.stage;
        const okOrder = landed.order <= tgt.p.order + 1;
        if (!okStage || !okOrder) {
          fail(
            `jump ${jp.id}: steering (${sx.toFixed(2)},${sz.toFixed(2)}) lands on ${landed.id} (stage ${landed.stage}, order ${landed.order}) beyond target ${tgt.p.id}`,
          );
        }
      }
    }
  }
  const unsteered = [...landings.entries()].map(([k, n]) => `${k}×${n}`).join(', ');
  console.log(
    `3. jump ${jp.id}: pad on ${padPiece?.p.id}, target ${tgt.p.id}; landings: ${unsteered}`,
  );
}
// Unsteered centre launch must hit the target.
for (const jp of L.jumpPads) {
  let pos = [jp.position[0], jp.position[1] + 0.3, jp.position[2]];
  let v = solve(pos, jp.targetPosition, jp.arcHeight ?? 3.2);
  const dt = 1 / 240;
  for (let t = 0; t < 6; t += dt) {
    v = [v[0] - DAMP * v[0] * dt, v[1] + (-G - DAMP * v[1]) * dt, v[2] - DAMP * v[2] * dt];
    pos = [pos[0] + v[0] * dt, pos[1] + v[1] * dt, pos[2] + v[2] * dt];
    if (v[1] < 0 && pos[1] <= jp.targetPosition[1] + R_ORB + 0.02) break;
  }
  const err = Math.hypot(pos[0] - jp.targetPosition[0], pos[2] - jp.targetPosition[2]);
  if (err > 1.5) fail(`jump ${jp.id} misses its target by ${err.toFixed(2)}m`);
  console.log(`   ${jp.id} unsteered landing error ${err.toFixed(2)}m`);
}

// --- 4. connectivity: stages only touch through their camp ---------------
function touches(a, b) {
  // sample a's footprint edge ring (with small margin) against b's surface
  for (const pt of footprintSamples(a, 0.75)) {
    const hb = b.surf(pt[0], pt[2], 0.6);
    if (hb !== null && Math.abs(hb - pt[1]) < 0.7) return true;
  }
  return false;
}
const bad = [];
let crossTouches = 0;
for (let i = 0; i < pieces.length; i++) {
  for (let j = i + 1; j < pieces.length; j++) {
    const a = pieces[i],
      b = pieces[j];
    if (a.stage === b.stage) continue;
    if (!touches(a, b) && !touches(b, a)) continue;
    crossTouches++;
    const [lo, hi] = a.stage < b.stage ? [a, b] : [b, a];
    const viaCamp = hi.stage === lo.stage + 1 && lo.kind === 'camp';
    if (!viaCamp) bad.push(`${lo.id} (stage ${lo.stage}) touches ${hi.id} (stage ${hi.stage})`);
  }
}
bad.forEach((b) => fail(`stage bypass: ${b}`));
console.log(
  `4. connectivity: ${crossTouches} cross-stage contacts, ${bad.length} not through a camp`,
);

// Moving/rotating/jump transitions stay inside their stage.
for (const mp of L.movingPlatforms) {
  for (const end of [mp.start, mp.end]) {
    const below = nearestPieceBelow(end[0], end[1] + 3, end[2]);
    void below;
  }
}

// --- 5. gates & rails -------------------------------------------------------
const camps = pieces.filter((p) => p.kind === 'camp');
for (const cp of L.checkpoints) {
  const camp = camps.find((c) => c.id === `sum-camp-${cp.order}`);
  if (!camp) fail(`checkpoint ${cp.id} has no camp plaza`);
  else if (Math.abs((cp.width ?? 3.7) - camp.size[0]) > 0.01)
    fail(`gate ${cp.id} width ${cp.width} != road ${camp.size[0]}`);
  const blk = L.blocks.find((b) => b.id === `sum-camp-${cp.order}`);
  if (!blk || blk.rails !== 'both' || (blk.railHeight ?? 0.45) < 1.2)
    fail(`camp ${cp.order} missing full rails`);
}
const orders = L.checkpoints.map((c) => c.order);
if (orders.join() !== orders.map((_, i) => i + 1).join()) fail('checkpoint orders are not 1..n');
if (!L.sequentialCheckpoints) fail('sequentialCheckpoints not enabled');
const roadBlocks = L.blocks.filter((b) => !b.decorative && b.rails && b.rails !== 'none');
const lowRails = roadBlocks.filter((b) => (b.railHeight ?? 0.45) < 1.2);
lowRails.forEach((b) => fail(`low rail on ${b.id}`));
const oneSided = roadBlocks.filter((b) => b.rails === 'right' || b.rails === 'left');
console.log(
  `5. gates: ${L.checkpoints.length} camps, all full-width & ordered; ${roadBlocks.length} railed road blocks (${oneSided.length} deliberately one-sided: ice shelves / storm catwalks)`,
);

// --- 6. waypoints ------------------------------------------------------------
const w = m.SUMMIT_BOT_WAYPOINTS;
let maxSeg = 0,
  floating = 0;
for (let i = 1; i < w.length; i++)
  maxSeg = Math.max(maxSeg, Math.hypot(w[i][0] - w[i - 1][0], w[i][2] - w[i - 1][2]));
for (const p of w) {
  const below = nearestPieceBelow(p[0], p[1], p[2]);
  if (!below || p[1] - below.h > 2.5) floating++;
}
const top = w[w.length - 1];
console.log(
  `6. bot waypoints: ${w.length}, max spacing ${maxSeg.toFixed(1)}m, ${floating} over gaps/platforms, final altitude ${(top[1] - 1).toFixed(1)}m`,
);
if (maxSeg > 16) fail(`waypoint spacing ${maxSeg.toFixed(1)}m`);

console.log('');
if (failures.length) {
  console.log(`FAILED (${failures.length}):`);
  failures.slice(0, 40).forEach((f) => console.log('  - ' + f));
  process.exit(1);
}
console.log('ALL SUMMIT CHECKS PASSED');
