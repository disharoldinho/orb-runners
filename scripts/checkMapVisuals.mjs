// Map visual lint: finds z-fighting / coplanar faces, scenery poking into the track and
// terrain clipping the road, in all campaign maps and the Summit.
//   node scripts/checkMapVisuals.mjs [--legacy] [--json out.json] [--verbose]
// --legacy models the pre-cleanup renderer (collider meshes drawn as-is, local-space tile
// patterns, no depth layers) to measure what the cleanup fixed. Exit code 1 if any
// blocking issue remains (not in --legacy mode).
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const LEGACY = args.includes('--legacy');
const VERBOSE = args.includes('--verbose');
const jsonOut = args.includes('--json') ? args[args.indexOf('--json') + 1] : null;

const bundle = await build({
  stdin: {
    contents: `
      export { MAPS } from './src/levels/maps.ts';
      export * as summit from './src/levels/summitMap.ts';
      export * from './src/levels/faceGeometry.ts';
      export * from './src/levels/blockParts.ts';
      export * from './src/levels/visualLayers.ts';
      export { getSummitTerrain } from './src/graphics/summitTerrain.ts';
      export * as summitScenery from './src/graphics/summitScenery.ts';
      export * as campaignScenery from './src/graphics/campaignScenery.ts';
      export { getDecorGeometry, DECOR_RADIUS } from './src/graphics/decorGeometry.ts';
      export * as THREE from 'three';
    `,
    resolveDir: root,
    loader: 'ts',
  },
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
  logLevel: 'silent',
});
const M = await import(
  'data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64')
);
const { THREE } = M;

const QUALITIES = ['low', 'medium', 'high'];
const Z_EPS = M.COPLANAR_EPS; // hard z-fight: planes closer than 3 mm
const FLICKER_EPS = 0.02; // near-coplanar: 3 mm .. 2 cm apart
// Camera near plane (components/game/GameCanvas). With a 24-bit perspective depth buffer the
// depth step at distance z is about z^2 / (near * 2^24); two parallel faces g metres apart
// start to flicker beyond sqrt(g * near * 2^24).
const CAMERA_NEAR = LEGACY ? 0.1 : 0.3;
const FLICKER_VIEW_M = 120;
const flickerDistance = (g) => Math.sqrt(g * CAMERA_NEAR * 2 ** 24);
const MIN_AREA = M.MIN_OVERLAP_M2;
const DECOR_TRACK_CLEAR = 0.6; // decor must stay this far outside any track/wall box
const DECOR_ROUTE_CLEAR = 3.0; // ... and this far (horizontally) from the route centreline
// Road shoulder: within 1 m of a deck edge the ground stays >= 0.3 m below the deck top;
// beyond that it may rise at up to 1.8:1 (61 deg), so slopes never slice through deck
// edges, curbs or rails. Checked out to TERRAIN_EDGE_RING metres.
const TERRAIN_EDGE_RING = 3.0;
const shoulderLimit = (top, d) => top - 0.3 + Math.max(0, d - 1.0) * 1.8;

const report = { mode: LEGACY ? 'legacy' : 'current', maps: [], totals: {} };
const add = (bucket, key, n = 1) => (bucket[key] = (bucket[key] ?? 0) + n);

