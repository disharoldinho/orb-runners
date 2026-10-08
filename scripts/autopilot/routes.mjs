/**
 * Autopilot racing lines for the campaign (see runStage.mjs).
 * points: { p: [x, z] | [x, y, z], v: target speed (m/s) on the segment after this point,
 *           hold?: wait here until a condition holds (timed obstacles) }
 * hold types: { type: 'platform', id, axis: 0|1|2, min, max, lead? }   moving platform centre
 *             { type: 'hazard', id, min, max, mod?, lead? }             spinner yaw window
 *             { type: 'time', t }                                       physics time (s)
 */
export const PROFILES = {
  // Clean, committed line at full pace: the basis for the Author time.
  author: { speedScale: 1, kp: 2.6, lookahead: 2.2 },
  // A careful player: ~70% of the speed, same line. Sanity check for gold/silver.
  steady: { speedScale: 0.7, kp: 2.2, lookahead: 2.0 },
};

export const ROUTES = {
  1: {
    points: [
      { p: [0, 0], v: 14 },
      { p: [0, -40], v: 9 },
      { p: [0, -46], v: 9 },
      { p: [-0.9, -50], v: 9 },
      { p: [0.9, -53], v: 12 },
      { p: [0, -63], v: 12 },
      { p: [0, -66], v: 4 },
    ],
  },
  2: {
    profiles: { author: { traceIds: ['m2-mp1'] } },
    // Waits at each shuttle mouth for the phase that keeps the shuttle under the gem line.
    points: [
      { p: [0, 0], v: 8 },
      { p: [0, -9], v: 5 },
      {
        p: [1.2, -11.8],
        v: 7,
        hold: { type: 'phase', id: 'm2-mp1', min: 1.8, max: 3.1, lead: 0.7 },
      },
      { p: [2.2, -15], v: 7 },
      { p: [2.2, -18.5], v: 8 },
      { p: [0.5, -22.5], v: 8 },
      { p: [0, -30], v: 6 },
      { p: [0, -35], v: 5 },
      { p: [1.4, -37.4], v: 5 },
      { p: [0, -39.6], v: 6 },
      { p: [0, -48], v: 8 },
      {
        p: [-1.0, -55.8],
        v: 7,
        hold: { type: 'phase', id: 'm2-mp2', min: 1.8, max: 3.0, lead: 0.7 },
      },
      { p: [-1.8, -59], v: 7 },
      { p: [-1.8, -62.5], v: 7 },
      { p: [-0.6, -66], v: 6 },
      {
        p: [1.0, -69.6],
        v: 7,
        hold: { type: 'phase', id: 'm2-mp3', min: 1.8, max: 3.0, lead: 0.7 },
      },
      { p: [1.8, -73], v: 7 },
      { p: [1.8, -76.5], v: 7 },
      { p: [0.4, -80], v: 8 },
      {
        p: [0, -87.3],
        v: 7,
        hold: {
          type: 'phase',
          id: 'm2-mp4',
          windows: [
            [0.75, 1.15],
            [3.9, 4.3],
          ],
          lead: 0.6,
        },
      },
      { p: [0, -92], v: 8 },
      { p: [0, -98], v: 10 },
      { p: [0, -103], v: 8 },
      { p: [0, -106], v: 4 },
    ],
  },
  3: {
    variants: [
      { name: 'x1' },
      { name: 'x1.15', speedScale: 1.15 },
      { name: 'x1.3', speedScale: 1.3 },
    ],
    // Threads the slalom straight, detours for the side gems and the diamond pocket, weaves
    // the gauntlet.
    points: [
      { p: [0, 0], v: 10 },
      { p: [0, -24], v: 7 },
      { p: [-1.2, -27.5], v: 4.5 },
      { p: [-3.6, -30.5], v: 4 },
      { p: [-3.6, -33.5], v: 4 },
      { p: [-0.6, -37], v: 6 },
      { p: [0, -50], v: 9 },
      { p: [-2.0, -55.5], v: 4.5 },
      { p: [-1.6, -60.5], v: 3.5 },
      { p: [0, -62.8], v: 3.5 },
      { p: [0, -67], v: 5 },
      { p: [0, -72], v: 5 },
      { p: [0, -75], v: 5 },
      { p: [-2.6, -78.8], v: 4 },
      { p: [-3.0, -82.5], v: 5 },
      { p: [0, -88], v: 8 },
      { p: [0, -94], v: 5 },
      { p: [1.1, -99], v: 4.5 },
      { p: [-1.1, -105.5], v: 4.5 },
      { p: [1.2, -112], v: 4.5 },
      { p: [-1.1, -118.5], v: 4.5 },
      { p: [0, -123], v: 10 },
      { p: [0, -133], v: 8 },
      { p: [0, -136], v: 4 },
    ],
  },
  4: {
    // Boards each windmill as an arm swings into line, rolls to the hub, and leaves when the
    // exit arm will be in line by the time it reaches the far deck (timed for the pilot's own
    // pace); out-and-back excursions along the side arms for the pair's gems.
    points: [
      { p: [0, 0], v: 9 },
      { p: [0, -8], v: 6 },
      { p: [0, -9.8], v: 6, hold: { type: 'align', id: 'm4-rh1', dist: 1.7, window: [-0.3, 0.1] } },
      { p: [0, -13], v: 4 },
      {
        p: [0, -15.97],
        v: 5,
        hold: { type: 'align', id: 'm4-rh1', dist: 4.97, window: [-0.15, 0.22], radius: 0.5 },
      },
      { p: [0, -21], v: 6 },
      { p: [0, -28], v: 6 },
      {
        p: [0, -29.7],
        v: 6,
        hold: { type: 'align', id: 'm4-rh2', dist: 1.7, window: [-0.3, 0.1] },
      },
      { p: [0, -33], v: 4 },
      {
        p: [0, -35.91],
        v: 2.5,
        hold: { type: 'align', id: 'm4-rh2', dist: 2.9, window: [-0.35, 0.15], radius: 0.5 },
      },
      { p: [-2.9, -35.6], v: 2.5 },
      { p: [-2.9, -36.2], v: 2.5 },
      {
        p: [0, -35.91],
        v: 5,
        hold: { type: 'align', id: 'm4-rh2', dist: 4.97, window: [-0.15, 0.22], radius: 0.5 },
      },
      { p: [0, -41], v: 6 },
      {
        p: [0, -47.6],
        v: 6,
        hold: { type: 'align', id: 'm4-rh3', dist: 1.7, window: [-0.3, 0.1] },
      },
      { p: [0, -51], v: 4 },
      {
        p: [0, -53.85],
        v: 2.5,
        hold: { type: 'align', id: 'm4-rh3', dist: 2.9, window: [-0.35, 0.15], radius: 0.5 },
      },
      { p: [2.9, -53.55], v: 2.5 },
      { p: [2.9, -54.15], v: 2.5 },
      {
        p: [0, -53.85],
        v: 5,
        hold: { type: 'align', id: 'm4-rh3', dist: 4.97, window: [-0.15, 0.22], radius: 0.5 },
      },
      { p: [0, -59], v: 6 },
      { p: [0, -66], v: 6 },
      {
        p: [0, -67.55],
        v: 6,
        hold: { type: 'align', id: 'm4-rh4', dist: 1.7, window: [-0.3, 0.1] },
      },
      { p: [0, -71], v: 4 },
      {
        p: [0, -73.79],
        v: 5,
        hold: { type: 'align', id: 'm4-rh4', dist: 4.97, window: [-0.15, 0.22], radius: 0.5 },
      },
      { p: [0, -80], v: 8 },
      { p: [0, -86.5], v: 8 },
      { p: [0, -89], v: 3 },
    ],
  },
};
