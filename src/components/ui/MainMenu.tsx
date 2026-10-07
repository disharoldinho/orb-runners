import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import { useRef } from 'react';
import * as THREE from 'three';
import { MAPS } from '../../levels/maps';
import { SUMMIT_LEVEL_ID } from '../../levels/summitMap';
import { useGameStore } from '../../store/useGameStore';
import { GRAPHICS_QUALITY_LABEL, GRAPHICS_QUALITY_ORDER } from '../../graphics/quality';
import { CharacterModel } from '../game/CharacterModel';
import { OrbShell } from '../game/PlayerOrb';
import { SummitPoster, Wordmark } from './brand';
import { formatTimeMs } from './HUD';
import { Icon, MedalDisc } from './icons';
import { PreviewCanvasGuard } from './GameFallback';

/** Settings start unfolded on roomy screens, folded on phones. */
const WIDE_SCREEN =
  typeof window !== 'undefined' && window.innerWidth >= 1100 && window.innerHeight >= 640;

function HeroOrbPreview() {
  const avatar = useGameStore((s) => s.avatar);
  const groupRef = useRef<THREE.Group>(null);
  const orbRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(t * 0.8) * 0.45;
      groupRef.current.position.y = Math.sin(t * 2.2) * 0.08 - 0.08;
    }
    if (orbRef.current) {
      orbRef.current.rotation.x += delta * 0.6;
      orbRef.current.rotation.z += delta * 0.25;
      orbRef.current.position.y = Math.sin(t * 2.2) * 0.08 - 0.08;
    }
  });

  return (
    <group>
      <group ref={groupRef}>
        <CharacterModel config={avatar} isPreview />
      </group>
      <group ref={orbRef}>
        <OrbShell style={avatar.orbStyle} primaryColor={avatar.primaryColor} />
      </group>
    </group>
  );
}