// ---- parts -------------------------------------------------------------------------
function levelParts(level, layers) {
  const parts = [];
  const push = (part, owner, kind, extra = {}) => parts.push({ ...part, owner, kind, ...extra });
  for (const b of level.blocks) {
    if (M.isHiddenBlock(b.id)) continue;
    const m = M.objectMatrix(b.position, b.rotation);
    const list = LEGACY ? M.blockColliderParts(b) : M.blockVisualParts(b);
    for (const p of list)
      push(M.boxPart(m, p.offset, p.size), b.id, p.kind, {
        block: b,
        layer: LEGACY ? 0 : (layers.get(b.id) ?? 0),
      });
  }
  for (const bp of level.boostPads ?? []) {
    const size = bp.size ?? [3, 4];
    const sx = size[0];
    const sy = size.length === 2 ? 0.08 : size[1];
    const sz = size.length === 2 ? size[1] : size[2];
    const m = M.objectMatrix(bp.position, bp.rotation);
    push(M.boxPart(m, [0, 0, 0], [sx, sy, sz]), bp.id, 'boostPad');
    push(
      M.boxPart(m, [-sx / 2 + 0.08, 0.05, 0], [0.14, 0.06, LEGACY ? sz : sz - 0.03]),
      bp.id,
      'boostRail',
    );
    push(
      M.boxPart(m, [sx / 2 - 0.08, 0.05, 0], [0.14, 0.06, LEGACY ? sz : sz - 0.03]),
      bp.id,
      'boostRail',
    );
  }
  for (const jp of level.jumpPads ?? []) {
    const r = jp.radius ?? 1.15;
    const m = M.objectMatrix(jp.position);
    push(M.cylinderPart(m, [0, 0.05, 0], r, r * 1.1, 0.1), jp.id, 'jumpBase');
    push(M.cylinderPart(m, [0, 0.12, 0], r * 0.82, r * 0.88, 0.12), jp.id, 'jumpTop');
  }
  for (const cp of level.checkpoints ?? []) {
    const w = cp.width ?? 3.7;
    const m = M.objectMatrix(cp.position, cp.rotation);
    push(M.boxPart(m, [0, 0.03, 0], [w - 0.3, 0.04, 0.28]), cp.id, 'gateStrip');
    const pil = LEGACY ? [0.32, 3.0, 0.36] : [0.35, 3.0, 0.41];
    push(M.boxPart(m, [-w / 2, 1.5, 0], pil), cp.id, 'gatePillar');
    push(M.boxPart(m, [w / 2, 1.5, 0], pil), cp.id, 'gatePillar');
  }
  {
    const m = M.objectMatrix(level.goalPosition, level.goalRotation);
    push(M.cylinderPart(m, [-1.6, 1.6, 0], 0.22, 0.3, 3.2), 'goal', 'goalPillar');
    push(M.cylinderPart(m, [1.6, 1.6, 0], 0.22, 0.3, 3.2), 'goal', 'goalPillar');
  }
  for (const mp of level.movingPlatforms ?? []) {
    const m = M.objectMatrix(mp.start);
    const [sx, sy, sz] = mp.size;
    const layer = LEGACY ? 0 : M.PLATFORM_LAYER;
    push(M.boxPart(m, [0, 0, 0], mp.size), mp.id, 'platform', { layer });
    push(M.boxPart(m, [0, -0.04, 0], [sx + 0.14, sy * 0.65, sz + 0.14]), mp.id, 'platformRim', {
      layer,
    });
  }
  for (const k of level.killZones ?? []) {
    if (k.visual !== 'lava') continue;
    const m = M.objectMatrix(k.position);
    push(M.quadPart(m, [0, k.size[1] / 2 - 0.05, 0], k.size[0], k.size[2]), k.id, 'lava');
  }
  for (const sw of level.switchBridges ?? []) {
    const m = M.objectMatrix(sw.switchPosition);
    push(M.cylinderPart(m, [0, 0.04, 0], 0.88, 0.98, 0.09), sw.id, 'switchBase');
  }
  return parts;
}

function isResolved(a, b) {
  if (LEGACY || a.owner === b.owner) return false;
  return (a.layer ?? 0) !== (b.layer ?? 0);
}

// Two faces resting on the same surface (e.g. the undersides of a rail and a gate pillar
// standing on a deck) are hidden by it: skip pairs whose overlap is covered by an
// opposite-facing face of a third part on the same plane.
const _neg = new THREE.Vector3();
function isCovered(fa, point, A, B, parts) {
  _neg.copy(fa.n).negate();
  for (const C of parts.near(point)) {
    if (C === A || C === B) continue;
    for (const fc of C.faces) {
      if (fc.n.dot(_neg) < 0.9995) continue;
      if (M.faceContains(fc, point, Z_EPS)) return true;
    }
  }
  return false;
}

function indexParts(parts) {
  const B = 8;
  const grid = new Map();
  parts.forEach((p) => {
    for (let x = Math.floor(p.min.x / B); x <= Math.floor(p.max.x / B); x++)
      for (let z = Math.floor(p.min.z / B); z <= Math.floor(p.max.z / B); z++) {
        const k = `${x},${z}`;
        if (!grid.has(k)) grid.set(k, []);
        grid.get(k).push(p);
      }
  });
  parts.near = (pt) => grid.get(`${Math.floor(pt.x / B)},${Math.floor(pt.z / B)}`) ?? [];
  return parts;
}

