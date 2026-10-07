import { create } from 'zustand';
import { AvatarConfig } from '../types/avatar';
import {
  CheckpointSplitBanner,
  GhostFrame,
  GhostReplayData,
  LevelProgress,
  LivePhysicsState,
  MedalTier,
  PlayPhase,
  RemoteClimberState,
  ScreenState,
  SummitLobbyState,
} from '../types/game';
import { MAPS } from '../levels/maps';
import { SUMMIT_LEVEL_ID, SUMMIT_MAP } from '../levels/summitMap';
import { LevelData } from '../types/level';
import { soundFX } from '../components/ui/SoundManager';
import {
  DEFAULT_GRAPHICS_QUALITY,
  GRAPHICS_QUALITY_ORDER,
  GraphicsQuality,
  isGraphicsQuality,
} from '../graphics/quality';

const STORAGE_KEY_AVATAR = 'orb_runners_avatar_v1';
const STORAGE_KEY_PROGRESS = 'orb_runners_progress_v1';
const STORAGE_KEY_GHOSTS = 'orb_runners_ghosts_v1';
const STORAGE_KEY_SUMMIT_PEAK = 'orb_runners_summit_peak_v1';
const STORAGE_KEY_GRAPHICS = 'orb_runners_graphics_v1';
const STORAGE_KEY_MUTE = 'orb_runners_mute_v1';

export function getLevelById(levelId: number): LevelData {
  if (levelId === SUMMIT_LEVEL_ID) return SUMMIT_MAP;
  return MAPS.find((m) => m.id === levelId) || MAPS[0];
}

const DEFAULT_AVATAR: AvatarConfig = {
  name: 'Pip',
  bodyType: 'critter',
  eyeType: 'googly',
  mouthType: 'cat',
  hatType: 'propeller',
  primaryColor: '#FF9F1C',
  secondaryColor: '#FFF5E1',
  orbStyle: 'clear',
};

function loadSavedAvatar(): AvatarConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_AVATAR);
    if (raw) {
      return { ...DEFAULT_AVATAR, ...JSON.parse(raw) };
    }
  } catch {
    // ignore storage errors
  }
  return DEFAULT_AVATAR;
}

function loadSavedProgress(): Record<number, LevelProgress> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROGRESS);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // ignore storage errors
  }
  return {};
}

function loadSavedGhosts(): Record<number, GhostReplayData> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_GHOSTS);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // ignore storage errors
  }
  return {};
}

function loadSavedSummitPeak(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SUMMIT_PEAK);
    if (raw) {
      const parsed = Number(raw);
      return Number.isFinite(parsed) ? parsed : 0;
    }
  } catch {
    // ignore
  }
  return 0;
}

function loadSavedGraphicsQuality(): GraphicsQuality {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_GRAPHICS);
    if (isGraphicsQuality(raw)) return raw;
  } catch {
    // ignore storage errors
  }
  return DEFAULT_GRAPHICS_QUALITY;
}

function loadSavedMute(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MUTE);
    return raw === '1' || raw === 'true';
  } catch {
    // ignore storage errors
  }
  return false;
}

/**
 * Shared high-frequency mutable physics & tilt state read inside R3F `useFrame`
 * so 60-120Hz physics updates never force React DOM re-renders.
 */
export const livePhysics: LivePhysicsState = {
  ballPosition: [0, 1.5, 0],
  ballVelocity: [0, 0, 0],
  ballSpeed: 0,
  tiltPitch: 0,
  tiltRoll: 0,
  cameraYaw: 0,
  cameraPeekYaw: 0,
  cameraPeekPitch: 0,
  lastBumperHitTime: 0,
  isGrounded: true,
  ghostDeltaMs: null,
  currentAltitudeM: 0,
  peakAltitudeM: loadSavedSummitPeak(),
  localEmote: null,
  localEmoteTimestamp: 0,
};

/** Mutable recording buffer for current active run's ghost frames */
export const currentRunGhostBuffer: { frames: GhostFrame[] } = {
  frames: [],
};

interface GameStore {
  screen: ScreenState;
  currentLevelId: number;
  playPhase: PlayPhase;
  runAttemptId: number;
  /** Increments when the player respawns at the last crossed Checkpoint (without resetting the timer!) */
  checkpointRespawnTick: number;
  activeSpawnPosition: [number, number, number];
  activeSpawnYaw: number;

