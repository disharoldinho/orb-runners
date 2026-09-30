import * as THREE from 'three';
import { LevelData, Vec3 } from '../types/level';

/**
 * Procedural Summit mountain heightfield, derived from the level data so it always
 * matches the road:
 *  - under every road deck the ground sits just below the deck (hidden under it),
 *  - just beside a deck it falls away steeply (open edges read as open edges),
 *  - wherever the bot route crosses open air (jump gaps, moving platforms, switch
 *    bridges) it drops into a deep chasm,
 *  - lava kill zones become pools set into the rock,
 *  - outside the spiral a broad massif flares down into the cloud sea with ridges and
 *    satellite peaks, so the road-wrapped horn reads as the summit of a real mountain.
 * Purely visual: no colliders are generated from it.
 */

export interface SummitTerrain {
  xs: Float32Array;
  zs: Float32Array;
  heights: Float32Array; // row-major [iz * nx + ix]
  /** 0 free ground, 1 under a road deck, 2 beside a deck / over a route gap / lava */
  flags: Uint8Array;
  nx: number;
  nz: number;
  center: [number, number];
  halfExtent: [number, number];
  sample(x: number, z: number): number;
  flagAt(x: number, z: number): number;
}

interface Floor {
  c: THREE.Vector3;
  ex: THREE.Vector3;
  ez: THREE.Vector3;
  n: THREE.Vector3;
  p0: THREE.Vector3;
  hx: number;
  hz: number;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

// --- deterministic value noise -------------------------------------------------------
function hash2(x: number, z: number) {
  let h = (x * 374761393 + z * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
function vnoise(x: number, z: number) {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx);
  const uz = fz * fz * (3 - 2 * fz);
  const a = hash2(ix, iz);
  const b = hash2(ix + 1, iz);
  const c = hash2(ix, iz + 1);
  const d = hash2(ix + 1, iz + 1);
  return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
}
export function fbm2(x: number, z: number, oct = 4) {
  let s = 0;
  let a = 0.5;
  let f = 1;
  for (let i = 0; i < oct; i++) {
    s += a * vnoise(x * f, z * f);
    f *= 2.03;
    a *= 0.5;
  }
  return s; // ~0..1
}
function ridged(x: number, z: number, oct = 4) {
  let s = 0;
  let a = 0.5;
  let f = 1;
  for (let i = 0; i < oct; i++) {
    const n = 1 - Math.abs(vnoise(x * f, z * f) * 2 - 1);
    s += a * n * n;
    f *= 2.1;
    a *= 0.5;
  }
  return s;
}

/** Non-uniform axis: dense over [lo, hi], geometric growth outside to +-reach. */
function buildAxis(lo: number, hi: number, cell: number, reach: number, grow: number) {
  const inner: number[] = [];
  const n = Math.ceil((hi - lo) / cell);
  for (let i = 0; i <= n; i++) inner.push(lo + ((hi - lo) * i) / n);
  const left: number[] = [];
  let step = cell;
  let x = lo;
  while (x > lo - reach) {
    step *= grow;
    x -= step;
    left.unshift(x);
  }
  const right: number[] = [];
  step = cell;
  x = hi;
  while (x < hi + reach) {
    step *= grow;
    x += step;
    right.push(x);
  }
  return Float32Array.from([...left, ...inner, ...right]);
}

function makeFloor(b: LevelData['blocks'][number]): Floor {
  const rot = b.rotation ?? [0, 0, 0];
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rot[0], rot[1], rot[2], 'XYZ'));
  const ex = new THREE.Vector3(1, 0, 0).applyQuaternion(q);
  const ez = new THREE.Vector3(0, 0, 1).applyQuaternion(q);
  const n = new THREE.Vector3(0, 1, 0).applyQuaternion(q);
  const c = new THREE.Vector3(...b.position);
  const p0 = c.clone().addScaledVector(n, b.size[1] / 2);
  const hx = b.size[0] / 2;
  const hz = b.size[2] / 2;
  const rx = Math.abs(ex.x) * hx + Math.abs(ez.x) * hz;
  const rz = Math.abs(ex.z) * hx + Math.abs(ez.z) * hz;
  return {
    c,
    ex,
    ez,
    n,
    p0,
    hx,
    hz,
    minX: c.x - rx,
    maxX: c.x + rx,
    minZ: c.z - rz,
    maxZ: c.z + rz,
  };
}

