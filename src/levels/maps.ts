import { LevelData } from '../types/level';

export const MAPS: LevelData[] = [
  // ============================================================================
  // MAP 1: SUNNY SLOPES (Difficulty 1)
  // ============================================================================
  {
    id: 1,
    name: 'Sunny Slopes',
    subtitle: 'Learn the art of tilting the world',
    difficulty: 1,
    skyPreset: 'day',
    accentColor: '#2ec4b6',
    spawnPosition: [0, 1.0, 0],
    killPlaneY: -12,
    // Onboarding flow: roll -> gentle descent -> wide runway (checkpoint) -> funnel into a
    // railed precision lane -> open finish plaza. Every width change is capped with a
    // low wall so the only way off is over a rail-less edge the player can see coming.
    goalPosition: [0, -1.7, -63],
    medalTimesMs: {
      author: 8400,
      gold: 10800,
      silver: 16000,
      bronze: 27000,
    },
    checkpoints: [
      { id: 'm1-cp1', order: 1, position: [0, -1.7, -21] },
      { id: 'm1-cp2', order: 2, position: [0, -1.7, -46] },
    ],
    blocks: [
      { id: 'm1-b1', position: [0, 0, -4], size: [7, 0.6, 12], theme: 'meadow', rails: 'both' },
      {
        id: 'm1-b2',
        position: [0, -1.0, -14.5],
        size: [6.5, 0.6, 10.5],
        rotation: [-0.195, 0, 0],
        theme: 'warning',
        rails: 'both',
      },
      {
        id: 'm1-b3',
        position: [0, -2.0, -29],
        size: [8, 0.6, 19],
        theme: 'meadow',
        rails: 'both',
      },
      // Funnel 8 m -> 6 m -> 4.5 m, with end caps closing the steps.
      { id: 'm1-cap1l', position: [-3.5, -1.3, -38.6], size: [1.0, 0.8, 0.3], theme: 'warning' },
      { id: 'm1-cap1r', position: [3.5, -1.3, -38.6], size: [1.0, 0.8, 0.3], theme: 'warning' },
      { id: 'm1-b4', position: [0, -2.0, -41.25], size: [6, 0.6, 5.5], theme: 'meadow', rails: 'both' },
      { id: 'm1-cap2l', position: [-2.625, -1.3, -44.1], size: [0.75, 0.8, 0.3], theme: 'warning' },
      { id: 'm1-cap2r', position: [2.625, -1.3, -44.1], size: [0.75, 0.8, 0.3], theme: 'warning' },
      // Precision lane: narrow but fully railed, teaches small steering inputs.
      { id: 'm1-b5', position: [0, -2.0, -50], size: [4.5, 0.6, 12], theme: 'cobalt', rails: 'both' },
      { id: 'm1-cap3l', position: [-3.375, -1.3, -55.9], size: [2.25, 0.8, 0.3], theme: 'warning' },
      { id: 'm1-cap3r', position: [3.375, -1.3, -55.9], size: [2.25, 0.8, 0.3], theme: 'warning' },
      // Finish plaza
      { id: 'm1-b6', position: [0, -2.0, -61], size: [9, 0.6, 10], theme: 'meadow', rails: 'both' },
    ],
    gems: [
      { id: 'm1-g1', position: [0, 0.9, -7], timeBonusMs: 1000 },
      { id: 'm1-g2', position: [-1.5, -1.1, -24], timeBonusMs: 1000 },
      { id: 'm1-g3', position: [1.5, -1.1, -29], timeBonusMs: 1000 },
      { id: 'm1-g4', position: [-0.9, -1.1, -50], timeBonusMs: 1000 },
      { id: 'm1-g5', position: [0.9, -1.1, -53], timeBonusMs: 1000 },
    ],
  },

  // ============================================================================
  // MAP 2: STEPPING STONES (Difficulty 1)
  // ============================================================================
  {
    id: 2,
    name: 'Stepping Stones',
    subtitle: 'Time your roll across oscillating sky bridges',
    difficulty: 1,
    skyPreset: 'day',
    accentColor: '#3b82f6',
    spawnPosition: [0, 1.0, 0],
    killPlaneY: -12,
    goalPosition: [0, 0.3, -44],
    medalTimesMs: {
      author: 8600,
      gold: 11000,
      silver: 16500,
      bronze: 28000,
    },
    checkpoints: [
      { id: 'm2-cp1', order: 1, position: [0, 0.3, -22] },
    ],
    blocks: [
      { id: 'm2-b1', position: [0, 0, -4], size: [6.5, 0.6, 11], theme: 'cobalt', rails: 'both' },
      { id: 'm2-b2', position: [0, 0, -22], size: [7, 0.6, 8], theme: 'cobalt' },
      { id: 'm2-b3', position: [0, 0, -41], size: [7.5, 0.6, 11], theme: 'cobalt', rails: 'both' },
    ],
    movingPlatforms: [
      {
        id: 'm2-mp1',
        start: [-3.2, 0, -13.5],
        end: [3.2, 0, -13.5],
        size: [4.5, 0.6, 7.5],
        speed: 1.8,
        theme: 'warning',
      },
      {
        id: 'm2-mp2',
        start: [3.5, 0, -30.5],
        end: [-3.5, 0, -30.5],
        size: [4.5, 0.6, 8.5],
        speed: 2.1,
        phaseOffset: 1.2,
        theme: 'warning',
      },
    ],
    gems: [
      { id: 'm2-g1', position: [0, 0.9, -13.5], timeBonusMs: 1500 },
      { id: 'm2-g2', position: [0, 0.9, -22], timeBonusMs: 1200 },
      { id: 'm2-g3', position: [0, 0.9, -30.5], timeBonusMs: 1500 },
    ],
  },

  // ============================================================================
  // MAP 3: BUMPER BOULEVARD (Difficulty 2)
  // ============================================================================
  {
    id: 3,
    name: 'Bumper Boulevard',
    subtitle: 'Pinball chaos! Weave through or ricochet to victory',
    difficulty: 2,
    skyPreset: 'sunset',
    accentColor: '#f97316',
    spawnPosition: [0, 1.0, 0],
    killPlaneY: -12,
    goalPosition: [0, 0.3, -46],
    medalTimesMs: {
      author: 8200,
      gold: 10500,
      silver: 15500,
      bronze: 25000,
    },
    checkpoints: [
      { id: 'm3-cp1', order: 1, position: [0, 0.3, -20.5] },
      { id: 'm3-cp2', order: 2, position: [0, 0.3, -37.5] },
    ],
    blocks: [
      { id: 'm3-b1', position: [0, 0, -4], size: [7, 0.6, 10], theme: 'sunset', rails: 'both' },
      { id: 'm3-b2', position: [0, 0, -22], size: [11, 0.6, 26], theme: 'sunset' },
      { id: 'm3-b3', position: [0, 0, -42], size: [6.5, 0.6, 14], theme: 'gold', rails: 'both' },
    ],
    bumpers: [
      { id: 'm3-bmp1', position: [-2.4, 0.75, -13], radius: 0.8 },
      { id: 'm3-bmp2', position: [2.4, 0.75, -13], radius: 0.8 },
      { id: 'm3-bmp3', position: [0, 0.75, -18], radius: 0.95 },
      { id: 'm3-bmp4', position: [-3.0, 0.75, -23], radius: 0.8 },
      { id: 'm3-bmp5', position: [3.0, 0.75, -23], radius: 0.8 },
      { id: 'm3-bmp6', position: [-1.6, 0.75, -28], radius: 0.85 },
      { id: 'm3-bmp7', position: [1.6, 0.75, -28], radius: 0.85 },
      { id: 'm3-bmp8', position: [0, 0.75, -33], radius: 0.85 },
    ],
    gems: [
      { id: 'm3-g1', position: [0, 0.9, -13], timeBonusMs: 1500 },
      { id: 'm3-g2', position: [-2.2, 0.9, -18], timeBonusMs: 1500 },
      { id: 'm3-g3', position: [2.2, 0.9, -18], timeBonusMs: 1500 },
      { id: 'm3-g4', position: [0, 0.9, -28], timeBonusMs: 1500 },
    ],
  },

  // ============================================================================
  // MAP 4: WINDMILL CROSSING (Difficulty 2)
  // ============================================================================
  {
    id: 4,
    name: 'Windmill Crossing',
    subtitle: 'Ride the spinning cross-bridges without getting swept off',
    difficulty: 2,
    skyPreset: 'day',
    accentColor: '#38bdf8',
    spawnPosition: [0, 1.0, 0],
    killPlaneY: -14,
    goalPosition: [0, 0.3, -49],
    medalTimesMs: {
      author: 10200,
      gold: 13000,
      silver: 19000,
      bronze: 32000,
    },
    checkpoints: [
      { id: 'm4-cp1', order: 1, position: [0, 0.3, -25] },
    ],
    blocks: [
      { id: 'm4-b1', position: [0, 0, -4], size: [6.5, 0.6, 10], theme: 'cobalt', rails: 'both' },
      { id: 'm4-b2', position: [0, 0, -25], size: [6.5, 0.6, 7], theme: 'warning' },
      { id: 'm4-b3', position: [0, 0, -46], size: [7, 0.6, 11], theme: 'cobalt', rails: 'both' },
    ],
    rotatingHazards: [
      {
        id: 'm4-rh1',
        position: [0, 0, -15.2],
        size: [3.2, 0.6, 13.5],
        angularVelocity: [0, 0.75, 0],
        type: 'cross-bridge',
        color: '#38bdf8',
      },
      {
        id: 'm4-rh2',
        position: [0, 0, -34.8],
        size: [3.2, 0.6, 13.5],
        angularVelocity: [0, -0.85, 0],
        type: 'cross-bridge',
        color: '#a855f7',
      },
    ],
    bumpers: [{ id: 'm4-bmp1', position: [0, 0.75, -22.2], radius: 0.7 }],
    gems: [
      { id: 'm4-g1', position: [0, 1.0, -15.2], timeBonusMs: 1500 },
      { id: 'm4-g2', position: [-2.0, 0.9, -25], timeBonusMs: 1500 },
      { id: 'm4-g3', position: [2.0, 0.9, -25], timeBonusMs: 1500 },
      { id: 'm4-g4', position: [0, 1.0, -34.8], timeBonusMs: 1500 },
    ],
  },

  // ============================================================================
  // MAP 5: SWITCHBACK SUMMIT (Difficulty 3 — Rebuilt & Polished)
  // ============================================================================
  {
    id: 5,
    name: 'Switchback Summit',
    subtitle: 'Hit the emerald switch for the turbo shortcut bridge, or take the right switchback!',
    difficulty: 3,
    skyPreset: 'aurora',
    accentColor: '#10b981',
    spawnPosition: [0, 1.0, 0],
    killPlaneY: -15,
    goalPosition: [0, 0.3, -45.5],
    medalTimesMs: {
      author: 8200,
      gold: 11000,
      silver: 18500,
      bronze: 32000,
    },
    checkpoints: [
      { id: 'm5-cp1', order: 1, position: [0, 0.3, -6.0] },
      { id: 'm5-cp2', order: 2, position: [0, 0.3, -39.8] },
    ],
    blocks: [
      // Start straightaway
      { id: 'm5-b1-start', position: [0, 0, -3.5], size: [7, 0.6, 9], theme: 'meadow', rails: 'both' },
      // Open 3-way junction hub (no side rails so left alcove & right detour are completely open)
      { id: 'm5-b1-hub', position: [0, 0, -10.5], size: [7.5, 0.6, 6], theme: 'meadow', rails: 'none' },
      // Left alcove holding the emerald bridge switch
      { id: 'm5-b1-alcove', position: [-6.0, 0, -10.5], size: [5.2, 0.6, 5.5], theme: 'warning' },
      // Right switchback entrance arm
      { id: 'm5-b2', position: [6.0, 0, -10.5], size: [5.2, 0.6, 5.5], theme: 'meadow' },
      // Right switchback main bypass boulevard (outer rail on right for safety)
      { id: 'm5-b3', position: [9.8, 0, -23.5], size: [5.0, 0.6, 26.5], theme: 'meadow', rails: 'right' },
      // Right switchback return arm
      { id: 'm5-b4', position: [6.0, 0, -36.5], size: [5.2, 0.6, 5.5], theme: 'meadow' },
      // Rejoin junction hub (rail on left only, open on right for returning detour players)
      { id: 'm5-b5-hub', position: [0, 0, -36.5], size: [7.5, 0.6, 6], theme: 'gold', rails: 'left' },
      // Final goal runway
      { id: 'm5-b5-goal', position: [0, 0, -43.5], size: [7.5, 0.6, 8.5], theme: 'gold', rails: 'both' },
    ],
    switchBridges: [
      {
        id: 'm5-sw1',
        switchPosition: [-6.0, 0.3, -10.5],
        bridgePosition: [0, 0, -23.5],
        bridgeSize: [4.2, 0.6, 20.0],
        color: '#10b981',
      },
    ],
    boostPads: [
      {
        id: 'm5-bp1',
        position: [0, 0.3, -18.5],
        size: [2.8, 4.5],
        force: 15,
        color: '#10b981',
      },
    ],
    bumpers: [
      { id: 'm5-bmp1', position: [9.8, 0.75, -19.5], radius: 0.68 },
      { id: 'm5-bmp2', position: [9.8, 0.75, -27.5], radius: 0.68 },
    ],
    gems: [
      { id: 'm5-g1', position: [-6.0, 0.9, -10.5], timeBonusMs: 1500 },
      { id: 'm5-g2', position: [0, 0.9, -23.5], timeBonusMs: 1500 },
      { id: 'm5-g3', position: [9.8, 0.9, -23.5], timeBonusMs: 1500 },
    ],
  },

  // ============================================================================
  // MAP 6: PENDULUM PERIL (Difficulty 3)
  // ============================================================================
  {
    id: 6,
    name: 'Pendulum Peril',
    subtitle: 'Dodge the sweeping hazard beams across narrow catwalks',
    difficulty: 3,
    skyPreset: 'neon',
    accentColor: '#f72585',
    spawnPosition: [0, 1.0, 0],
    killPlaneY: -14,
    goalPosition: [0, 0.3, -52],
    medalTimesMs: {
      author: 10500,
      gold: 13500,
      silver: 21000,
      bronze: 36000,
    },
    checkpoints: [
      { id: 'm6-cp1', order: 1, position: [0, 0.3, -31] },
    ],
    blocks: [
      { id: 'm6-b1', position: [0, 0, -4], size: [6, 0.6, 10], theme: 'cyber', rails: 'both' },
      { id: 'm6-b2', position: [0, 0, -18], size: [4.0, 0.6, 19], theme: 'cyber' },
      { id: 'm6-b3', position: [0, 0, -31], size: [6.5, 0.6, 8], theme: 'warning' },
      { id: 'm6-b4', position: [0, 0, -44], size: [4.4, 0.6, 19], theme: 'cyber' },
    ],
    rotatingHazards: [
      {
        id: 'm6-rh1',
        position: [0, 0.7, -15],
        size: [6.5, 0.55, 0.55],
        angularVelocity: [0, 2.2, 0],
        type: 'hazard',
        color: '#f43f5e',
      },
      {
        id: 'm6-rh2',
        position: [0, 0.7, -22],
        size: [6.5, 0.55, 0.55],
        angularVelocity: [0, -2.4, 0],
        type: 'hazard',
        color: '#f43f5e',
      },
      {
        id: 'm6-rh3',
        position: [0, 0.7, -40],
        size: [7.0, 0.55, 0.55],
        angularVelocity: [0, 2.8, 0],
        type: 'hazard',
        color: '#f43f5e',
      },
    ],
    bumpers: [
      { id: 'm6-bmp1', position: [-2.0, 0.75, -33.5], radius: 0.7 },
      { id: 'm6-bmp2', position: [2.0, 0.75, -33.5], radius: 0.7 },
    ],
    gems: [
      { id: 'm6-g1', position: [0, 0.9, -18.5], timeBonusMs: 1500 },
      { id: 'm6-g2', position: [0, 0.9, -31], timeBonusMs: 1500 },
      { id: 'm6-g3', position: [0, 0.9, -44], timeBonusMs: 1500 },
    ],
  },

  // ============================================================================
  // MAP 7: CASCADE COASTER (Difficulty 4)
  // ============================================================================
  {
    id: 7,
    name: 'Cascade Coaster',
    subtitle: 'Full-throttle downhill ramp jump into high-altitude islands',
    difficulty: 4,
    skyPreset: 'day',
    accentColor: '#38bdf8',
    spawnPosition: [0, 1.0, 0],
    killPlaneY: -22,
    goalPosition: [0, -6.7, -58],
    medalTimesMs: {
      author: 9200,
      gold: 11500,
      silver: 17500,
      bronze: 30000,
    },
    checkpoints: [
      { id: 'm7-cp1', order: 1, position: [0, -5.7, -26.2] },
      { id: 'm7-cp2', order: 2, position: [0, -6.7, -41.5] },
    ],
    blocks: [
      { id: 'm7-b1', position: [0, 0, -3.5], size: [6, 0.6, 9], theme: 'ice', rails: 'both' },
      {
        id: 'm7-b2',
        position: [0, -3.0, -16],
        size: [5.4, 0.6, 18.5],
        rotation: [-0.34, 0, 0],
        theme: 'ice',
        rails: 'both',
      },
      {
        id: 'm7-b3',
        position: [0, -6.0, -26.5],
        size: [5.8, 0.6, 5.0],
        theme: 'warning',
        rails: 'both',
      },
      {
        id: 'm7-b4',
        position: [0, -7.0, -38],
        size: [9.5, 0.6, 14.5],
        theme: 'cobalt',
        rails: 'both',
      },
      {
        id: 'm7-b5',
        position: [0, -7.0, -56],
        size: [7, 0.6, 11],
        theme: 'gold',
        rails: 'both',
      },
    ],
    movingPlatforms: [
      {
        id: 'm7-mp1',
        start: [-3.5, -7.0, -47.8],
        end: [3.5, -7.0, -47.8],
        size: [4.2, 0.6, 6.5],
        speed: 2.4,
        theme: 'warning',
      },
    ],
    bumpers: [
      { id: 'm7-bmp1', position: [-2.5, -6.25, -36], radius: 0.8 },
      { id: 'm7-bmp2', position: [2.5, -6.25, -36], radius: 0.8 },
    ],
    gems: [
      { id: 'm7-g1', position: [0, -2.0, -16], timeBonusMs: 1500 },
      { id: 'm7-g2', position: [0, -5.0, -29.5], timeBonusMs: 2000 },
      { id: 'm7-g3', position: [0, -6.1, -38], timeBonusMs: 1500 },
    ],
  },

  // ============================================================================
  // MAP 8: CLOCKWORK ARCHIPELAGO (Difficulty 4)
  // ============================================================================
  {
    id: 8,
    name: 'Clockwork Archipelago',
    subtitle: 'Interlocking spinning bridges and synchronized moving platforms',
    difficulty: 4,
    skyPreset: 'sunset',
    accentColor: '#f59e0b',
    spawnPosition: [0, 1.0, 0],
    killPlaneY: -15,
    goalPosition: [0, 0.3, -60],
    medalTimesMs: {
      author: 13200,
      gold: 16500,
      silver: 24500,
      bronze: 40000,
    },
    checkpoints: [
      { id: 'm8-cp1', order: 1, position: [0, 0.3, -22] },
      { id: 'm8-cp2', order: 2, position: [0, 0.3, -40] },
    ],
    blocks: [
      { id: 'm8-b1', position: [0, 0, -4], size: [6, 0.6, 9], theme: 'sunset', rails: 'both' },
      { id: 'm8-b2', position: [0, 0, -22], size: [6, 0.6, 6], theme: 'citadel' },
      { id: 'm8-b3', position: [0, 0, -40], size: [6, 0.6, 6], theme: 'citadel' },
      { id: 'm8-b4', position: [0, 0, -57.5], size: [7, 0.6, 10], theme: 'gold', rails: 'both' },
    ],
    rotatingHazards: [
      {
        id: 'm8-rh1',
        position: [0, 0, -13.2],
        size: [2.8, 0.6, 11.5],
        angularVelocity: [0, 0.95, 0],
        type: 'cross-bridge',
        color: '#f59e0b',
      },
      {
        id: 'm8-rh2',
        position: [0, 0, -48.8],
        size: [2.8, 0.6, 12.0],
        angularVelocity: [0, -1.05, 0],
        type: 'cross-bridge',
        color: '#38bdf8',
      },
    ],
    movingPlatforms: [
      {
        id: 'm8-mp1',
        start: [-3.5, 0, -28.2],
        end: [3.5, 0, -28.2],
        size: [3.8, 0.6, 6.5],
        speed: 2.3,
        theme: 'warning',
      },
      {
        id: 'm8-mp2',
        start: [3.5, 0, -34.2],
        end: [-3.5, 0, -34.2],
        size: [3.8, 0.6, 6.5],
        speed: 2.3,
        phaseOffset: Math.PI,
        theme: 'warning',
      },
    ],
    bumpers: [
      { id: 'm8-bmp1', position: [-2.0, 0.75, -22], radius: 0.65 },
      { id: 'm8-bmp2', position: [2.0, 0.75, -40], radius: 0.65 },
    ],
    gems: [
      { id: 'm8-g1', position: [0, 1.0, -13.2], timeBonusMs: 1500 },
      { id: 'm8-g2', position: [0, 0.9, -31.2], timeBonusMs: 2000 },
      { id: 'm8-g3', position: [0, 1.0, -48.8], timeBonusMs: 1500 },
    ],
  },

  // ============================================================================
  // MAP 9: RAZOR'S EDGE (Difficulty 5)
  // ============================================================================
  {
    id: 9,
    name: "Razor's Edge",
    subtitle: 'High-stakes balance beams and switch-activated bridges',
    difficulty: 5,
    skyPreset: 'neon',
    accentColor: '#00f5d4',
    spawnPosition: [0, 1.0, 0],
    killPlaneY: -16,
    goalPosition: [0, -1.7, -58],
    medalTimesMs: {
      author: 12500,
      gold: 15500,
      silver: 24000,
      bronze: 42000,
    },
    checkpoints: [
      { id: 'm9-cp1', order: 1, position: [0, 0.3, -24.0] },
      { id: 'm9-cp2', order: 2, position: [0, -1.7, -44.0] },
    ],
    blocks: [
      { id: 'm9-b1', position: [0, 0, -4], size: [5.5, 0.6, 9], theme: 'cyber', rails: 'both' },
      { id: 'm9-b2', position: [0, 0, -15], size: [2.5, 0.6, 14], theme: 'warning' },
      { id: 'm9-b3', position: [0, 0, -26], size: [6.5, 0.6, 9], theme: 'cyber' },
      { id: 'm9-b4', position: [0, -2.0, -46], size: [5.5, 0.6, 9], theme: 'cyber' },
      { id: 'm9-b5', position: [0, -2.0, -55.5], size: [4.8, 0.6, 11], theme: 'gold' },
    ],
    switchBridges: [
      {
        id: 'm9-sw1',
        switchPosition: [0, 0.3, -27.5],
        bridgePosition: [0, -1.0, -36],
        bridgeSize: [3.0, 0.6, 12.5],
        bridgeRotation: [-0.16, 0, 0],
        color: '#00f5d4',
      },
    ],
    rotatingHazards: [
      {
        id: 'm9-rh1',
        position: [0, 0.7, -27.5],
        size: [6.0, 0.5, 0.5],
        angularVelocity: [0, 2.5, 0],
        type: 'hazard',
        color: '#f72585',
      },
      {
        id: 'm9-rh2',
        position: [0, -1.3, -47.5],
        size: [5.2, 0.5, 0.5],
        angularVelocity: [0, -2.7, 0],
        type: 'hazard',
        color: '#f72585',
      },
    ],
    gems: [
      { id: 'm9-g1', position: [0, 0.9, -15], timeBonusMs: 1500 },
      { id: 'm9-g2', position: [0, -0.1, -36], timeBonusMs: 2000 },
      { id: 'm9-g3', position: [0, -1.1, -51], timeBonusMs: 1500 },
    ],
  },

  // ============================================================================
  // MAP 10: GRAND MASTER'S CITADEL (Difficulty 5)
  // ============================================================================
  {
    id: 10,
    name: "Grand Master's Citadel",
    subtitle: 'Conquer every obstacle and catch the moving Goal Gate!',
    difficulty: 5,
    skyPreset: 'citadel',
    accentColor: '#fbbf24',
    spawnPosition: [0, 1.0, 0],
    killPlaneY: -18,
    goalPosition: [0, -1.7, -69],
    goalMovingRange: [2.8, 0, 0],
    goalMovingSpeed: 1.8,
    medalTimesMs: {
      author: 17000,
      gold: 21000,
      silver: 32000,
      bronze: 52000,
    },
    checkpoints: [
      { id: 'm10-cp1', order: 1, position: [0, 0.3, -15.2] },
      { id: 'm10-cp2', order: 2, position: [0, 0.3, -25.5] },
      { id: 'm10-cp3', order: 3, position: [0, 0.3, -43.5] },
    ],
    blocks: [
      { id: 'm10-b1', position: [0, 0, -8], size: [8, 0.6, 18], theme: 'citadel' },
      { id: 'm10-b2', position: [0, 0, -25.5], size: [6, 0.6, 6], theme: 'warning' },
      { id: 'm10-b3', position: [0, 0, -45.5], size: [7.5, 0.6, 8], theme: 'citadel' },
      {
        id: 'm10-b4',
        position: [0, -2.0, -66.5],
        size: [9.5, 0.6, 12],
        theme: 'gold',
        rails: 'both',
      },
    ],
    bumpers: [
      { id: 'm10-bmp1', position: [-2.0, 0.75, -7], radius: 0.8 },
      { id: 'm10-bmp2', position: [2.0, 0.75, -7], radius: 0.8 },
      { id: 'm10-bmp3', position: [0, 0.75, -11.5], radius: 0.9 },
      { id: 'm10-bmp4', position: [-2.2, 0.75, -46.5], radius: 0.75 },
      { id: 'm10-bmp5', position: [2.2, 0.75, -46.5], radius: 0.75 },
    ],
    movingPlatforms: [
      {
        id: 'm10-mp1',
        start: [-3.2, 0, -19.8],
        end: [3.2, 0, -19.8],
        size: [4.2, 0.6, 6.0],
        speed: 2.5,
        theme: 'warning',
      },
    ],
    rotatingHazards: [
      {
        id: 'm10-rh1',
        position: [0, 0, -35.5],
        size: [3.0, 0.6, 13.5],
        angularVelocity: [0, 1.05, 0],
        type: 'cross-bridge',
        color: '#fbbf24',
      },
      {
        id: 'm10-rh2',
        position: [0, 0.7, -46.5],
        size: [6.8, 0.5, 0.5],
        angularVelocity: [0, -2.6, 0],
        type: 'hazard',
        color: '#ef4444',
      },
    ],
    switchBridges: [
      {
        id: 'm10-sw1',
        switchPosition: [0, 0.3, -46.5],
        bridgePosition: [0, -1.0, -55],
        bridgeSize: [3.6, 0.6, 12.5],
        bridgeRotation: [-0.16, 0, 0],
        color: '#fbbf24',
      },
    ],
    gems: [
      { id: 'm10-g1', position: [0, 0.9, -7], timeBonusMs: 1500 },
      { id: 'm10-g2', position: [0, 0.9, -19.8], timeBonusMs: 2000 },
      { id: 'm10-g3', position: [0, 1.0, -35.5], timeBonusMs: 2000 },
      { id: 'm10-g4', position: [0, -0.1, -55], timeBonusMs: 2000 },
    ],
  },

  // ============================================================================
  // MAP 11: TURBO SPEEDWAY (Difficulty 3 — Trackmania Boost Highway)
  // ============================================================================
  {
    id: 11,
    name: 'Turbo Speedway',
    subtitle: 'Chain neon chevron boost pads down a high-velocity stadium circuit!',
    difficulty: 3,
    skyPreset: 'neon',
    accentColor: '#00f5d4',
    spawnPosition: [0, 1.0, 0],
    killPlaneY: -18,
    goalPosition: [0, -2.2, -74],
    medalTimesMs: {
      author: 6400,
      gold: 8200,
      silver: 13000,
      bronze: 22000,
    },
    checkpoints: [
      { id: 'm11-cp1', order: 1, position: [0, 0.3, -24] },
      { id: 'm11-cp2', order: 2, position: [0, -2.2, -52] },
    ],
    blocks: [
      { id: 'm11-b1', position: [0, 0, -13], size: [8.0, 0.6, 30], theme: 'cyber', rails: 'both' },
      {
        id: 'm11-b2-ramp',
        position: [0, -1.25, -35.5],
        size: [7.5, 0.6, 16.5],
        rotation: [-0.155, 0, 0],
        theme: 'warning',
        rails: 'both',
      },
      { id: 'm11-b3', position: [0, -2.5, -59.5], size: [8.5, 0.6, 33], theme: 'gold', rails: 'both' },
    ],
    boostPads: [
      { id: 'm11-bp1', position: [0, 0.3, -8], size: [3.2, 5.0], force: 18, color: '#00f5d4' },
      { id: 'm11-bp2', position: [-2.0, 0.3, -19], size: [2.6, 4.5], force: 17, color: '#38bdf8' },
      { id: 'm11-bp3', position: [2.0, 0.3, -19], size: [2.6, 4.5], force: 17, color: '#38bdf8' },
      { id: 'm11-bp4', position: [0, -2.2, -47], size: [3.4, 5.5], force: 20, color: '#10b981' },
      { id: 'm11-bp5', position: [0, -2.2, -62], size: [3.4, 5.5], force: 20, color: '#00f5d4' },
    ],
    bumpers: [
      { id: 'm11-bmp1', position: [0, 0.75, -18.5], radius: 0.85 },
      { id: 'm11-bmp2', position: [-2.2, -1.75, -56], radius: 0.8 },
      { id: 'm11-bmp3', position: [2.2, -1.75, -56], radius: 0.8 },
    ],
    gems: [
      { id: 'm11-g1', position: [0, 0.9, -12], timeBonusMs: 1200 },
      { id: 'm11-g2', position: [0, -0.4, -35.5], timeBonusMs: 1500 },
      { id: 'm11-g3', position: [0, -1.6, -56], timeBonusMs: 1500 },
      { id: 'm11-g4', position: [0, -1.6, -67], timeBonusMs: 1200 },
    ],
  },

  // ============================================================================
  // MAP 12: SKYHOPPER VAULTS (Difficulty 4 — Pneumatic Jump Pad Islands)
  // ============================================================================
  {
    id: 12,
    name: 'Skyhopper Vaults',
    subtitle: 'Launch across floating sky islands using pneumatic spring jump pads!',
    difficulty: 4,
    skyPreset: 'day',
    accentColor: '#f59e0b',
    spawnPosition: [0, 1.0, 0],
    killPlaneY: -18,
    goalPosition: [0, 4.3, -62],
    medalTimesMs: {
      author: 8800,
      gold: 11500,
      silver: 18000,
      bronze: 30000,
    },
    checkpoints: [
      { id: 'm12-cp1', order: 1, position: [0, 2.3, -23] },
      { id: 'm12-cp2', order: 2, position: [0, 4.3, -43] },
    ],
    blocks: [
      { id: 'm12-b1', position: [0, 0, -5], size: [7.5, 0.6, 14], theme: 'cobalt', rails: 'both' },
      { id: 'm12-b2', position: [0, 2.0, -24], size: [8.5, 0.6, 13], theme: 'meadow', rails: 'both' },
      { id: 'm12-b3', position: [0, 4.0, -44], size: [8.5, 0.6, 13], theme: 'cobalt', rails: 'both' },
      { id: 'm12-b4', position: [0, 4.0, -60], size: [8.5, 0.6, 11], theme: 'gold', rails: 'both' },
    ],
    boostPads: [
      { id: 'm12-bp1', position: [0, 0.3, -6.5], size: [2.8, 4.0], force: 13, color: '#38bdf8' },
      { id: 'm12-bp2', position: [0, 2.3, -25.5], size: [2.8, 4.0], force: 13, color: '#10b981' },
      { id: 'm12-bp3', position: [0, 4.3, -45.5], size: [2.8, 4.0], force: 12, color: '#f59e0b' },
    ],
    jumpPads: [
      {
        id: 'm12-jp1',
        position: [0, 0.3, -10.5],
        targetPosition: [0, 2.3, -20.0],
        arcHeight: 3.0,
        radius: 1.35,
        color: '#f59e0b',
      },
      {
        id: 'm12-jp2',
        position: [0, 2.3, -29.2],
        targetPosition: [0, 4.3, -39.5],
        arcHeight: 3.0,
        radius: 1.35,
        color: '#10b981',
      },
      {
        id: 'm12-jp3',
        position: [0, 4.3, -49.2],
        targetPosition: [0, 4.3, -56.5],
        arcHeight: 2.6,
        radius: 1.35,
        color: '#38bdf8',
      },
    ],
    gems: [
      { id: 'm12-g1', position: [0, 3.8, -15.5], timeBonusMs: 1500 },
      { id: 'm12-g2', position: [0, 5.8, -34.5], timeBonusMs: 1500 },
      { id: 'm12-g3', position: [0, 6.8, -52.5], timeBonusMs: 1500 },
    ],
  },

  // ============================================================================
  // MAP 13: PINBALL REACTOR (Difficulty 4 — Multi-Path Boost & Bumper Core)
  // ============================================================================
  {
    id: 13,
    name: 'Pinball Reactor',
    subtitle: 'Blast through the reactor core or unlock the twin outer turbo catwalks!',
    difficulty: 4,
    skyPreset: 'sunset',
    accentColor: '#f43f5e',
    spawnPosition: [0, 1.0, 0],
    killPlaneY: -16,
    goalPosition: [0, 0.3, -60],
    medalTimesMs: {
      author: 9200,
      gold: 12000,
      silver: 19000,
      bronze: 32000,
    },
    checkpoints: [
      { id: 'm13-cp1', order: 1, position: [0, 0.3, -16] },
      { id: 'm13-cp2', order: 2, position: [0, 0.3, -44] },
    ],
    blocks: [
      { id: 'm13-b1', position: [0, 0, -5], size: [7.5, 0.6, 14], theme: 'sunset', rails: 'both' },
      { id: 'm13-b2-core', position: [0, 0, -29], size: [13.5, 0.6, 30], theme: 'citadel' },
      { id: 'm13-b3-goal', position: [0, 0, -53], size: [8.0, 0.6, 18], theme: 'gold', rails: 'both' },
    ],
    boostPads: [
      { id: 'm13-bp1', position: [-4.5, 0.3, -24], size: [2.4, 5.0], force: 18, color: '#00f5d4' },
      { id: 'm13-bp2', position: [4.5, 0.3, -24], size: [2.4, 5.0], force: 18, color: '#00f5d4' },
      { id: 'm13-bp3', position: [0, 0.3, -48], size: [3.0, 4.5], force: 16, color: '#f59e0b' },
    ],
    bumpers: [
      { id: 'm13-bmp1', position: [0, 0.75, -21], radius: 0.95 },
      { id: 'm13-bmp2', position: [-2.2, 0.75, -26], radius: 0.85 },
      { id: 'm13-bmp3', position: [2.2, 0.75, -26], radius: 0.85 },
      { id: 'm13-bmp4', position: [0, 0.75, -31], radius: 1.05 },
      { id: 'm13-bmp5', position: [-2.2, 0.75, -36], radius: 0.85 },
      { id: 'm13-bmp6', position: [2.2, 0.75, -36], radius: 0.85 },
    ],
    rotatingHazards: [
      {
        id: 'm13-rh1',
        position: [0, 0.7, -29],
        size: [7.2, 0.55, 0.55],
        angularVelocity: [0, 2.3, 0],
        type: 'hazard',
        color: '#f43f5e',
      },
    ],
    gems: [
      { id: 'm13-g1', position: [-4.5, 0.9, -29], timeBonusMs: 1500 },
      { id: 'm13-g2', position: [4.5, 0.9, -29], timeBonusMs: 1500 },
      { id: 'm13-g3', position: [0, 0.9, -39], timeBonusMs: 1500 },
      { id: 'm13-g4', position: [0, 0.9, -51], timeBonusMs: 1500 },
    ],
  },

  // ============================================================================
  // MAP 14: OBSIDIAN CORKSCREW (Difficulty 5 — Descending Spiral Drop)
  // ============================================================================
  {
    id: 14,
    name: 'Obsidian Corkscrew',
    subtitle: 'Carve around the high-altitude spiral ramps and boost to the lower sanctum!',
    difficulty: 5,
    skyPreset: 'aurora',
    accentColor: '#a855f7',
    spawnPosition: [0, 1.0, 0],
    killPlaneY: -24,
    goalPosition: [0, -7.7, -38],
    medalTimesMs: {
      author: 11200,
      gold: 14500,
      silver: 22000,
      bronze: 38000,
    },
    checkpoints: [
      { id: 'm14-cp1', order: 1, position: [14, -1.7, -14], rotation: [0, -Math.PI / 2, 0], respawnYaw: -Math.PI / 2 },
      { id: 'm14-cp2', order: 2, position: [0, -5.7, -22] },
    ],
    blocks: [
      // Top entry runway
      { id: 'm14-b1', position: [0, 0, -6], size: [7.0, 0.6, 15], theme: 'cyber', rails: 'left' },
      // East descending wing
      {
        id: 'm14-b2',
        position: [7.5, -1.0, -11.5],
        size: [14.0, 0.6, 6.0],
        rotation: [0, 0, -0.14],
        theme: 'warning',
      },
      // East corner deck
      { id: 'm14-b3', position: [14, -2.0, -14], size: [6.5, 0.6, 10], theme: 'cyber', rails: 'right' },
      // South-west return descending ramp back toward X = 0
      {
        id: 'm14-b4',
        position: [7.0, -4.0, -19.5],
        size: [14.5, 0.6, 6.0],
        rotation: [0, 0, 0.26],
        theme: 'ice',
      },
      // Lower central landing deck
      { id: 'm14-b5', position: [0, -6.0, -23.5], size: [7.5, 0.6, 12], theme: 'cobalt', rails: 'both' },
      // Final downhill ramp to goal
      {
        id: 'm14-b6',
        position: [0, -7.0, -31.5],
        size: [6.5, 0.6, 8.0],
        rotation: [-0.24, 0, 0],
        theme: 'warning',
        rails: 'both',
      },
      { id: 'm14-b7', position: [0, -8.0, -38.5], size: [8.0, 0.6, 9.0], theme: 'gold', rails: 'both' },
    ],
    boostPads: [
      { id: 'm14-bp1', position: [0, -5.7, -25.5], size: [2.8, 4.0], force: 16, color: '#a855f7' },
    ],
    bumpers: [
      { id: 'm14-bmp1', position: [14, -1.25, -17], radius: 0.75 },
    ],
    gems: [
      { id: 'm14-g1', position: [7.5, -0.1, -11.5], timeBonusMs: 1500 },
      { id: 'm14-g2', position: [14, -1.1, -14], timeBonusMs: 1500 },
      { id: 'm14-g3', position: [7.0, -3.1, -19.5], timeBonusMs: 1500 },
      { id: 'm14-g4', position: [0, -7.1, -36], timeBonusMs: 1500 },
    ],
  },

  // ============================================================================
  // MAP 15: CELESTIAL ODYSSEY (Difficulty 5 — The 15-Stage Campaign Finale)
  // ============================================================================
  {
    id: 15,
    name: 'Celestial Odyssey',
    subtitle: 'Master turbo pads, sky jump vaults, switch bridges, and the moving Goal Gate!',
    difficulty: 5,
    skyPreset: 'citadel',
    accentColor: '#fbbf24',
    spawnPosition: [0, 1.0, 0],
    killPlaneY: -22,
    goalPosition: [0, 2.3, -86],
    goalMovingRange: [3.2, 0, 0],
    goalMovingSpeed: 2.1,
    medalTimesMs: {
      author: 14500,
      gold: 18500,
      silver: 28000,
      bronze: 48000,
    },
    checkpoints: [
      { id: 'm15-cp1', order: 1, position: [0, 0.3, -24] },
      { id: 'm15-cp2', order: 2, position: [0, 2.3, -47] },
      { id: 'm15-cp3', order: 3, position: [0, 2.3, -68] },
    ],
    blocks: [
      { id: 'm15-b1', position: [0, 0, -12], size: [8.0, 0.6, 28], theme: 'citadel', rails: 'both' },
      { id: 'm15-b2', position: [0, 2.0, -45], size: [8.0, 0.6, 12], theme: 'warning' },
      { id: 'm15-b3', position: [0, 2.0, -68], size: [8.0, 0.6, 10], theme: 'citadel' },
      { id: 'm15-b4', position: [0, 2.0, -84], size: [10.0, 0.6, 13], theme: 'gold', rails: 'both' },
    ],
    boostPads: [
      { id: 'm15-bp1', position: [0, 0.3, -8], size: [3.2, 5.0], force: 18, color: '#00f5d4' },
      { id: 'm15-bp2', position: [0, 0.3, -19], size: [3.2, 5.0], force: 16, color: '#fbbf24' },
      { id: 'm15-bp3', position: [0, 2.3, -70], size: [3.0, 4.5], force: 16, color: '#10b981' },
    ],
    jumpPads: [
      {
        id: 'm15-jp1',
        position: [0, 0.3, -24.8],
        targetPosition: [0, 2.3, -31.5],
        arcHeight: 3.0,
        radius: 1.4,
        color: '#f59e0b',
      },
      {
        id: 'm15-jp2',
        position: [0, 2.3, -72.2],
        targetPosition: [0, 2.3, -79.5],
        arcHeight: 2.8,
        radius: 1.4,
        color: '#38bdf8',
      },
    ],
    rotatingHazards: [
      {
        id: 'm15-rh1',
        position: [0, 2.0, -34.5],
        size: [3.4, 0.6, 11.5],
        angularVelocity: [0, 0.95, 0],
        type: 'cross-bridge',
        color: '#fbbf24',
      },
      {
        id: 'm15-rh2',
        position: [0, 2.7, -45],
        size: [7.0, 0.5, 0.5],
        angularVelocity: [0, -2.5, 0],
        type: 'hazard',
        color: '#ef4444',
      },
    ],
    switchBridges: [
      {
        id: 'm15-sw1',
        switchPosition: [0, 2.3, -48.5],
        bridgePosition: [0, 2.0, -57],
        bridgeSize: [4.2, 0.6, 13.0],
        color: '#00f5d4',
      },
    ],
    bumpers: [
      { id: 'm15-bmp1', position: [-2.3, 0.75, -14], radius: 0.8 },
      { id: 'm15-bmp2', position: [2.3, 0.75, -14], radius: 0.8 },
    ],
    gems: [
      { id: 'm15-g1', position: [0, 0.9, -14], timeBonusMs: 1500 },
      { id: 'm15-g2', position: [0, 3.8, -29.5], timeBonusMs: 2000 },
      { id: 'm15-g3', position: [0, 2.9, -57], timeBonusMs: 2000 },
      { id: 'm15-g4', position: [0, 4.8, -76], timeBonusMs: 2000 },
    ],
  },
];