  /** Displayed run time (ms): simulated play time minus gem bonuses. Medals and PBs use it. */
  elapsedMs: number;
  /**
   * Simulated play time of this attempt (ms). Unlike elapsedMs it never jumps back when a
   * gem is collected, so the PB ghost is recorded and played back against it.
   */
  runClockMs: number;
  bonusTimeSavedMs: number;
  collectedGems: string[];
  activatedSwitches: Record<string, boolean>;
  crossedCheckpoints: string[];
  currentRunSplitsMs: Record<string, number>;
  activeSplitBanner: CheckpointSplitBanner | null;
  checkpointWarningMessage: string | null;

  lastEarnedMedal: MedalTier;
  isNewRecord: boolean;
  soundMuted: boolean;
  showGhost: boolean;
  graphicsQuality: GraphicsQuality;
  gamepadConnected: boolean;
  gamepadName: string | null;

  avatar: AvatarConfig;
  progress: Record<number, LevelProgress>;
  ghosts: Record<number, GhostReplayData>;

  // Summit Multiplayer & Lobby State
  summitLobby: SummitLobbyState;
  /**
   * Bumped on every explicit "launch climb". The Summit socket (re)connects only when this
   * or the level changes, never when the server reports back the room it actually joined.
   */
  summitSession: number;
  remoteClimbers: RemoteClimberState[];
  summitBestAltitudeM: number;

  // Actions
  setScreen: (screen: ScreenState) => void;
  /** Leave the current run (campaign or Summit lobby) and go back to the main menu. */
  exitToMenu: () => void;
  selectLevel: (levelId: number) => void;
  startRun: () => void;
  respawnAtCheckpoint: () => void;
  crossCheckpoint: (checkpointId: string, order: number, respawnPos: [number, number, number], respawnYaw?: number) => void;
  notifyMissedCheckpoint: () => void;
  setPlayPhase: (phase: PlayPhase) => void;
  tickTimer: (deltaMs: number) => void;
  collectGem: (gemId: string, bonusMs: number) => void;
  activateSwitch: (switchId: string) => void;
  triggerGoal: () => void;
  triggerFallout: () => void;
  updateAvatar: (partial: Partial<AvatarConfig>) => void;
  toggleMute: () => void;
  toggleGhost: () => void;
  setGraphicsQuality: (quality: GraphicsQuality) => void;
  cycleGraphicsQuality: () => void;
  setGamepadStatus: (connected: boolean, name: string | null) => void;
  getTotalMedalsCount: () => number;
  getAuthorMedalsCount: () => number;

  // Summit Actions
  openSummitLobbyModal: () => void;
  launchSummitClimb: (lobbyConfig: Partial<SummitLobbyState>) => void;
  setSummitLobbyState: (partial: Partial<SummitLobbyState>) => void;
  setRemoteClimbers: (climbers: RemoteClimberState[]) => void;
  triggerEmote: (emote: string) => void;
  recordPeakAltitude: (altM: number) => void;
}

const MEDAL_RANK: Record<MedalTier, number> = {
  none: 0,
  bronze: 1,
  silver: 2,
  gold: 3,
  author: 4,
};

const initialSoundMuted = loadSavedMute();
soundFX.muted = initialSoundMuted;

