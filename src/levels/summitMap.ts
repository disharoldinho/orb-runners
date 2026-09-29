import { Euler, Matrix4 } from 'three';
import {
  BlockDef,
  BlockTheme,
  BoostPadDef,
  BumperDef,
  CheckpointDef,
  GemDef,
  JumpPadDef,
  KillZoneDef,
  LevelData,
  MovingPlatformDef,
  RotatingHazardDef,
  SkyPreset,
  SwitchBridgeDef,
  Vec3,
  WindZoneDef,
} from '../types/level';

/**
 * REACH THE SUMMIT — one continuous 250m climb up a spiral mountain road.
 *
 * The road winds clockwise around a central mountain; every loop sits 25-30m
 * above the previous one, so nothing higher up is ever reachable except by
 * following the road. Nine themed stages, each with its own mechanic, are
 * separated by full-width Base Camp gates that must be crossed in order.
 *
 * Anti-skip rules baked into the builder (and checked by scripts/verifySummit.mjs):
 * - every straight and ramp has continuous 1.2m+ guardrails, every corner a 1.8m
 *   outer wall; narrowing/widening edges get end caps
 * - uphill ramps are 1:5 (11.3°, < 14°); boost pads only sit on ramps
 * - jump pads always use targetPosition + arcHeight and land on the next terrace
 *   of the same stage
 * - falling more than `respawnFallDepth` below your last camp respawns you there,
 *   and lava/chasm kill zones catch the rest
 *
 * AGENTS.md: after changing this file run `npm run summit:waypoints` so the
 * server-side bots (server/summitWaypoints.json) follow the new road.
 */

export const SUMMIT_LEVEL_ID = 999;

export interface SummitPhaseInfo {
  id: number;
  name: string;
  subtitle: string;
  /** One-line description of the stage's signature challenge. */
  challenge: string;
  minAltitudeM: number;
  maxAltitudeM: number;
  skyPreset: SkyPreset;
  accentColor: string;
  theme: BlockTheme;
}

const STAGE_RISES = [25, 25, 28, 28, 28, 30, 28, 28, 30]; // = 250m

const STAGE_INFO: Omit<SummitPhaseInfo, 'id' | 'minAltitudeM' | 'maxAltitudeM'>[] = [
  {
    name: 'STAGE 1 • MEADOW FOOTHILLS',
    subtitle: 'Grassy terraces and spring pads',
    challenge: 'Spring Terraces: aim for the spring pads to vault up to the next terrace',
    skyPreset: 'day',
    accentColor: '#10b981',
    theme: 'meadow',
  },
  {
    name: 'STAGE 2 • WHISPERING FOREST',
    subtitle: 'Stacked hairpin switchbacks through the birches',
    challenge: 'Switchbacks: narrow hairpins with tree-trunk slaloms on every climb',
    skyPreset: 'forest',
    accentColor: '#84cc16',
    theme: 'forest',
  },
  {
    name: 'STAGE 3 • CRYSTAL CAVERNS',
    subtitle: 'Amethyst halls ringing with crystal bumpers',
    challenge: 'Pinball Halls: thread chambers of crystal bumpers without being knocked back',
    skyPreset: 'cave',
    accentColor: '#d946ef',
    theme: 'crystal',
  },
  {
    name: 'STAGE 4 • SUNSCORCH CANYON',
    subtitle: 'Sky-ferries over the desert gorge',
    challenge: 'Canyon Ferries: time your ride on shuttling and rising platforms',
    skyPreset: 'desert',
    accentColor: '#f59e0b',
    theme: 'sand',
  },
  {
    name: 'STAGE 5 • FROSTBITE SLOPES',
    subtitle: 'Glassy ice shelves over the abyss',
    challenge: 'Black Ice: near-frictionless, cambered shelves with no outer rail',
    skyPreset: 'glacier',
    accentColor: '#7dd3fc',
    theme: 'ice',
  },
  {
    name: 'STAGE 6 • GALE CLIFFS',
    subtitle: 'Windmill sweepers on the cliff road',
    challenge: 'Sweepers: dodge spinning bars and cross the chasm on a turning bridge',
    skyPreset: 'gale',
    accentColor: '#93c5fd',
    theme: 'citadel',
  },
  {
    name: 'STAGE 7 • MOLTEN CALDERA',
    subtitle: 'Basalt causeways over rivers of lava',
    challenge: 'Lava Switches: hit switches to raise bridges and hop sinking basalt',
    skyPreset: 'volcano',
    accentColor: '#f97316',
    theme: 'lava',
  },
  {
    name: 'STAGE 8 • STORM PEAK',
    subtitle: 'Exposed catwalks in a howling gale',
    challenge: 'Gusts: hold your line on narrow catwalks while gusts shove you outward',
    skyPreset: 'storm',
    accentColor: '#67e8f9',
    theme: 'storm',
  },
  {
    name: 'STAGE 9 • CELESTIAL CROWN',
    subtitle: 'The cloud stairway to the golden crown',
    challenge: 'Cloud Stairway: ride rising cloud steps in rhythm to the 250m summit',
    skyPreset: 'summit',
    accentColor: '#fbbf24',
    theme: 'cloud',
  },
];

export const SUMMIT_PHASES: SummitPhaseInfo[] = (() => {
  let alt = 0;
  return STAGE_INFO.map((info, i) => {
    const phase = { ...info, id: i + 1, minAltitudeM: alt, maxAltitudeM: alt + STAGE_RISES[i] };
    alt += STAGE_RISES[i];
    return phase;
  });
})();

export const SUMMIT_TARGET_ALTITUDE_M = STAGE_RISES.reduce((a, b) => a + b, 0);