function coplanarIssues(parts, stats, hot) {
  indexParts(parts);
  const order = parts.map((_, i) => i).sort((i, j) => parts[i].min.x - parts[j].min.x);
  for (let oi = 0; oi < order.length; oi++) {
    const A = parts[order[oi]];
    for (let oj = oi + 1; oj < order.length; oj++) {
      const B = parts[order[oj]];
      if (B.min.x > A.max.x + FLICKER_EPS) break;
      if (!M.aabbOverlap(A, B, FLICKER_EPS)) continue;

      let hard = 0;
      let soft = 0;
      let at = null;
      for (const fa of A.faces)
        for (const fb of B.faces) {
          const info = M.coplanarOverlapInfo(fa, fb, Z_EPS);
          const h = info?.area ?? 0;
          if (h >= MIN_AREA && isCovered(fa, info.centroid, A, B, parts)) continue;
          if (h >= MIN_AREA) {
            const identical =
              A.block &&
              B.block &&
              M.facesRenderIdentically(A.block, A.kind, fa, B.block, B.kind, fb, !LEGACY);
            if (!identical) {
              hard += h;
              at =
                at ??
                fa.poly
                  .reduce((s, p) => s.add(p), new THREE.Vector3())
                  .divideScalar(fa.poly.length);
            }
            continue;
          }
          const s = M.coplanarOverlap(fa, fb, FLICKER_EPS);
          if (s >= MIN_AREA * 4) {
            const g = Math.abs(fb.d - fb.n.dot(fa.poly[0]));
            if (flickerDistance(g) < FLICKER_VIEW_M) soft += s;
          }
        }
      if (hard >= MIN_AREA) {
        const key = `zfight:${A.kind}/${B.kind}`;
        if (isResolved(A, B)) {
          add(stats, 'zfight_resolved_by_layer');
          add(stats, 'resolved:' + A.kind + '/' + B.kind);
          hot.push({
            type: 'resolved',
            a: A.owner,
            b: B.owner,
            kinds: `${A.kind}/${B.kind}`,
            area: +hard.toFixed(3),
            at: at && at.toArray().map((v) => +v.toFixed(2)),
          });
        } else {
          add(stats, 'zfight');
          add(stats, key);
          hot.push({
            type: 'zfight',
            a: A.owner,
            b: B.owner,
            kinds: `${A.kind}/${B.kind}`,
            area: +hard.toFixed(3),
            at: at && at.toArray().map((v) => +v.toFixed(2)),
          });
        }
      } else if (soft > 0) {
        add(stats, 'flicker_under_120m');
      }
    }
  }
}

// ---- scenery helpers -----------------------------------------------------------------
const decorDims = {};
function dims(kind) {
  if (!decorDims[kind]) {
    const g = M.getDecorGeometry(kind, 0);
    const p = g.getAttribute('position');
    let r = 0;
    let y0 = Infinity;
    let y1 = -Infinity;
    for (let i = 0; i < p.count; i++) {
      r = Math.max(r, Math.hypot(p.getX(i), p.getZ(i)));
      y0 = Math.min(y0, p.getY(i));
      y1 = Math.max(y1, p.getY(i));
    }
    decorDims[kind] = { r, y0, y1 };
  }
  return decorDims[kind];
}