export const useGameStore = create<GameStore>((set, get) => ({
  screen: 'menu',
  currentLevelId: 1,
  playPhase: 'countdown',
  runAttemptId: 1,
  checkpointRespawnTick: 0,
  activeSpawnPosition: [0, 1.0, 0],
  activeSpawnYaw: 0,

  elapsedMs: 0,
  runClockMs: 0,
  bonusTimeSavedMs: 0,
  collectedGems: [],
  activatedSwitches: {},
  crossedCheckpoints: [],
  currentRunSplitsMs: {},
  activeSplitBanner: null,
  checkpointWarningMessage: null,

  lastEarnedMedal: 'none',
  isNewRecord: false,
  soundMuted: initialSoundMuted,
  showGhost: true,
  graphicsQuality: loadSavedGraphicsQuality(),
  gamepadConnected: false,
  gamepadName: null,

  avatar: loadSavedAvatar(),
  progress: loadSavedProgress(),
  ghosts: loadSavedGhosts(),

  summitLobby: {
    mode: 'public',
    lobbyCode: 'PUBLIC',
    lobbyName: 'Global Summit Server',
    password: '',
    includeBots: true,
    isConnected: false,
    errorMessage: null,
  },
  summitSession: 0,
  remoteClimbers: [],
  summitBestAltitudeM: loadSavedSummitPeak(),

  setScreen: (screen) => set({ screen }),

  // Unmounting the game canvas closes the Summit websocket (the server drops the
  // climber on 'close'); also clear the remote climbers so no stale ghosts linger.
  exitToMenu: () => set({ screen: 'menu', remoteClimbers: [] }),

  selectLevel: (levelId) => {
    const map = getLevelById(levelId);
    livePhysics.ballPosition = [...map.spawnPosition];
    livePhysics.ballVelocity = [0, 0, 0];
    livePhysics.ballSpeed = 0;
    livePhysics.tiltPitch = 0;
    livePhysics.tiltRoll = 0;
    livePhysics.cameraYaw = map.initialYaw ?? 0;
    livePhysics.cameraPeekYaw = 0;
    livePhysics.cameraPeekPitch = 0;
    livePhysics.ghostDeltaMs = null;
    livePhysics.currentAltitudeM = 0;
    currentRunGhostBuffer.frames = [];

    set((state) => ({
      currentLevelId: levelId,
      screen: 'playing',
      playPhase: 'countdown',
      runAttemptId: state.runAttemptId + 1,
      checkpointRespawnTick: 0,
      activeSpawnPosition: [...map.spawnPosition],
      activeSpawnYaw: map.initialYaw ?? 0,
      elapsedMs: 0,
      runClockMs: 0,
      bonusTimeSavedMs: 0,
      collectedGems: [],
      activatedSwitches: {},
      crossedCheckpoints: [],
      currentRunSplitsMs: {},
      activeSplitBanner: null,
      checkpointWarningMessage: null,
      lastEarnedMedal: 'none',
      isNewRecord: false,
    }));
  },

  startRun: () => {
    const { currentLevelId } = get();
    const map = getLevelById(currentLevelId);
    livePhysics.ballPosition = [...map.spawnPosition];
    livePhysics.ballVelocity = [0, 0, 0];
    livePhysics.ballSpeed = 0;
    livePhysics.tiltPitch = 0;
    livePhysics.tiltRoll = 0;
    livePhysics.cameraYaw = map.initialYaw ?? 0;
    livePhysics.cameraPeekYaw = 0;
    livePhysics.cameraPeekPitch = 0;
    livePhysics.ghostDeltaMs = null;
    livePhysics.currentAltitudeM = 0;
    currentRunGhostBuffer.frames = [];

    set((state) => ({
      playPhase: 'countdown',
      runAttemptId: state.runAttemptId + 1,
      checkpointRespawnTick: 0,
      activeSpawnPosition: [...map.spawnPosition],
      activeSpawnYaw: map.initialYaw ?? 0,
      elapsedMs: 0,
      runClockMs: 0,
      bonusTimeSavedMs: 0,
      collectedGems: [],
      activatedSwitches: {},
      crossedCheckpoints: [],
      currentRunSplitsMs: {},
      activeSplitBanner: null,
      checkpointWarningMessage: null,
      lastEarnedMedal: 'none',
      isNewRecord: false,
    }));
  },

  respawnAtCheckpoint: () => {
    const { playPhase, crossedCheckpoints, activeSpawnPosition, activeSpawnYaw, startRun } = get();
    if (playPhase === 'goal') return;

    // If no checkpoint has been crossed yet, perform a full start-line reset
    if (crossedCheckpoints.length === 0) {
      startRun();
      return;
    }

    soundFX.playCheckpointRespawn();
    livePhysics.ballPosition = [...activeSpawnPosition];
    livePhysics.ballVelocity = [0, 0, 0];
    livePhysics.ballSpeed = 0;
    livePhysics.tiltPitch = 0;
    livePhysics.tiltRoll = 0;
    livePhysics.cameraYaw = activeSpawnYaw;

    set((state) => ({
      playPhase: 'playing',
      checkpointRespawnTick: state.checkpointRespawnTick + 1,
    }));
  },

  crossCheckpoint: (checkpointId, order, respawnPos, respawnYaw = 0) => {
    const {
      playPhase,
      currentLevelId,
      elapsedMs,
      crossedCheckpoints,
      currentRunSplitsMs,
      progress,
      ghosts,
    } = get();
    if (playPhase !== 'playing') return;
    if (crossedCheckpoints.includes(checkpointId)) return;

    const map = getLevelById(currentLevelId);
    const totalCheckpoints = map.checkpoints?.length ?? 1;

    // Sequential maps (Summit): a gate only counts if it's the next one in order.
    if (map.sequentialCheckpoints && order !== crossedCheckpoints.length + 1) {
      set({
        checkpointWarningMessage: `Reach ${
          map.isSummitMode ? 'Camp' : 'Checkpoint'
        } ${crossedCheckpoints.length + 1} first!`,
      });
      return;
    }
    const splitTimeMs = Math.round(elapsedMs);

    // Compare against saved Personal Best checkpoint split
    const pbSplits =
      ghosts[currentLevelId]?.checkpointSplitsMs ||
      progress[currentLevelId]?.bestCheckpointSplitsMs;
    const pbSplitTime = pbSplits?.[checkpointId] ?? null;
    const deltaMs = pbSplitTime !== null ? splitTimeMs - pbSplitTime : null;

    soundFX.playCheckpointSplit(deltaMs === null || deltaMs <= 0);

    const banner: CheckpointSplitBanner = {
      checkpointId,
      order,
      totalCheckpoints,
      splitTimeMs,
      deltaMs,
      timestamp: performance.now(),
    };

    set({
      crossedCheckpoints: [...crossedCheckpoints, checkpointId],
      currentRunSplitsMs: {
        ...currentRunSplitsMs,
        [checkpointId]: splitTimeMs,
      },
      // Elevate respawn position by +0.75m so the orb drops cleanly onto the checkpoint pad
      activeSpawnPosition: [respawnPos[0], respawnPos[1] + 0.75, respawnPos[2]],
      activeSpawnYaw: respawnYaw,
      activeSplitBanner: banner,
      checkpointWarningMessage: null,
    });
  },

  notifyMissedCheckpoint: () => {
    const { currentLevelId, crossedCheckpoints } = get();
    const map = getLevelById(currentLevelId);
    const total = map.checkpoints?.length ?? 0;
    set({
      checkpointWarningMessage: map.isSummitMode
        ? `Pass every Base Camp first! (${crossedCheckpoints.length}/${total})`
        : `Cross all Checkpoints first! (${crossedCheckpoints.length}/${total})`,
    });
  },

  setPlayPhase: (playPhase) => set({ playPhase }),

  tickTimer: (deltaMs) => {
    const { playPhase, elapsedMs, runClockMs } = get();
    if (playPhase === 'playing') {
      set({ elapsedMs: Math.max(0, elapsedMs + deltaMs), runClockMs: runClockMs + deltaMs });
    }
  },

  collectGem: (gemId, bonusMs) => {
    const { collectedGems, elapsedMs, bonusTimeSavedMs } = get();
    if (collectedGems.includes(gemId)) return;
    soundFX.playGemPickup();
    set({
      collectedGems: [...collectedGems, gemId],
      elapsedMs: Math.max(0, elapsedMs - bonusMs),
      bonusTimeSavedMs: bonusTimeSavedMs + bonusMs,
    });
  },

  activateSwitch: (switchId) => {
    const { activatedSwitches } = get();
    if (activatedSwitches[switchId]) return;
    soundFX.playSwitchActivate();
    set({
      activatedSwitches: {
        ...activatedSwitches,
        [switchId]: true,
      },
    });
  },

  triggerGoal: () => {
    const {
      playPhase,
      currentLevelId,
      elapsedMs,
      progress,
      ghosts,
      avatar,
      crossedCheckpoints,
      currentRunSplitsMs,
      notifyMissedCheckpoint,
    } = get();
    if (playPhase !== 'playing') return;

    const map = getLevelById(currentLevelId);
    const requiredCheckpoints =
      map.isSummitMode && !map.sequentialCheckpoints ? 0 : (map.checkpoints?.length ?? 0);
    if (crossedCheckpoints.length < requiredCheckpoints) {
      notifyMissedCheckpoint();
      return;
    }

    soundFX.playGoalFanfare();
    const finalTime = Math.round(elapsedMs);

    let earnedMedal: MedalTier = 'bronze';
    if (finalTime <= map.medalTimesMs.author) {
      earnedMedal = 'author';
    } else if (finalTime <= map.medalTimesMs.gold) {
      earnedMedal = 'gold';
    } else if (finalTime <= map.medalTimesMs.silver) {
      earnedMedal = 'silver';
    }

    const prev = progress[currentLevelId];
    const isNewRecord = !prev || prev.bestTimeMs === null || finalTime < prev.bestTimeMs;
    const bestTimeMs = isNewRecord ? finalTime : prev.bestTimeMs;
    const bestMedal =
      !prev || MEDAL_RANK[earnedMedal] > MEDAL_RANK[prev.medal]
        ? earnedMedal
        : prev.medal;

    const bestCheckpointSplitsMs = isNewRecord
      ? { ...currentRunSplitsMs }
      : prev?.bestCheckpointSplitsMs ?? { ...currentRunSplitsMs };

    const updatedProgress: Record<number, LevelProgress> = {
      ...progress,
      [currentLevelId]: {
        bestTimeMs,
        medal: bestMedal,
        clears: (prev?.clears ?? 0) + 1,
        bestCheckpointSplitsMs,
      },
    };

    let updatedGhosts = ghosts;
    if (isNewRecord && currentRunGhostBuffer.frames.length > 2) {
      const [bx, by, bz] = livePhysics.ballPosition;
      // Frames are stamped with the run clock (see GhostOrb), so the final one is too.
      const finalFrames: GhostFrame[] = [
        ...currentRunGhostBuffer.frames,
        [
          Math.round(get().runClockMs),
          Number(bx.toFixed(2)),
          Number(by.toFixed(2)),
          Number(bz.toFixed(2)),
          Number(livePhysics.cameraYaw.toFixed(2)),
        ],
      ];
      updatedGhosts = {
        ...ghosts,
        [currentLevelId]: {
          bestTimeMs: finalTime,
          avatar: { ...avatar },
          frames: finalFrames,
          checkpointSplitsMs: { ...currentRunSplitsMs },
          clock: 'run',
        },
      };
      try {
        localStorage.setItem(STORAGE_KEY_GHOSTS, JSON.stringify(updatedGhosts));
      } catch {
        // ignore storage errors
      }
    }

    try {
      localStorage.setItem(STORAGE_KEY_PROGRESS, JSON.stringify(updatedProgress));
    } catch {
      // ignore storage errors
    }

    set({
      playPhase: 'goal',
      progress: updatedProgress,
      ghosts: updatedGhosts,
      lastEarnedMedal: earnedMedal,
      isNewRecord,
    });
  },

  triggerFallout: () => {
    const { playPhase } = get();
    if (playPhase !== 'playing') return;
    soundFX.playFallout();
    set({ playPhase: 'fallout' });
  },

  updateAvatar: (partial) => {
    const updated = { ...get().avatar, ...partial };
    try {
      localStorage.setItem(STORAGE_KEY_AVATAR, JSON.stringify(updated));
    } catch {
      // ignore storage errors
    }
    set({ avatar: updated });
  },

  toggleMute: () => {
    const nextMuted = !get().soundMuted;
    soundFX.muted = nextMuted;
    try {
      localStorage.setItem(STORAGE_KEY_MUTE, nextMuted ? '1' : '0');
    } catch {
      // ignore storage errors
    }
    set({ soundMuted: nextMuted });
  },

  toggleGhost: () => {
    set((state) => ({ showGhost: !state.showGhost }));
  },

  setGraphicsQuality: (quality) => {
    try {
      localStorage.setItem(STORAGE_KEY_GRAPHICS, quality);
    } catch {
      // ignore storage errors
    }
    set({ graphicsQuality: quality });
  },

  cycleGraphicsQuality: () => {
    const idx = GRAPHICS_QUALITY_ORDER.indexOf(get().graphicsQuality);
    get().setGraphicsQuality(GRAPHICS_QUALITY_ORDER[(idx + 1) % GRAPHICS_QUALITY_ORDER.length]);
  },

  setGamepadStatus: (connected, name) => {
    set({ gamepadConnected: connected, gamepadName: name });
  },

  getTotalMedalsCount: () => {
    const { progress } = get();
    return Object.entries(progress).filter(([id, p]) => Number(id) !== SUMMIT_LEVEL_ID && p.medal !== 'none').length;
  },

  getAuthorMedalsCount: () => {
    const { progress } = get();
    return Object.entries(progress).filter(([id, p]) => Number(id) !== SUMMIT_LEVEL_ID && p.medal === 'author').length;
  },

  openSummitLobbyModal: () => {
    set({ screen: 'summit-lobby' });
  },

  launchSummitClimb: (lobbyConfig) => {
    set((state) => ({
      summitLobby: {
        ...state.summitLobby,
        ...lobbyConfig,
        errorMessage: null,
      },
      summitSession: state.summitSession + 1,
    }));
    get().selectLevel(SUMMIT_LEVEL_ID);
  },

  setSummitLobbyState: (partial) => {
    set((state) => ({
      summitLobby: {
        ...state.summitLobby,
        ...partial,
      },
    }));
  },

  setRemoteClimbers: (climbers) => {
    set({ remoteClimbers: climbers });
  },

  triggerEmote: (emote) => {
    soundFX.playEmotePop();
    livePhysics.localEmote = emote;
    livePhysics.localEmoteTimestamp = performance.now();
  },

  recordPeakAltitude: (altM) => {
    const rounded = Math.max(0, Math.round(altM));
    if (rounded > get().summitBestAltitudeM) {
      try {
        localStorage.setItem(STORAGE_KEY_SUMMIT_PEAK, String(rounded));
      } catch {
        // ignore
      }
      set({ summitBestAltitudeM: rounded });
    }
  },
}));

