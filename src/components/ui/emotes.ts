import { EMOTE_ART } from '../../art';

export type EmoteId = 'wave' | 'fire' | 'whoa' | 'crown' | 'laugh' | 'thumbs' | 'heart' | 'gg';

export interface EmoteDef {
  id: EmoteId;
  /** Keyboard digit (1-8). */
  key: string;
  label: string;
  color: string;
  /** Sticker art URL. */
  art: string;
  /** Emoji the first four emotes used on the wire before the sticker art existed. */
  legacy?: string;
}

/**
 * Summit emotes. Wire protocol (backward compatible): the four original emotes are still
 * SENT as their legacy emoji so players on older builds keep seeing them; the new ones are
 * sent by id. Receivers accept both forms (see `resolveEmote`).
 */
export const EMOTES: EmoteDef[] = [
  { id: 'wave', key: '1', label: 'Wave', color: '#ffc531', legacy: '👋', art: EMOTE_ART.wave },
  { id: 'fire', key: '2', label: 'Fire', color: '#ff5b3a', legacy: '🔥', art: EMOTE_ART.fire },
  { id: 'whoa', key: '3', label: 'Whoa', color: '#3fa9ff', legacy: '😱', art: EMOTE_ART.whoa },
  { id: 'crown', key: '4', label: 'Crown', color: '#25d49b', legacy: '👑', art: EMOTE_ART.crown },
  { id: 'laugh', key: '5', label: 'Laugh', color: '#ff7ac8', art: EMOTE_ART.laugh },
  { id: 'thumbs', key: '6', label: 'Thumbs up', color: '#7a4cff', art: EMOTE_ART.thumbs },
  { id: 'heart', key: '7', label: 'Heart', color: '#ffe7bf', art: EMOTE_ART.heart },
  { id: 'gg', key: '8', label: 'GG', color: '#5a4d74', art: EMOTE_ART.gg },
];

const BY_WIRE = new Map<string, EmoteDef>();
for (const e of EMOTES) {
  BY_WIRE.set(e.id, e);
  if (e.legacy) BY_WIRE.set(e.legacy, e);
}

/** Emote for a wire payload (new id or legacy emoji); null for anything unknown. */
export const resolveEmote = (payload: string | null | undefined): EmoteDef | null =>
  (payload && BY_WIRE.get(payload)) || null;

/** What to send on the wire for an emote. */
export const emoteWirePayload = (e: EmoteDef): string => e.legacy ?? e.id;
