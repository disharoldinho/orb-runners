import { useMemo } from 'react';
import { RigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import { BlockTheme, StaticBlockDef } from '../../types/level';

export const THEME_PALETTES: Record<
  BlockTheme,
  { c1: string; c2: string; trim: string; rail: string; glow: string }
> = {
  meadow: {
    c1: '#14b8a6',
    c2: '#0d9488',
    trim: '#f59e0b',
    rail: '#fbbf24',
    glow: '#2dd4bf',
  },
  cobalt: {
    c1: '#2563eb',
    c2: '#1d4ed8',
    trim: '#38bdf8',
    rail: '#facc15',
    glow: '#60a5fa',
  },
  sunset: {
    c1: '#ea580c',
    c2: '#c2410c',
    trim: '#fde047',
    rail: '#fb7185',
    glow: '#fb923c',
  },
  cyber: {
    c1: '#1e1b4b',
    c2: '#0f172a',
    trim: '#00f5d4',
    rail: '#f72585',
    glow: '#00f5d4',
  },
  citadel: {
    c1: '#334155',
    c2: '#1e293b',
    trim: '#f59e0b',
    rail: '#ef4444',
    glow: '#fbbf24',
  },
  warning: {
    c1: '#eab308',
    c2: '#ca8a04',
    trim: '#ef4444',
    rail: '#ef4444',
    glow: '#fde047',
  },
  gold: {
    c1: '#f59e0b',
    c2: '#d97706',
    trim: '#fef08a',
    rail: '#ffffff',
    glow: '#fde047',
  },
  ice: {
    c1: '#38bdf8',
    c2: '#0284c7',
    trim: '#e0f2fe',
    rail: '#ffffff',
    glow: '#7dd3fc',
  },
};

const textureCache = new Map<string, THREE.CanvasTexture>();
let sharedBumpMap: THREE.CanvasTexture | null = null;

export function getTileBumpMap(repeatX: number, repeatZ: number): THREE.CanvasTexture {
  if (!sharedBumpMap) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    // Base raised tile height
    ctx.fillStyle = '#d0d0d0';
    ctx.fillRect(0, 0, 256, 256);

    // Grout / bevel trenches for 2x2 grid
    ctx.strokeStyle = '#303030';
    ctx.lineWidth = 6;
    ctx.strokeRect(0, 0, 128, 128);
    ctx.strokeRect(128, 0, 128, 128);
    ctx.strokeRect(0, 128, 128, 128);
    ctx.strokeRect(128, 128, 128, 128);

    // Inner recessed tech frame
    ctx.strokeStyle = '#909090';
    ctx.lineWidth = 2;
    ctx.strokeRect(14, 14, 100, 100);
    ctx.strokeRect(142, 14, 100, 100);
    ctx.strokeRect(14, 142, 100, 100);
    ctx.strokeRect(142, 142, 100, 100);

    sharedBumpMap = new THREE.CanvasTexture(canvas);
    sharedBumpMap.wrapS = THREE.RepeatWrapping;
    sharedBumpMap.wrapT = THREE.RepeatWrapping;
  }

  const clone = sharedBumpMap.clone();
  clone.needsUpdate = true;
  clone.repeat.set(Math.max(1, repeatX / 2), Math.max(1, repeatZ / 2));
  return clone;
}

