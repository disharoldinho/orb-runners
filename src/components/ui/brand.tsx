/** Brand pieces for the "Sticker Rally" UI: wordmark, Summit poster art and phase strip. */
import { WORDMARK_URL, summitPhaseArt } from '../../art';
import { SUMMIT_PHASES } from '../../levels/summitMap';

/** Designer wordmark (orb mascot + "ORB RUNNERS", text converted to shapes). */
export function Wordmark() {
  return (
    <h1 className="wordmark">
      <img src={WORDMARK_URL} alt="Orb Runners" width={804} height={170} draggable={false} />
    </h1>
  );
}

/** The nine Summit phases as a strip of tiny illustrated tickets (numbered, in climb order). */
export function SummitPhaseStrip({ compact = false }: { compact?: boolean }) {
  return (
    <ol className={`phase-strip ${compact ? 'is-compact' : ''}`} aria-label="Summit stages">
      {SUMMIT_PHASES.map((p) => (
        <li key={p.id} title={`Stage ${p.id}: ${shortPhaseName(p.name)}`}>
          <img src={summitPhaseArt(p.id)} alt="" loading="lazy" decoding="async" draggable={false} />
          <span>{p.id}</span>
        </li>
      ))}
    </ol>
  );
}

/** Summit phase names carry a 'STAGE N · ' prefix; strip it for labels. */
export const shortPhaseName = (name: string) => name.replace(/^\s*stage\s*\d+\s*[·•:\-–]\s*/i, '');

/** Flat layered mountain with a dashed spiral road and the golden crown on top. */
export function SummitPoster() {
  return (
    <svg
      viewBox="0 0 320 200"
      className="summit-poster"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden
    >
      <rect width="320" height="200" fill="#8fd3ff" />
      <circle cx="262" cy="46" r="22" fill="var(--sun)" stroke="var(--ink)" strokeWidth="3" />
      <path
        d="M0 150 L50 104 L92 136 L140 86 L196 140 L250 96 L320 146 V200 H0Z"
        fill="#b9a4ff"
        stroke="var(--ink)"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M70 200 L160 40 L250 200Z"
        fill="#f4efe6"
        stroke="var(--ink)"
        strokeWidth="3.4"
        strokeLinejoin="round"
      />
      <path
        d="M160 40 L135 84 L148 80 L160 92 L172 80 L186 86Z"
        fill="#fff"
        stroke="var(--ink)"
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
      <path
        d="M104 190 C150 176 206 180 222 170 C190 160 124 162 118 150 C150 138 190 142 200 132 C176 124 136 126 132 116 C150 106 176 108 182 98 C166 92 146 94 146 86"
        fill="none"
        stroke="var(--tomato)"
        strokeWidth="4"
        strokeDasharray="7 6"
        strokeLinecap="round"
      />
      <path
        d="M146 36 l3 -12 6 8 5 -10 5 10 6 -8 3 12z"
        fill="var(--sun)"
        stroke="var(--ink)"
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
      <path
        d="M0 176 C40 168 60 186 100 180 S170 170 200 184 S280 176 320 182 V200 H0Z"
        fill="#25d49b"
        stroke="var(--ink)"
        strokeWidth="3"
      />
    </svg>
  );
}