function solidBoxes(level) {
  // track decks, walls and gates as oriented boxes (inverse matrices for point tests)
  const out = [];
  for (const b of level.blocks) {
    if (M.isHiddenBlock(b.id) || b.decorative) continue;
    const m = M.objectMatrix(b.position, b.rotation);
    for (const p of M.blockColliderParts(b)) {
      if (p.kind !== 'body' && p.kind !== 'rail') continue;
      const mm = m.clone().multiply(M.objectMatrix(p.offset));
      out.push({
        id: b.id,
        inv: mm.clone().invert(),
        h: p.size.map((s) => s / 2),
        part: M.boxPart(m, p.offset, p.size),
        top: b.position[1] + b.size[1] / 2,
      });
    }
  }
  for (const cp of level.checkpoints ?? []) {
    const w = cp.width ?? 3.7;
    const m = M.objectMatrix(cp.position, cp.rotation);
    const mm = m.clone().multiply(M.objectMatrix([0, 1.6, 0]));
    out.push({
      id: cp.id,
      inv: mm.clone().invert(),
      h: [w / 2 + 0.3, 1.7, 0.3],
      part: M.boxPart(m, [0, 1.6, 0], [w + 0.6, 3.4, 0.6]),
    });
  }
  const B = 16;
  const grid = new Map();
  out.forEach((o, i) => {
    for (let x = Math.floor((o.part.min.x - 4) / B); x <= Math.floor((o.part.max.x + 4) / B); x++)
      for (
        let z = Math.floor((o.part.min.z - 4) / B);
        z <= Math.floor((o.part.max.z + 4) / B);
        z++
      ) {
        const k = `${x},${z}`;
        if (!grid.has(k)) grid.set(k, []);
        grid.get(k).push(i);
      }
  });
  return {
    list: out,
    near: (x, z) =>
      (grid.get(`${Math.floor(x / B)},${Math.floor(z / B)}`) ?? []).map((i) => out[i]),
  };
}

const _v = new THREE.Vector3();
function decorHitsSolid(d, solids, clear) {
  const { r, y0, y1 } = dims(d.kind);
  const R = r * d.scale;
  for (const s of solids.near(d.x, d.z)) {
    if (d.y + y1 * d.scale < s.part.min.y - clear || d.y + y0 * d.scale > s.part.max.y + clear)
      continue;
    for (const fy of [0.08, 0.35, 0.65, 0.95]) {
      const y = d.y + (y0 + (y1 - y0) * fy) * d.scale;
      // canopy is widest mid-height; trunk base is thin
      const rr = fy < 0.2 ? Math.min(R, 0.5 * d.scale) : R;
      for (let a = -1; a < 8; a++) {
        const px = a < 0 ? d.x : d.x + Math.cos((a / 8) * Math.PI * 2) * rr;
        const pz = a < 0 ? d.z : d.z + Math.sin((a / 8) * Math.PI * 2) * rr;
        _v.set(px, y, pz).applyMatrix4(s.inv);
        if (
          Math.abs(_v.x) < s.h[0] + clear &&
          Math.abs(_v.y) < s.h[1] + clear &&
          Math.abs(_v.z) < s.h[2] + clear
        )
          return s.id;
      }
    }
  }
  return null;
}

function routeIndex(route) {
  const B = 16;
  const grid = new Map();
  for (let i = 1; i < route.length; i++) {
    const a = route[i - 1];
    const b = route[i];
    for (
      let x = Math.floor((Math.min(a[0], b[0]) - 8) / B);
      x <= Math.floor((Math.max(a[0], b[0]) + 8) / B);
      x++
    )
      for (
        let z = Math.floor((Math.min(a[2], b[2]) - 8) / B);
        z <= Math.floor((Math.max(a[2], b[2]) + 8) / B);
        z++
      ) {
        const k = `${x},${z}`;
        if (!grid.has(k)) grid.set(k, []);
        grid.get(k).push(i);
      }
  }
  return (x, z, y0, y1, clear) => {
    for (const i of grid.get(`${Math.floor(x / B)},${Math.floor(z / B)}`) ?? []) {
      const a = route[i - 1];
      const b = route[i];
      const vx = b[0] - a[0];
      const vz = b[2] - a[2];
      const L2 = vx * vx + vz * vz || 1;
      const t = Math.max(0, Math.min(1, ((x - a[0]) * vx + (z - a[2]) * vz) / L2));
      const d = Math.hypot(a[0] + vx * t - x, a[2] + vz * t - z);
      const floor = a[1] + (b[1] - a[1]) * t - 1.0;
      if (d < clear && y1 > floor - 0.3 && y0 < floor + 3.5) return true;
    }
    return false;
  };
}

