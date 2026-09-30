/**
 * Orb Runners custom icon set ("Sticker Rally" art direction).
 * Hand-drawn on a 24px grid: chunky 2.6px rounded strokes, slightly off-kilter
 * shapes and small filled accents so they read as stickers, not a stock icon font.
 * Every icon inherits `currentColor`.
 */
import type { CSSProperties, ReactNode } from 'react';

export type IconName =
  | 'play'
  | 'restart'
  | 'flag'
  | 'menu'
  | 'close'
  | 'sound'
  | 'mute'
  | 'ghost'
  | 'map'
  | 'mountain'
  | 'users'
  | 'lock'
  | 'globe'
  | 'copy'
  | 'check'
  | 'arrowRight'
  | 'arrowLeft'
  | 'sparkle'
  | 'medal'
  | 'gfx'
  | 'gamepad'
  | 'phoneTilt'
  | 'level'
  | 'exit'
  | 'home'
  | 'shuffle'
  | 'refresh'
  | 'key'
  | 'plus'
  | 'bot'
  | 'alert'
  | 'star'
  | 'bolt'
  | 'gem'
  | 'tent'
  | 'crown'
  | 'wave'
  | 'flame'
  | 'whoa'
  | 'rotate'
  | 'stopwatch'
  | 'chevronDown';