/** Stage for a number of Base Camps already crossed (camp N opens stage N+1). */
export function getSummitStageByCamps(campsCrossed: number): SummitPhaseInfo {
  return SUMMIT_PHASES[Math.max(0, Math.min(SUMMIT_PHASES.length - 1, campsCrossed))];
}

export function getSummitPhaseForAltitude(altM: number): SummitPhaseInfo {
  for (let i = SUMMIT_PHASES.length - 1; i >= 0; i--) {
    if (altM >= SUMMIT_PHASES[i].minAltitudeM) {
      return SUMMIT_PHASES[i];
    }
  }
  return SUMMIT_PHASES[0];
}

// ---------------------------------------------------------------------------
// Route builder
// ---------------------------------------------------------------------------

/** Heading 0 = -Z, 1 = +X, 2 = +Z, 3 = -X (clockwise, right turns). */
type Heading = 0 | 1 | 2 | 3;
const FWD: [number, number][] = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];
const yawOf = (h: Heading) => (-h * Math.PI) / 2;
const r2 = (n: number) => Math.round(n * 100) / 100;
const r4 = (n: number) => Math.round(n * 10000) / 10000;

/** Euler XYZ for yaw(heading) * pitch * roll (roll > 0 raises the right/inner side). */
function rot(h: Heading, pitch = 0, roll = 0): Vec3 {
  if (pitch === 0 && roll === 0) return [0, r4(yawOf(h)), 0];
  const m = new Matrix4()
    .makeRotationY(yawOf(h))
    .multiply(new Matrix4().makeRotationX(pitch))
    .multiply(new Matrix4().makeRotationZ(roll));
  const e = new Euler().setFromRotationMatrix(m, 'XYZ');
  return [r4(e.x), r4(e.y), r4(e.z)];
}

export const MAX_RAMP_SLOPE_DEG = 11.4;
const DECK = 0.8; // floor block thickness; floor level F = block centre, surface = F + 0.4
const RAIL = 1.2;
const CORNER_WALL = 1.8;

/** Walkable piece metadata, exported for scripts/verifySummit.mjs. */
export interface SummitRoutePiece {
  id: string;
  stage: number; // 1..9
  order: number; // sequence along the road
  kind: 'flat' | 'ramp' | 'corner' | 'camp' | 'moving' | 'bridge';
  center: Vec3;
  size: Vec3;
  rotation: Vec3;
  heading: Heading;
  slopeDeg: number;
  boosted: boolean;
}

interface PieceOpts {
  width?: number;
  rails?: BlockDef['rails'];
  railH?: number;
  theme?: BlockTheme;
  surface?: BlockDef['surface'];
  roll?: number;
  boost?: boolean;
  id?: string;
}

class RouteBuilder {
  x = 0;
  z = 0;
  F = 0;
  h: Heading = 0;
  W = 9;
  theme: BlockTheme = 'meadow';
  accent = '#10b981';
  stage = 1;
  order = 0;
  private n = 0;
  private usedIds = new Set<string>();
  private lastEndWidth: number | null = null;

  blocks: BlockDef[] = [];
  boostPads: BoostPadDef[] = [];
  jumpPads: JumpPadDef[] = [];
  bumpers: BumperDef[] = [];
  rotatingHazards: RotatingHazardDef[] = [];
  movingPlatforms: MovingPlatformDef[] = [];
  switchBridges: SwitchBridgeDef[] = [];
  checkpoints: CheckpointDef[] = [];
  gems: GemDef[] = [];
  killZones: KillZoneDef[] = [];
  windZones: WindZoneDef[] = [];
  waypoints: Vec3[] = [];
  pieces: SummitRoutePiece[] = [];
  cornerPads: { x: number; z: number; h: Heading; stage: number; F: number; W: number }[] = [];

  id(tag: string) {
    this.n += 1;
    return `sum-s${this.stage}-${tag}-${this.n}`;
  }

  f() {
    return FWD[this.h];
  }
  r() {
    return FWD[(this.h + 1) % 4];
  }
  /** World point `a` metres ahead and `l` metres to the right of the cursor. */
  at(a: number, l = 0, y = this.F): Vec3 {
    const [fx, fz] = this.f();
    const [rx, rz] = this.r();
    return [r2(this.x + fx * a + rx * l), r2(y), r2(this.z + fz * a + rz * l)];
  }
  advance(a: number) {
    const [fx, fz] = this.f();
    this.x = r2(this.x + fx * a);
    this.z = r2(this.z + fz * a);
  }
  wp(a: number, l = 0, floor = this.F) {
    this.waypoints.push(this.at(a, l, r2(floor + 1.0)));
  }
  private wpAlong(len: number, floorAt: (a: number) => number) {
    const steps = Math.max(1, Math.ceil(len / 8));
    for (let i = 1; i <= steps; i++) {
      const a = (len * i) / steps;
      this.wp(a, 0, floorAt(a));
    }
  }

  /** Close off exposed edges where the road narrows or widens. */
  private widthCap(newW: number) {
    const prev = this.lastEndWidth;
    this.lastEndWidth = newW;
    if (prev === null || Math.abs(prev - newW) < 0.05) return;
    const outer = Math.max(prev, newW) / 2;
    const inner = Math.min(prev, newW) / 2;
    const capLen = outer - inner;
    // Cap sits on the side of the wider piece, at the junction line.
    const a = prev > newW ? -0.15 : 0.15;
    for (const side of [-1, 1]) {
      const l = side * (inner + capLen / 2);
      this.blocks.push({
        id: this.id('cap'),
        position: this.at(a, l, r2(this.F + DECK / 2 + RAIL / 2)),
        size: [r2(capLen), RAIL, 0.3],
        rotation: rot(this.h),
        theme: this.theme,
      });
    }
  }

