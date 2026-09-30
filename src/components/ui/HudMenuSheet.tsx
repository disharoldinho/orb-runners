import { useState } from 'react';
import { GRAPHICS_QUALITY_LABEL, GRAPHICS_QUALITY_ORDER } from '../../graphics/quality';
import { gyroSupported, isTouchDevice } from '../../input/touchInput';
import { getLevelById, useGameStore } from '../../store/useGameStore';
import { useUiStore } from '../../store/useUiStore';
import type { LeaderboardEntry } from './HUD';
import { EMOTES, Icon, MedalDisc } from './icons';

const IS_TOUCH = isTouchDevice();

/**
 * The single in-run menu sheet. Everything that is not needed second-to-second
 * lives here: sound, ghost, graphics, tilt steering, medal targets, the Summit
 * leaderboard / lobby / emotes, restart and exit. The run keeps going while it
 * is open (Summit is live multiplayer; campaign timing matches Trackmania online).
 */
export function HudMenuSheet({ leaderboard }: { leaderboard: LeaderboardEntry[] }) {
  const open = useUiStore((s) => s.menuOpen);
  const setOpen = useUiStore((s) => s.setMenuOpen);
  const gyroOn = useUiStore((s) => s.gyroOn);
  const toggleGyro = useUiStore((s) => s.toggleGyro);
  const recalibrate = useUiStore((s) => s.recalibrate);

  const currentLevelId = useGameStore((s) => s.currentLevelId);
  const crossed = useGameStore((s) => s.crossedCheckpoints.length);
  const soundMuted = useGameStore((s) => s.soundMuted);
  const showGhost = useGameStore((s) => s.showGhost);
  const hasGhost = useGameStore((s) => Boolean(s.ghosts[s.currentLevelId]));
  const graphicsQuality = useGameStore((s) => s.graphicsQuality);
  const gamepadConnected = useGameStore((s) => s.gamepadConnected);
  const summitLobby = useGameStore((s) => s.summitLobby);
  const summitBestAltitudeM = useGameStore((s) => s.summitBestAltitudeM);
  const toggleMute = useGameStore((s) => s.toggleMute);
  const toggleGhost = useGameStore((s) => s.toggleGhost);
  const setGraphicsQuality = useGameStore((s) => s.setGraphicsQuality);
  const startRun = useGameStore((s) => s.startRun);
  const respawnAtCheckpoint = useGameStore((s) => s.respawnAtCheckpoint);
  const exitToMenu = useGameStore((s) => s.exitToMenu);
  const triggerEmote = useGameStore((s) => s.triggerEmote);
  const openSummitLobbyModal = useGameStore((s) => s.openSummitLobbyModal);

  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const level = getLevelById(currentLevelId);
  const isSummit = Boolean(level.isSummitMode);
  const close = () => setOpen(false);
  const act = (fn: () => void) => () => {
    fn();
    close();
  };
  const copyCode = () => {
    navigator.clipboard?.writeText(summitLobby.lobbyCode).catch(() => {});
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="sheet-backdrop" onClick={close} data-testid="hud-menu-sheet">
      <div
        className="sheet"
        role="dialog"
        aria-label="Run menu"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-grip" aria-hidden />
        <header className="sheet-head">
          <div>
            <small>
              {isSummit ? 'Reach the Summit' : `Stage ${String(level.id).padStart(2, '0')}`}
            </small>
            <h3>{isSummit ? 'Climb menu' : level.name}</h3>
          </div>
          <button className="icon-btn" onClick={close} aria-label="Close menu">
            <Icon name="close" size={20} />
          </button>
        </header>

        <div className="sheet-body">
          <div className="sheet-col sheet-col-a">
            <div className="sheet-primary">
              <button className="btn btn-go" onClick={close}>
                <Icon name="play" size={18} />
                <span>Keep rolling</span>
              </button>
              {crossed > 0 && (
                <button className="btn btn-paper" onClick={act(respawnAtCheckpoint)}>
                  <Icon name="flag" size={18} />
                  <span>{isSummit ? 'Last camp' : 'Last checkpoint'}</span>
                  {!IS_TOUCH && <kbd>{gamepadConnected ? 'B' : 'C'}</kbd>}
                </button>
              )}
              <button className="btn btn-paper" onClick={act(startRun)}>
                <Icon name="restart" size={18} />
                <span>{isSummit ? 'Restart climb' : 'Restart stage'}</span>
                {!IS_TOUCH && <kbd>{gamepadConnected ? 'Y' : 'R'}</kbd>}
              </button>
            </div>
          </div>

          <div className="sheet-col sheet-col-b">
            {isSummit && (
              <section className="sheet-section">
                <h4>
                  Climbers
                  <span className="sheet-room">
                    <Icon name={summitLobby.mode === 'private' ? 'lock' : 'globe'} size={13} />
                    {summitLobby.mode === 'private' ? summitLobby.lobbyCode : 'Public server'}
                    {summitLobby.mode === 'private' && (
                      <button className="mini-btn" onClick={copyCode} aria-label="Copy lobby code">
                        <Icon name={copied ? 'check' : 'copy'} size={12} />
                      </button>
                    )}
                  </span>
                </h4>
                <ol className="sheet-board">
                  {leaderboard.slice(0, 8).map((e, i) => (
                    <li key={e.id} className={e.isLocal ? 'is-you' : ''}>
                      <span className="rank">{i + 1}</span>
                      <i style={{ background: e.color }} />
                      <span className="name">
                        {e.name.replace(/\s*\[BOT\]\s*/i, '')}
                        {e.isBot && <small>bot</small>}
                        {e.isLocal && <small className="you">you</small>}
                      </span>
                      <strong>{e.altitudeM}m</strong>
                    </li>
                  ))}
                </ol>
                <div className="sheet-row">
                  <span className="sheet-peak">
                    <Icon name="crown" size={14} /> Your peak {summitBestAltitudeM}m
                  </span>
                  <button className="btn btn-paper btn-sm" onClick={act(openSummitLobbyModal)}>
                    <Icon name="users" size={16} />
                    <span>Switch lobby</span>
                  </button>
                </div>
                <div className="sheet-emotes">
                  {EMOTES.map((em) => (
                    <button
                      key={em.key}
                      onClick={() => triggerEmote(em.payload)}
                      style={{ ['--emote' as string]: em.color }}
                      aria-label={`${em.label} emote`}
                    >
                      <Icon name={em.icon} size={22} />
                      {!IS_TOUCH && <kbd>{em.key}</kbd>}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {!isSummit && (
              <section className="sheet-section">
                <h4>Medal targets</h4>
                <div className="sheet-medals">
                  {(['author', 'gold', 'silver', 'bronze'] as const).map((m) => (
                    <span key={m}>
                      <MedalDisc tier={m} size={18} />
                      <b>{(level.medalTimesMs[m] / 1000).toFixed(1)}s</b>
                      <small>{m}</small>
                    </span>
                  ))}
                </div>
              </section>
            )}
          </div>

          <div className="sheet-col sheet-col-c">
            <section className="sheet-section">
              <h4>Settings</h4>
              <div className="sheet-toggles">
                <button
                  className={`toggle ${!soundMuted ? 'on' : ''}`}
                  onClick={toggleMute}
                  aria-pressed={!soundMuted}
                >
                  <Icon name={soundMuted ? 'mute' : 'sound'} size={20} />
                  <span>Sound</span>
                  <em>{soundMuted ? 'Off' : 'On'}</em>
                </button>
                {hasGhost && (
                  <button
                    className={`toggle ${showGhost ? 'on' : ''}`}
                    onClick={toggleGhost}
                    aria-pressed={showGhost}
                  >
                    <Icon name="ghost" size={20} />
                    <span>PB ghost</span>
                    <em>{showGhost ? 'On' : 'Off'}</em>
                    {!IS_TOUCH && <kbd>G</kbd>}
                  </button>
                )}
                {IS_TOUCH && gyroSupported() && (
                  <button
                    className={`toggle ${gyroOn ? 'on' : ''}`}
                    onClick={toggleGyro}
                    aria-pressed={gyroOn}
                  >
                    <Icon name="phoneTilt" size={20} />
                    <span>Tilt steering</span>
                    <em>{gyroOn ? 'On' : 'Off'}</em>
                  </button>
                )}
                {IS_TOUCH && gyroOn && (
                  <button className="toggle" onClick={recalibrate}>
                    <Icon name="level" size={20} />
                    <span>Set level</span>
                    <em>Now</em>
                  </button>
                )}
              </div>
              <div className="sheet-gfx">
                <span>
                  <Icon name="gfx" size={16} /> Graphics
                </span>
                <div className="segmented" role="radiogroup" aria-label="Graphics quality">
                  {GRAPHICS_QUALITY_ORDER.map((q) => (
                    <button
                      key={q}
                      role="radio"
                      aria-checked={graphicsQuality === q}
                      className={graphicsQuality === q ? 'on' : ''}
                      onClick={() => setGraphicsQuality(q)}
                    >
                      {GRAPHICS_QUALITY_LABEL[q]}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {!IS_TOUCH && (
              <p className="sheet-keys">
                {gamepadConnected
                  ? 'Left stick tilts · B respawn · Y restart · X ghost · Start menu'
                  : 'WASD / arrows tilt · C respawn · R restart · G ghost · Esc menu'}
              </p>
            )}
          </div>
        </div>

        <footer className="sheet-foot">
          <button className="btn btn-danger" onClick={act(exitToMenu)} data-testid="sheet-exit">
            <Icon name={isSummit ? 'exit' : 'home'} size={18} />
            <span>{isSummit ? 'Leave the Summit' : 'Back to stage select'}</span>
          </button>
        </footer>
      </div>
    </div>
  );
}
