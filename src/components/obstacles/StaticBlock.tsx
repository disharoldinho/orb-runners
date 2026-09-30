import { useMemo } from 'react';
import { RigidBody } from '@react-three/rapier';
import type { CoefficientCombineRule } from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import { BlockTheme, StaticBlockDef } from '../../types/level';
import { useGameStore } from '../../store/useGameStore';
import {
  getSharedMaterial,
  getSurfaceMaterial,
  isNaturalTheme,
} from '../../graphics/surfaceMaterials';

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
  forest: {
    c1: '#4d7c0f',
    c2: '#3f6212',
    trim: '#a16207',
    rail: '#78350f',
    glow: '#bef264',
  },
  crystal: {
    c1: '#6d28d9',
    c2: '#4c1d95',
    trim: '#e879f9',
    rail: '#c4b5fd',
    glow: '#f0abfc',
  },
  sand: {
    c1: '#e7b872',
    c2: '#d19a4c',
    trim: '#b45309',
    rail: '#9a3412',
    glow: '#fcd34d',
  },
  lava: {
    c1: '#292524',
    c2: '#1c1917',
    trim: '#f97316',
    rail: '#57534e',
    glow: '#fb923c',
  },
  storm: {
    c1: '#475569',
    c2: '#334155',
    trim: '#67e8f9',
    rail: '#e2e8f0',
    glow: '#a5f3fc',
  },
  cloud: {
    c1: '#f8fafc',
    c2: '#e2e8f0',
    trim: '#fbbf24',
    rail: '#fde68a',
    glow: '#fef3c7',
  },
};

/** Rapier CoefficientCombineRule.Min: an ice surface stays slippery whatever the orb's own friction. */
const COMBINE_MIN = 1 as CoefficientCombineRule;

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

  // One canvas (and one GPU upload) per theme; per-size textures are clones sharing its source.
  const baseKey = `${theme}_base_v2`;
  const base = textureCache.get(baseKey);
  if (base) {
    const clone = base.clone();
    clone.repeat.set(Math.max(1, repeatX / 2), Math.max(1, repeatZ / 2));
    clone.needsUpdate = true;
    textureCache.set(key, clone);
    return clone;
  }

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
  textureCache.set(baseKey, tex);
  return getCheckerTexture(theme, repeatX, repeatZ);
}

export function StaticBlock({
  position,
  size,
  rotation = [0, 0, 0],
  theme = 'meadow',
  rails = 'none',
  railHeight = 0.45,
  surface = 'normal',
  decorative = false,
}: StaticBlockDef) {
  const [sx, sy, sz] = size;
  const palette = THEME_PALETTES[theme] || THEME_PALETTES.meadow;

  const quality = useGameStore((st) => st.graphicsQuality);
  const isIce = surface === 'ice';
  const natural = isNaturalTheme(theme);

  // Shared (per theme/quality) materials: one program + uniform set for hundreds of blocks.
  const mats = useMemo(() => {
    const body = getSurfaceMaterial(theme, surface, palette, quality);
    const trim = getSharedMaterial(
      `trim|${theme}`,
      () =>
        new THREE.MeshStandardMaterial({
          color: palette.trim,
          emissive: palette.glow,
          emissiveIntensity: natural ? 0.55 : 1.1,
          roughness: 0.2,
          metalness: 0.5,
        })
    );
    const curb = getSharedMaterial(
      `curb|${theme}`,
      () =>
        new THREE.MeshStandardMaterial({
          color: palette.rail,
          emissive: palette.glow,
          emissiveIntensity: natural ? 0.12 : 0.25,
          roughness: 0.3,
        })
    );
    // Natural themes: the underside reads as rock (same procedural body material).
    const hull = natural
      ? body
      : getSharedMaterial(
          'hull|metal',
          () => new THREE.MeshStandardMaterial({ color: '#0f172a', metalness: 0.7, roughness: 0.3 })
        );
    const rail = getSharedMaterial(
      `rail|${theme}`,
      () =>
        new THREE.MeshStandardMaterial({
          color: palette.rail,
          roughness: natural ? 0.55 : 0.25,
          metalness: natural ? 0.1 : 0.4,
        })
    );
    const railGlow = getSharedMaterial(
      `railglow|${theme}`,
      () =>
        new THREE.MeshStandardMaterial({
          color: palette.glow,
          emissive: palette.glow,
          emissiveIntensity: natural ? 1.2 : 1.8,
        })
    );
    return { body, trim, curb, hull, rail, railGlow };
  }, [theme, surface, palette, quality, natural]);

  const showLeftRail = rails === 'both' || rails === 'left';
  const showRightRail = rails === 'both' || rails === 'right';
  const railThickness = 0.24;

  // NOTE: the mesh list below must stay geometry-identical: the fixed RigidBody derives its
  // cuboid colliders from these meshes. Only materials are art (shared, procedural).
  const content = (
    <>
      {/* Main block: procedural themed tiles on top, rock/panels on the sides */}
      <mesh receiveShadow castShadow material={mats.body}>
        <boxGeometry args={[sx, sy, sz]} />
      </mesh>

      {/* Glowing side trim frame */}
      <mesh position={[0, -sy * 0.2, 0]} material={mats.trim}>
        <boxGeometry args={[sx + 0.1, 0.1, sz + 0.08]} />
      </mesh>

      {/* Edge curbs (left & right) */}
      <mesh position={[-sx / 2 + 0.09, sy / 2 + 0.012, 0]} receiveShadow material={mats.curb}>
        <boxGeometry args={[0.18, 0.024, sz]} />
      </mesh>
      <mesh position={[sx / 2 - 0.09, sy / 2 + 0.012, 0]} receiveShadow material={mats.curb}>
        <boxGeometry args={[0.18, 0.024, sz]} />
      </mesh>

      {/* Under-hull (rock for natural themes, metal chassis for stadium themes) */}
      <mesh position={[0, -sy / 2 - 0.18, 0]} material={mats.hull}>
        <boxGeometry args={[sx * 0.88, 0.34, sz * 0.94]} />
      </mesh>

      {showLeftRail && (
        <group position={[-sx / 2 + railThickness / 2, sy / 2 + railHeight / 2, 0]}>
          <mesh castShadow receiveShadow material={mats.rail}>
            <boxGeometry args={[railThickness, railHeight, sz]} />
          </mesh>
          <mesh position={[0, railHeight / 2 + 0.02, 0]} material={mats.railGlow}>
            <boxGeometry args={[railThickness * 0.6, 0.04, sz]} />
          </mesh>
        </group>
      )}

      {showRightRail && (
        <group position={[sx / 2 - railThickness / 2, sy / 2 + railHeight / 2, 0]}>
          <mesh castShadow receiveShadow material={mats.rail}>
            <boxGeometry args={[railThickness, railHeight, sz]} />
          </mesh>
          <mesh position={[0, railHeight / 2 + 0.02, 0]} material={mats.railGlow}>
            <boxGeometry args={[railThickness * 0.6, 0.04, sz]} />
          </mesh>
        </group>
      )}
    </>
  );

  if (decorative) {
    return (
      <group position={position} rotation={rotation}>
        {content}
      </group>
    );
  }

  return (
    <RigidBody
      type="fixed"
      position={position}
      rotation={rotation}
      friction={isIce ? 0.02 : theme === 'ice' ? 0.15 : 0.95}
      frictionCombineRule={isIce ? COMBINE_MIN : undefined}
      restitution={0.2}
    >
      {content}
    </RigidBody>
  );
}
