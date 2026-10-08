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

// Stage 5 summit zigzag, shared by both branches of the junction choice.
const ROUTE5_TAIL = [
  { p: [0, -90], v: 4 },
  { p: [-3, -96], v: 9 },
  { p: [-19, -96], v: 4 },
  { p: [-22, -99.5], v: 9 },
  { p: [-22, -124], v: 6 },
  { p: [-22, -126], v: 3 },
];

// Stage 6 sweepers: safe arrival angles (rad past perpendicular) at the pivot line,
// from a numeric check of the bar against a ball crossing on the 1.7 m lane (safe for
// |rel| >= ~0.85; 0.15 rad margin).
const SWEEP = [
  [1.0, 1.571],
  [-1.571, -1.0],
];

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
  5: {
    variants: [
      { name: 'shortcut' },
      {
        // the right switchback, weaving the bumpers for its gem
        name: 'switchback',
        points: [
          { p: [0, 0], v: 10 },
          { p: [0, -14], v: 6 },
          { p: [3, -19], v: 6 },
          { p: [10.5, -19.5], v: 3.5 },
          { p: [11.5, -23], v: 9 },
          { p: [11.5, -57], v: 5 },
          { p: [10.5, -61], v: 6 },
          { p: [2, -61.5], v: 6 },
          { p: [0, -66], v: 10 },
          ...ROUTE5_TAIL,
        ],
      },
    ],
    // Shortcut line: up the spur to the switch (and gem), back to the hub, boosted bridge,
    // then the summit ridge, the walled corner and the west leg.
    points: [
      { p: [0, 0], v: 10 },
      { p: [0, -14], v: 6 },
      { p: [-2.5, -18.6], v: 7 },
      { p: [-16.8, -18.7], v: 3 },
      { p: [-17.4, -19.2], v: 3 },
      { p: [-16.5, -19.6], v: 7 },
      { p: [-3, -20], v: 5 },
      { p: [0, -24], v: 8 },
      { p: [0, -56], v: 10 },
      ...ROUTE5_TAIL,
    ],
  },
  6: {
    // Lane beside each hub (on the side where the arm sweeps the same way you roll), entered
    // only when the bar will be near-parallel to the catwalk as you pass the pivot.
    points: [
      { p: [0, 0], v: 8 },
      {
        p: [0.8, -17.5],
        v: 6.5,
        hold: { type: 'align', id: 'm6-rh1', dist: 7.2, windows: SWEEP, mod: Math.PI },
      },
      { p: [1.7, -24.7], v: 6.5 },
      { p: [0.8, -29.5], v: 6 },
      {
        p: [-0.8, -33.4],
        v: 6.5,
        hold: { type: 'align', id: 'm6-rh2', dist: 6.7, windows: SWEEP, mod: Math.PI },
      },
      { p: [-1.7, -40.1], v: 6 },
      { p: [1.8, -45.5], v: 5 },
      { p: [0.6, -51], v: 6 },
      {
        p: [0.8, -61.5],
        v: 6.5,
        hold: { type: 'align', id: 'm6-rh3', dist: 7.4, windows: SWEEP, mod: Math.PI },
      },
      { p: [1.7, -68.9], v: 6.5 },
      { p: [0, -74], v: 6 },
      {
        p: [-0.8, -77.5],
        v: 6.5,
        hold: { type: 'align', id: 'm6-rh4', dist: 7.6, windows: SWEEP, mod: Math.PI },
      },
      { p: [-1.7, -85.1], v: 6.5 },
      { p: [0, -95], v: 7 },
      {
        p: [0.8, -106.5],
        v: 6.5,
        hold: { type: 'align', id: 'm6-rh5', dist: 8.1, windows: SWEEP, mod: Math.PI },
      },
      { p: [1.7, -114.6], v: 7 },
      { p: [0, -124], v: 6 },
      { p: [0, -130], v: 3 },
    ],
  },
  7: {
    // Down each ramp on the gem side, weave the chicanes, brake on the last flat and cross
    // when the ferry will be in line (x = -2.6 cos(0.9 t)).
    points: [
      { p: [0, 0], v: 8 },
      { p: [0, -11], v: 10 },
      { p: [1.7, -28.5], v: 8 },
      { p: [1.9, -35.6], v: 6 },
      { p: [-1.9, -40.1], v: 6 },
      { p: [0, -44.6], v: 10 },
      { p: [-1.7, -65.8], v: 8 },
      { p: [-1.9, -72.9], v: 5 },
      { p: [1.9, -77.4], v: 5 },
      { p: [-1.9, -80.9], v: 5 },
      { p: [0, -84], v: 10 },
      { p: [-1.7, -106.9], v: 9 },
      { p: [0, -116], v: 5 },
      {
        p: [0, -123.5],
        v: 6,
        hold: {
          type: 'phase',
          id: 'm7-mp1',
          windows: [
            [0.89, 1.26],
            [4.03, 4.4],
          ],
          lead: 0.25,
        },
      },
      { p: [0, -132.5], v: 7 },
      { p: [0, -140], v: 5 },
      { p: [0, -142], v: 3 },
    ],
  },
};