  private record(
    kind: SummitRoutePiece['kind'],
    id: string,
    center: Vec3,
    size: Vec3,
    rotation: Vec3,
    slopeDeg = 0,
    boosted = false,
  ) {
    this.pieces.push({
      id,
      stage: this.stage,
      order: this.order++,
      kind,
      center,
      size,
      rotation,
      heading: this.h,
      slopeDeg,
      boosted,
    });
  }

  flat(len: number, o: PieceOpts = {}) {
    this.splitRun(len, (part) => this.rawFlat(part, o));
  }

  private rawFlat(len: number, o: PieceOpts = {}) {
    const W = o.width ?? this.W;
    this.widthCap(W);
    const id = o.id && !this.usedIds.has(o.id) ? o.id : this.id('flat');
    this.usedIds.add(id);
    const center = this.at(len / 2);
    const size: Vec3 = [W, DECK, r2(len)];
    const rotation = rot(this.h, 0, o.roll ?? 0);
    this.blocks.push({
      id,
      position: center,
      size,
      rotation,
      theme: o.theme ?? this.theme,
      rails: o.rails ?? 'both',
      railHeight: o.railH ?? RAIL,
      surface: o.surface,
    });
    this.record('flat', id, center, size, rotation);
    this.wpAlong(len, () => this.F);
    this.advance(len);
  }

  /** Straight uphill ramp; slope must stay under MAX_RAMP_SLOPE_DEG (AGENTS.md: < 14°). */
  ramp(run: number, rise: number, o: PieceOpts = {}) {
    const slope = rise / run;
    this.splitRun(run, (part) => this.rawRamp(part, r2(part * slope), o));
  }

  private rawRamp(run: number, rise: number, o: PieceOpts = {}) {
    const W = o.width ?? this.W;
    this.widthCap(W);
    const pitch = Math.atan2(rise, run);
    const slopeDeg = (pitch * 180) / Math.PI;
    if (slopeDeg > MAX_RAMP_SLOPE_DEG) {
      throw new Error(`Summit ramp too steep: ${slopeDeg.toFixed(2)}°`);
    }
    const id = this.id('ramp');
    const F0 = this.F;
    const center = this.at(run / 2, 0, r2(F0 + rise / 2 - 0.03));
    const size: Vec3 = [W, DECK, r2(Math.hypot(run, rise) + 0.4)];
    const rotation = rot(this.h, pitch, o.roll ?? 0);
    this.blocks.push({
      id,
      position: center,
      size,
      rotation,
      theme: o.theme ?? this.theme,
      rails: o.rails ?? 'both',
      railHeight: o.railH ?? RAIL,
      surface: o.surface,
    });
    const boosted = o.boost !== false && run >= 12;
    if (boosted) {
      for (const frac of [0.14, 0.56]) {
        this.boostPads.push({
          id: this.id('bp'),
          position: this.at(run * frac, 0, r2(F0 + rise * frac + 0.42)),
          rotation: rot(this.h, pitch),
          size: [Math.min(3.8, W - 1.6), 5.0],
          force: 20,
          color: this.accent,
        });
      }
    }
    this.record('ramp', id, center, size, rotation, slopeDeg, boosted);
    this.wpAlong(run, (a) => F0 + (rise * a) / run);
    this.F = r2(F0 + rise);
    this.advance(run);
  }

  /** 1:5 climb (11.3°). */
  climb(rise: number, o: PieceOpts = {}) {
    this.ramp(rise * 5, rise, o);
  }

  /** Square corner pad with walls on the outer sides, then turn. */
  corner(dir: 'R' | 'L', o: { theme?: BlockTheme; wallH?: number } = {}) {
    const W = this.W;
    this.widthCap(W);
    const id = this.id('corner');
    const center = this.at(W / 2);
    const size: Vec3 = [W, DECK, W];
    const rotation = rot(this.h);
    this.blocks.push({ id, position: center, size, rotation, theme: o.theme ?? this.theme });
    const wallH = o.wallH ?? CORNER_WALL;
    const wy = r2(this.F + DECK / 2 + wallH / 2);
    // Front wall
    this.blocks.push({
      id: this.id('wall'),
      position: this.at(W + 0.15, 0, wy),
      size: [r2(W + 0.6), wallH, 0.3],
      rotation,
      theme: o.theme ?? this.theme,
    });
    // Outer side wall (left for a right turn, right for a left turn)
    const side = dir === 'R' ? -1 : 1;
    this.blocks.push({
      id: this.id('wall'),
      position: this.at(W / 2, side * (W / 2 + 0.15), wy),
      size: [0.3, wallH, r2(W + 0.6)],
      rotation,
      theme: o.theme ?? this.theme,
    });
    this.record('corner', id, center, size, rotation);
    if (dir === 'R' && this.atomic === 0) {
      this.cornerPads.push({
        x: center[0],
        z: center[2],
        h: this.h,
        stage: this.stage,
        F: this.F,
        W,
      });
    }
    this.waypoints.push([center[0], r2(this.F + 1.0), center[2]]);
    // Pivot on the pad centre.
    this.x = center[0];
    this.z = center[2];
    this.h = ((this.h + (dir === 'R' ? 1 : 3)) % 4) as Heading;
    this.advance(W / 2);
  }

  // ---- Spiral skeleton ------------------------------------------------------
  // Every side of the mountain spiral has a target length (tapering upward). Plain
  // flats/ramps split across a corner when a side is full; features are wrapped in
  // atom() so a corner is inserted before them instead of through them.
  targets: number[] = [];
  sideIdx = 0;
  sideStart = { x: 0, z: 0 };
  private atomic = 0;
  sideLens: number[] = [];