const P: Record<IconName, ReactNode> = {
  play: (
    <path
      d="M7.5 4.8c0-1 1.1-1.6 2-1.1l10 6.2c.8.5.8 1.7 0 2.2l-10 6.2c-.9.5-2-.1-2-1.1z"
      fill="currentColor"
      stroke="none"
    />
  ),
  restart: (
    <>
      <path d="M5.2 13.2a7 7 0 1 0 2.3-6.4" />
      <path d="M4.4 3.8l.9 4.6 4.5-1.2" />
    </>
  ),
  flag: (
    <>
      <path d="M5.5 21V3.6" />
      <path
        d="M5.5 4.2c3.4-2 6.2 1.6 9.6 0 1.4-.6 2.6-.5 3.4 0v8.6c-.8-.5-2-.6-3.4 0-3.4 1.6-6.2-2-9.6 0"
        fill="currentColor"
        fillOpacity=".25"
      />
      <path d="M9.2 4.5v4.4M12.8 6.6v4.2" strokeWidth="2" />
    </>
  ),
  menu: (
    <>
      <path d="M4 6.5h16" />
      <path d="M4 12h11" />
      <path d="M4 17.5h16" />
      <circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none" />
    </>
  ),
  close: <path d="M6 6.4l11.6 11.2M17.8 6.2L6.2 17.8" />,
  sound: (
    <>
      <path d="M3.8 9.4h3.4l5-4.2v13.6l-5-4.2H3.8z" fill="currentColor" fillOpacity=".25" />
      <path d="M15.6 9a4.4 4.4 0 0 1 0 6M18.4 6.4a8 8 0 0 1 0 11.2" />
    </>
  ),
  mute: (
    <>
      <path d="M3.8 9.4h3.4l5-4.2v13.6l-5-4.2H3.8z" fill="currentColor" fillOpacity=".25" />
      <path d="M15.8 9.2l5 5.6M20.8 9.2l-5 5.6" />
    </>
  ),
  ghost: (
    <>
      <path
        d="M5 20.4V10.6a7 7 0 0 1 14 0v9.8l-2.4-1.8-2.3 1.8-2.3-1.8-2.3 1.8-2.3-1.8z"
        fill="currentColor"
        fillOpacity=".2"
      />
      <circle cx="9.6" cy="10.8" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="14.6" cy="10.4" r="1.3" fill="currentColor" stroke="none" />
    </>
  ),
  map: (
    <>
      <path
        d="M3.6 6.2l5.2-2.2 6.4 2.4 5.2-2.2v13.6l-5.2 2.2-6.4-2.4-5.2 2.2z"
        fill="currentColor"
        fillOpacity=".18"
      />
      <path d="M8.8 4v13.6M15.2 6.4V20" strokeWidth="2" />
    </>
  ),
  mountain: (
    <>
      <path d="M2.6 19.6l6.6-11.4 3.4 5.4 2.6-3.8 6.2 9.8z" fill="currentColor" fillOpacity=".22" />
      <path d="M7.4 11.3l1.8 1.3 1.6-1.1" strokeWidth="2" />
      <circle cx="18" cy="5.4" r="1.8" fill="currentColor" stroke="none" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8.4" r="3.4" />
      <path d="M2.8 20c.6-3.6 3-5.6 6.2-5.6s5.6 2 6.2 5.6" />
      <path d="M15.6 5.4a3 3 0 0 1 .4 5.9M18 14.6c1.8.7 2.9 2.4 3.2 4.8" />
    </>
  ),
  lock: (
    <>
      <rect
        x="4.6"
        y="10.4"
        width="14.8"
        height="10"
        rx="2.6"
        fill="currentColor"
        fillOpacity=".22"
      />
      <path d="M8 10.4V7.6a4 4 0 0 1 8 0v2.8" />
      <path d="M12 14.4v2.2" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path
        d="M3.6 12h16.8M12 3.4c-3 3.4-3 13.8 0 17.2M12 3.4c3 3.4 3 13.8 0 17.2"
        strokeWidth="2"
      />
    </>
  ),
  copy: (
    <>
      <rect
        x="8.4"
        y="8.4"
        width="11.6"
        height="11.6"
        rx="2.4"
        fill="currentColor"
        fillOpacity=".2"
      />
      <path d="M15.6 5.4V5a1.6 1.6 0 0 0-1.6-1.6H5A1.6 1.6 0 0 0 3.4 5v9A1.6 1.6 0 0 0 5 15.6h.4" />
    </>
  ),
  check: <path d="M4.6 12.8l4.6 4.6L19.6 6.4" />,
  arrowRight: <path d="M4 12.2h15M13.4 6l6 6.2-6 6" />,
  arrowLeft: <path d="M20 12.2H5M10.6 6l-6 6.2 6 6" />,
  sparkle: (
    <>
      <path
        d="M11 2.8c.6 4.4 2 6 6.6 6.8-4.6.8-6 2.4-6.6 6.8-.6-4.4-2-6-6.6-6.8 4.6-.8 6-2.4 6.6-6.8z"
        fill="currentColor"
        fillOpacity=".3"
      />
      <path
        d="M18.6 14.6c.3 2 .9 2.6 2.8 3-1.9.4-2.5 1-2.8 3-.3-2-.9-2.6-2.8-3 1.9-.4 2.5-1 2.8-3z"
        fill="currentColor"
        stroke="none"
      />
    </>
  ),
  medal: (
    <>
      <path d="M8 2.8l2.6 6.2M16 2.8l-2.6 6.2" />
      <circle cx="12" cy="14.6" r="6" fill="currentColor" fillOpacity=".25" />
      <path
        d="M12 11.6l.9 1.9 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .4-2-1.5-1.4 2-.3z"
        fill="currentColor"
        stroke="none"
      />
    </>
  ),
  gfx: (
    <>
      <path d="M12 3.4l7.8 4.4v8.6L12 20.8l-7.8-4.4V7.8z" fill="currentColor" fillOpacity=".18" />
      <path d="M4.4 7.9L12 12.3l7.6-4.4M12 12.3v8.3" strokeWidth="2" />
    </>
  ),
  gamepad: (
    <>
      <path
        d="M7 7.2h10a4.6 4.6 0 0 1 4.4 5.8l-1 3.8a2.6 2.6 0 0 1-4.4 1.1L14 16h-4l-2 1.9a2.6 2.6 0 0 1-4.4-1.1l-1-3.8A4.6 4.6 0 0 1 7 7.2z"
        fill="currentColor"
        fillOpacity=".18"
      />
      <path d="M8 10.4v3.4M6.3 12.1h3.4" strokeWidth="2" />
      <circle cx="16" cy="11" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="17.6" cy="13.4" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  phoneTilt: (
    <>
      <rect
        x="7.4"
        y="3.2"
        width="9.2"
        height="17.6"
        rx="2.4"
        transform="rotate(-14 12 12)"
        fill="currentColor"
        fillOpacity=".18"
      />
      <path d="M2.6 9.4a9.6 9.6 0 0 1 2.2-4.2M21.4 14.6a9.6 9.6 0 0 1-2.2 4.2" strokeWidth="2" />
    </>
  ),
  level: (
    <>
      <circle cx="12" cy="12" r="7.6" />
      <path d="M12 2.4v4M12 17.6v4M2.4 12h4M17.6 12h4" />
      <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
    </>
  ),
  exit: (
    <>
      <path d="M13.6 3.6H6.2a1.8 1.8 0 0 0-1.8 1.8v13.2a1.8 1.8 0 0 0 1.8 1.8h7.4" />
      <path d="M10 12h10.4M16.6 7.8l4 4.2-4 4.2" />
    </>
  ),
  home: (
    <>
      <path d="M3.6 11.2L12 3.8l8.4 7.4" />
      <path d="M6 9.6v10.6h12V9.6" fill="currentColor" fillOpacity=".18" />
      <path d="M10.2 20.2v-5.4h3.6v5.4" strokeWidth="2" />
    </>
  ),
  shuffle: (
    <>
      <path d="M3.4 7h3.4c5.4 0 5 10 10.4 10h3.4M3.4 17h3.4c1.6 0 2.6-.9 3.4-2.2M13.8 9.2C14.6 7.9 15.6 7 17.2 7h3.4" />
      <path d="M18.2 4.4l2.6 2.6-2.6 2.6M18.2 14.4l2.6 2.6-2.6 2.6" />
    </>
  ),
  refresh: (
    <>
      <path d="M19.4 10.4a7.6 7.6 0 0 0-13.8-2.2M4.6 13.6a7.6 7.6 0 0 0 13.8 2.2" />
      <path d="M19.8 4.2v6.4h-6.4M4.2 19.8v-6.4h6.4" />
    </>
  ),
  key: (
    <>
      <circle cx="8" cy="15.6" r="4.4" fill="currentColor" fillOpacity=".2" />
      <path d="M11.2 12.6l8.6-8.6M16.4 7.4l2.8 2.8M14 9.8l2 2" />
    </>
  ),
  plus: (
    <>
      <circle cx="12" cy="12" r="8.6" fill="currentColor" fillOpacity=".18" />
      <path d="M12 7.8v8.4M7.8 12h8.4" />
    </>
  ),
  bot: (
    <>
      <rect
        x="4.4"
        y="7.8"
        width="15.2"
        height="11.4"
        rx="3"
        fill="currentColor"
        fillOpacity=".18"
      />
      <path d="M12 7.8V4.4" />
      <circle cx="12" cy="3.6" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="9.2" cy="13" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="14.8" cy="13" r="1.4" fill="currentColor" stroke="none" />
      <path d="M9.6 16.4h4.8" strokeWidth="2" />
    </>
  ),
  alert: (
    <>
      <path
        d="M10.4 4.2a1.8 1.8 0 0 1 3.2 0l7.4 13.4a1.8 1.8 0 0 1-1.6 2.7H4.6A1.8 1.8 0 0 1 3 17.6z"
        fill="currentColor"
        fillOpacity=".2"
      />
      <path d="M12 9.4v4.4" />
      <circle cx="12" cy="16.9" r="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  star: (
    <path
      d="M12 3.2l2.6 5.5 6 .7-4.4 4.1 1.2 5.9L12 16.5l-5.4 2.9 1.2-5.9-4.4-4.1 6-.7z"
      fill="currentColor"
    />
  ),
  bolt: <path d="M13.6 2.8L5.4 13.4h5.8l-1.4 7.8 8.8-11h-6z" fill="currentColor" />,
  gem: (
    <>
      <path d="M6.4 4.4h11.2l3.6 5.2L12 20.4 2.8 9.6z" fill="currentColor" fillOpacity=".25" />
      <path d="M2.8 9.6h18.4M9 4.6l-1.4 5L12 20.2l4.4-10.6-1.4-5" strokeWidth="2" />
    </>
  ),
  tent: (
    <>
      <path d="M2.8 20.2L12 4.2l9.2 16z" fill="currentColor" fillOpacity=".2" />
      <path d="M12 12.4l-3.4 7.8M12 12.4l3.4 7.8" strokeWidth="2" />
    </>
  ),
  crown: (
    <>
      <path
        d="M3.4 8.2l4.4 3.6L12 4.6l4.2 7.2 4.4-3.6-1.8 10H5.2z"
        fill="currentColor"
        fillOpacity=".3"
      />
      <path d="M5.6 20.4h12.8" />
    </>
  ),
  wave: (
    <>
      <path
        d="M8.6 12.6V6.2a1.6 1.6 0 0 1 3.2 0v5.2M11.8 11V4.6a1.6 1.6 0 0 1 3.2 0V11M15 11V6.4a1.6 1.6 0 0 1 3.2 0v7.4c0 4-2.6 6.8-6.4 6.8-2.6 0-4.2-1.2-5.6-3.4l-2.4-3.8a1.6 1.6 0 0 1 2.6-1.8l1.2 1.4"
        fill="currentColor"
        fillOpacity=".15"
      />
      <path d="M2.4 6.4c.4-1.4 1.2-2.6 2.4-3.4" strokeWidth="2" />
    </>
  ),
  flame: (
    <>
      <path
        d="M12 21c-4 0-6.8-2.6-6.8-6.4 0-3.8 3-5.4 3.8-10.2 2.8 1.6 4 3.6 4.2 6 1-.8 1.6-2 1.8-3.2 2 1.8 3.8 4.4 3.8 7.4 0 3.8-2.8 6.4-6.8 6.4z"
        fill="currentColor"
        fillOpacity=".3"
      />
      <path
        d="M12 21c-1.8 0-3-1.2-3-2.8 0-1.8 1.4-2.6 2.2-4.4 1.8 1.2 3.8 2.6 3.8 4.4 0 1.6-1.2 2.8-3 2.8z"
        fill="currentColor"
        stroke="none"
      />
    </>
  ),
  whoa: (
    <>
      <circle cx="12" cy="12" r="8.8" fill="currentColor" fillOpacity=".18" />
      <circle cx="8.8" cy="9.6" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="15.2" cy="9.6" r="1.4" fill="currentColor" stroke="none" />
      <ellipse cx="12" cy="15.6" rx="2.2" ry="2.8" />
    </>
  ),
  rotate: (
    <>
      <rect x="3" y="8" width="14" height="9" rx="2" fill="currentColor" fillOpacity=".18" />
      <path d="M13.8 3.4a6.8 6.8 0 0 1 7 6.2M18.6 8.4l2.2 1.4 1-2.4" />
    </>
  ),
  stopwatch: (
    <>
      <circle cx="12" cy="13.4" r="7.6" fill="currentColor" fillOpacity=".18" />
      <path d="M12 13.4l3-3M9.6 2.8h4.8M12 2.8v3" />
    </>
  ),
  chevronDown: <path d="M5.6 9.2l6.4 6.4 6.4-6.4" />,
};

export function Icon({
  name,
  size = 20,
  className,
  style,
  title,
}: {
  name: IconName;
  size?: number;
  className?: string;
  style?: CSSProperties;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`orb-icon ${className ?? ''}`}
      style={style}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
    >
      {title && <title>{title}</title>}
      {P[name]}
    </svg>
  );
}

