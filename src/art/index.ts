/**
 * Designer art (Sticker Rally): stage ticket illustrations, Summit phase art, emote
 * stickers and the wordmark. SVGs are imported as hashed asset URLs (tiny ones inline).
 */
const campaignArt = import.meta.glob('../assets/art/stages/campaign/*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;
const summitArt = import.meta.glob('../assets/art/stages/summit/*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;
const emoteArt = import.meta.glob('../assets/art/emotes/*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

export { default as WORDMARK_URL } from '../assets/art/logo/orb-runners-logo.svg?url';

/** Files are named `NN-slug.svg` / `N-slug.svg`: key them by the leading number. */
function byNumber(files: Record<string, string>): Map<number, string> {
  const out = new Map<number, string>();
  for (const [path, url] of Object.entries(files)) {
    const m = /\/(\d+)-[^/]+\.svg$/.exec(path);
    if (m) out.set(Number(m[1]), url);
  }
  return out;
}

const CAMPAIGN = byNumber(campaignArt);
const SUMMIT = byNumber(summitArt);

/** Ticket illustration (330x210, no text) for campaign stage `id` (1-15). */
export const campaignTicketArt = (id: number): string | undefined => CAMPAIGN.get(id);
/** Illustration for Summit phase `id` (1-9). */
export const summitPhaseArt = (id: number): string | undefined => SUMMIT.get(id);

/** Emote sticker art keyed by emote id (`wave`, `fire`, ...). */
export const EMOTE_ART: Record<string, string> = Object.fromEntries(
  Object.entries(emoteArt).map(([path, url]) => [/emote-([a-z]+)\.svg$/.exec(path)?.[1] ?? path, url])
);
