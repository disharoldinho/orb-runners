import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import {
  Play,
  Sparkles,
  Trophy,
  Star,
  Lock,
  Award,
  Gamepad2,
  Flag,
  Mountain,
  Users,
  Globe,
} from 'lucide-react';
import { useRef } from 'react';
import * as THREE from 'three';
import { MAPS } from '../../levels/maps';
import { SUMMIT_LEVEL_ID } from '../../levels/summitMap';
import { useGameStore } from '../../store/useGameStore';
import { CharacterModel } from '../game/CharacterModel';
import { OrbShell } from '../game/PlayerOrb';
import { formatTimeMs } from './HUD';

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
  const totalMedals = useGameStore((s) => s.getTotalMedalsCount());
  const authorMedals = useGameStore((s) => s.getAuthorMedalsCount());

  const summitStat = progress[SUMMIT_LEVEL_ID];

  return (
    <div className="main-menu-screen">
      {/* Left Hero Column: Game Branding & Live 3D Avatar Card */}
      <aside className="menu-hero-panel">
        <div className="brand-header">
          <div className="brand-pills-row">
            <span className="arcade-pill">SUMMIT MULTIPLAYER &amp; 15-MAP CAMPAIGN</span>
            {gamepadConnected && (
              <span className="gamepad-connected-pill">
                <Gamepad2 size={13} />
                Controller Active
              </span>
            )}
          </div>
          <h1 className="game-logo">ORB RUNNERS</h1>
          <p className="game-tagline">
            Tilt the world, race friends up the 25-stage Summit Tower, and chase Trackmaster
            Medals!
          </p>
        </div>

        <div className="hero-avatar-showcase">
          <div className="hero-canvas-container">
            <Canvas camera={{ position: [0, 0.35, 2.05], fov: 44 }}>
              <Environment resolution={256}>
                <Lightformer
                  form="circle"
                  intensity={3.5}
                  position={[0, 4, 3]}
                  scale={4}
                />
                <Lightformer
                  form="ring"
                  color="#38bdf8"
                  intensity={2.5}
                  position={[-4, 2, 2]}
                  scale={4}
                />
              </Environment>
              <ambientLight intensity={0.85} />
              <directionalLight position={[3, 5, 4]} intensity={1.4} />
              <HeroOrbPreview />
            </Canvas>
          </div>
          <div className="hero-avatar-footer">
            <div>
              <span className="runner-label">ACTIVE RUNNER</span>
              <h3>{avatar.name || 'Pip'}</h3>
            </div>
            <button
              className="btn-accent"
              onClick={() => setScreen('character-creator')}
            >
              <Sparkles size={17} />
              <span>{gamepadConnected ? 'Customize (X)' : 'Customize Buddy'}</span>
            </button>
          </div>
        </div>

        <div className="controls-guide-box">
          <h4>Controls &amp; Speedrun Rules</h4>
          <ul>
            <li>
              <strong>WASD / Left Stick:</strong> Tilt the stage around your orb
            </li>
            <li>
              <strong>C / Backspace / Pad (B):</strong> Checkpoint / Biome Camp Respawn
            </li>
            <li>
              <strong>R / Delete / Pad (Y):</strong> Instant 00:00.000 Stage Reset
            </li>
            <li>
              <strong>Keys 1–4 (Summit Mode):</strong> Pop live 3D Emotes (👋 🔥 😱 👑)
            </li>
          </ul>
        </div>
      </aside>

      {/* Right Column: Reach the Summit Banner + 15-Stage Campaign Grid */}
      <main className="menu-levels-panel">
        {/* ================= REACH THE SUMMIT MULTIPLAYER HERO BANNER ================= */}
        <div className="summit-menu-banner">
          <div className="summit-menu-banner-left">
            <div className="summit-banner-badges">
              <span className="summit-featured-pill">
                <Mountain size={13} /> NEW MULTIPLAYER MODE
              </span>
              <span className="summit-live-pill">
                <Users size={12} /> PUBLIC &amp; PRIVATE LOBBIES (CODES + PASSWORDS)
              </span>
            </div>
            <h2>🏔️ REACH THE SUMMIT (5-PHASE, 25-STAGE MEGA-CLIMB)</h2>
            <p>
              Ascend a continuous <strong>250-meter, 2km mountain highway</strong> of 25
              interconnected stages across 5 themed phases! Climb on a live server with friends, pop
              3D emotes, and unlock 5 Biome Base Camps along the way.
            </p>
            <div className="summit-banner-stats">
              <div>
                <span>PEAK ALTITUDE</span>
                <strong>{summitBestAltitudeM}m / 250m</strong>
              </div>
              <div>
                <span>FASTEST SUMMIT</span>
                <strong>
                  {summitStat?.bestTimeMs ? formatTimeMs(summitStat.bestTimeMs) : '--:--.---'}
                </strong>
              </div>
            </div>
          </div>

          <div className="summit-menu-banner-actions">
            <button
              className="btn-summit-Quick"
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
              <Globe size={18} />
              <span>Play Public Server</span>
            </button>
            <button className="btn-summit-private" onClick={openSummitLobbyModal}>
              <Lock size={16} />
              <span>Private Lobbies (Code / Password)</span>
            </button>
          </div>
        </div>

        <div className="levels-panel-header">
          <div>
            <h2>Official Speedrun Campaign ({MAPS.length} Maps)</h2>
            <p>
              Beat Bronze, Silver, Gold, and the secret green <strong>Author Medal</strong> times!
            </p>
          </div>
          <div className="medal-header-pills">
            {authorMedals > 0 && (
              <div className="author-summary-badge">
                <span>
                  🎖️ {authorMedals} / {MAPS.length} Author
                </span>
              </div>
            )}
            <div className="medal-summary-badge">
              <Award size={20} />
              <span>
                {totalMedals} / {MAPS.length} Medaled
              </span>
            </div>
          </div>
        </div>

        <div className="levels-grid">
          {MAPS.map((map) => {
            const stat = progress[map.id];
            const medal = stat?.medal || 'none';
            const isSelected = currentLevelId === map.id;
            const cpCount = map.checkpoints?.length ?? 1;

            return (
              <div
                key={map.id}
                className={`level-card medal-${medal} ${
                  isSelected ? 'gamepad-selected-card' : ''
                }`}
                onClick={() => selectLevel(map.id)}
              >
                <div className="level-card-top">
                  <div className="level-card-badges">
                    <span
                      className="level-num-badge"
                      style={{ backgroundColor: map.accentColor }}
                    >
                      MAP {String(map.id).padStart(2, '0')}
                    </span>
                    <span className="level-cp-badge" title={`${cpCount} Checkpoints`}>
                      <Flag size={11} />
                      {cpCount} CP
                    </span>
                  </div>

                  <div className="difficulty-stars" title={`Difficulty ${map.difficulty}/5`}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        size={13}
                        fill={i < map.difficulty ? '#facc15' : 'transparent'}
                        color={i < map.difficulty ? '#facc15' : '#64748b'}
                      />
                    ))}
                  </div>
                </div>

                <h3 className="level-card-title">{map.name}</h3>
                <p className="level-card-desc">{map.subtitle}</p>

                <div className="level-card-footer">
                  <div className="level-record-info">
                    <span className="record-label">PERSONAL BEST</span>
                    <strong className="record-value">
                      {stat?.bestTimeMs ? formatTimeMs(stat.bestTimeMs) : '--:--.---'}
                    </strong>
                    <span className="gold-target-hint">
                      🎖️ {(map.medalTimesMs.author / 1000).toFixed(1)}s · 🥇{' '}
                      {(map.medalTimesMs.gold / 1000).toFixed(1)}s
                    </span>
                  </div>

                  <div className="level-play-col">
                    {medal !== 'none' && (
                      <span className={`medal-chip ${medal}`}>
                        <Trophy size={13} />
                        {medal.toUpperCase()}
                      </span>
                    )}
                    <button className="play-stage-btn" aria-label={`Play ${map.name}`}>
                      <Play size={16} fill="currentColor" />
                      <span>{gamepadConnected && isSelected ? 'Play (A)' : 'Roll!'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Future Level Editor Teaser Card */}
          <div className="level-card editor-teaser-card">
            <div className="level-card-top">
              <span className="level-num-badge editor-badge">FUTURE UPDATE</span>
              <Lock size={15} color="#94a3b8" />
            </div>
            <h3 className="level-card-title">Custom Map Studio</h3>
            <p className="level-card-desc">
              All 15 campaign stages and the 25-stage Summit Tower run on our declarative JSON
              Level Schema—ready for the Custom Map Builder!
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