/** Summit emotes: the network payload stays the original emoji (protocol compatible),
 *  the UI shows the custom sticker icon. */
export const EMOTES: {
  key: string;
  payload: string;
  icon: IconName;
  label: string;
  color: string;
}[] = [
  { key: '1', payload: '👋', icon: 'wave', label: 'Wave', color: '#ffc531' },
  { key: '2', payload: '🔥', icon: 'flame', label: 'Fire', color: '#ff5b3a' },
  { key: '3', payload: '😱', icon: 'whoa', label: 'Whoa', color: '#3fa9ff' },
  { key: '4', payload: '👑', icon: 'crown', label: 'Crown', color: '#25d49b' },
];

/** Flat medal disc used in the HUD, results card and level list. */
export function MedalDisc({
  tier,
  size = 18,
}: {
  tier: 'author' | 'gold' | 'silver' | 'bronze' | 'none';
  size?: number;
}) {
  const fill = {
    author: '#25d49b',
    gold: '#ffc531',
    silver: '#c9d3e0',
    bronze: '#e08a4f',
    none: '#00000000',
  }[tier];
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={`medal-disc medal-disc-${tier}`}
      aria-hidden
    >
      <circle
        cx="12"
        cy="12"
        r="9.4"
        fill={fill}
        stroke="var(--ink)"
        strokeWidth="2.6"
        strokeDasharray={tier === 'none' ? '3 3' : undefined}
      />
      {tier !== 'none' && (
        <path
          d="M12 6.8l1.6 3.3 3.6.5-2.6 2.5.6 3.6-3.2-1.7-3.2 1.7.6-3.6-2.6-2.5 3.6-.5z"
          fill="var(--ink)"
          opacity=".6"
        />
      )}
    </svg>
  );
}
