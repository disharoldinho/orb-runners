import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  NameTagSpec,
  TAG_H,
  TAG_W,
  TAG_WORLD_H,
  createNameTagTexture,
  drawNameTag,
  getEmoteTexture,
  makeLabelMaterial,
  whenStickerFontsReady,
} from '../../graphics/stickerLabels';

/** Sticker-style name tag sprite (redraws only when its text changes). */
export function NameTag({
  position,
  spec,
  worldHeight = TAG_WORLD_H,
}: {
  position: [number, number, number];
  spec: NameTagSpec;
  worldHeight?: number;
}) {
  const { canvas, texture, material } = useMemo(() => {
    const t = createNameTagTexture(spec);
    return { ...t, material: makeLabelMaterial(t.texture) };
    // Created once; later spec changes redraw the same canvas below.
  }, []);
  const key = `${spec.name}|${spec.badge ?? ''}|${spec.accent}|${spec.isBot ? 1 : 0}|${spec.fill ?? ''}|${spec.textColor ?? ''}`;
  const specRef = useRef(spec);
  specRef.current = spec;
  useEffect(() => {
    drawNameTag(canvas, specRef.current);
    texture.needsUpdate = true;
  }, [key, canvas, texture]);
  // Redraw once the HUD fonts are loaded (first tags may render with the fallback font).
  useEffect(() => {
    let alive = true;
    whenStickerFontsReady().then(() => {
      if (!alive) return;
      drawNameTag(canvas, specRef.current);
      texture.needsUpdate = true;
    });
    return () => {
      alive = false;
    };
  }, [canvas, texture]);
  useEffect(
    () => () => {
      texture.dispose();
      material.dispose();
    },
    [texture, material]
  );
  return (
    <sprite
      position={position}
      scale={[(worldHeight * TAG_W) / TAG_H, worldHeight, 1]}
      material={material}
      renderOrder={3}
    />
  );
}

const POP_S = 0.34;

/**
 * Emote speech bubble that pops in (overshoot) when `emote` changes and shrinks away when
 * it clears. Pass `getEmote` to read a mutable source every frame instead of a prop.
 */
export function EmoteBubble({
  emote,
  getEmote,
  position,
  size = 0.62,
}: {
  emote?: string | null;
  getEmote?: () => string | null;
  position: [number, number, number];
  size?: number;
}) {
  const spriteRef = useRef<THREE.Sprite>(null);
  const material = useMemo(() => makeLabelMaterial(getEmoteTexture('👋')), []);
  useEffect(() => () => material.dispose(), [material]); // textures are shared/cached
  const state = useRef({ shown: null as string | null, t: 0, visible: 0 });

  useFrame((_, delta) => {
    const sp = spriteRef.current;
    if (!sp) return;
    const dt = Math.min(delta, 0.05);
    const cur = getEmote ? getEmote() : emote ?? null;
    const s = state.current;
    if (cur && cur !== s.shown) {
      s.shown = cur;
      s.t = 0;
      material.map = getEmoteTexture(cur);
      material.needsUpdate = true;
    }
    if (!cur) s.shown = null;
    s.t += dt;
    const target = cur ? 1 : 0;
    s.visible += (target - s.visible) * (1 - Math.exp(-(cur ? 30 : 14) * dt));
    // overshoot pop for the first POP_S seconds
    const pop = cur && s.t < POP_S ? 1 + Math.sin((s.t / POP_S) * Math.PI) * 0.28 : 1;
    const k = s.visible * pop * size;
    sp.visible = s.visible > 0.02;
    sp.scale.set(k, k, 1);
    sp.position.set(position[0], position[1] + Math.sin(s.t * 3) * 0.03, position[2]);
  });

  return <sprite ref={spriteRef} material={material} visible={false} renderOrder={4} />;
}
