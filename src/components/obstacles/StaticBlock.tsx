import { useMemo } from 'react';
import { RigidBody } from '@react-three/rapier';
import type { CoefficientCombineRule } from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import { BlockTheme, StaticBlockDef } from '../../types/level';
import { useGameStore } from '../../store/useGameStore';
import { blockColliderParts, blockVisualParts } from '../../levels/blockParts';
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

/** Collider-source meshes are never drawn (see levels/blockParts). */
const COLLIDER_ONLY = new THREE.MeshBasicMaterial({ visible: false });

export function StaticBlock(def: StaticBlockDef & { layer?: number }) {
  const {
    position,
    rotation = [0, 0, 0],
    theme = 'meadow',
    surface = 'normal',
    decorative = false,
    layer = 0,
  } = def;
  const palette = THEME_PALETTES[theme] || THEME_PALETTES.meadow;

  const quality = useGameStore((st) => st.graphicsQuality);
  const isIce = surface === 'ice';
  const natural = isNaturalTheme(theme);

  const mats = useMemo(() => {
    const body = getSurfaceMaterial(theme, surface, palette, quality, { layer });
    const trim = getSharedMaterial(
      `trim|${theme}`,
      () =>
        new THREE.MeshStandardMaterial({
          color: palette.trim,
          emissive: palette.glow,
          emissiveIntensity: natural ? 0.4 : 0.8,
          roughness: 0.2,
          metalness: 0.5,
        }),
      layer
    );
    const curb = getSharedMaterial(
      `curb|${theme}`,
      () =>
        new THREE.MeshStandardMaterial({
          color: palette.rail,
          emissive: palette.glow,
          emissiveIntensity: natural ? 0.12 : 0.25,
          roughness: 0.3,
        }),
      layer
    );
    const hull = natural
      ? getSurfaceMaterial(theme, surface, palette, quality, { layer, hull: true })
      : getSharedMaterial(
          'hull|metal',
          () => new THREE.MeshStandardMaterial({ color: '#0f172a', metalness: 0.7, roughness: 0.3 }),
          layer
        );
    const rail = getSharedMaterial(
      `rail|${theme}`,
      () =>
        new THREE.MeshStandardMaterial({
          color: palette.rail,
          roughness: natural ? 0.55 : 0.25,
          metalness: natural ? 0.1 : 0.4,
        }),
      layer
    );
    const railGlow = getSharedMaterial(
      `railglow|${theme}`,
      () =>
        new THREE.MeshStandardMaterial({
          color: palette.glow,
          emissive: palette.glow,
          emissiveIntensity: natural ? 1.0 : 1.4,
        }),
      layer
    );
    return { body, trim, curb, hull, rail, railGlow };
  }, [theme, surface, palette, quality, natural, layer]);

  const sizeKey = def.size.join(',');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const colliderParts = useMemo(() => blockColliderParts(def), [sizeKey, def.rails, def.railHeight]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const visualParts = useMemo(() => blockVisualParts(def), [sizeKey, def.rails, def.railHeight]);

  const visuals = visualParts.map((p, i) => (
    <mesh
      key={i}
      position={p.offset}
      material={mats[p.kind]}
      castShadow={p.kind === 'body' || p.kind === 'rail'}
      receiveShadow={p.kind === 'body' || p.kind === 'rail' || p.kind === 'curb'}
    >
      <boxGeometry args={p.size} />
    </mesh>
  ));

  if (decorative) {
    return (
      <group position={position} rotation={rotation}>
        {visuals}
      </group>
    );
  }

  // The fixed body keeps the exact original box list as (invisible) collider sources, so
  // physics is bit-for-bit unchanged while the drawn meshes are free to be cleaned up.
  return (
    <>
      <RigidBody
        type="fixed"
        position={position}
        rotation={rotation}
        includeInvisible
        friction={isIce ? 0.02 : theme === 'ice' ? 0.15 : 0.95}
        frictionCombineRule={isIce ? COMBINE_MIN : undefined}
        restitution={0.2}
      >
        {colliderParts.map((p, i) => (
          <mesh key={i} position={p.offset} material={COLLIDER_ONLY} visible={false}>
            <boxGeometry args={p.size} />
          </mesh>
        ))}
      </RigidBody>
      <group position={position} rotation={rotation}>
        {visuals}
      </group>
    </>
  );
}
