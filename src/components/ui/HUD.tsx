import { useEffect, useRef, useState } from 'react';
import { MAPS } from '../../levels/maps';
import { SUMMIT_PHASES, getSummitStageByCamps } from '../../levels/summitMap';
import { getLevelById, livePhysics, useGameStore } from '../../store/useGameStore';
import { useUiStore } from '../../store/useUiStore';
import { isShortcutKey } from '../../input/keyboardGuards';
import { MAX_TILT_RAD } from '../game/TiltController';
import { HudMenuSheet } from './HudMenuSheet';
import { EMOTES, Icon, MedalDisc } from './icons';
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

export type LeaderboardEntry = {
  id: string;
  name: string;
  altitudeM: number;
  color: string;
  isLocal: boolean;
  isBot: boolean;
};

/** Summit phase names carry a 'STAGE N · ' prefix; the tag already shows the number. */
const shortStageName = (name: string) => name.replace(/^\s*stage\s*\d+\s*[·•:\-–]\s*/i, '');

const MEDAL_LABEL: Record<string, string> = {
  author: 'Author medal',
  gold: 'Gold medal',
  silver: 'Silver medal',
  bronze: 'Bronze medal',
  none: 'Finished',
};

const dismissRenameNotice = () =>
  useGameStore.getState().setSummitLobbyState({ renamedFrom: null });

/** Shown to a host whose requested private code was taken: the room got another code. */
function LobbyRenameNotice({ requested, actual }: { requested: string; actual: string }) {
  useEffect(() => {
    const t = window.setTimeout(dismissRenameNotice, 12000);
    return () => window.clearTimeout(t);
  }, [requested, actual]);
  return (
    <div className="hud-notice" role="status" data-testid="lobby-rename-notice">
      <Icon name="alert" size={18} />
      <span>
        Code <s>{requested}</s> was already taken, so your lobby is <b>{actual}</b>. Share{' '}
        <b>{actual}</b> with your friends.
      </span>
      <button className="mini-btn" onClick={dismissRenameNotice} aria-label="Dismiss">
        <Icon name="close" size={13} />
      </button>
    </div>
  );
}

