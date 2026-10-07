export type Vec3 = [number, number, number];

export type BlockTheme =
  | 'meadow'
  | 'cobalt'
  | 'sunset'
  | 'cyber'
  | 'citadel'
  | 'warning'
  | 'gold'
  | 'ice'
  | 'forest'
  | 'crystal'
  | 'sand'
  | 'lava'
  | 'storm'
  | 'cloud';

export type SkyPreset =
  | 'day'
  | 'sunset'
  | 'neon'
  | 'aurora'
  | 'citadel'
  | 'forest'
  | 'cave'
  | 'desert'
  | 'glacier'
  | 'gale'
  | 'volcano'
  | 'storm'
  | 'summit';

export interface StaticBlockDef {
  id: string;
  position: Vec3;
  size: Vec3;
  rotation?: Vec3; // Euler angles in radians [rx, ry, rz]
  theme?: BlockTheme;
  /** Optional raised side rails along the local X edges (left/right of a Z-aligned path) */
  rails?: 'none' | 'both' | 'left' | 'right';
  railHeight?: number;
  /** Surface override. 'ice' = near-frictionless (combined with the orb using the Min rule). */
  surface?: 'normal' | 'ice';
  /** Purely visual block (no collider), e.g. distant scenery. */
  decorative?: boolean;
}

export interface MovingPlatformDef {
  id: string;
  start: Vec3;
  end: Vec3;
  size: Vec3;
  speed: number; // Oscillation frequency in rad/s
  phaseOffset?: number; // Initial phase in radians
  theme?: BlockTheme;
}

export interface RotatingHazardDef {
  id: string;
  position: Vec3;
  size: Vec3; // Dimensions of the spinning bar/bridge
  angularVelocity: Vec3; // [wx, wy, wz] in rad/s
  type: 'hazard' | 'bridge' | 'cross-bridge';
  color?: string;
}

export interface BumperDef {
  id: string;
  position: Vec3;
  radius?: number;
  height?: number;
  bounceImpulse?: number;
}

export interface SwitchBridgeDef {
  id: string;
  switchPosition: Vec3;
  bridgePosition: Vec3;
  bridgeSize: Vec3;
  bridgeRotation?: Vec3;
  color?: string;
}

export interface CollectibleGemDef {
  id: string;
  position: Vec3;
  timeBonusMs?: number; // Shaves time off the speedrun timer!
}

export interface CheckpointDef {
  id: string;
  order: number; // 1-indexed sector order (1, 2, 3...)
  position: Vec3;
  rotation?: Vec3;
  /** Optional custom label (e.g., "CAMP 2 — 90m" in Summit Mode) */
  label?: string;
  /** Respawn yaw in radians when respawning at this checkpoint (default 0 = looking toward -Z) */
  respawnYaw?: number;
  /** Gate width in metres (default 3.7). Summit camps span the full road so they can't be bypassed. */
  width?: number;
}

/** Box volume that sends the orb back to its last checkpoint (lava, chasms, shortcut catchers). */
export interface KillZoneDef {
  id: string;
  position: Vec3;
  size: Vec3;
  /** Optional visual: 'lava' draws a glowing molten surface on top; default is invisible. */
  visual?: 'none' | 'lava';
}

/** Region that pushes the orb with a (optionally pulsing) wind force. */
export interface WindZoneDef {
  id: string;
  position: Vec3;
  size: Vec3;
  /** World-space acceleration in m/s^2 while inside (applied as force * mass). */
  force: Vec3;
  /** If set, the wind gusts on/off with this period in seconds (50% duty, with a 0.6s telegraph). */
  gustPeriod?: number;
  gustPhase?: number;
  color?: string;
}

export type BlockDef = StaticBlockDef;
export type GemDef = CollectibleGemDef;

export interface BoostPadDef {
  id: string;
  position: Vec3;
  rotation?: Vec3;
  size?: Vec3 | [number, number]; // [sx, sy, sz] or [width, length]
  /** World-space unit direction vector [dx, dy, dz] to boost the orb */
  direction?: Vec3;
  impulse?: number; // default 16
  force?: number; // alias for impulse
  color?: string;
}

export interface JumpPadDef {
  id: string;
  position: Vec3;
  radius?: number; // default 1.25
  upwardImpulse?: number; // default 14.5 (ignored when targetPosition is set)
  impulseY?: number; // alias for upwardImpulse
  forwardImpulse?: number; // default 0
  direction?: Vec3; // default [0, 0, -1]
  /** Optional world-space landing target [tx, ty, tz] for deterministic ballistic launch! */
  targetPosition?: Vec3;
  /** Optional apex height above the higher of start/target Y (default 3.2m) */
  arcHeight?: number;
  color?: string;
}

export interface LevelData {
  id: number;
  name: string;
  subtitle: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  skyPreset: SkyPreset;
  accentColor: string;
  spawnPosition: Vec3;
  /** Initial camera yaw in radians (default 0 = looking toward -Z) */
  initialYaw?: number;
  killPlaneY: number;
  /**
   * If set, the orb also falls out when it drops this many metres below its
   * current respawn point (start or last checkpoint). Used by the Summit so a
   * fall never lands you on a lower part of the mountain.
   */
  respawnFallDepth?: number;
  /** Checkpoints must be crossed strictly in `order` (and all of them before the goal). */
  sequentialCheckpoints?: boolean;
  goalPosition: Vec3;
  goalRotation?: Vec3;
  /** If defined, the Goal Gate itself oscillates horizontally! */
  goalMovingRange?: Vec3;
  goalMovingSpeed?: number;
  /** True for the "Reach the Summit" multiplayer mountain climb */
  isSummitMode?: boolean;
  summitTargetAltitudeM?: number;
  medalTimesMs: {
    author: number;
    gold: number;
    silver: number;
    bronze: number;
  };
  checkpoints?: CheckpointDef[];
  blocks: StaticBlockDef[];
  movingPlatforms?: MovingPlatformDef[];
  rotatingHazards?: RotatingHazardDef[];
  bumpers?: BumperDef[];
  switchBridges?: SwitchBridgeDef[];
  boostPads?: BoostPadDef[];
  jumpPads?: JumpPadDef[];
  gems?: CollectibleGemDef[];
  killZones?: KillZoneDef[];
  windZones?: WindZoneDef[];
}
