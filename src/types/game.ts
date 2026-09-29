import { AvatarConfig } from './avatar';

export type ScreenState = 'menu' | 'character-creator' | 'summit-lobby' | 'playing';

export type PlayPhase = 'countdown' | 'playing' | 'goal' | 'fallout' | 'paused';

export type MedalTier = 'none' | 'bronze' | 'silver' | 'gold' | 'author';

/** Compact keyframe: [elapsedMs, x, y, z, charYaw] */
export type GhostFrame = [number, number, number, number, number];

export interface GhostReplayData {
  bestTimeMs: number;
  avatar: AvatarConfig;
  frames: GhostFrame[];
  /** Recorded sector checkpoint timestamps (ms) for Trackmania split comparisons */
  checkpointSplitsMs?: Record<string, number>;
}

export interface CheckpointSplitBanner {
  checkpointId: string;
  order: number;
  totalCheckpoints: number;
  splitTimeMs: number;
  /** Delta vs PB checkpoint split in ms (negative = Trackmania Blue ahead, positive = Trackmania Red behind, null = first run) */
  deltaMs: number | null;
  timestamp: number;
}

export interface LevelProgress {
  bestTimeMs: number | null;
  medal: MedalTier;
  clears: number;
  bestCheckpointSplitsMs?: Record<string, number>;
}

export interface RemoteClimberState {
  id: string;
  name: string;
  position: [number, number, number];
  yaw: number;
  altitudeM: number;
  peakAltitudeM?: number;
  stageNum?: number;
  avatar: AvatarConfig;
  emote: string | null;
  emoteTimestamp?: number;
  isBot?: boolean;
}

export interface SummitLobbyState {
  mode: 'public' | 'private';
  action?: 'public' | 'create' | 'join';
  lobbyCode: string;
  lobbyName: string;
  password: string;
  includeBots: boolean;
  isConnected: boolean;
  errorMessage: string | null;
}

export interface TiltInput {
  pitch: number;
  roll: number;
}

export interface LivePhysicsState {
  ballPosition: [number, number, number];
  ballVelocity: [number, number, number];
  ballSpeed: number;
  tiltPitch: number;
  tiltRoll: number;
  cameraYaw: number;
  /** Right-stick manual camera peek offset [yawOffset, elevationOffset] */
  cameraPeekYaw: number;
  cameraPeekPitch: number;
  lastBumperHitTime: number;
  isGrounded: boolean;
  /** Live split difference (ms) vs Personal Best Ghost: negative = ahead of PB, positive = behind PB */
  ghostDeltaMs: number | null;
  /** Live altitude in meters for Reach the Summit mode */
  currentAltitudeM: number;
  peakAltitudeM: number;
  /** Current emote popped by local player */
  localEmote: string | null;
  localEmoteTimestamp: number;
}