export function MainMenu() {
  const avatar = useGameStore((s) => s.avatar);
  const progress = useGameStore((s) => s.progress);
  const currentLevelId = useGameStore((s) => s.currentLevelId);
  const gamepadConnected = useGameStore((s) => s.gamepadConnected);
  const summitBestAltitudeM = useGameStore((s) => s.summitBestAltitudeM);
  const selectLevel = useGameStore((s) => s.selectLevel);
  const setScreen = useGameStore((s) => s.setScreen);
  const openSummitLobbyModal = useGameStore((s) => s.openSummitLobbyModal);
  const launchSummitClimb = useGameStore((s) => s.launchSummitClimb);
  const graphicsQuality = useGameStore((s) => s.graphicsQuality);
  const setGraphicsQuality = useGameStore((s) => s.setGraphicsQuality);
  const totalMedals = useGameStore((s) => s.getTotalMedalsCount());
  const authorMedals = useGameStore((s) => s.getAuthorMedalsCount());

  const summitStat = progress[SUMMIT_LEVEL_ID];

  return (
    <div className="menu-screen paper">
      <header className="menu-top">
        <Wordmark />
        <p className="menu-tagline">Tilt the world. Roll the orb. Beat the clock.</p>
        {gamepadConnected && (
          <span className="tag tag-mint menu-pad">
            <Icon name="gamepad" size={16} /> Pad ready
          </span>
        )}
      </header>

      <div className="menu-layout">
        <div className="menu-side">
          {/* Runner */}
          <section className="card runner-card">
            <div className="runner-porthole">
              <PreviewCanvasGuard>
                <Canvas camera={{ position: [0, 0.35, 2.05], fov: 44 }} dpr={[1, 1.75]}>
                  <Environment resolution={128}>
                    <Lightformer form="circle" intensity={3.5} position={[0, 4, 3]} scale={4} />
                    <Lightformer
                      form="ring"
                      color="#3fa9ff"
                      intensity={2.2}
                      position={[-4, 2, 2]}
                      scale={4}
                    />
                  </Environment>
                  <ambientLight intensity={0.9} />
                  <directionalLight position={[3, 5, 4]} intensity={1.4} />
                  <HeroOrbPreview />
                </Canvas>
              </PreviewCanvasGuard>
            </div>
            <div className="runner-info">
              <small>Your runner</small>
              <h3>{avatar.name || 'Pip'}</h3>
              <button
                className="btn btn-paper btn-sm"
                onClick={() => setScreen('character-creator')}
              >
                <Icon name="sparkle" size={16} />
                <span>Customise</span>
                {gamepadConnected && <kbd>X</kbd>}
              </button>
            </div>
          </section>

          {/* Settings + controls, folded away */}
          <details className="card fold" open={WIDE_SCREEN}>
            <summary>
              <Icon name="gfx" size={18} />
              <span>Settings &amp; controls</span>
              <Icon name="chevronDown" size={18} className="fold-chev" />
            </summary>
            <div className="fold-body">
              <div className="setting-row">
                <span>Graphics</span>
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
              <ul className="controls-list">
                <li>
                  <span>Tilt</span>
                  <b>
                    <kbd>WASD</kbd> <kbd>Stick</kbd> <kbd>Touch pad</kbd>
                  </b>
                </li>
                <li>
                  <span>Respawn</span>
                  <b>
                    <kbd>C</kbd> <kbd>⌫</kbd> <kbd>Pad B</kbd>
                  </b>
                </li>
                <li>
                  <span>Restart</span>
                  <b>
                    <kbd>R</kbd> <kbd>Del</kbd> <kbd>Pad Y</kbd>
                  </b>
                </li>
                <li>
                  <span>Run menu</span>
                  <b>
                    <kbd>Esc</kbd> <kbd>Pad Start</kbd>
                  </b>
                </li>
                <li>
                  <span>Ghost / emotes</span>
                  <b>
                    <kbd>G</kbd> <kbd>1–4</kbd>
                  </b>
                </li>
              </ul>
            </div>
          </details>
        </div>

        <div className="menu-main">
          {/* Summit */}
          <section className="card summit-card">
            <div className="summit-art">
              <SummitPoster />
              <span className="tag tag-tomato summit-live">
                <Icon name="users" size={14} /> Live multiplayer
              </span>
            </div>
            <div className="summit-body">
              <h2>Reach the Summit</h2>
              <p>
                One 250 m spiral road, 9 themed stages, 8 base camps. Race everyone to the crown.
              </p>
              <div className="summit-stats">
                <span>
                  <small>Peak</small>
                  <b>{summitBestAltitudeM} m</b>
                </span>
                <span>
                  <small>Best climb</small>
                  <b>{summitStat?.bestTimeMs ? formatTimeMs(summitStat.bestTimeMs) : '--.---'}</b>
                </span>
              </div>
              <div className="summit-actions">
                <button
                  className="btn btn-go"
                  onClick={() =>
                    launchSummitClimb({
                      mode: 'public',
                      action: 'public',
                      lobbyCode: 'PUBLIC',
                      lobbyName: 'Global Summit Server',
                      password: '',
                      includeBots: true,
                    })
                  }
                >
                  <Icon name="mountain" size={20} />
                  <span>Play Public Server</span>
                </button>
                <button className="btn btn-paper" onClick={openSummitLobbyModal}>
                  <Icon name="lock" size={18} />
                  <span>Private lobby</span>
                </button>
              </div>
            </div>
          </section>

          {/* Campaign */}
          <section className="campaign">
            <header className="section-head">
              <h2>
                Campaign <small>{MAPS.length} stages</small>
              </h2>
              <div className="medal-tally">
                <span title="Stages with a medal">
                  <MedalDisc tier="gold" size={18} />
                  {totalMedals}/{MAPS.length}
                </span>
                <span title="Author medals">
                  <MedalDisc tier="author" size={18} />
                  {authorMedals}
                </span>
              </div>
            </header>

            <div className="ticket-list">
              {MAPS.map((map) => {
                const stat = progress[map.id];
                const medal = stat?.medal || 'none';
                const isSelected = currentLevelId === map.id;
                return (
                  <button
                    key={map.id}
                    className={`ticket ${isSelected && gamepadConnected ? 'is-picked' : ''}`}
                    style={{ ['--tk' as string]: map.accentColor }}
                    onClick={() => selectLevel(map.id)}
                    aria-label={`Play ${map.name}`}
                  >
                    <span className="ticket-num">{String(map.id).padStart(2, '0')}</span>
                    <span className="ticket-body">
                      <span className="ticket-title">{map.name}</span>
                      <span className="ticket-sub">{map.subtitle}</span>
                      <span className="ticket-meta">
                        <span className="pips" aria-label={`Difficulty ${map.difficulty} of 5`}>
                          {Array.from({ length: 5 }).map((_, i) => (
                            <i key={i} className={i < map.difficulty ? 'on' : ''} />
                          ))}
                        </span>
                        <span className="ticket-pb">
                          <Icon name="stopwatch" size={13} />
                          {stat?.bestTimeMs ? formatTimeMs(stat.bestTimeMs) : '--.---'}
                        </span>
                        <span className="ticket-target" title="Gold target">
                          <MedalDisc tier="gold" size={12} />
                          {(map.medalTimesMs.gold / 1000).toFixed(1)}
                        </span>
                      </span>
                    </span>
                    <span className="ticket-end">
                      <MedalDisc tier={medal} size={26} />
                      <span className="ticket-go">
                        <Icon name="play" size={16} />
                        {gamepadConnected && isSelected && <kbd>A</kbd>}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
