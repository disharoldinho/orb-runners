import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sparkles, Shuffle, ArrowLeft, Lock, Award } from 'lucide-react';
import * as THREE from 'three';
import { useGameStore } from '../../store/useGameStore';
import {
  AvatarConfig,
  BODY_OPTIONS,
  COLOR_SWATCHES,
  CosmeticItem,
  EYE_OPTIONS,
  HAT_OPTIONS,
  MOUTH_OPTIONS,
  ORB_STYLE_OPTIONS,
} from '../../types/avatar';
import { CharacterModel } from '../game/CharacterModel';
import { OrbShell } from '../game/PlayerOrb';

function TurntableStage({ avatar }: { avatar: AvatarConfig }) {
  const groupRef = useRef<THREE.Group>(null);
  const shellRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.65;
    }
    if (shellRef.current) {
      shellRef.current.rotation.x += delta * 0.35;
      shellRef.current.rotation.z += delta * 0.2;
    }
  });

  return (
    <group position={[0, -0.15, 0]}>
      <group ref={groupRef}>
        <CharacterModel config={avatar} isPreview />
      </group>
      <group ref={shellRef}>
        <OrbShell style={avatar.orbStyle} primaryColor={avatar.primaryColor} />
      </group>

      {/* Studio Pedestal */}
      <mesh position={[0, -0.72, 0]} receiveShadow>
        <cylinderGeometry args={[0.85, 1.05, 0.24, 32]} />
        <meshStandardMaterial color="#1e293b" metalness={0.6} roughness={0.25} />
      </mesh>
      <mesh position={[0, -0.59, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.86, 0.03, 12, 36]} />
        <meshStandardMaterial
          color={avatar.primaryColor}
          emissive={avatar.primaryColor}
          emissiveIntensity={0.8}
        />
      </mesh>
    </group>
  );
}