function decorOverlaps(items) {
  // heavy interpenetration between props (ground-cover tufts excluded)
  const B = 8;
  const grid = new Map();
  items.forEach((d, i) => {
    if (d.kind === 'tuft') return;
    const k = `${Math.floor(d.x / B)},${Math.floor(d.z / B)}`;
    if (!grid.has(k)) grid.set(k, []);
    grid.get(k).push(i);
  });
  let n = 0;
  items.forEach((d, i) => {
    if (d.kind === 'tuft') return;
    const gx = Math.floor(d.x / B);
    const gz = Math.floor(d.z / B);
    for (let x = gx - 1; x <= gx + 1; x++)
      for (let z = gz - 1; z <= gz + 1; z++)
        for (const j of grid.get(`${x},${z}`) ?? []) {
          if (j <= i) continue;
          const e = items[j];
          const lim = 0.4 * (dims(d.kind).r * d.scale + dims(e.kind).r * e.scale);
          if (Math.hypot(d.x - e.x, d.z - e.z) < lim && Math.abs(d.y - e.y) < 2) n++;
        }
  });
  return n;
}

function puffHitsSolid(p, solids) {
  const [x, y, z, s] = p;
  for (const o of solids.list) {
    const b = o.part;
    if (x + 0.8 * s < b.min.x || x - 0.8 * s > b.max.x) continue;
    if (z + 0.8 * s < b.min.z || z - 0.8 * s > b.max.z) continue;
    if (y + 0.5 * s < b.min.y || y - 0.5 * s > b.max.y) continue;
    return o.id;
  }
  return null;
}

// Edges used by exactly one triangle (position-welded): > 0 means see-through holes.
function openEdges(geo) {
  const p = geo.getAttribute('position');
  const key = (i) => `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`;
  const idx = geo.index ? geo.index.array : Array.from({ length: p.count }, (_, i) => i);
  const edges = new Map();
  for (let t = 0; t < idx.length; t += 3) {
    const k = [key(idx[t]), key(idx[t + 1]), key(idx[t + 2])];
    if (k[0] === k[1] || k[1] === k[2] || k[0] === k[2]) continue;
    for (let e = 0; e < 3; e++) {
      const a = k[e];
      const b = k[(e + 1) % 3];
      const ek = a < b ? a + '|' + b : b + '|' + a;
      edges.set(ek, (edges.get(ek) ?? 0) + 1);
    }
  }
  let open = 0;
  edges.forEach((n) => (open += n === 1 ? 1 : 0));
  return open;
}

// ---- per map ---------------------------------------------------------------------------
function checkLevel(level, name, extra) {
  const stats = {};
  const hot = [];
  const layers = LEGACY ? new Map() : M.getBlockLayers(level);
  stats.depth_layers = layers.size;
  stats.max_layer = Math.max(0, ...layers.values());
  coplanarIssues(levelParts(level, layers), stats, hot);
  const solids = solidBoxes(level);
  extra(stats, hot, solids);
  const cap = VERBOSE ? 60 : 12;
  const perType = {};
  const kept = hot.filter((h) => (perType[h.type] = (perType[h.type] ?? 0) + 1) <= cap);
  report.maps.push({ name, stats, hot: kept });
  for (const [k, v] of Object.entries(stats))
    if (k === 'max_layer') report.totals[k] = Math.max(report.totals[k] ?? 0, v);
    else add(report.totals, k, v);
}