  private sideDone() {
    const [fx, fz] = this.f();
    return r2((this.x - this.sideStart.x) * fx + (this.z - this.sideStart.z) * fz);
  }
  remaining() {
    const t = this.targets[this.sideIdx] ?? Infinity;
    return r2(t - this.sideDone());
  }

  /** Spiral corner: pad the side to its target length, then turn right. */
  turn() {
    const rem = this.remaining();
    if (Number.isFinite(rem) && rem > 0.05) {
      this.atomic++;
      this.flat(rem);
      this.atomic--;
    }
    this.sideLens.push(this.sideDone());
    this.corner('R', { wallH: this.cornerWallH });
    this.sideIdx += 1;
    this.sideStart = { x: this.x, z: this.z };
  }
  cornerWallH = CORNER_WALL;

  /** Run a feature that must not be split by a corner (forward length `len`). */
  atom(len: number, fn: () => void) {
    if (this.atomic === 0 && this.remaining() < len) this.turn();
    this.atomic++;
    fn();
    this.atomic--;
  }

  /** Split a splittable piece of length `len` across spiral corners. */
  private splitRun(len: number, piece: (part: number) => void) {
    if (this.atomic > 0) {
      piece(len);
      return;
    }
    let left = len;
    while (left > 0.05) {
      let rem = this.remaining();
      if (rem < 3) {
        this.turn();
        continue;
      }
      if (left <= rem) {
        piece(r2(left));
        return;
      }
      let part = rem;
      if (left - part < 3) part = left - 3;
      if (part < 3) {
        this.turn();
        continue;
      }
      piece(r2(part));
      left = r2(left - part);
      this.turn();
    }
  }

  /** Empty span (void) — crossed by jump pads or moving platforms. */
  gap(len: number) {
    this.lastEndWidth = null;
    const steps = Math.max(1, Math.ceil(len / 6));
    for (let i = 1; i <= steps; i++) this.wp((len * i) / steps);
    this.advance(len);
  }

  /** Base Camp plaza with a full-width, order-enforced gate. */
  camp(order: number, nextStageName: string) {
    const len = 16;
    const W = this.W;
    this.widthCap(W);
    const id = `sum-camp-${order}`;
    const center = this.at(len / 2);
    const size: Vec3 = [W, DECK, len];
    const rotation = rot(this.h);
    this.blocks.push({
      id,
      position: center,
      size,
      rotation,
      theme: 'gold',
      rails: 'both',
      railHeight: RAIL,
    });
    this.record('camp', id, center, size, rotation);
    this.checkpoints.push({
      id: `sum-cp-${order}`,
      order,
      position: this.at(len / 2, 0, r2(this.F + DECK / 2)),
      rotation: [0, r4(yawOf(this.h)), 0],
      respawnYaw: r4(yawOf(this.h)),
      width: W,
      label: `CAMP ${order} (${Math.round(this.F)}M) • ${nextStageName}`,
    });
    // Decorative camp banners outside the rails
    for (const side of [-1, 1]) {
      this.blocks.push({
        id: this.id('banner'),
        position: this.at(len / 2, side * (W / 2 + 0.9), r2(this.F + 3.0)),
        size: [1.2, 6.0, 1.2],
        rotation,
        theme: 'gold',
      });
    }
    this.wpAlong(len, () => this.F);
    this.advance(len);
  }

  gem(a: number, l = 0) {
    this.gems.push({
      id: this.id('gem'),
      position: this.at(a, l, r2(this.F + 1.6)),
      timeBonusMs: 2000,
    });
  }

  /** Decorative scenery block (no collider). */
  decor(position: Vec3, size: Vec3, theme: BlockTheme, rotation: Vec3 = [0, 0, 0]) {
    this.blocks.push({ id: this.id('decor'), position, size, rotation, theme, decorative: true });
  }

  /** Extra walkable surface that isn't a simple flat (moving platform / bridge) for verification. */
  recordExtra(kind: SummitRoutePiece['kind'], id: string, center: Vec3, size: Vec3) {
    this.record(kind, id, center, size, rot(this.h));
  }

  startStage(stage: number) {
    this.stage = stage;
    const info = SUMMIT_PHASES[stage - 1];
    this.theme = info.theme;
    this.accent = info.accentColor;
  }
}

// ---------------------------------------------------------------------------
// Stage layouts
// ---------------------------------------------------------------------------

/** Spiral side lengths, tapering toward the top of the mountain. */
const SIDE_TARGETS = Array.from({ length: 60 }, (_, k) => Math.max(56, 96 - 1.8 * k));