export function CharacterCreator() {
  const avatar = useGameStore((s) => s.avatar);
  const updateAvatar = useGameStore((s) => s.updateAvatar);
  const setScreen = useGameStore((s) => s.setScreen);
  const totalMedals = useGameStore((s) => s.getTotalMedalsCount());

  const handleRandomize = () => {
    const pick = <T extends string>(items: CosmeticItem<T>[]): T => {
      const unlocked = items.filter((i) => !i.requiredMedals || totalMedals >= i.requiredMedals);
      return unlocked[Math.floor(Math.random() * unlocked.length)].id;
    };
    const c1 = COLOR_SWATCHES[Math.floor(Math.random() * COLOR_SWATCHES.length)];
    let c2 = COLOR_SWATCHES[Math.floor(Math.random() * COLOR_SWATCHES.length)];
    if (c2 === c1) c2 = '#FFF5E1';

    updateAvatar({
      bodyType: pick(BODY_OPTIONS),
      eyeType: pick(EYE_OPTIONS),
      mouthType: pick(MOUTH_OPTIONS),
      hatType: pick(HAT_OPTIONS),
      orbStyle: pick(ORB_STYLE_OPTIONS),
      primaryColor: c1,
      secondaryColor: c2,
    });
  };

  return (
    <div className="creator-screen">
      {/* Top Header */}
      <header className="creator-header">
        <button className="btn-secondary" onClick={() => setScreen('menu')}>
          <ArrowLeft size={18} />
          <span>Back to Maps</span>
        </button>

        <div className="creator-title-group">
          <Sparkles size={22} className="accent-icon" />
          <h1>Orb Buddy Workshop</h1>
        </div>

        <div className="medal-counter-pill">
          <Award size={18} />
          <span>{totalMedals} / 10 Stage Medals Unlocked</span>
        </div>
      </header>

      <div className="creator-content">
        {/* Left: Live 3D Turntable Viewport */}
        <div className="creator-preview-card">
          <div className="preview-canvas-box">
            <Canvas shadows camera={{ position: [0, 0.55, 2.45], fov: 45 }}>
              <ambientLight intensity={0.85} />
              <directionalLight position={[4, 6, 5]} intensity={1.4} castShadow />
              <pointLight position={[-3, 2, -2]} intensity={0.8} color="#38bdf8" />
              <TurntableStage avatar={avatar} />
            </Canvas>
          </div>

          <div className="preview-controls-bar">
            <div className="name-input-group">
              <label htmlFor="buddy-name">Runner Name</label>
              <input
                id="buddy-name"
                type="text"
                maxLength={16}
                value={avatar.name}
                onChange={(e) => updateAvatar({ name: e.target.value })}
                placeholder="Enter name..."
              />
            </div>

            <button className="btn-accent" onClick={handleRandomize}>
              <Shuffle size={17} />
              <span>Randomize</span>
            </button>
          </div>
        </div>

        {/* Right: Modular Parts & Colors Selector */}
        <div className="creator-options-panel">
          {/* Body Shape */}
          <section className="option-section">
            <h3>1. Body Shape</h3>
            <div className="option-grid">
              {BODY_OPTIONS.map((item) => (
                <button
                  key={item.id}
                  className={`option-chip ${avatar.bodyType === item.id ? 'active' : ''}`}
                  onClick={() => updateAvatar({ bodyType: item.id })}
                >
                  <span className="chip-icon">{item.icon}</span>
                  <span className="chip-label">{item.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Eyes */}
          <section className="option-section">
            <h3>2. Expression / Eyes</h3>
            <div className="option-grid">
              {EYE_OPTIONS.map((item) => {
                const locked = Boolean(item.requiredMedals && totalMedals < item.requiredMedals);
                return (
                  <button
                    key={item.id}
                    disabled={locked}
                    className={`option-chip ${avatar.eyeType === item.id ? 'active' : ''} ${
                      locked ? 'locked' : ''
                    }`}
                    onClick={() => updateAvatar({ eyeType: item.id })}
                  >
                    <span className="chip-icon">{locked ? <Lock size={15} /> : item.icon}</span>
                    <span className="chip-label">
                      {item.label}
                      {locked && <small className="unlock-hint">{item.requiredMedals} Medals</small>}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Mouth */}
          <section className="option-section">
            <h3>3. Mouth & Face</h3>
            <div className="option-grid">
              {MOUTH_OPTIONS.map((item) => {
                const locked = Boolean(item.requiredMedals && totalMedals < item.requiredMedals);
                return (
                  <button
                    key={item.id}
                    disabled={locked}
                    className={`option-chip ${avatar.mouthType === item.id ? 'active' : ''} ${
                      locked ? 'locked' : ''
                    }`}
                    onClick={() => updateAvatar({ mouthType: item.id })}
                  >
                    <span className="chip-icon">{locked ? <Lock size={15} /> : item.icon}</span>
                    <span className="chip-label">
                      {item.label}
                      {locked && <small className="unlock-hint">{item.requiredMedals} Medals</small>}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Hats */}
          <section className="option-section">
            <h3>4. Hats & Headgear</h3>
            <div className="option-grid">
              {HAT_OPTIONS.map((item) => {
                const locked = Boolean(item.requiredMedals && totalMedals < item.requiredMedals);
                return (
                  <button
                    key={item.id}
                    disabled={locked}
                    className={`option-chip ${avatar.hatType === item.id ? 'active' : ''} ${
                      locked ? 'locked' : ''
                    }`}
                    onClick={() => updateAvatar({ hatType: item.id })}
                  >
                    <span className="chip-icon">{locked ? <Lock size={15} /> : item.icon}</span>
                    <span className="chip-label">
                      {item.label}
                      {locked && <small className="unlock-hint">{item.requiredMedals} Medals</small>}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Orb Shell */}
          <section className="option-section">
            <h3>5. Glass Orb Shell</h3>
            <div className="option-grid">
              {ORB_STYLE_OPTIONS.map((item) => {
                const locked = Boolean(item.requiredMedals && totalMedals < item.requiredMedals);
                return (
                  <button
                    key={item.id}
                    disabled={locked}
                    className={`option-chip ${avatar.orbStyle === item.id ? 'active' : ''} ${
                      locked ? 'locked' : ''
                    }`}
                    onClick={() => updateAvatar({ orbStyle: item.id })}
                  >
                    <span className="chip-icon">{locked ? <Lock size={15} /> : item.icon}</span>
                    <span className="chip-label">
                      {item.label}
                      {locked && <small className="unlock-hint">{item.requiredMedals} Medals</small>}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Colors */}
          <section className="option-section colors-row">
            <div>
              <h3>Primary Color</h3>
              <div className="swatch-row">
                {COLOR_SWATCHES.map((hex) => (
                  <button
                    key={hex}
                    className={`color-swatch ${avatar.primaryColor === hex ? 'selected' : ''}`}
                    style={{ backgroundColor: hex }}
                    onClick={() => updateAvatar({ primaryColor: hex })}
                    aria-label={`Primary color ${hex}`}
                  />
                ))}
              </div>
            </div>

            <div>
              <h3>Accent / Belly Color</h3>
              <div className="swatch-row">
                {COLOR_SWATCHES.map((hex) => (
                  <button
                    key={hex}
                    className={`color-swatch ${avatar.secondaryColor === hex ? 'selected' : ''}`}
                    style={{ backgroundColor: hex }}
                    onClick={() => updateAvatar({ secondaryColor: hex })}
                    aria-label={`Secondary color ${hex}`}
                  />
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
