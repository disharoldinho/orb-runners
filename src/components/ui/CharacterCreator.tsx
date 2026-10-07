import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
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
import { CosmeticGlyph } from './cosmeticGlyphs';
import { Icon, MedalDisc } from './icons';
import { PreviewCanvasGuard } from './GameFallback';

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
        <meshStandardMaterial color="#fff3dc" metalness={0.05} roughness={0.7} />
      </mesh>
      <mesh position={[0, -0.59, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.86, 0.03, 12, 36]} />
        <meshStandardMaterial
          color={avatar.primaryColor}
          emissive={avatar.primaryColor}
          emissiveIntensity={0.25}
        />
      </mesh>
    </group>
  );
}

function OptionSection<T extends string>({
  title,
  items,
  value,
  onPick,
  totalMedals,
  color,
}: {
  title: string;
  items: CosmeticItem<T>[];
  value: T;
  onPick: (id: T) => void;
  totalMedals: number;
  color: string;
}) {
  return (
    <section className="opt-section">
      <h3>{title}</h3>
      <div className="opt-grid">
        {items.map((item) => {
          const locked = Boolean(item.requiredMedals && totalMedals < item.requiredMedals);
          return (
            <button
              key={item.id}
              disabled={locked}
              className={`opt-chip ${value === item.id ? 'on' : ''} ${locked ? 'locked' : ''}`}
              onClick={() => onPick(item.id)}
              aria-pressed={value === item.id}
            >
              <span className="opt-glyph">
                {locked ? (
                  <Icon name="lock" size={20} />
                ) : (
                  <CosmeticGlyph id={item.id} color={color} />
                )}
              </span>
              <span className="opt-label">
                {item.label}
                {locked && (
                  <small>
                    <MedalDisc tier="gold" size={11} /> {item.requiredMedals}
                  </small>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </section>
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

  const common = { totalMedals, color: avatar.primaryColor };

  return (
    <div className="creator-screen paper">
      <header className="screen-head">
        <button className="btn btn-paper btn-sm" onClick={() => setScreen('menu')}>
          <Icon name="arrowLeft" size={18} />
          <span>Back</span>
        </button>
        <h1 className="screen-title">Workshop</h1>
        <span className="tag tag-sun" title="Medals unlock cosmetics">
          <MedalDisc tier="gold" size={16} />
          {totalMedals} medals
        </span>
      </header>

      <div className="creator-layout">
        <div className="card creator-stage">
          <div className="creator-canvas">
            <PreviewCanvasGuard>
              <Canvas shadows camera={{ position: [0, 0.55, 2.45], fov: 45 }} dpr={[1, 1.75]}>
                <ambientLight intensity={0.95} />
                <directionalLight position={[4, 6, 5]} intensity={1.4} castShadow />
                <pointLight position={[-3, 2, -2]} intensity={0.6} color="#3fa9ff" />
                <TurntableStage avatar={avatar} />
              </Canvas>
            </PreviewCanvasGuard>
          </div>
          <div className="creator-name-row">
            <label className="field">
              <span>Runner name</span>
              <input
                id="buddy-name"
                type="text"
                maxLength={16}
                value={avatar.name}
                onChange={(e) => updateAvatar({ name: e.target.value })}
                placeholder="Name your runner"
              />
            </label>
            <button className="btn btn-sun" onClick={handleRandomize} aria-label="Randomise look">
              <Icon name="shuffle" size={18} />
              <span>Shuffle</span>
            </button>
          </div>
        </div>

        <div className="creator-options">
          <OptionSection
            title="Body"
            items={BODY_OPTIONS}
            value={avatar.bodyType}
            onPick={(id) => updateAvatar({ bodyType: id })}
            {...common}
          />
          <OptionSection
            title="Eyes"
            items={EYE_OPTIONS}
            value={avatar.eyeType}
            onPick={(id) => updateAvatar({ eyeType: id })}
            {...common}
          />
          <OptionSection
            title="Mouth"
            items={MOUTH_OPTIONS}
            value={avatar.mouthType}
            onPick={(id) => updateAvatar({ mouthType: id })}
            {...common}
          />
          <OptionSection
            title="Hat"
            items={HAT_OPTIONS}
            value={avatar.hatType}
            onPick={(id) => updateAvatar({ hatType: id })}
            {...common}
          />
          <OptionSection
            title="Orb shell"
            items={ORB_STYLE_OPTIONS}
            value={avatar.orbStyle}
            onPick={(id) => updateAvatar({ orbStyle: id })}
            {...common}
          />

          <section className="opt-section">
            <h3>Main colour</h3>
            <div className="swatches">
              {COLOR_SWATCHES.map((hex) => (
                <button
                  key={hex}
                  className={`swatch ${avatar.primaryColor === hex ? 'on' : ''}`}
                  style={{ backgroundColor: hex }}
                  onClick={() => updateAvatar({ primaryColor: hex })}
                  aria-label={`Primary color ${hex}`}
                />
              ))}
            </div>
          </section>
          <section className="opt-section">
            <h3>Belly colour</h3>
            <div className="swatches">
              {COLOR_SWATCHES.map((hex) => (
                <button
                  key={hex}
                  className={`swatch ${avatar.secondaryColor === hex ? 'on' : ''}`}
                  style={{ backgroundColor: hex }}
                  onClick={() => updateAvatar({ secondaryColor: hex })}
                  aria-label={`Secondary color ${hex}`}
                />
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