for (const level of M.MAPS) {
  checkLevel(level, `${level.id} ${level.name}`, (stats, hot, solids) => {
    const style =
      M.campaignScenery.CAMPAIGN_STYLES[level.skyPreset] ?? M.campaignScenery.CAMPAIGN_STYLES.day;
    const seen = new Set();
    for (const q of QUALITIES) {
      const sc = M.campaignScenery.buildCampaignScenery(level, style, q);
      if (q === 'medium') add(stats, 'island_mesh_holes', openEdges(sc.geo));
      sc.geo.dispose?.();
      const isl = sc.islands;
      for (let i = 0; i < isl.length; i++) {
        const a = isl[i];
        for (let j = i + 1; j < isl.length; j++) {
          const b = isl[j];
          const k = `ii:${a.x.toFixed(1)},${b.x.toFixed(1)}`;
          if (seen.has(k)) continue;
          if (
            Math.hypot(a.x - b.x, a.z - b.z) < a.r + b.r + 1 &&
            Math.abs(a.y - b.y) < Math.max(a.r, b.r) * 2.2 + 2
          ) {
            seen.add(k);
            add(stats, 'island_overlap');
            hot.push({ type: 'island_overlap', at: [a.x, a.y, a.z].map((v) => +v.toFixed(1)) });
          }
        }
      }
      for (const d of sc.decor) {
        const k = `d:${d.x.toFixed(2)},${d.z.toFixed(2)}`;
        if (seen.has(k)) continue;
        seen.add(k);
        const owner = isl.find(
          (i) => Math.hypot(i.x - d.x, i.z - d.z) < i.r + 0.01 && Math.abs(i.y - d.y) < 0.01,
        );
        const R = dims(d.kind).r * d.scale;
        if (
          owner &&
          Math.hypot(owner.x - d.x, owner.z - d.z) + R * 0.6 > owner.r * Math.cos(Math.PI / 9)
        ) {
          add(stats, 'flora_overhang');
        }
        const hit = decorHitsSolid(d, solids, DECOR_TRACK_CLEAR);
        if (hit) {
          add(stats, 'decor_in_track');
          hot.push({
            type: 'decor_in_track',
            kind: d.kind,
            block: hit,
            at: [d.x, d.y, d.z].map((v) => +v.toFixed(1)),
          });
        }
      }
      for (const p of sc.puffs) {
        const k = `p:${p[0].toFixed(2)}`;
        if (seen.has(k)) continue;
        seen.add(k);
        const hit = puffHitsSolid(p, solids);
        if (hit) {
          add(stats, 'cloud_through_track');
          hot.push({
            type: 'cloud_through_track',
            block: hit,
            at: p.slice(0, 3).map((v) => +v.toFixed(1)),
          });
        }
      }
      add(stats, 'decor_overlap', decorOverlaps(sc.decor));
    }
  });
}

{
  const S = M.summit;
  const level = S.SUMMIT_MAP;
  const route = S.SUMMIT_BOT_WAYPOINTS;
  const nearRoute = routeIndex(route);
  checkLevel(level, 'Summit', (stats, hot, solids) => {
    for (const q of QUALITIES) {
      const t = M.getSummitTerrain(level, route, M.summitScenery.TERRAIN_CELL[q]);
      // terrain vs decks: through the top, or crowding right beside it
      let through = 0;
      let crowd = 0;
      for (const b of level.blocks) {
        if (M.isHiddenBlock(b.id) || b.decorative) continue;
        const m = M.objectMatrix(b.position, b.rotation);
        const [sx, sy, sz] = b.size;
        const top = new THREE.Vector3();
        const step = 0.75;
        for (
          let lx = -sx / 2 - TERRAIN_EDGE_RING;
          lx <= sx / 2 + TERRAIN_EDGE_RING + 1e-6;
          lx += step
        )
          for (
            let lz = -sz / 2 - TERRAIN_EDGE_RING;
            lz <= sz / 2 + TERRAIN_EDGE_RING + 1e-6;
            lz += step
          ) {
            const inside = Math.abs(lx) <= sx / 2 && Math.abs(lz) <= sz / 2;
            const cx = Math.max(-sx / 2, Math.min(sx / 2, lx));
            const cz = Math.max(-sz / 2, Math.min(sz / 2, lz));
            top.set(cx, sy / 2, cz).applyMatrix4(m);
            const p = new THREE.Vector3(lx, sy / 2, lz).applyMatrix4(m);
            const g = t.sample(p.x, p.z);
            if (inside && g > top.y - 0.02) {
              through++;
              if (through < 6)
                hot.push({
                  type: 'terrain_through_deck',
                  q,
                  block: b.id,
                  at: [p.x, g, p.z].map((v) => +v.toFixed(1)),
                });
            } else if (
              !inside &&
              b.size[1] <= 1.5 &&
              g > shoulderLimit(top.y, Math.hypot(lx - cx, lz - cz)) &&
              g < top.y + 8
            ) {
              crowd++;
              if (crowd < 6)
                hot.push({
                  type: 'terrain_crowds_road',
                  q,
                  block: b.id,
                  at: [p.x, g, p.z].map((v) => +v.toFixed(1)),
                });
            }
          }
      }
      add(stats, 'terrain_through_deck_samples', through);
      add(stats, 'terrain_crowds_road_samples', crowd);
      let overRoute = 0;
      for (const w of route) if (t.sample(w[0], w[2]) > w[1] - 1.1) overRoute++;
      add(stats, 'terrain_over_route_waypoints', overRoute);

      const decor = M.summitScenery.scatterDecor(t, M.summitScenery.DECOR_DENSITY[q]);
      let inTrack = 0;
      let inRoute = 0;
      for (const d of decor) {
        const hit = decorHitsSolid(d, solids, DECOR_TRACK_CLEAR);
        const { r, y0, y1 } = dims(d.kind);
        const inR = nearRoute(
          d.x,
          d.z,
          d.y + y0 * d.scale,
          d.y + y1 * d.scale,
          DECOR_ROUTE_CLEAR + r * d.scale,
        );
        if (hit) {
          inTrack++;
          if (inTrack < 12)
            hot.push({
              type: 'decor_in_track',
              q,
              kind: d.kind,
              block: hit,
              at: [d.x, d.y, d.z].map((v) => +v.toFixed(1)),
            });
        } else if (inR) {
          inRoute++;
          if (inRoute < 12)
            hot.push({
              type: 'decor_near_route',
              q,
              kind: d.kind,
              at: [d.x, d.y, d.z].map((v) => +v.toFixed(1)),
            });
        }
      }
      add(stats, `decor_in_track`, inTrack);
      add(stats, `decor_near_route`, inRoute);
      add(stats, 'decor_overlap', decorOverlaps(decor));
      const puffs = M.summitScenery.cloudBelt(t, M.summitScenery.PUFFS[q], route);
      for (const p of puffs) {
        const hit = puffHitsSolid(p, solids);
        if (hit) {
          add(stats, 'cloud_through_track');
          hot.push({
            type: 'cloud_through_track',
            q,
            block: hit,
            at: p.slice(0, 3).map((v) => +v.toFixed(1)),
          });
        }
      }
    }
  });
}