export function getCheckerTexture(theme: BlockTheme, repeatX: number, repeatZ: number) {
  const key = `${theme}_${Math.round(repeatX * 2)}_${Math.round(repeatZ * 2)}_v2`;
  const existing = textureCache.get(key);
  if (existing) return existing;

  const palette = THEME_PALETTES[theme] || THEME_PALETTES.meadow;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const drawTile = (ox: number, oy: number, baseColor: string, isAlt: boolean) => {
    ctx.fillStyle = baseColor;
    ctx.fillRect(ox, oy, 256, 256);

    // Subtle radial sheen inside tile
    const grad = ctx.createRadialGradient(ox + 128, oy + 128, 20, ox + 128, oy + 128, 170);
    grad.addColorStop(0, 'rgba(255,255,255,0.12)');
    grad.addColorStop(1, 'rgba(0,0,0,0.14)');
    ctx.fillStyle = grad;
    ctx.fillRect(ox, oy, 256, 256);

    // Outer bevel highlight & shadow
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 4;
    ctx.strokeRect(ox + 4, oy + 4, 248, 248);

    // Inner tech inset frame
    ctx.strokeStyle = isAlt ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.18)';
    ctx.lineWidth = 3;
    ctx.strokeRect(ox + 22, oy + 22, 212, 212);

    // Corner rivets
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    const corners = [
      [ox + 14, oy + 14],
      [ox + 242, oy + 14],
      [ox + 14, oy + 242],
      [ox + 242, oy + 242],
    ];
    for (const [cx, cy] of corners) {
      ctx.beginPath();
      ctx.arc(cx, cy, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  drawTile(0, 0, palette.c1, false);
  drawTile(256, 256, palette.c1, false);
  drawTile(256, 0, palette.c2, true);
  drawTile(0, 256, palette.c2, true);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(Math.max(1, repeatX / 2), Math.max(1, repeatZ / 2));
  tex.anisotropy = 8;
  textureCache.set(key, tex);
  return tex;
}

export function StaticBlock({
  position,
  size,
  rotation = [0, 0, 0],
  theme = 'meadow',
  rails = 'none',
  railHeight = 0.45,
}: StaticBlockDef) {
  const [sx, sy, sz] = size;
  const palette = THEME_PALETTES[theme] || THEME_PALETTES.meadow;

  const checkerTex = useMemo(() => getCheckerTexture(theme, sx, sz), [theme, sx, sz]);
  const bumpTex = useMemo(() => getTileBumpMap(sx, sz), [sx, sz]);

  const showLeftRail = rails === 'both' || rails === 'left';
  const showRightRail = rails === 'both' || rails === 'right';
  const railThickness = 0.24;

  return (
    <RigidBody
      type="fixed"
      position={position}
      rotation={rotation}
      friction={theme === 'ice' ? 0.15 : 0.95}
      restitution={0.2}
    >
      {/* Main Beveled PBR Floor Block */}
      <mesh receiveShadow castShadow>
        <boxGeometry args={[sx, sy, sz]} />
        <meshStandardMaterial
          map={checkerTex}
          bumpMap={bumpTex}
          bumpScale={0.016}
          roughness={theme === 'ice' ? 0.08 : theme === 'cyber' ? 0.24 : 0.32}
          metalness={theme === 'gold' ? 0.65 : theme === 'cyber' ? 0.35 : 0.15}
        />
      </mesh>

      {/* Glowing Neon Side Trim Frame */}
      <mesh position={[0, -sy * 0.2, 0]}>
        <boxGeometry args={[sx + 0.1, 0.1, sz + 0.08]} />
        <meshStandardMaterial
          color={palette.trim}
          emissive={palette.glow}
          emissiveIntensity={0.5}
          roughness={0.2}
          metalness={0.5}
        />
      </mesh>

      {/* Trackmania Stadium Racing Edge Curbs (Left & Right) */}
      <mesh position={[-sx / 2 + 0.09, sy / 2 + 0.012, 0]} receiveShadow>
        <boxGeometry args={[0.18, 0.024, sz]} />
        <meshStandardMaterial
          color={palette.rail}
          emissive={palette.glow}
          emissiveIntensity={0.25}
          roughness={0.25}
        />
      </mesh>
      <mesh position={[sx / 2 - 0.09, sy / 2 + 0.012, 0]} receiveShadow>
        <boxGeometry args={[0.18, 0.024, sz]} />
        <meshStandardMaterial
          color={palette.rail}
          emissive={palette.glow}
          emissiveIntensity={0.25}
          roughness={0.25}
        />
      </mesh>

      {/* Architectural Metallic Under-Chassis Hull */}
      <mesh position={[0, -sy / 2 - 0.18, 0]}>
        <boxGeometry args={[sx * 0.88, 0.34, sz * 0.94]} />
        <meshStandardMaterial color="#0f172a" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Optional Left Safety Rail with Glowing Top Strip */}
      {showLeftRail && (
        <group position={[-sx / 2 + railThickness / 2, sy / 2 + railHeight / 2, 0]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[railThickness, railHeight, sz]} />
            <meshStandardMaterial color={palette.rail} roughness={0.25} metalness={0.35} />
          </mesh>
          <mesh position={[0, railHeight / 2 + 0.02, 0]}>
            <boxGeometry args={[railThickness * 0.6, 0.04, sz]} />
            <meshStandardMaterial
              color={palette.glow}
              emissive={palette.glow}
              emissiveIntensity={0.8}
            />
          </mesh>
        </group>
      )}

      {/* Optional Right Safety Rail with Glowing Top Strip */}
      {showRightRail && (
        <group position={[sx / 2 - railThickness / 2, sy / 2 + railHeight / 2, 0]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[railThickness, railHeight, sz]} />
            <meshStandardMaterial color={palette.rail} roughness={0.25} metalness={0.35} />
          </mesh>
          <mesh position={[0, railHeight / 2 + 0.02, 0]}>
            <boxGeometry args={[railThickness * 0.6, 0.04, sz]} />
            <meshStandardMaterial
              color={palette.glow}
              emissive={palette.glow}
              emissiveIntensity={0.8}
            />
          </mesh>
        </group>
      )}
    </RigidBody>
  );
}
