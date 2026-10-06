import * as THREE from 'three';
import { resolveEmote } from '../components/ui/emotes';
// troika-three-text (gate labels) can't parse woff2, so the 3D labels load the woff build.
import lilitaUrl from '../assets/fonts/lilita-one-latin-400-normal.woff';

/**
 * Canvas-drawn "Sticker Rally" labels for the 3D world (climber name tags, emote bubbles,
 * the PB ghost tag): cream paper plate, 3px ink outline, hard ink drop shadow, Lilita One,
 * exactly like the DOM HUD. They replace troika SDF text, which used a CDN-fetched default
 * font and drew emoji as flat monochrome outlines.
 */

/** Local font file for any remaining troika <Text> (never the CDN default). */
export const DISPLAY_FONT_URL = lilitaUrl;

const INK = '#1d1433';
const PAPER = '#fffdf8';
const SUN = '#ffc531';
const DISPLAY = "'Lilita One', 'Arial Rounded MT Bold', 'Trebuchet MS', sans-serif";
const UI = "'Chakra Petch', 'Segoe UI', sans-serif";

let fontsReady: Promise<void> | null = null;
/** Resolves once the HUD fonts are usable in canvas (never rejects). */
export function whenStickerFontsReady(): Promise<void> {
  if (!fontsReady) {
    fontsReady =
      typeof document !== 'undefined' && document.fonts?.load
        ? Promise.all([
            document.fonts.load(`64px 'Lilita One'`),
            document.fonts.load(`700 40px 'Chakra Petch'`),
          ])
            .then(() => undefined)
            .catch(() => undefined)
        : Promise.resolve();
  }
  return fontsReady;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, h / 2, w / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function makeTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  return tex;
}

/** Sprite material for labels: unlit, un-fogged, not tone-mapped (matches the DOM UI). */
export function makeLabelMaterial(map: THREE.Texture): THREE.SpriteMaterial {
  return new THREE.SpriteMaterial({
    map,
    transparent: true,
    depthWrite: false,
    fog: false,
    toneMapped: false,
  });
}

export const TAG_W = 512;
export const TAG_H = 128;
/** World size of a name tag sprite (the canvas is a fixed 4:1 plate area). */
export const TAG_WORLD_H = 0.36;

export interface NameTagSpec {
  name: string;
  /** Right-hand badge text, e.g. "128m" (omitted when undefined). */
  badge?: string;
  /** Avatar colour dot on the left. */
  accent: string;
  /** Small grey "BOT" chip after the name. */
  isBot?: boolean;
  /** Plate fill (defaults to paper). */
  fill?: string;
  textColor?: string;
}

/** Draws a name tag into a fixed TAG_W x TAG_H canvas, plate centred, width fitted to the text. */
export function drawNameTag(canvas: HTMLCanvasElement, spec: NameTagSpec) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const name = spec.name.replace(/\s*\[BOT\]\s*/i, '').trim() || 'Runner';
  const pad = 22;
  const plateH = 78;
  const top = 14;
  const dot = 22;
  let nameSize = 46;
  ctx.font = `${nameSize}px ${DISPLAY}`;
  const botW = spec.isBot ? 64 : 0;
  ctx.font = `700 30px ${UI}`;
  const badgeText = spec.badge ?? '';
  const badgeW = badgeText ? ctx.measureText(badgeText).width + 28 : 0;
  const maxName = TAG_W - 12 - pad * 2 - dot - 14 - botW - (badgeW ? badgeW + 12 : 0);
  ctx.font = `${nameSize}px ${DISPLAY}`;
  let nameW = ctx.measureText(name).width;
  if (nameW > maxName) {
    nameSize = Math.max(26, Math.floor((nameSize * maxName) / nameW));
    ctx.font = `${nameSize}px ${DISPLAY}`;
    nameW = Math.min(maxName, ctx.measureText(name).width);
  }
  const plateW = pad * 2 + dot + 14 + nameW + botW + (badgeW ? badgeW + 12 : 0);
  const x0 = Math.round((TAG_W - 8 - plateW) / 2);

  // hard ink drop shadow, then plate with ink stroke
  ctx.fillStyle = INK;
  roundRect(ctx, x0 + 6, top + 6, plateW, plateH, 22);
  ctx.fill();
  ctx.fillStyle = spec.fill ?? PAPER;
  roundRect(ctx, x0, top, plateW, plateH, 22);
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = INK;
  ctx.stroke();

  // avatar colour dot
  const cy = top + plateH / 2;
  ctx.beginPath();
  ctx.arc(x0 + pad + dot / 2, cy, dot / 2, 0, Math.PI * 2);
  ctx.fillStyle = spec.accent;
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.stroke();

  // name
  let x = x0 + pad + dot + 14;
  ctx.fillStyle = spec.textColor ?? INK;
  ctx.font = `${nameSize}px ${DISPLAY}`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText(name, x, cy + 3, maxName);
  x += nameW;

  if (spec.isBot) {
    ctx.font = `700 22px ${UI}`;
    ctx.fillStyle = 'rgba(29,20,51,0.14)';
    roundRect(ctx, x + 8, cy - 15, 52, 30, 10);
    ctx.fill();
    ctx.fillStyle = INK;
    ctx.textAlign = 'center';
    ctx.fillText('BOT', x + 34, cy + 1);
    x += botW;
  }

  if (badgeW) {
    const bx = x + 12;
    ctx.fillStyle = SUN;
    roundRect(ctx, bx, cy - 22, badgeW, 44, 14);
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.font = `700 30px ${UI}`;
    ctx.textAlign = 'center';
    ctx.fillText(badgeText, bx + badgeW / 2, cy + 2);
  }
}

export function createNameTagTexture(spec: NameTagSpec) {
  const canvas = document.createElement('canvas');
  canvas.width = TAG_W;
  canvas.height = TAG_H;
  drawNameTag(canvas, spec);
  return { canvas, texture: makeTexture(canvas) };
}

// ---------------------------------------------------------------- emote bubbles

const EMOTE_SIZE = 256;
const emoteCache = new Map<string, THREE.CanvasTexture>();

/**
 * Texture for a Summit emote payload (new id or legacy emoji): the Designer's round sticker
 * art (it carries its own ink ring and drop shadow). Cached per emote; unknown payloads
 * from other builds get a plain paper sticker with the text.
 */
export function getEmoteTexture(payload: string): THREE.CanvasTexture {
  const def = resolveEmote(payload);
  const cacheKey = def ? def.id : payload;
  const hit = emoteCache.get(cacheKey);
  if (hit) return hit;
  const canvas = document.createElement('canvas');
  canvas.width = EMOTE_SIZE;
  canvas.height = EMOTE_SIZE;
  const ctx = canvas.getContext('2d')!;
  const tex = makeTexture(canvas);
  if (def?.art) {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      ctx.clearRect(0, 0, EMOTE_SIZE, EMOTE_SIZE);
      ctx.drawImage(img, 0, 0, EMOTE_SIZE, EMOTE_SIZE);
      tex.needsUpdate = true;
    };
    img.src = def.art;
  } else {
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(134, 134, 110, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PAPER;
    ctx.beginPath();
    ctx.arc(124, 124, 110, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 9;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.font = `90px ${DISPLAY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(payload.slice(0, 4), 124, 130, 180);
    tex.needsUpdate = true;
  }
  emoteCache.set(cacheKey, tex);
  return tex;
}
