/** Tiny custom sticker glyphs for the character creator options (replaces emoji). */
import type { ReactNode } from 'react';

const G: Record<string, ReactNode> = {
  // Body shapes
  bean: <rect x="7" y="3.6" width="10" height="17" rx="5" fill="var(--glyph)" />,
  blob: (
    <path
      d="M12 3.6c4.6 0 7.8 5 7.8 9.6 0 4.4-3.4 7.2-7.8 7.2s-7.8-2.8-7.8-7.2c0-4.6 3.2-9.6 7.8-9.6z"
      fill="var(--glyph)"
    />
  ),
  bot: (
    <>
      <rect x="5" y="6.4" width="14" height="13.4" rx="2.6" fill="var(--glyph)" />
      <path d="M12 6.4V3.4" />
    </>
  ),
  critter: (
    <>
      <path d="M8.2 9.4L7 2.8M15.8 9.4L17 2.8" />
      <ellipse cx="12" cy="14.4" rx="6.8" ry="6.4" fill="var(--glyph)" />
    </>
  ),
  // Eyes
  googly: (
    <>
      <circle cx="8" cy="12" r="4.4" fill="#fff" />
      <circle cx="16.4" cy="12" r="4.4" fill="#fff" />
      <circle cx="9" cy="13.2" r="1.8" fill="var(--ink)" stroke="none" />
      <circle cx="15.2" cy="10.8" r="1.8" fill="var(--ink)" stroke="none" />
    </>
  ),
  happy: <path d="M4.4 13.4c1.2-2.8 4.4-2.8 5.6 0M14 13.4c1.2-2.8 4.4-2.8 5.6 0" />,
  sparkle: (
    <>
      <circle cx="8" cy="12" r="3.6" fill="var(--ink)" />
      <circle cx="16" cy="12" r="3.6" fill="var(--ink)" />
      <circle cx="7" cy="10.8" r="1.1" fill="#fff" stroke="none" />
      <circle cx="15" cy="10.8" r="1.1" fill="#fff" stroke="none" />
    </>
  ),
  determined: (
    <>
      <path d="M4 8.4l5.4 2M20 8.4l-5.4 2" />
      <circle cx="8" cy="14" r="2" fill="var(--ink)" />
      <circle cx="16" cy="14" r="2" fill="var(--ink)" />
    </>
  ),
  derpy: <path d="M5 9.4l5 5M10 9.4l-5 5M14 9.4l5 5M19 9.4l-5 5" />,
  shades: (
    <>
      <path d="M2.8 9.4h18.4" />
      <path
        d="M4 9.6h6.4v2.6a3 3 0 0 1-6.4 0zM13.6 9.6H20v2.6a3 3 0 0 1-6.4 0z"
        fill="var(--ink)"
      />
    </>
  ),
  // Mouths
  cat: <path d="M4.6 10.4c.6 3 3.8 3.6 7.4.6 3.6 3 6.8 2.4 7.4-.6" />,
  grin: (
    <>
      <path d="M4.4 9.6h15.2c0 5-3.4 7.8-7.6 7.8s-7.6-2.8-7.6-7.8z" fill="#fff" />
      <path d="M8.4 9.8v3.4M12 9.8v4.4M15.6 9.8v3.4" strokeWidth="1.6" />
    </>
  ),
  shock: <ellipse cx="12" cy="12.4" rx="3.6" ry="4.6" fill="var(--ink)" />,
  tongue: (
    <>
      <path d="M4.6 9.4c2.4 2.4 12.4 2.4 14.8 0" />
      <path d="M9.6 10.8v2.6a2.4 2.4 0 0 0 4.8 0v-2.6" fill="var(--tomato)" />
    </>
  ),
  mustache: (
    <path
      d="M12 10.6c-1.4-2.4-4.8-2.4-6.6.2-1 1.4-2.6 1.4-3 .4.4 3.6 5.2 4.6 9.6 1.4 4.4 3.2 9.2 2.2 9.6-1.4-.4 1-2 1-3-.4-1.8-2.6-5.2-2.6-6.6-.2z"
      fill="var(--ink)"
    />
  ),
  // Hats
  none: (
    <>
      <circle cx="12" cy="12" r="7.6" />
      <path d="M6.6 17.4L17.4 6.6" />
    </>
  ),
  propeller: (
    <>
      <path d="M4.6 17.4a7.4 7.4 0 0 1 14.8 0z" fill="var(--glyph)" />
      <path d="M12 10V6.2M5.4 5.2h13.2" />
    </>
  ),
  chef: (
    <path
      d="M7.4 20h9.2v-5.2a4 4 0 1 0-1.4-7.6 3.8 3.8 0 0 0-6.4 0 4 4 0 1 0-1.4 7.6z"
      fill="#fff"
    />
  ),
  wizard: (
    <>
      <path d="M3.6 20h16.8M6.4 20l5-16.2 6.2 16.2" fill="var(--grape)" />
      <circle cx="12.4" cy="13.6" r="1.4" fill="var(--sun)" stroke="none" />
    </>
  ),
  viking: (
    <>
      <path d="M6.6 17.6a5.4 5.4 0 0 1 10.8 0z" fill="#c9d3e0" />
      <path d="M6.8 14.4C4.2 13.4 3 10.6 3.4 7.4M17.2 14.4c2.6-1 3.8-3.8 3.4-7" />
    </>
  ),
  crown: <path d="M3.8 18.6l-.6-10 4.8 3.8L12 5l4 7.4 4.8-3.8-.6 10z" fill="var(--sun)" />,
  halo: <ellipse cx="12" cy="10.4" rx="8" ry="3.8" stroke="var(--sun)" strokeWidth="3.2" />,
  // Orb shells
  clear: (
    <>
      <circle cx="12" cy="12" r="8.4" fill="#d9f3ff" />
      <path d="M7.6 9.2a5 5 0 0 1 3.4-3" stroke="#fff" />
    </>
  ),
  candy: (
    <>
      <circle cx="12" cy="12" r="8.4" fill="#fff" />
      <path d="M5 8.2l9.6 11M8.6 4.2l11 12.4" stroke="var(--tomato)" strokeWidth="2.8" />
      <circle cx="12" cy="12" r="8.4" />
    </>
  ),
  neon: (
    <>
      <circle cx="12" cy="12" r="8.4" fill="var(--grape)" />
      <path d="M13.2 5.8l-4 6.8h3.6l-1 5.6 4.4-7.2h-3.6z" fill="var(--sun)" strokeWidth="1.6" />
    </>
  ),
  starlight: (
    <>
      <circle cx="12" cy="12" r="8.4" fill="var(--sun)" />
      <path
        d="M12 7.4l1.4 2.9 3.2.4-2.3 2.2.6 3.2-2.9-1.6-2.9 1.6.6-3.2-2.3-2.2 3.2-.4z"
        fill="#fff"
        strokeWidth="1.4"
      />
    </>
  ),
};

export function CosmeticGlyph({ id, color }: { id: string; color?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={26}
      height={26}
      fill="none"
      stroke="var(--ink)"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ ['--glyph' as string]: color ?? 'var(--sky)' }}
      aria-hidden
    >
      {G[id] ?? <circle cx="12" cy="12" r="7" fill="var(--glyph)" />}
    </svg>
  );
}