// ---- output -----------------------------------------------------------------------------
// the footprint table used for prop spacing must match the real meshes
{
  const { DECOR_RADIUS } = M;
  for (const [k, r] of Object.entries(DECOR_RADIUS)) {
    if (Math.abs(dims(k).r - r) > 0.05) {
      console.error(`DECOR_RADIUS.${k}=${r} but the mesh footprint is ${dims(k).r.toFixed(2)}`);
      add(report.totals, 'decor_radius_table_mismatch');
    }
  }
}
if ((report.totals.max_layer ?? 0) > M.MAX_LAYER) add(report.totals, 'too_many_depth_layers');

const BLOCKING = [
  'island_mesh_holes',
  'terrain_crowds_road_samples',
  'decor_overlap',
  'flicker_under_120m',
  'flora_overhang',
  'island_overlap',
  'decor_radius_table_mismatch',
  'too_many_depth_layers',
  'zfight',
  'terrain_through_deck_samples',
  'decor_in_track',
  'cloud_through_track',
  'terrain_over_route_waypoints',
];
const pad = (s, n) => String(s).padEnd(n);
console.log(`map visual lint (${report.mode})`);
for (const m of report.maps) {
  const s = Object.entries(m.stats)
    .filter(([k, v]) => v && !k.includes(':'))
    .map(([k, v]) => `${k}=${v}`)
    .join('  ');
  console.log(`  ${pad(m.name, 22)} ${s || 'clean'}`);
  if (VERBOSE) for (const h of m.hot) console.log('      ', JSON.stringify(h));
}
console.log('totals:', JSON.stringify(report.totals));
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(report, null, 1));
const blocking = BLOCKING.reduce((s, k) => s + (report.totals[k] ?? 0), 0);
if (!LEGACY && blocking > 0) {
  console.error(
    `FAIL: ${blocking} blocking visual issue(s): ${BLOCKING.filter((k) => report.totals[k])
      .map((k) => `${k}=${report.totals[k]}`)
      .join(', ')}`,
  );
  process.exit(1);
}
if (!LEGACY) console.log('OK: no blocking visual issues');
