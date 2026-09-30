import { useEffect, useRef, useState } from 'react';
import {
  RotateCcw,
  Volume2,
  VolumeX,
  Map,
  Trophy,
  ArrowRight,
  Zap,
  Sparkles,
  Ghost,
  Flag,
  Gamepad2,
  Mountain,
  Users,
  Copy,
  Check,
  Lock,
  Globe,
  Monitor,
} from 'lucide-react';
import { MAPS } from '../../levels/maps';
import { SUMMIT_PHASES, getSummitStageByCamps } from '../../levels/summitMap';
import { getLevelById, livePhysics, useGameStore } from '../../store/useGameStore';
import { GRAPHICS_QUALITY_LABEL } from '../../graphics/quality';
import { MAX_TILT_RAD } from '../game/TiltController';
import { soundFX } from './SoundManager';

export function formatTimeMs(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  const millis = Math.floor(ms % 1000);
  const minStr = minutes > 0 ? `${String(minutes).padStart(2, '0')}:` : '';
  return `${minStr}${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
}

export function formatSplitDeltaMs(deltaMs: number): string {
  const sign = deltaMs <= 0 ? '-' : '+';
  const absSec = (Math.abs(deltaMs) / 1000).toFixed(3);
  return `${sign}${absSec}s`;
}

const SUMMIT_EMOTES = [
  { key: '1', emoji: '👋', label: 'Wave' },
  { key: '2', emoji: '🔥', label: 'Fire' },
  { key: '3', emoji: '😱', label: 'Whoa' },
  { key: '4', emoji: '👑', label: 'Crown' },
];

export function HUD() {
  const currentLevelId = useGameStore((s) => s.currentLevelId);
  const playPhase = useGameStore((s) => s.playPhase);
  const runAttemptId = useGameStore((s) => s.runAttemptId);
  const elapsedMs = useGameStore((s) => s.elapsedMs);
  const bonusTimeSavedMs = useGameStore((s) => s.bonusTimeSavedMs);
  const crossedCheckpoints = useGameStore((s) => s.crossedCheckpoints);
  const activeSplitBanner = useGameStore((s) => s.activeSplitBanner);
  const checkpointWarningMessage = useGameStore((s) => s.checkpointWarningMessage);
  const lastEarnedMedal = useGameStore((s) => s.lastEarnedMedal);
  const isNewRecord = useGameStore((s) => s.isNewRecord);
  const soundMuted = useGameStore((s) => s.soundMuted);
  const showGhost = useGameStore((s) => s.showGhost);
  const gamepadConnected = useGameStore((s) => s.gamepadConnected);
  const hasGhostForLevel = useGameStore((s) => Boolean(s.ghosts[s.currentLevelId]));
  const avatar = useGameStore((s) => s.avatar);
  const summitLobby = useGameStore((s) => s.summitLobby);
  const remoteClimbers = useGameStore((s) => s.remoteClimbers);
  const summitBestAltitudeM = useGameStore((s) => s.summitBestAltitudeM);

  const setPlayPhase = useGameStore((s) => s.setPlayPhase);
  const startRun = useGameStore((s) => s.startRun);
  const respawnAtCheckpoint = useGameStore((s) => s.respawnAtCheckpoint);
  const selectLevel = useGameStore((s) => s.selectLevel);
  const setScreen = useGameStore((s) => s.setScreen);
  const toggleMute = useGameStore((s) => s.toggleMute);
  const toggleGhost = useGameStore((s) => s.toggleGhost);
  const graphicsQuality = useGameStore((s) => s.graphicsQuality);
  const cycleGraphicsQuality = useGameStore((s) => s.cycleGraphicsQuality);
  const triggerEmote = useGameStore((s) => s.triggerEmote);
  const openSummitLobbyModal = useGameStore((s) => s.openSummitLobbyModal);

  const level = getLevelById(currentLevelId);
  const isSummit = Boolean(level.isSummitMode);
  const targetAltM = level.summitTargetAltitudeM || 250;
  const totalCheckpoints = level.checkpoints?.length ?? 0;
  const hasNextLevel = !isSummit && currentLevelId < MAPS.length;

  const [countdownLabel, setCountdownLabel] = useState<string>('READY?');
  const [showSplitPopup, setShowSplitPopup] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [hudLocalAltM, setHudLocalAltM] = useState(0);

  const tiltDotRef = useRef<HTMLDivElement>(null);
  const speedTextRef = useRef<HTMLSpanElement>(null);
  const ghostSplitRef = useRef<HTMLDivElement>(null);
  const altitudeBigRef = useRef<HTMLSpanElement>(null);
  const summitStageSpanRef = useRef<HTMLSpanElement>(null);
  const summitPhaseTitleRef = useRef<HTMLHeadingElement>(null);
  const summitPhaseSubRef = useRef<HTMLParagraphElement>(null);
  const summitChallengeRef = useRef<HTMLParagraphElement>(null);
  const thermometerFillRef = useRef<HTMLDivElement>(null);
  const thermometerYouPinRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcuts: 'G' to toggle PB Ghost, '1'-'4' for Summit 3D Emotes
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyG') {
        toggleGhost();
      } else if (isSummit) {
        if (e.code === 'Digit1') triggerEmote('👋');
        if (e.code === 'Digit2') triggerEmote('🔥');
        if (e.code === 'Digit3') triggerEmote('😱');
        if (e.code === 'Digit4') triggerEmote('👑');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [toggleGhost, isSummit, triggerEmote]);

  // Warning toasts (missed / out-of-order gate) fade out on their own.
  useEffect(() => {
    if (!checkpointWarningMessage) return;
    const t = window.setTimeout(() => {
      if (useGameStore.getState().checkpointWarningMessage === checkpointWarningMessage) {
        useGameStore.setState({ checkpointWarningMessage: null });
      }
    }, 3200);
    return () => window.clearTimeout(t);
  }, [checkpointWarningMessage]);

  // Periodically sync rounded local altitude for leaderboard sorting in Summit Mode
  useEffect(() => {
    if (!isSummit) return;
    const id = window.setInterval(() => {
      setHudLocalAltM(Math.round(livePhysics.currentAltitudeM));
    }, 250);
    return () => window.clearInterval(id);
  }, [isSummit]);

  // Show Trackmania Checkpoint Split Popup for 2.35s when crossing a checkpoint
  useEffect(() => {
    if (!activeSplitBanner) {
      setShowSplitPopup(false);
      return;
    }
    setShowSplitPopup(true);
    const t = window.setTimeout(() => {
      setShowSplitPopup(false);
    }, 2350);
    return () => window.clearTimeout(t);
  }, [activeSplitBanner]);

  // Handle 3-2-1-GO Countdown Sequence
  useEffect(() => {
    if (playPhase !== 'countdown') return;

    setCountdownLabel('READY?');
    soundFX.playCountdownBeep(false);

    const t1 = window.setTimeout(() => {
      setCountdownLabel('GO!!');
      soundFX.playCountdownBeep(true);
      setPlayPhase('playing');
    }, 1150);

    return () => {
      window.clearTimeout(t1);
    };
  }, [playPhase, runAttemptId, setPlayPhase]);

  // Auto-respawn after Fall Out
  useEffect(() => {
    if (playPhase !== 'fallout') return;
    const timer = window.setTimeout(() => {
      if (crossedCheckpoints.length > 0) {
        respawnAtCheckpoint();
      } else {
        startRun();
      }
    }, 1550);
    return () => window.clearTimeout(timer);
  }, [playPhase, crossedCheckpoints.length, respawnAtCheckpoint, startRun]);

  // Update 60fps Tilt Radar, Speedometer, Live Ghost Split & Summit Altitude Bar via DOM refs
  useEffect(() => {
    let rafId = 0;
    const updateLoop = () => {
      if (tiltDotRef.current) {
        const normX = (livePhysics.tiltRoll / MAX_TILT_RAD) * 34;
        const normY = (-livePhysics.tiltPitch / MAX_TILT_RAD) * 34;
        tiltDotRef.current.style.transform = `translate(${normX.toFixed(1)}px, ${normY.toFixed(
          1
        )}px)`;
      }
      if (speedTextRef.current) {
        const kmh = Math.round(livePhysics.ballSpeed * 3.6);
        speedTextRef.current.textContent = String(kmh).padStart(2, '0');
      }
      if (ghostSplitRef.current) {
        const deltaMs = livePhysics.ghostDeltaMs;
        if (deltaMs === null) {
          ghostSplitRef.current.style.display = 'none';
        } else {
          ghostSplitRef.current.style.display = 'inline-flex';
          const sec = (Math.abs(deltaMs) / 1000).toFixed(2);
          if (deltaMs <= 0) {
            ghostSplitRef.current.className = 'ghost-split-chip ahead';
            ghostSplitRef.current.textContent = `⚡ -${sec}s vs PB`;
          } else {
            ghostSplitRef.current.className = 'ghost-split-chip behind';
            ghostSplitRef.current.textContent = `+${sec}s vs PB`;
          }
        }
      }
      if (isSummit) {
        const alt = Math.max(0, livePhysics.currentAltitudeM);
        const pct = Math.min(100, Math.max(0, (alt / targetAltM) * 100));
        // Stage follows the Base Camps actually passed (in order), not raw altitude, so a
        // lucky fall/bounce can never "skip" the stage banner ahead.
        const campsCrossed = useGameStore.getState().crossedCheckpoints.length;
        const activePhase = getSummitStageByCamps(campsCrossed);
        if (altitudeBigRef.current) {
          altitudeBigRef.current.textContent = `${Math.round(alt)}m`;
        }
        if (summitStageSpanRef.current) {
          const label = `STAGE ${activePhase.id} / ${SUMMIT_PHASES.length}`;
          if (summitStageSpanRef.current.textContent !== label) {
            summitStageSpanRef.current.textContent = label;
          }
          summitStageSpanRef.current.style.borderColor = activePhase.accentColor;
        }
        if (summitPhaseTitleRef.current) {
          summitPhaseTitleRef.current.textContent = activePhase.name;
          summitPhaseTitleRef.current.style.color = activePhase.accentColor;
        }
        if (summitPhaseSubRef.current) {
          summitPhaseSubRef.current.textContent = activePhase.subtitle;
        }
        if (summitChallengeRef.current) {
          summitChallengeRef.current.textContent = activePhase.challenge;
          summitChallengeRef.current.style.borderColor = activePhase.accentColor;
        }
        if (thermometerFillRef.current) {
          thermometerFillRef.current.style.height = `${pct.toFixed(1)}%`;
        }
        if (thermometerYouPinRef.current) {
          thermometerYouPinRef.current.style.bottom = `${pct.toFixed(1)}%`;
        }
      }
      rafId = requestAnimationFrame(updateLoop);
    };
    rafId = requestAnimationFrame(updateLoop);
    return () => cancelAnimationFrame(rafId);
  }, [isSummit, targetAltM]);

  const handleCopyLobbyCode = () => {
    navigator.clipboard?.writeText(summitLobby.lobbyCode).catch(() => {});
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 1800);
  };

  // Build sorted leaderboard for Summit Mode
  const leaderboardEntries = isSummit
    ? [
        {
          id: 'local-you',
          name: `${avatar.name || 'You'} (YOU)`,
          altitudeM: hudLocalAltM,
          color: avatar.primaryColor,
          isLocal: true,
          isBot: false,
        },
        ...remoteClimbers.map((c) => ({
          id: c.id,
          name: c.name,
          altitudeM: c.altitudeM,
          color: c.avatar?.primaryColor || '#38bdf8',
          isLocal: false,
          isBot: Boolean(c.isBot),
        })),
      ].sort((a, b) => b.altitudeM - a.altitudeM)
    : [];

  return (
    <div className="hud-overlay">
      {/* Top Bar */}
      <div className="hud-top-bar">
        {/* Stage Badge + Checkpoint Counter */}
        <div className="hud-card stage-info-card">
          <div className="stage-badge-row">
            {isSummit ? (
              <span ref={summitStageSpanRef} className="stage-pill summit-stage-pill">
                STAGE 1 / {SUMMIT_PHASES.length}
              </span>
            ) : (
              <span className="stage-pill">STAGE {String(level.id).padStart(2, '0')}</span>
            )}
            {totalCheckpoints > 0 && (
              <span
                className={`cp-progress-pill ${
                  crossedCheckpoints.length === totalCheckpoints ? 'cp-complete' : ''
                }`}
              >
                <Flag size={12} />
                {isSummit
                  ? `CAMPS ${crossedCheckpoints.length}/${totalCheckpoints}`
                  : `CP ${crossedCheckpoints.length}/${totalCheckpoints}`}
              </span>
            )}
            {gamepadConnected && (
              <span className="gamepad-hud-pill" title="Controller Connected">
                <Gamepad2 size={13} />
                PAD
              </span>
            )}
          </div>
          <div>
            <h2 ref={isSummit ? summitPhaseTitleRef : undefined}>{level.name}</h2>
            <p ref={isSummit ? summitPhaseSubRef : undefined}>{level.subtitle}</p>
            {isSummit && (
              <p ref={summitChallengeRef} className="summit-challenge-line">
                {SUMMIT_PHASES[0].challenge}
              </p>
            )}
          </div>
        </div>

        {/* Center Trackmania Speedrun Clock + Summit Altitude Counter */}
        <div className="hud-card timer-card">
          <div className="timer-label">
            {isSummit ? 'LIVE SUMMIT ASCENT & TIMER' : 'OFFICIAL TRACKMANIA TIMER'}
          </div>
          <div className="timer-digits">{formatTimeMs(elapsedMs)}</div>
          {isSummit && (
            <div className="summit-altitude-readout-row">
              <Mountain size={16} color="#fbbf24" />
              <span>ALTITUDE:</span>
              <strong ref={altitudeBigRef}>0m</strong>
              <span className="summit-target-slash">/ {targetAltM}m</span>
              <span className="summit-peak-tag">PEAK: {summitBestAltitudeM}m</span>
            </div>
          )}
          <div className="timer-badges-row">
            {bonusTimeSavedMs > 0 && (
              <div className="bonus-time-chip">
                <Sparkles size={13} />
                <span>-{(bonusTimeSavedMs / 1000).toFixed(1)}s Gem</span>
              </div>
            )}
            <div ref={ghostSplitRef} className="ghost-split-chip" style={{ display: 'none' }} />
          </div>
          {!isSummit && (
            <div className="medal-targets-row">
              <span className="medal-target author" title="Author / Trackmaster Target">
                🎖️ {(level.medalTimesMs.author / 1000).toFixed(1)}s
              </span>
              <span className="medal-target gold">
                🥇 {(level.medalTimesMs.gold / 1000).toFixed(1)}s
              </span>
              <span className="medal-target silver">
                🥈 {(level.medalTimesMs.silver / 1000).toFixed(1)}s
              </span>
              <span className="medal-target bronze">
                🥉 {(level.medalTimesMs.bronze / 1000).toFixed(1)}s
              </span>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="hud-actions">
          {crossedCheckpoints.length > 0 && (
            <button
              className="hud-icon-btn cp-respawn-btn"
              onClick={respawnAtCheckpoint}
              title="Respawn at Last Checkpoint / Biome Camp (C / Backspace / Gamepad B)"
            >
              <Flag size={17} />
              <span>
                {isSummit
                  ? gamepadConnected
                    ? 'Camp (B)'
                    : 'Camp (C)'
                  : gamepadConnected
                    ? 'CP (B)'
                    : 'CP (C)'}
              </span>
            </button>
          )}
          {hasGhostForLevel && (
            <button
              className={`hud-icon-btn ${showGhost ? 'ghost-active' : ''}`}
              onClick={toggleGhost}
              title="Toggle Personal Best Ghost (G / Gamepad X)"
            >
              <Ghost size={18} />
              <span>{showGhost ? 'Ghost: ON' : 'Ghost: OFF'}</span>
            </button>
          )}
          <button
            className="hud-icon-btn"
            onClick={startRun}
            title="Full Stage Reset (R / Gamepad Y)"
          >
            <RotateCcw size={18} />
            <span>{gamepadConnected ? 'Reset (Y)' : 'Reset (R)'}</span>
          </button>
          <button
            className="hud-icon-btn"
            onClick={cycleGraphicsQuality}
            title="Graphics Quality (Low / Medium / High)"
          >
            <Monitor size={17} />
            <span>GFX: {GRAPHICS_QUALITY_LABEL[graphicsQuality]}</span>
          </button>
          <button className="hud-icon-btn" onClick={toggleMute} title="Toggle Audio">
            {soundMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <button className="hud-icon-btn" onClick={() => setScreen('menu')} title="Stage Select">
            <Map size={18} />
            <span>Maps</span>
          </button>
        </div>
      </div>

      {/* ================= SUMMIT MODE LEFT ALTITUDE THERMOMETER ================= */}
      {isSummit && (
        <div className="summit-thermometer-panel">
          <div className="thermometer-top-label">👑 {targetAltM}m</div>
          <div className="thermometer-track">
            <div ref={thermometerFillRef} className="thermometer-fill" style={{ height: '0%' }} />
            {/* Biome Camp Tick Marks */}
            {SUMMIT_PHASES.slice(1).map(({ minAltitudeM: campAlt }) => (
              <div
                key={campAlt}
                className="thermometer-camp-tick"
                style={{ bottom: `${(campAlt / targetAltM) * 100}%` }}
              >
                <span>{campAlt}m</span>
              </div>
            ))}
            {/* Remote Climber Pins */}
            {remoteClimbers.map((rc) => {
              const pct = Math.min(100, Math.max(0, (rc.altitudeM / targetAltM) * 100));
              return (
                <div
                  key={rc.id}
                  className="thermometer-climber-pin remote"
                  style={{
                    bottom: `${pct.toFixed(1)}%`,
                    backgroundColor: rc.avatar?.primaryColor || '#38bdf8',
                  }}
                  title={`${rc.name}: ${rc.altitudeM}m`}
                />
              );
            })}
            {/* Local Player Pin */}
            <div
              ref={thermometerYouPinRef}
              className="thermometer-climber-pin you"
              style={{ bottom: '0%' }}
            >
              <span>YOU</span>
            </div>
          </div>
          <div className="thermometer-bottom-label">🏕️ 0m</div>
        </div>
      )}

      {/* ================= SUMMIT MODE RIGHT LIVE LEADERBOARD & LOBBY HUD ================= */}
      {isSummit && (
        <div className="summit-leaderboard-panel">
          <div className="summit-lobby-status-header">
            <div className="summit-room-badge">
              {summitLobby.mode === 'private' ? <Lock size={13} /> : <Globe size={13} />}
              <span>
                {summitLobby.mode === 'private'
                  ? `CODE: ${summitLobby.lobbyCode}`
                  : 'PUBLIC SERVER'}
              </span>
              {summitLobby.mode === 'private' && (
                <button
                  className="lobby-copy-mini-btn"
                  onClick={handleCopyLobbyCode}
                  title="Copy Lobby Code"
                >
                  {copiedCode ? <Check size={12} /> : <Copy size={12} />}
                </button>
              )}
            </div>
            <button className="lobby-switch-mini-btn" onClick={openSummitLobbyModal}>
              <Users size={12} />
              Lobby
            </button>
          </div>

          <div className="summit-lb-title">
            <span>LIVE CLIMBERS ({leaderboardEntries.length})</span>
            <span className={`conn-dot ${summitLobby.isConnected ? 'online' : 'local'}`} />
          </div>

          <div className="summit-lb-list">
            {leaderboardEntries.slice(0, 7).map((entry, idx) => (
              <div
                key={entry.id}
                className={`summit-lb-row ${entry.isLocal ? 'is-you' : ''}`}
              >
                <span className="lb-rank">#{idx + 1}</span>
                <span className="lb-color-dot" style={{ backgroundColor: entry.color }} />
                <span className="lb-name">{entry.name}</span>
                <strong className="lb-alt">{entry.altitudeM}m</strong>
              </div>
            ))}
          </div>

          <div className="summit-emote-bar">
            {SUMMIT_EMOTES.map((em) => (
              <button
                key={em.key}
                className="summit-emote-btn"
                onClick={() => triggerEmote(em.emoji)}
                title={`Send ${em.label} Emote (Key ${em.key})`}
              >
                <span className="emote-icon">{em.emoji}</span>
                <span className="emote-key">{em.key}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Trackmania Official Checkpoint Split Freeze Banner */}
      {showSplitPopup && activeSplitBanner && playPhase === 'playing' && (
        <div className="tm-split-banner">
          <div className="tm-split-header">
            {isSummit
              ? `🏕️ BIOME BASE CAMP ${activeSplitBanner.order} REACHED!`
              : `CHECKPOINT ${activeSplitBanner.order} / ${activeSplitBanner.totalCheckpoints}`}
          </div>
          <div className="tm-split-row">
            <span className="tm-split-time">{formatTimeMs(activeSplitBanner.splitTimeMs)}</span>
            {activeSplitBanner.deltaMs !== null ? (
              <span
                className={`tm-split-delta ${
                  activeSplitBanner.deltaMs <= 0 ? 'tm-blue-ahead' : 'tm-red-behind'
                }`}
              >
                {formatSplitDeltaMs(activeSplitBanner.deltaMs)}
              </span>
            ) : (
              <span className="tm-split-delta tm-neutral">
                {isSummit ? 'RESPAWN SAVED (PRESS C)' : 'SECTOR RECORDED'}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Missed Checkpoint Warning */}
      {checkpointWarningMessage && playPhase === 'playing' && (
        <div className="tm-warning-toast">{checkpointWarningMessage}</div>
      )}

      {/* Center Status Banners */}
      {playPhase === 'countdown' && (
        <div className="center-banner countdown-banner">
          <div className="banner-sub">
            {isSummit ? '9-STAGE MOUNTAIN CLIMB' : `STAGE ${level.id}`}
          </div>
          <div className="banner-main">{countdownLabel}</div>
        </div>
      )}

      {playPhase === 'fallout' && (
        <div className="center-banner fallout-banner">
          <div className="banner-main">FALL OUT!</div>
          <div className="banner-sub">
            {crossedCheckpoints.length > 0
              ? isSummit
                ? `Returning to Biome Camp ${crossedCheckpoints.length}...`
                : `Respawning at Checkpoint ${crossedCheckpoints.length}... (or press R for Start)`
              : 'Respawning on start pad...'}
          </div>
        </div>
      )}

      {playPhase === 'goal' && (
        <div className="goal-modal-backdrop">
          <div className="goal-modal-card">
            <div className="goal-header-badge">
              {isSummit ? '👑 220M SUMMIT CONQUERED!' : 'STAGE CLEAR!'}
            </div>
            <h2>{level.name}</h2>

            <div className="goal-medal-showcase">
              <div className={`medal-emblem ${lastEarnedMedal}`}>
                <Trophy size={42} />
                <span>
                  {lastEarnedMedal === 'author'
                    ? '🎖️ AUTHOR TRACKMASTER MEDAL'
                    : `${lastEarnedMedal.toUpperCase()} MEDAL`}
                </span>
              </div>
            </div>

            <div className="goal-stats-box">
              <div className="stat-item">
                <span>OFFICIAL CLEAR TIME</span>
                <strong>{formatTimeMs(elapsedMs)}</strong>
              </div>
              {isNewRecord && (
                <div className="new-record-pill">NEW PERSONAL BEST & GHOST SAVED!</div>
              )}
            </div>

            <div className="goal-buttons-row">
              <button className="btn-secondary" onClick={startRun}>
                <RotateCcw size={18} />
                <span>{gamepadConnected ? 'Replay (Y)' : 'Climb Again (R)'}</span>
              </button>
              <button className="btn-secondary" onClick={() => setScreen('menu')}>
                <Map size={18} />
                <span>{gamepadConnected ? 'Maps (B)' : 'Main Menu'}</span>
              </button>
              {hasNextLevel && (
                <button
                  className="btn-primary"
                  onClick={() => selectLevel(currentLevelId + 1)}
                >
                  <span>{gamepadConnected ? 'Next Stage (A)' : 'Next Stage'}</span>
                  <ArrowRight size={18} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bottom HUD: Board Tilt Gizmo & Speedometer */}
      <div className="hud-bottom-bar">
        <div className="hud-card tilt-gizmo-card">
          <div className="tilt-radar-circle">
            <div className="radar-crosshair-h" />
            <div className="radar-crosshair-v" />
            <div ref={tiltDotRef} className="radar-tilt-dot" />
          </div>
          <div className="tilt-gizmo-meta">
            <span className="gizmo-title">BOARD TILT</span>
            <span className="gizmo-keys">
              {gamepadConnected ? 'Left Stick / D-Pad' : 'WASD / Arrows'}
            </span>
            <span className="gizmo-subhint">
              {gamepadConnected ? '(B) CP Respawn · (Y) Reset' : '(C) CP Respawn · (R) Reset'}
            </span>
          </div>
        </div>

        <div className="hud-card speedometer-card">
          <Zap size={20} className="speed-icon" />
          <div className="speed-readout">
            <span ref={speedTextRef} className="speed-number">
              00
            </span>
            <span className="speed-unit">KM/H</span>
          </div>
        </div>
      </div>
    </div>
  );
}