const tmp = new THREE.Vector3();
/** Surface height of a floor's top plane at (x, z) plus footprint distance. */
function floorQuery(f: Floor, x: number, z: number): { y: number; d: number } {
  const ny = Math.abs(f.n.y) < 0.2 ? 0.2 : f.n.y;
  const y = f.p0.y - (f.n.x * (x - f.p0.x) + f.n.z * (z - f.p0.z)) / ny;
  tmp.set(x - f.c.x, y - f.c.y, z - f.c.z);
  const lx = tmp.dot(f.ex);
  const lz = tmp.dot(f.ez);
  const dx = Math.max(Math.abs(lx) - f.hx, 0);
  const dz = Math.max(Math.abs(lz) - f.hz, 0);
  return { y, d: Math.hypot(dx, dz) };
}

const cache = new Map<string, SummitTerrain>();

export function getSummitTerrain(level: LevelData, route: Vec3[], cell: number): SummitTerrain {
  const key = `${level.id}|${cell}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const floors = level.blocks
    .filter((b) => !b.decorative && b.size[1] <= 1.5 && b.size[0] >= 2 && b.size[2] >= 2)
    .map(makeFloor);
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const f of floors) {
    minX = Math.min(minX, f.minX);
    maxX = Math.max(maxX, f.maxX);
    minZ = Math.min(minZ, f.minZ);
    maxZ = Math.max(maxZ, f.maxZ);
  }
  const cx = (minX + maxX) / 2;
  const cz = (minZ + maxZ) / 2;
  const ax = (maxX - minX) / 2;
  const az = (maxZ - minZ) / 2;

  // Spatial hash of floors (16 m buckets) for fast neighbourhood queries.
  const B = 16;
  const buckets = new Map<string, Floor[]>();
  const SEARCH = 46;
  for (const f of floors) {
    for (let bx = Math.floor((f.minX - SEARCH) / B); bx <= Math.floor((f.maxX + SEARCH) / B); bx++)
      for (
        let bz = Math.floor((f.minZ - SEARCH) / B);
        bz <= Math.floor((f.maxZ + SEARCH) / B);
        bz++
      ) {
        const k = `${bx},${bz}`;
        const arr = buckets.get(k);
        if (arr) arr.push(f);
        else buckets.set(k, [f]);
      }
  }

  // Route segments (bot waypoints are 1 m above the floor) for gap chasms.
  const segs: { a: Vec3; b: Vec3 }[] = [];
  for (let i = 1; i < route.length; i++) segs.push({ a: route[i - 1], b: route[i] });
  const segBuckets = new Map<string, number[]>();
  const CORR = 4.2;
  segs.forEach((s, i) => {
    const x0 = Math.min(s.a[0], s.b[0]) - CORR;
    const x1 = Math.max(s.a[0], s.b[0]) + CORR;
    const z0 = Math.min(s.a[2], s.b[2]) - CORR;
    const z1 = Math.max(s.a[2], s.b[2]) + CORR;
    for (let bx = Math.floor(x0 / B); bx <= Math.floor(x1 / B); bx++)
      for (let bz = Math.floor(z0 / B); bz <= Math.floor(z1 / B); bz++) {
        const k = `${bx},${bz}`;
        const arr = segBuckets.get(k);
        if (arr) arr.push(i);
        else segBuckets.set(k, [i]);
      }
  });

  const margin = Math.max(2.2, cell * 1.7);
  const pad = 30;
  const xs = buildAxis(minX - pad, maxX + pad, cell, 950, 1.2);
  const zs = buildAxis(minZ - pad, maxZ + pad, cell, 950, 1.2);
  const nx = xs.length;
  const nz = zs.length;
  const heights = new Float32Array(nx * nz);
  const flags = new Uint8Array(nx * nz);

  // Satellite peaks framing the horn (placed away from the start plaza view axis).
  const peaks = [
    { a: 3.75, d: 190, h: 150, w: 120 },
    { a: 5.75, d: 215, h: 175, w: 130 },
    { a: 0.6, d: 520, h: 150, w: 170 },
    { a: 1.5, d: 700, h: 210, w: 230 },
    { a: 2.5, d: 480, h: 95, w: 150 },
    { a: 3.3, d: 640, h: 180, w: 210 },
    { a: 4.3, d: 560, h: 120, w: 180 },
    { a: 5.3, d: 760, h: 230, w: 250 },
  ].map((p) => ({ x: cx + Math.cos(p.a) * p.d, z: cz + Math.sin(p.a) * p.d, h: p.h, w: p.w }));

  for (let iz = 0; iz < nz; iz++) {
    const z = zs[iz];
    for (let ix = 0; ix < nx; ix++) {
      const x = xs[ix];
      let capStrict = Infinity;
      let capMargin = Infinity;
      let nearD = Infinity;
      let wSum = 0;
      let ySum = 0;
      const bucket = buckets.get(`${Math.floor(x / B)},${Math.floor(z / B)}`);
      const soft: { y: number; d: number }[] = [];
      const strictYs: number[] = [];
      if (bucket) {
        for (const f of bucket) {
          if (
            x < f.minX - SEARCH ||
            x > f.maxX + SEARCH ||
            z < f.minZ - SEARCH ||
            z > f.maxZ + SEARCH
          )
            continue;
          const q = floorQuery(f, x, z);
          if (q.d <= 0.0001) {
            capStrict = Math.min(capStrict, q.y - 1.3);
            strictYs.push(q.y);
          } else if (q.d <= margin) capMargin = Math.min(capMargin, q.y - 1.3 - 2.2 * q.d);
          if (q.d < nearD) nearD = q.d;
          soft.push(q);
        }
      }
      // Height of the LOWEST deck close to the nearest one: outside the spiral that is the
      // outermost loop (upper loops overhang further in and must not raise the ground).
      let nearY = NaN;
      for (const q of soft) {
        if (q.d > nearD + 3) continue;
        if (Number.isNaN(nearY) || q.y < nearY) nearY = q.y;
      }
      void wSum;
      void ySum;
      const strict = capStrict < Infinity;

      // Chasm under route sections that cross open air (no deck at the route's own level,
      // even if a higher loop of the road passes overhead).
      let capPath = Infinity;
      {
        const sb = segBuckets.get(`${Math.floor(x / B)},${Math.floor(z / B)}`);
        if (sb) {
          for (const i of sb) {
            const { a, b } = segs[i];
            const vx = b[0] - a[0];
            const vz = b[2] - a[2];
            const L2 = vx * vx + vz * vz || 1;
            const t = Math.max(0, Math.min(1, ((x - a[0]) * vx + (z - a[2]) * vz) / L2));
            const px = a[0] + vx * t - x;
            const pz = a[2] + vz * t - z;
            if (px * px + pz * pz <= CORR * CORR) {
              const floorY = a[1] + (b[1] - a[1]) * t - 1.0;
              if (
                !strictYs.some((y) => Math.abs(y - floorY) < 2.5 || (y < floorY && y > floorY - 12))
              )
                capPath = Math.min(capPath, floorY - 15);
            }
          }
        }
      }

      // Lava pools set into the rock.
      let capLava = Infinity;
      for (const k of level.killZones ?? []) {
        if (k.visual !== 'lava') continue;
        if (
          Math.abs(x - k.position[0]) <= k.size[0] / 2 + 0.5 &&
          Math.abs(z - k.position[2]) <= k.size[2] / 2 + 0.5
        )
          capLava = Math.min(capLava, k.position[1] + k.size[1] / 2 - 0.3);
      }

      // Desired shape
      const r = Math.pow(
        Math.pow(Math.abs(x - cx) / (ax + 3), 4) + Math.pow(Math.abs(z - cz) / (az + 3), 4),
        0.25,
      );
      let desired: number;
      if (strict) {
        desired = Infinity;
      } else if (r < 1 && !Number.isNaN(nearY)) {
        desired = nearY - 1.3 + fbm2(x * 0.08, z * 0.08) * 3.5;
      } else {
        const s = Math.max(0, (r - 1) * Math.min(ax, az));
        const ang = Math.atan2(z - cz, x - cx);
        // Four arêtes running out from the corners of the horn (Matterhorn-style), plus
        // ridged detail and fine noise.
        const arete = Math.pow(
          Math.abs(Math.sin(2 * ang + (fbm2(x * 0.004, z * 0.004) - 0.5) * 0.5)),
          4,
        );
        const areteH =
          arete * 190 * Math.exp(-s / 170) * (0.75 + 0.5 * ridged(x * 0.008, z * 0.008));
        const detail = (ridged(x * 0.006, z * 0.006) - 0.35) * 70 * Math.min(1, s / 60);
        const fine = (fbm2(x * 0.05, z * 0.05) - 0.5) * 8;
        let massif = -8 - 250 * (1 - Math.exp(-s / 230)) + detail + fine;
        massif = Math.max(massif, -40 + areteH + detail * 0.5 + fine);
        for (const p of peaks) {
          const d = Math.hypot(x - p.x, z - p.z);
          const k = Math.max(0, 1 - d / p.w);
          const cone = p.h * Math.pow(k, 1.6) + ridged(x * 0.02, z * 0.02) * 26 * k;
          massif = Math.max(massif, -210 + cone + 210 * k * 0.45);
        }
        desired = massif;
        if (!Number.isNaN(nearY) && nearD < SEARCH) {
          // Gorge rule: right beside a road the ground falls away; only beyond a ~20 m gorge
          // may scenery rise again (so ridges never wall in the road).
          const limit = nearD < 20 ? nearY - 4 - 1.25 * nearD : nearY - 29 + 2.4 * (nearD - 20);
          // smooth minimum so clamped ridges get rounded shoulders instead of straight blades
          const kSm = 18;
          const hh = Math.max(0, Math.min(1, 0.5 + (0.5 * (limit - desired)) / kSm));
          const clamped =
            limit +
            (desired - limit) * hh -
            kSm * hh * (1 - hh) +
            (fbm2(x * 0.03, z * 0.03) - 0.5) * 6 * (nearD > 20 ? 1 : 0);
          const w = Math.min(1, Math.max(0, (nearD - 38) / 7));
          desired = clamped + (desired - clamped) * w;
          desired = Math.max(desired, nearY - 4 - 1.25 * nearD + fine * 0.5);
        }
      }

      let h = Math.min(desired, capStrict, capMargin, capPath, capLava);
      if (!Number.isFinite(h)) h = Number.isNaN(nearY) ? -8 : nearY - 1.3;
      heights[iz * nx + ix] = h;
      flags[iz * nx + ix] = strict
        ? 1
        : capMargin < Infinity || capPath < Infinity || capLava < Infinity
          ? 2
          : 0;
    }
  }

  const locate = (arr: Float32Array, v: number) => {
    let lo = 0;
    let hi = arr.length - 1;
    if (v <= arr[0]) return 0;
    if (v >= arr[hi]) return hi - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (arr[mid] <= v) lo = mid;
      else hi = mid;
    }
    return lo;
  };

  const terrain: SummitTerrain = {
    xs,
    zs,
    heights,
    flags,
    nx,
    nz,
    center: [cx, cz],
    halfExtent: [ax, az],
    sample(x, z) {
      const i = locate(xs, x);
      const j = locate(zs, z);
      const tx = Math.max(0, Math.min(1, (x - xs[i]) / (xs[i + 1] - xs[i])));
      const tz = Math.max(0, Math.min(1, (z - zs[j]) / (zs[j + 1] - zs[j])));
      const h00 = heights[j * nx + i];
      const h10 = heights[j * nx + i + 1];
      const h01 = heights[(j + 1) * nx + i];
      const h11 = heights[(j + 1) * nx + i + 1];
      // same diagonal split as the mesh (a-b-d / b-c-d)
      if (tx + tz <= 1) return h00 + (h10 - h00) * tx + (h01 - h00) * tz;
      return h11 + (h01 - h11) * (1 - tx) + (h10 - h11) * (1 - tz);
    },
    flagAt(x, z) {
      const i = locate(xs, x);
      const j = locate(zs, z);
      let f = 0;
      for (let dj = 0; dj <= 1; dj++)
        for (let di = 0; di <= 1; di++) f = Math.max(f, flags[(j + dj) * nx + i + di]);
      return f;
    },
  };
  cache.set(key, terrain);
  return terrain;
}

/** Triangle mesh for a terrain (diagonal split matches `sample`). */
export function buildTerrainGeometry(t: SummitTerrain): THREE.BufferGeometry {
  const { xs, zs, heights, nx, nz } = t;
  const pos = new Float32Array(nx * nz * 3);
  for (let j = 0; j < nz; j++)
    for (let i = 0; i < nx; i++) {
      const k = (j * nx + i) * 3;
      pos[k] = xs[i];
      pos[k + 1] = heights[j * nx + i];
      pos[k + 2] = zs[j];
    }
  const idx = new Uint32Array((nx - 1) * (nz - 1) * 6);
  let p = 0;
  for (let j = 0; j < nz - 1; j++)
    for (let i = 0; i < nx - 1; i++) {
      const a = j * nx + i;
      const b = a + 1;
      const c = a + nx + 1;
      const d = a + nx;
      idx[p++] = a;
      idx[p++] = d;
      idx[p++] = b;
      idx[p++] = b;
      idx[p++] = d;
      idx[p++] = c;
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}
