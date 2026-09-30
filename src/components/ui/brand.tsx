/** Brand pieces for the "Sticker Rally" UI: logo mark, wordmark and the Summit poster art. */

export function OrbMark({ size = 44 }: { size?: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden className="orb-mark">
      <circle cx="24" cy="25" r="19" fill="var(--sky)" stroke="var(--ink)" strokeWidth="3.4" />
      <path
        d="M9 30c6 5 24 6 30-3"
        fill="none"
        stroke="var(--ink)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M14 15.5c2.4-3 5.6-4.6 9-5"
        fill="none"
        stroke="#fff"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      <circle cx="19.5" cy="24" r="2.4" fill="var(--ink)" />
      <circle cx="29" cy="23" r="2.4" fill="var(--ink)" />
      <path
        d="M40 8l1.4 3 3 .5-2.2 2.1.5 3-2.7-1.4-2.7 1.4.5-3-2.2-2.1 3-.5z"
        fill="var(--sun)"
        stroke="var(--ink)"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Wordmark() {
  return (
    <div className="wordmark" aria-label="Orb Runners">
      <OrbMark size={52} />
      <h1>
        <span className="wm-orb">ORB</span>
        <span className="wm-runners">RUNNERS</span>
      </h1>
    </div>
  );
}

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