function buildSummitLevel() {
  const b = new RouteBuilder();
  b.targets = SIDE_TARGETS;
  const spawn: Vec3 = [0, 1.0, 0];

  // Start plaza: z = +6 .. -14, spawn at the origin looking toward -Z.
  b.z = 6;
  b.sideStart = { x: 0, z: 6 };
  b.waypoints.push(spawn);
  b.startStage(1);

  const PLAT_T = 0.75;
  const platY = (F: number) => r2(F + DECK / 2 - PLAT_T / 2);
  const isX = () => b.h === 1 || b.h === 3;

  // ===== STAGE 1 • MEADOW FOOTHILLS (0 → 25m): Spring Terraces =====
  // Spring pads are deterministic ballistic launchers (targetPosition + arcHeight).
  // A 5m-wide funnel makes it impossible to roll past a pad; each lands on the next
  // terrace 5m higher, far below anything in the next stage.
  const springHop = (gapLen: number, rise: number, terraceLen: number) =>
    b.atom(10 + gapLen + terraceLen, () => {
      b.flat(10, { width: 5 });
      const padAt = b.at(-5, 0, r2(b.F + 0.45));
      const landF = r2(b.F + rise);
      b.jumpPads.push({
        id: b.id('spring'),
        position: padAt,
        targetPosition: b.at(gapLen + 4.5, 0, r2(landF + 0.4)),
        arcHeight: 2.6,
        radius: 2.2,
        color: b.accent,
      });
      b.gap(gapLen);
      b.F = landF;
      b.flat(terraceLen);
    });

  b.atom(20, () => b.flat(20, { id: 'sum-base-plaza', theme: 'gold' }));
  b.climb(5);
  b.flat(6);
  b.gem(3);
  springHop(8, 5, 14);
  b.climb(5);
  b.flat(4);
  springHop(8, 5, 12);
  b.climb(3);
  b.climb(2);

  // ===== STAGE 2 • WHISPERING FOREST (25 → 50m): Switchbacks =====
  b.camp(1, 'WHISPERING FOREST');
  b.startStage(2);
  b.W = 7;
  // Birch trunks (static pillars) staggered across a climb.
  const trees = (run: number, rise: number) => {
    const F0 = b.F;
    for (const [frac, lat] of [
      [0.28, 1.5],
      [0.52, -1.5],
      [0.76, 1.5],
    ] as const) {
      const surf = F0 + rise * frac + 0.4;
      b.blocks.push({
        id: b.id('trunk'),
        position: b.at(run * frac, lat, r2(surf + 2.4)),
        size: [1.0, 5.0, 1.0],
        rotation: rot(b.h),
        theme: 'sand',
      });
      b.decor(b.at(run * frac, lat, r2(surf + 5.6)), [3.2, 2.2, 3.2], 'forest', rot(b.h));
    }
  };
  const forestClimb = () =>
    b.atom(25, () => {
      trees(25, 5);
      b.ramp(25, 5, { railH: 1.4, boost: false });
    });
  // Stacked switchback: up, hairpin, back up, hairpin, up again directly above the
  // first ramp (10m overhead), then continue forward over the far hairpin.
  b.flat(4);
  b.atom(34, () => {
    forestClimb();
    b.corner('L');
    b.corner('L');
    forestClimb();
    b.corner('L');
    b.corner('L');
    forestClimb();
  });
  b.flat(10);
  b.gem(4);
  forestClimb();
  b.flat(6);
  forestClimb();

  // ===== STAGE 3 • CRYSTAL CAVERNS (50 → 78m): Pinball Halls =====
  b.W = 10;
  b.cornerWallH = 2.6;
  b.camp(2, 'CRYSTAL CAVERNS');
  b.startStage(3);
  const crystalHall = (len: number, pattern: [number, number][]) =>
    b.atom(len, () => {
      const F0 = b.F;
      for (const [fa, lat] of pattern) {
        b.bumpers.push({
          id: b.id('crystal-bumper'),
          position: b.at(len * fa, lat, r2(F0 + 0.85)),
          radius: 0.9,
        });
      }
      // Crystal spires outside the hall walls
      for (const [fa, side] of [
        [0.15, -1],
        [0.5, 1],
        [0.85, -1],
      ] as const) {
        b.decor(b.at(len * fa, side * (b.W / 2 + 1.6), r2(F0 + 2.2)), [1.4, 6.5, 1.4], 'crystal', [
          0.18 * side,
          0.6,
          0.12,
        ]);
      }
      b.flat(len, { railH: 2.4 });
    });
  const CAVE = { railH: 2.4 };
  crystalHall(20, [
    [0.25, 0],
    [0.5, -2.8],
    [0.5, 2.8],
    [0.75, 0],
  ]);
  b.climb(7, CAVE);
  crystalHall(22, [
    [0.2, -2.6],
    [0.2, 2.6],
    [0.45, 0],
    [0.7, -3.0],
    [0.7, 3.0],
    [0.88, 0],
  ]);
  b.climb(7, CAVE);
  b.climb(7, CAVE);
  crystalHall(20, [
    [0.2, 0],
    [0.4, -3.1],
    [0.4, 3.1],
    [0.6, 0],
    [0.8, -3.1],
    [0.8, 3.1],
  ]);
  b.climb(7, CAVE);

  // ===== STAGE 4 • SUNSCORCH CANYON (78 → 106m): Canyon Ferries =====
  b.W = 9;
  b.cornerWallH = CORNER_WALL;
  b.camp(3, 'SUNSCORCH CANYON');
  b.startStage(4);
  // Forward ferry: shuttles between the near and far ledge of a gorge.
  const forwardFerry = (gapLen: number, speed: number, phase = 0) =>
    b.atom(gapLen + 4, () => {
      const len = 6;
      const id = b.id('ferry');
      b.movingPlatforms.push({
        id,
        start: b.at(len / 2 + 0.05, 0, platY(b.F)),
        end: b.at(gapLen - len / 2 - 0.05, 0, platY(b.F)),
        size: [6, PLAT_T, len],
        speed,
        phaseOffset: phase,
        theme: 'warning',
      });
      b.recordExtra('moving', id, b.at(gapLen / 2, 0, b.F), [6, DECK, gapLen]);
      b.gap(gapLen);
      b.flat(4);
    });
  // Rising ferry: carries you diagonally up to a ledge `rise` metres higher.
  const risingFerry = (gapLen: number, rise: number, speed: number) =>
    b.atom(gapLen + 4, () => {
      const len = 6;
      const id = b.id('lift');
      b.movingPlatforms.push({
        id,
        start: b.at(len / 2 + 0.05, 0, platY(b.F)),
        end: b.at(gapLen - len / 2 - 0.05, 0, platY(b.F + rise)),
        size: [6.5, PLAT_T, len],
        speed,
        theme: 'warning',
      });
      b.recordExtra('moving', id, b.at(gapLen / 2, 0, r2(b.F + rise / 2)), [6.5, DECK, gapLen]);
      b.gap(gapLen);
      b.F = r2(b.F + rise);
      b.flat(4);
    });
  // Lateral shuttle: a long plank sliding sideways across the gorge; board it when aligned.
  const lateralShuttle = (gapLen: number, speed: number) =>
    b.atom(gapLen + 4, () => {
      const id = b.id('shuttle');
      const c = gapLen / 2;
      b.movingPlatforms.push({
        id,
        start: b.at(c, -5.5, platY(b.F)),
        end: b.at(c, 5.5, platY(b.F)),
        size: isX() ? [r2(gapLen - 0.1), PLAT_T, 4.2] : [4.2, PLAT_T, r2(gapLen - 0.1)],
        speed,
        phaseOffset: Math.PI / 2,
        theme: 'warning',
      });
      b.recordExtra('moving', id, b.at(c, 0, b.F), [15, DECK, gapLen]);
      b.gap(gapLen);
      b.flat(4);
    });
  b.flat(4);
  forwardFerry(14, 0.8);
  b.flat(4);
  b.gem(2);
  risingFerry(10, 6, 0.75);
  b.climb(4);
  b.flat(4);
  lateralShuttle(12, 0.7);
  b.flat(4);
  b.climb(4);
  b.flat(4);
  risingFerry(10, 6, 0.8);
  b.flat(2);
  forwardFerry(12, 0.9, 1.2);
  b.climb(4);
  b.climb(4);

  // ===== STAGE 5 • FROSTBITE SLOPES (106 → 134m): Black Ice =====
  b.camp(4, 'FROSTBITE SLOPES');
  b.startStage(5);
  b.W = 8;
  const ICE = { surface: 'ice' as const };
  // Cambered ice shelf banking toward the open outer edge (no rail there), with
  // short roll-in/roll-out segments so the centreline stays seamless.
  const camberShelf = (len: number, rollDeg: number) =>
    b.atom(len + 10, () => {
      const full = (rollDeg * Math.PI) / 180;
      for (const k of [0.34, 0.67]) b.flat(2.5, { ...ICE, roll: full * k, rails: 'right' });
      b.flat(len, { ...ICE, roll: full, rails: 'right' });
      for (const k of [0.67, 0.34]) b.flat(2.5, { ...ICE, roll: full * k, rails: 'right' });
    });
  b.climb(6, ICE);
  camberShelf(26, 9);
  b.flat(4, ICE);
  b.climb(6, ICE);
  b.flat(4, ICE);
  b.gem(2);
  camberShelf(22, 10);
  b.flat(4, ICE);
  b.climb(6, ICE);
  camberShelf(20, 11);
  b.flat(4, ICE);
  b.climb(5, ICE);
  b.climb(5, ICE);

  // ===== STAGE 6 • GALE CLIFFS (134 → 164m): Sweepers =====
  b.camp(5, 'GALE CLIFFS');
  b.startStage(6);
  b.W = 8;
  const sweeperAlley = (len: number, spins: number[]) =>
    b.atom(len, () => {
      const F0 = b.F;
      spins.forEach((w, i) => {
        b.rotatingHazards.push({
          id: b.id('sweeper'),
          position: b.at((len * (i + 1)) / (spins.length + 1), 0, r2(F0 + DECK / 2 + 0.45)),
          size: [b.W - 1.0, 0.55, 0.55],
          angularVelocity: [0, w, 0],
          type: 'hazard',
          color: '#f43f5e',
        });
      });
      b.flat(len);
    });
  // Windmill: a long blade turning about the road axis, sweeping down to the deck.
  const windmill = (len: number, w: number) =>
    b.atom(len, () => {
      const F0 = b.F;
      b.rotatingHazards.push({
        id: b.id('windmill'),
        position: b.at(len / 2, 0, r2(F0 + DECK / 2 + 4.9)),
        size: isX() ? [0.6, 0.6, 9.4] : [9.4, 0.6, 0.6],
        angularVelocity: isX() ? [w, 0, 0] : [0, 0, w],
        type: 'hazard',
        color: '#e2e8f0',
      });
      b.blocks.push({
        id: b.id('mast'),
        position: b.at(len / 2, -(b.W / 2 + 0.7), r2(F0 + 3.0)),
        size: [0.8, 5.2, 0.8],
        rotation: rot(b.h),
        theme: 'citadel',
      });
      b.flat(len);
    });
  // Spinning cross-bridge over an open chasm.
  const turningBridge = (gapLen: number, w: number) =>
    b.atom(gapLen + 8, () => {
      b.flat(4);
      const id = b.id('xbridge');
      b.rotatingHazards.push({
        id,
        position: b.at(gapLen / 2, 0, r2(b.F + DECK / 2 - 0.35)),
        size: [3.6, 0.7, r2(gapLen - 0.2)],
        angularVelocity: [0, w, 0],
        type: 'cross-bridge',
        color: b.accent,
      });
      b.recordExtra('bridge', id, b.at(gapLen / 2, 0, b.F), [gapLen, DECK, gapLen]);
      b.gap(gapLen);
      b.flat(4);
    });
  sweeperAlley(28, [1.5, -1.8]);
  b.climb(6);
  turningBridge(16, 0.55);
  b.gem(-2);
  b.climb(6);
  sweeperAlley(30, [1.9, -2.1, 2.3]);
  b.climb(6);
  windmill(14, 1.3);
  b.climb(6);
  b.climb(6);

  // ===== STAGE 7 • MOLTEN CALDERA (164 → 192m): Lava Switches =====
  b.camp(6, 'MOLTEN CALDERA');
  b.startStage(7);
  b.W = 9;
  const lavaUnder = (a0: number, len: number, width: number) => {
    b.killZones.push({
      id: b.id('lava'),
      position: b.at(a0 + len / 2, 0, r2(b.F - 2.0)),
      size: isX() ? [r2(len + 1.0), 2.0, width] : [width, 2.0, r2(len + 1.0)],
      visual: 'lava',
    });
  };
  // Switch moat: the bridge only rises once you roll over the switch on the approach.
  const switchMoat = (gapLen: number, switchSide: number) =>
    b.atom(12 + gapLen + 4, () => {
      b.flat(12);
      const id = b.id('switch');
      b.switchBridges.push({
        id,
        switchPosition: b.at(-6, switchSide * 2.9, r2(b.F + DECK / 2 - 0.02)),
        bridgePosition: b.at(gapLen / 2, 0, b.F),
        bridgeSize: isX() ? [r2(gapLen + 0.6), 0.75, 4.6] : [4.6, 0.75, r2(gapLen + 0.6)],
        color: '#fb923c',
      });
      b.recordExtra('bridge', id, b.at(gapLen / 2, 0, b.F), [4.6, DECK, gapLen]);
      lavaUnder(0, gapLen, b.W + 8);
      b.gap(gapLen);
      b.flat(4);
    });
  // Sinking basalt stepping stones that dip into the lava on a cycle.
  const sinkingStones = (count: number, speed: number) => {
    const stone = 4.6;
    const gapLen = r2(count * stone + (count + 1) * 0.5);
    b.atom(gapLen + 4, () => {
      for (let i = 0; i < count; i++) {
        const a = 0.5 + stone / 2 + i * (stone + 0.5);
        const top = b.at(a, 0, platY(b.F));
        const id = b.id('basalt');
        b.movingPlatforms.push({
          id,
          start: top,
          end: [top[0], r2(top[1] - 2.9), top[2]],
          size: isX() ? [stone, PLAT_T, 5] : [5, PLAT_T, stone],
          speed,
          phaseOffset: -i * 1.6, // each stone crests just after the one behind it: a forward "wave"
          theme: 'lava',
        });
        b.recordExtra('moving', id, b.at(a, 0, b.F), [5, DECK, stone]);
      }
      lavaUnder(0, gapLen, b.W + 8);
      b.gap(gapLen);
      b.flat(4);
    });
  };
  b.climb(7);
  switchMoat(12, -1);
  b.flat(4);
  sinkingStones(3, 1.1);
  b.climb(7);
  b.gem(-3);
  switchMoat(12, 1);
  b.climb(7);
  b.climb(7);

  // ===== STAGE 8 • STORM PEAK (192 → 220m): Gusts =====
  b.camp(7, 'STORM PEAK');
  b.startStage(8);
  b.W = 8;
  // Narrow catwalk with gusts pushing toward the open (outer/left) edge.
  const gustCatwalk = (len: number, accel: number, period: number, phase: number, rods: number[]) =>
    b.atom(len + 3, () => {
      const cw = 5;
      b.flat(1.5);
      const F0 = b.F;
      const [rx, rz] = b.r();
      b.windZones.push({
        id: b.id('gust'),
        position: b.at(len / 2, 0, r2(F0 + DECK / 2 + 1.6)),
        size: isX() ? [len, 3.2, cw + 1] : [cw + 1, 3.2, len],
        force: [r2(-rx * accel), 0, r2(-rz * accel)],
        gustPeriod: period,
        gustPhase: phase,
        color: '#cffafe',
      });
      for (const fa of rods) {
        b.bumpers.push({
          id: b.id('rod'),
          position: b.at(len * fa, 0.4, r2(F0 + 0.85)),
          radius: 0.7,
        });
      }
      b.flat(len, { width: cw, rails: 'right' });
      b.flat(1.5);
    });
  b.climb(7);
  gustCatwalk(34, 4.2, 4.2, 0, [0.35, 0.7]);
  b.climb(7);
  b.gem(-6);
  gustCatwalk(30, 4.6, 3.6, 1.3, [0.3, 0.6, 0.85]);
  b.climb(7);
  b.climb(7);

  // ===== STAGE 9 • CELESTIAL CROWN (220 → 250m): Cloud Stairway =====
  b.camp(8, 'CELESTIAL CROWN');
  b.startStage(9);
  b.W = 9;
  // Rising cloud steps: step i rides between +3i and +3(i+1). Neighbours are half a
  // cycle apart, so each step is level with the next one at the top of its travel.
  const cloudStairway = (steps: number, stepRise: number, speed: number) => {
    const size = 4.8;
    const pitch = size + 0.4;
    const gapLen = r2(0.4 + steps * pitch);
    b.atom(gapLen + 4, () => {
      const F0 = b.F;
      for (let i = 0; i < steps; i++) {
        const a = 0.4 + size / 2 + i * pitch;
        const lo = b.at(a, 0, platY(F0 + i * stepRise));
        const id = b.id('cloud-step');
        b.movingPlatforms.push({
          id,
          start: lo,
          end: [lo[0], r2(lo[1] + stepRise), lo[2]],
          size: [size, PLAT_T, size],
          speed,
          phaseOffset: i % 2 === 0 ? 0 : Math.PI,
          theme: 'cloud',
        });
        b.recordExtra('moving', id, b.at(a, 0, r2(F0 + i * stepRise + stepRise / 2)), [
          size,
          DECK,
          size,
        ]);
      }
      b.gap(gapLen);
      b.F = r2(F0 + steps * stepRise);
      b.flat(4);
    });
  };
  b.climb(6);
  b.flat(4);
  cloudStairway(4, 3, 1.0);
  b.flat(4);
  b.gem(2);
  b.climb(6);
  b.flat(4);
  b.climb(6);
  // Golden Crown plaza + goal
  let goalPosition: Vec3 = [0, 0, 0];
  b.atom(26, () => {
    b.W = 12;
    b.flat(26, { id: 'sum-crown-plaza', theme: 'gold', railH: 1.4 });
    goalPosition = b.at(-6, 0, r2(b.F + DECK / 2));
    for (const side of [-1, 1]) {
      b.blocks.push({
        id: b.id('crown-pillar'),
        position: b.at(-6, side * 7.2, r2(b.F + 3.4)),
        size: [1.6, 6.8, 1.6],
        rotation: rot(b.h),
        theme: 'gold',
      });
    }
    // Back wall so nobody rolls off the top of the world.
    b.blocks.push({
      id: 'sum-crown-backwall',
      position: b.at(0.15, 0, r2(b.F + DECK / 2 + 1.2)),
      size: [12.6, 2.4, 0.3],
      rotation: rot(b.h),
      theme: 'gold',
    });
  });

  // ---------------------------------------------------------------------------
  // Mountain core (decorative, no collider): one block per spiral loop, bounded by
  // the inner edges of that loop's four corners and topped just under the next
  // loop's road, so the mountain steps inward as it rises.
  // ---------------------------------------------------------------------------
  const pads = b.cornerPads;
  const coreTheme = (F: number): BlockTheme =>
    F < 50
      ? 'forest'
      : F < 106
        ? 'sand'
        : F < 164
          ? 'ice'
          : F < 192
            ? 'lava'
            : F < 220
              ? 'storm'
              : 'cloud';
  let prevTop = -30;
  for (let j = 0; j + 3 < pads.length; j += 4) {
    const loop = pads.slice(j, j + 4);
    const next = pads.slice(j + 4, j + 8);
    let minX = -Infinity;
    let maxX = Infinity;
    let minZ = -Infinity;
    let maxZ = Infinity;
    for (const p of loop) {
      const hw = p.W / 2 + 1.2;
      if (p.h === 0) {
        minX = Math.max(minX, p.x + hw);
        minZ = Math.max(minZ, p.z + hw);
      } else if (p.h === 1) {
        maxX = Math.min(maxX, p.x - hw);
        minZ = Math.max(minZ, p.z + hw);
      } else if (p.h === 2) {
        maxX = Math.min(maxX, p.x - hw);
        maxZ = Math.min(maxZ, p.z - hw);
      } else {
        minX = Math.max(minX, p.x + hw);
        maxZ = Math.min(maxZ, p.z - hw);
      }
    }
    const top = next.length
      ? Math.min(...next.map((p) => p.F)) - 2
      : Math.max(...loop.map((p) => p.F)) + 4;
    if (maxX - minX > 4 && maxZ - minZ > 4 && top > prevTop + 2) {
      b.decor(
        [r2((minX + maxX) / 2), r2((prevTop + top) / 2), r2((minZ + maxZ) / 2)],
        [r2(maxX - minX), r2(top - prevTop), r2(maxZ - minZ)],
        coreTheme(top),
      );
      prevTop = top;
    }
  }

  const level: LevelData = {
    id: SUMMIT_LEVEL_ID,
    name: 'Reach the Summit',
    subtitle: `9 themed stages, one continuous ${SUMMIT_TARGET_ALTITUDE_M}m mountain climb`,
    difficulty: 5,
    skyPreset: 'day',
    accentColor: '#fbbf24',
    spawnPosition: spawn,
    initialYaw: 0,
    killPlaneY: -30,
    respawnFallDepth: 6,
    sequentialCheckpoints: true,
    goalPosition,
    goalRotation: [0, r4(yawOf(b.h)), 0],
    isSummitMode: true,
    summitTargetAltitudeM: SUMMIT_TARGET_ALTITUDE_M,
    medalTimesMs: {
      author: 240000,
      gold: 300000,
      silver: 420000,
      bronze: 600000,
    },
    checkpoints: b.checkpoints,
    blocks: b.blocks,
    boostPads: b.boostPads,
    jumpPads: b.jumpPads,
    bumpers: b.bumpers,
    rotatingHazards: b.rotatingHazards,
    movingPlatforms: b.movingPlatforms,
    switchBridges: b.switchBridges,
    gems: b.gems,
    killZones: b.killZones,
    windZones: b.windZones,
  };

  // Bot route: drop consecutive duplicates.
  const waypoints: Vec3[] = [];
  for (const p of b.waypoints) {
    const last = waypoints[waypoints.length - 1];
    if (!last || Math.hypot(p[0] - last[0], p[1] - last[1], p[2] - last[2]) > 0.5)
      waypoints.push(p);
  }

  return { level, waypoints, pieces: b.pieces, sideLens: b.sideLens, cornerPads: b.cornerPads };
}

const BuiltSummit = buildSummitLevel();
export const SUMMIT_MAP: LevelData = BuiltSummit.level;
export const SUMMIT_BOT_WAYPOINTS: Vec3[] = BuiltSummit.waypoints;
export const SUMMIT_ROUTE_PIECES: SummitRoutePiece[] = BuiltSummit.pieces;
export const SUMMIT_SIDE_LENGTHS: number[] = BuiltSummit.sideLens;
