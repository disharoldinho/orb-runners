export type Vec3 = [number, number, number];

export type BlockTheme =
  | 'meadow'
  | 'cobalt'
  | 'sunset'
  | 'cyber'
  | 'citadel'
  | 'warning'
  | 'gold'
  | 'ice';

export interface StaticBlockDef {
  id: string;
  position: Vec3;
  size: Vec3;
  rotation?: Vec3; // Euler angles in radians [rx, ry, rz]
  theme?: BlockTheme;
  /** Optional raised side rails along the local X edges (left/right of a Z-aligned path) */
  rails?: 'none' | 'both' | 'left' | 'right';
  railHeight?: number;
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
  radius?: number; // default 1.15
  upwardImpulse?: number; // default 18.5
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
  skyPreset: 'day' | 'sunset' | 'neon' | 'aurora' | 'citadel';
  accentColor: string;
  spawnPosition: Vec3;
  /** Initial camera yaw in radians (default 0 = looking toward -Z) */
  initialYaw?: number;
  killPlaneY: number;
  goalPosition: Vec3;
  goalRotation?: Vec3;
  /** If defined, the Goal Gate itself oscillates horizontally! */
  goalMovingRange?: Vec3;
  goalMovingSpeed?: number;
  /** True for the 25-Stage "Reach the Summit" Multiplayer Mega-Climb */
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
}