export function HUD() {
  const currentLevelId = useGameStore((s) => s.currentLevelId);
  const playPhase = useGameStore((s) => s.playPhase);
  const runAttemptId = useGameStore((s) => s.runAttemptId);
  const bonusTimeSavedMs = useGameStore((s) => s.bonusTimeSavedMs);
  const crossedCheckpoints = useGameStore((s) => s.crossedCheckpoints);
  const activeSplitBanner = useGameStore((s) => s.activeSplitBanner);
  const checkpointWarningMessage = useGameStore((s) => s.checkpointWarningMessage);
  const lastEarnedMedal = useGameStore((s) => s.lastEarnedMedal);
  const isNewRecord = useGameStore((s) => s.isNewRecord);
  const gamepadConnected = useGameStore((s) => s.gamepadConnected);
  const avatar = useGameStore((s) => s.avatar);
  const remoteClimbers = useGameStore((s) => s.remoteClimbers);
  const summitLobby = useGameStore((s) => s.summitLobby);

  const setPlayPhase = useGameStore((s) => s.setPlayPhase);
  const startRun = useGameStore((s) => s.startRun);
  const respawnAtCheckpoint = useGameStore((s) => s.respawnAtCheckpoint);
  const selectLevel = useGameStore((s) => s.selectLevel);
  const exitToMenu = useGameStore((s) => s.exitToMenu);
  const toggleGhost = useGameStore((s) => s.toggleGhost);
  const triggerEmote = useGameStore((s) => s.triggerEmote);
  const openSummitLobbyModal = useGameStore((s) => s.openSummitLobbyModal);

  const menuOpen = useUiStore((s) => s.menuOpen);
  const toggleMenu = useUiStore((s) => s.toggleMenu);
  const setMenuOpen = useUiStore((s) => s.setMenuOpen);

  const level = getLevelById(currentLevelId);
  const isSummit = Boolean(level.isSummitMode);
  const targetAltM = level.summitTargetAltitudeM || 250;
  const totalCheckpoints = level.checkpoints?.length ?? 0;
  const hasNextLevel = !isSummit && currentLevelId < MAPS.length;
  const accent = level.accentColor || '#ffc531';

  const [countdownLabel, setCountdownLabel] = useState<string>('READY?');
  const [showSplitPopup, setShowSplitPopup] = useState(false);
  const [hudLocalAltM, setHudLocalAltM] = useState(0);

  const timerRef = useRef<HTMLDivElement>(null);
  const tiltDotRef = useRef<HTMLDivElement>(null);
  const speedRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const ghostSplitRef = useRef<HTMLDivElement>(null);
  const altitudeRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const altitudeBarRef = useRef<HTMLDivElement>(null);
  const summitTagRef = useRef<HTMLSpanElement>(null);
  const summitNameRef = useRef<HTMLHeadingElement>(null);
  const summitChallengeRef = useRef<HTMLParagraphElement>(null);
  const stageStickerRef = useRef<HTMLDivElement>(null);
  const railFillRef = useRef<HTMLDivElement>(null);
  const railYouRef = useRef<HTMLDivElement>(null);

  // Keyboard: G ghost, 1-4 Summit emotes, Esc run menu.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!isShortcutKey(e)) return;
      if (e.code === 'Escape') {
        if (useGameStore.getState().playPhase !== 'goal') toggleMenu();
        return;
      }
      if (e.code === 'KeyG') {
        toggleGhost();
      } else if (isSummit) {
        const em = EMOTES.find((x) => e.code === `Digit${x.key}`);
        if (em) triggerEmote(em.payload);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [toggleGhost, isSummit, triggerEmote, toggleMenu]);

  // Close the sheet when the run ends or the level changes.
  useEffect(() => {
    if (playPhase === 'goal') setMenuOpen(false);
  }, [playPhase, setMenuOpen]);
  useEffect(() => () => setMenuOpen(false), [setMenuOpen]);

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

  // Checkpoint split plate for 2.35s after crossing a gate
  useEffect(() => {
    if (!activeSplitBanner) {
      setShowSplitPopup(false);
      return;
    }
    setShowSplitPopup(true);
    const t = window.setTimeout(() => setShowSplitPopup(false), 2350);
    return () => window.clearTimeout(t);
  }, [activeSplitBanner]);

  // READY? -> GO!! countdown
  useEffect(() => {
    if (playPhase !== 'countdown') return;
    setCountdownLabel('READY?');
    soundFX.playCountdownBeep(false);
    const t1 = window.setTimeout(() => {
      setCountdownLabel('GO!!');
      soundFX.playCountdownBeep(true);
      setPlayPhase('playing');
    }, 1150);
    return () => window.clearTimeout(t1);
  }, [playPhase, runAttemptId, setPlayPhase]);

  // Auto-respawn after Fall Out
  useEffect(() => {
    if (playPhase !== 'fallout') return;
    const timer = window.setTimeout(() => {
      if (crossedCheckpoints.length > 0) respawnAtCheckpoint();
      else startRun();
    }, 1550);
    return () => window.clearTimeout(timer);
  }, [playPhase, crossedCheckpoints.length, respawnAtCheckpoint, startRun]);

  // 60fps DOM updates (run timer, tilt radar, speed, ghost split, Summit altitude) without
  // re-rendering. The timer used to be a store subscription, which re-rendered this whole HUD
  // on every elapsedMs update (every frame).
  useEffect(() => {
    let rafId = 0;
    const updateLoop = () => {
      if (timerRef.current) {
        const t = formatTimeMs(useGameStore.getState().elapsedMs);
        if (timerRef.current.textContent !== t) timerRef.current.textContent = t;
      }
      if (tiltDotRef.current) {
        const normX = (livePhysics.tiltRoll / MAX_TILT_RAD) * 26;
        const normY = (-livePhysics.tiltPitch / MAX_TILT_RAD) * 26;
        tiltDotRef.current.style.transform = `translate(${normX.toFixed(1)}px, ${normY.toFixed(1)}px)`;
      }
      const kmh = String(Math.round(livePhysics.ballSpeed * 3.6)).padStart(2, '0');
      for (const el of speedRefs.current) if (el && el.textContent !== kmh) el.textContent = kmh;
      if (ghostSplitRef.current) {
        const deltaMs = livePhysics.ghostDeltaMs;
        if (deltaMs === null) {
          ghostSplitRef.current.style.display = 'none';
        } else {
          ghostSplitRef.current.style.display = 'inline-flex';
          const sec = (Math.abs(deltaMs) / 1000).toFixed(2);
          ghostSplitRef.current.className = `hud-chip ${deltaMs <= 0 ? 'chip-ahead' : 'chip-behind'}`;
          ghostSplitRef.current.textContent = `${deltaMs <= 0 ? '-' : '+'}${sec} PB`;
        }
      }
      if (isSummit) {
        const alt = Math.max(0, livePhysics.currentAltitudeM);
        const pct = Math.min(100, Math.max(0, (alt / targetAltM) * 100));
        // Stage follows the Base Camps actually passed (in order), never raw altitude.
        const campsCrossed = useGameStore.getState().crossedCheckpoints.length;
        const phase = getSummitStageByCamps(campsCrossed);
        const altText = `${Math.round(alt)}`;
        for (const el of altitudeRefs.current)
          if (el && el.textContent !== altText) el.textContent = altText;
        if (altitudeBarRef.current) altitudeBarRef.current.style.width = `${pct.toFixed(1)}%`;
        const tag = `${phase.id}/${SUMMIT_PHASES.length}`;
        if (summitTagRef.current && summitTagRef.current.textContent !== tag)
          summitTagRef.current.textContent = tag;
        const shortName = shortStageName(phase.name);
        if (summitNameRef.current && summitNameRef.current.textContent !== shortName)
          summitNameRef.current.textContent = shortName;
        if (
          summitChallengeRef.current &&
          summitChallengeRef.current.textContent !== phase.challenge
        )
          summitChallengeRef.current.textContent = phase.challenge;
        stageStickerRef.current?.style.setProperty('--stage-accent', phase.accentColor);
        if (railFillRef.current) railFillRef.current.style.height = `${pct.toFixed(1)}%`;
        if (railYouRef.current) railYouRef.current.style.bottom = `${pct.toFixed(1)}%`;
      }
      rafId = requestAnimationFrame(updateLoop);
    };
    rafId = requestAnimationFrame(updateLoop);
    return () => cancelAnimationFrame(rafId);
  }, [isSummit, targetAltM]);

  const leaderboardEntries: LeaderboardEntry[] = isSummit
    ? [
        {
          id: 'local-you',
          name: avatar.name || 'You',
          altitudeM: hudLocalAltM,
          color: avatar.primaryColor,
          isLocal: true,
          isBot: false,
        },
        ...remoteClimbers.map((c) => ({
          id: c.id,
          name: c.name,
          altitudeM: c.altitudeM,
          color: c.avatar?.primaryColor || '#3fa9ff',
          isLocal: false,
          isBot: Boolean(c.isBot),
        })),
      ].sort((a, b) => b.altitudeM - a.altitudeM)
    : [];
  const myRank = leaderboardEntries.findIndex((e) => e.isLocal) + 1;
  // Desktop board: top 5, but you are always on it (top 4 + you when lower down).
  const ranked = leaderboardEntries.map((e, i) => ({ e, i }));
  const boardRows = myRank > 5 ? [...ranked.slice(0, 4), ranked[myRank - 1]] : ranked.slice(0, 5);
  const firstPhase = SUMMIT_PHASES[0];

  return (
    <div className="hud" data-summit={isSummit ? 'true' : 'false'}>
      {/* ---------- Top-left: stage sticker ---------- */}
      <div
        ref={stageStickerRef}
        className="hud-stage"
        style={{ ['--stage-accent' as string]: isSummit ? firstPhase.accentColor : accent }}
        data-testid="hud-stage"
      >
        <span className="hud-stage-tag" ref={isSummit ? summitTagRef : undefined}>
          {isSummit ? `1/${SUMMIT_PHASES.length}` : String(level.id).padStart(2, '0')}
        </span>
        <div className="hud-stage-text">
          <h2 ref={isSummit ? summitNameRef : undefined}>
            {isSummit ? shortStageName(firstPhase.name) : level.name}
          </h2>
          {isSummit ? (
            <p ref={summitChallengeRef} className="desk-only">
              {firstPhase.challenge}
            </p>
          ) : (
            <p className="desk-only">{level.subtitle}</p>
          )}
        </div>
        {totalCheckpoints > 0 && (
          <span
            className={`hud-cp ${crossedCheckpoints.length === totalCheckpoints ? 'done' : ''}`}
            title={isSummit ? 'Base camps passed' : 'Checkpoints passed'}
          >
            <Icon name={isSummit ? 'tent' : 'flag'} size={13} />
            {crossedCheckpoints.length}/{totalCheckpoints}
          </span>
        )}
      </div>

      {/* ---------- Top-centre: the one essential plate ---------- */}
      <div className="hud-center">
        <div className="hud-timer" data-testid="hud-timer">
          <div className="hud-timer-digits" ref={timerRef}>
            {formatTimeMs(useGameStore.getState().elapsedMs)}
          </div>
          <div className="hud-timer-sub">
            <span className="hud-speed compact-only">
              <Icon name="bolt" size={12} />
              <span ref={(el) => (speedRefs.current[0] = el)}>00</span>
              <small>km/h</small>
            </span>
            {isSummit && (
              <span className="hud-alt">
                <Icon name="mountain" size={13} />
                <span ref={(el) => (altitudeRefs.current[0] = el)}>0</span>
                <small>/{targetAltM}m</small>
              </span>
            )}
            {isSummit && myRank > 0 && (
              <span className="hud-rank" title="Your place among climbers">
                P{myRank}
              </span>
            )}
          </div>
          {isSummit && (
            <div className="hud-alt-bar">
              <div ref={altitudeBarRef} />
            </div>
          )}
        </div>
        <div className="hud-chips">
          {bonusTimeSavedMs > 0 && (
            <div className="hud-chip chip-gem">
              <Icon name="gem" size={12} />-{(bonusTimeSavedMs / 1000).toFixed(1)}s
            </div>
          )}
          <div ref={ghostSplitRef} className="hud-chip" style={{ display: 'none' }} />
        </div>
        {!isSummit && (
          <div className="hud-medals desk-only" aria-label="Medal targets">
            {(['author', 'gold', 'silver', 'bronze'] as const).map((m) => (
              <span key={m} title={MEDAL_LABEL[m]}>
                <MedalDisc tier={m} size={14} />
                {(level.medalTimesMs[m] / 1000).toFixed(1)}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ---------- Top-right: actions ---------- */}
      <div className="hud-actions">
        {crossedCheckpoints.length > 0 && (
          <button
            className="key-btn desk-only"
            onClick={respawnAtCheckpoint}
            title={`Respawn at last ${isSummit ? 'camp' : 'checkpoint'} (C / Backspace / Pad B)`}
          >
            <Icon name="flag" size={18} />
            <span>Respawn</span>
            <kbd>{gamepadConnected ? 'B' : 'C'}</kbd>
          </button>
        )}
        <button className="key-btn desk-only" onClick={startRun} title="Restart stage (R / Pad Y)">
          <Icon name="restart" size={18} />
          <span>Restart</span>
          <kbd>{gamepadConnected ? 'Y' : 'R'}</kbd>
        </button>
        {playPhase !== 'goal' && (
          <button
            className={`key-btn menu-btn ${menuOpen ? 'on' : ''}`}
            onClick={toggleMenu}
            aria-expanded={menuOpen}
            aria-label="Open run menu"
            title="Menu: settings, sound, ghost, maps (Esc / Pad Start)"
            data-testid="hud-menu-btn"
          >
            <Icon name="menu" size={20} />
            <span className="desk-only">Menu</span>
          </button>
        )}
      </div>

      {/* ---------- Desktop-only extras ---------- */}
      {isSummit && (
        <div className="hud-rail desk-only" aria-hidden>
          <span className="hud-rail-top">
            <Icon name="crown" size={14} />
            {targetAltM}
          </span>
          <div className="hud-rail-track">
            <div ref={railFillRef} className="hud-rail-fill" />
            {SUMMIT_PHASES.slice(1).map(({ minAltitudeM }) => (
              <i key={minAltitudeM} style={{ bottom: `${(minAltitudeM / targetAltM) * 100}%` }} />
            ))}
            {remoteClimbers.map((rc) => (
              <b
                key={rc.id}
                style={{
                  bottom: `${Math.min(100, Math.max(0, (rc.altitudeM / targetAltM) * 100)).toFixed(1)}%`,
                  background: rc.avatar?.primaryColor || '#3fa9ff',
                }}
                title={`${rc.name}: ${rc.altitudeM}m`}
              />
            ))}
            <div ref={railYouRef} className="hud-rail-you">
              YOU
            </div>
          </div>
          <span className="hud-rail-bottom">0</span>
        </div>
      )}

      {isSummit && (
        <aside className="hud-board desk-only">
          <header>
            <span className="hud-board-room">
              <Icon name={summitLobby.mode === 'private' ? 'lock' : 'globe'} size={13} />
              {summitLobby.mode === 'private' ? summitLobby.lobbyCode : 'Public'}
            </span>
            <span className={`conn-dot ${summitLobby.isConnected ? 'online' : 'local'}`} />
            <button className="mini-btn" onClick={openSummitLobbyModal} title="Switch lobby">
              <Icon name="users" size={13} />
            </button>
          </header>
          <ol>
            {boardRows.map(({ e, i }) => (
              <li key={e.id} className={e.isLocal ? 'is-you' : ''}>
                <span className="rank">{i + 1}</span>
                <i style={{ background: e.color }} />
                <span className="name">
                  {e.name.replace(/\s*\[BOT\]\s*/i, '')}
                  {e.isBot && <small>bot</small>}
                </span>
                <strong>{e.altitudeM}m</strong>
              </li>
            ))}
          </ol>
          <div className="hud-emotes">
            {EMOTES.map((em) => (
              <button
                key={em.key}
                onClick={() => triggerEmote(em.payload)}
                title={`${em.label} emote (key ${em.key})`}
                style={{ ['--emote' as string]: em.color }}
              >
                <Icon name={em.icon} size={18} />
                <kbd>{em.key}</kbd>
              </button>
            ))}
          </div>
        </aside>
      )}

      <div className="hud-bottom desk-only">
        <div className="hud-radar" title="Board tilt">
          <div className="hud-radar-dish">
            <div ref={tiltDotRef} className="hud-radar-dot" />
          </div>
          <span>{gamepadConnected ? 'L-stick' : 'WASD'}</span>
        </div>
        <div className="hud-speedo">
          <span ref={(el) => (speedRefs.current[1] = el)}>00</span>
          <small>km/h</small>
        </div>
      </div>

      {/* ---------- Transient banners ---------- */}
      {showSplitPopup && activeSplitBanner && playPhase === 'playing' && (
        <div className="hud-split">
          <div className="hud-split-head">
            {isSummit
              ? `Camp ${activeSplitBanner.order} reached`
              : `Checkpoint ${activeSplitBanner.order}/${activeSplitBanner.totalCheckpoints}`}
          </div>
          <div className="hud-split-row">
            <span className="hud-split-time">{formatTimeMs(activeSplitBanner.splitTimeMs)}</span>
            {activeSplitBanner.deltaMs !== null ? (
              <span
                className={`hud-split-delta ${activeSplitBanner.deltaMs <= 0 ? 'ahead' : 'behind'}`}
              >
                {formatSplitDeltaMs(activeSplitBanner.deltaMs)}
              </span>
            ) : (
              <span className="hud-split-delta neutral">
                {isSummit ? 'Respawn saved' : 'Split saved'}
              </span>
            )}
          </div>
        </div>
      )}

      {isSummit && summitLobby.isConnected && summitLobby.renamedFrom && (
        <LobbyRenameNotice requested={summitLobby.renamedFrom} actual={summitLobby.lobbyCode} />
      )}

      {checkpointWarningMessage && playPhase === 'playing' && (
        <div className="hud-warning">
          <Icon name="alert" size={18} />
          {checkpointWarningMessage}
        </div>
      )}

      {playPhase === 'countdown' && (
        <div className="hud-shout countdown">
          <small>{isSummit ? '9-stage mountain climb' : `Stage ${level.id}`}</small>
          <strong key={countdownLabel}>{countdownLabel}</strong>
        </div>
      )}

      {playPhase === 'fallout' && (
        <div className="hud-shout fallout">
          <strong>FALL OUT!</strong>
          <small>
            {crossedCheckpoints.length > 0
              ? isSummit
                ? `Back to camp ${crossedCheckpoints.length}`
                : `Back to checkpoint ${crossedCheckpoints.length}`
              : 'Back to the start pad'}
          </small>
        </div>
      )}

      {playPhase === 'goal' && (
        <div className="results-backdrop">
          <div
            className={`results-card tier-${lastEarnedMedal}`}
            role="dialog"
            aria-label="Results"
          >
            <div className="results-ribbon">{isSummit ? 'Summit conquered!' : 'Stage clear!'}</div>
            <h2>{level.name}</h2>
            <div className="results-main">
              <div className="results-medal">
                <MedalDisc tier={lastEarnedMedal} size={76} />
                <span>{MEDAL_LABEL[lastEarnedMedal] ?? 'Finished'}</span>
              </div>
              <div className="results-time">
                <small>Clear time</small>
                {/* Final time: the timer stops at the goal, and this renders on the phase change. */}
                <strong>{formatTimeMs(useGameStore.getState().elapsedMs)}</strong>
                {isNewRecord && <span className="results-stamp">New PB · ghost saved</span>}
              </div>
            </div>
            {!isSummit && (
              <div className="results-targets">
                {(['author', 'gold', 'silver', 'bronze'] as const).map((m) => (
                  <span key={m}>
                    <MedalDisc tier={m} size={14} />
                    {(level.medalTimesMs[m] / 1000).toFixed(1)}s
                  </span>
                ))}
              </div>
            )}
            <div className="results-actions">
              <button className="btn btn-paper" onClick={startRun}>
                <Icon name="restart" size={18} />
                <span>{isSummit ? 'Climb again' : 'Retry'}</span>
                <kbd>{gamepadConnected ? 'Y' : 'R'}</kbd>
              </button>
              <button className="btn btn-paper" onClick={exitToMenu}>
                <Icon name="map" size={18} />
                <span>Menu</span>
                {gamepadConnected && <kbd>B</kbd>}
              </button>
              {hasNextLevel && (
                <button className="btn btn-go" onClick={() => selectLevel(currentLevelId + 1)}>
                  <span>Next stage</span>
                  <Icon name="arrowRight" size={18} />
                  {gamepadConnected && <kbd>A</kbd>}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <HudMenuSheet leaderboard={leaderboardEntries} />
    </div>
  );
}
