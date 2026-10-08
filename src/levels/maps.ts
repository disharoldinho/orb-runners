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
    layoutVersion: 2,
    name: 'Stepping Stones',
    subtitle: 'Time your roll across oscillating sky bridges',
    difficulty: 1,
    skyPreset: 'day',
    accentColor: '#3b82f6',
    spawnPosition: [0, 1.0, 0],
    killPlaneY: -12,
    // Teaches timing one beat at a time: a slow wide shuttle -> CP1 -> staggered stepping
    // stones -> CP2 -> a scissor pair of shuttles with a rest deck between -> CP3 -> a
    // quicker final shuttle into the goal plaza. Every deck that leads onto a shuttle closes
    // down to a 4 m mouth with low caps, so you wait on solid ground and leave from the
    // centre. Off-centre gems over the shuttles reward boarding while the shuttle swings.
    goalPosition: [0, 0.3, -103],
    // Author: autopilot (scripts/autopilot, route 2), all 5 gems, 18.583 s -> 18.6 s.
    medalTimesMs: {
      author: 18600,
      gold: 24000,
      silver: 35500,
      bronze: 59500,
    },
    checkpoints: [
      { id: 'm2-cp1', order: 1, position: [0, 0.3, -24] },
      { id: 'm2-cp2', order: 2, position: [0, 0.3, -51] },
      { id: 'm2-cp3', order: 3, position: [0, 0.3, -82] },
    ],
    blocks: [
      { id: 'm2-b1', position: [0, 0, -6], size: [7, 0.6, 14], theme: 'cobalt', rails: 'both' },
      { id: 'm2-cap1l', position: [-2.75, 0.7, -12.85], size: [1.5, 0.8, 0.3], theme: 'warning' },
      { id: 'm2-cap1r', position: [2.75, 0.7, -12.85], size: [1.5, 0.8, 0.3], theme: 'warning' },
      // CP1 deck
      { id: 'm2-b2', position: [0, 0, -26], size: [7, 0.6, 10], theme: 'cobalt', rails: 'both' },
      // The stepping stones: staggered, 0.5 m joints, a 2.4 m wide overlap to thread
      { id: 'm2-s1', position: [-0.9, 0, -33.3], size: [4.2, 0.6, 3.6], theme: 'meadow' },
      { id: 'm2-s2', position: [0.9, 0, -37.4], size: [4.2, 0.6, 3.6], theme: 'meadow' },
      { id: 'm2-s3', position: [-0.9, 0, -41.5], size: [4.2, 0.6, 3.6], theme: 'meadow' },
      { id: 'm2-s4', position: [0.9, 0, -45.6], size: [4.2, 0.6, 3.6], theme: 'meadow' },
      // CP2 rest deck
      { id: 'm2-b3', position: [0, 0, -52.4], size: [7, 0.6, 9], theme: 'cobalt', rails: 'both' },
      { id: 'm2-cap3l', position: [-2.75, 0.7, -56.75], size: [1.5, 0.8, 0.3], theme: 'warning' },
      { id: 'm2-cap3r', position: [2.75, 0.7, -56.75], size: [1.5, 0.8, 0.3], theme: 'warning' },
      // Island between the scissor shuttles
      { id: 'm2-b4', position: [0, 0, -67.7], size: [6, 0.6, 6], theme: 'cobalt', rails: 'both' },
      { id: 'm2-cap4l', position: [-2.5, 0.7, -70.55], size: [1, 0.8, 0.3], theme: 'warning' },
      { id: 'm2-cap4r', position: [2.5, 0.7, -70.55], size: [1, 0.8, 0.3], theme: 'warning' },
      // CP3 deck
      { id: 'm2-b5', position: [0, 0, -83.5], size: [7, 0.6, 10], theme: 'cobalt', rails: 'both' },
      { id: 'm2-cap5l', position: [-2.75, 0.7, -88.35], size: [1.5, 0.8, 0.3], theme: 'warning' },
      { id: 'm2-cap5r', position: [2.75, 0.7, -88.35], size: [1.5, 0.8, 0.3], theme: 'warning' },
      // Goal plaza
      { id: 'm2-b6', position: [0, 0, -101.2], size: [9, 0.6, 11], theme: 'meadow', rails: 'both' },
      // Set-dressing: beacon posts marking how far each shuttle swings (no collider)
      { id: 'm2-post1l', position: [-5.6, 0.2, -17], size: [0.45, 2.6, 0.45], theme: 'warning', decorative: true },
      { id: 'm2-post1r', position: [5.6, 0.2, -17], size: [0.45, 2.6, 0.45], theme: 'warning', decorative: true },
      { id: 'm2-post2l', position: [-5.2, 0.2, -60.8], size: [0.45, 2.6, 0.45], theme: 'warning', decorative: true },
      { id: 'm2-post2r', position: [5.2, 0.2, -60.8], size: [0.45, 2.6, 0.45], theme: 'warning', decorative: true },
      { id: 'm2-post3l', position: [-5.2, 0.2, -74.6], size: [0.45, 2.6, 0.45], theme: 'warning', decorative: true },
      { id: 'm2-post3r', position: [5.2, 0.2, -74.6], size: [0.45, 2.6, 0.45], theme: 'warning', decorative: true },
      { id: 'm2-post4l', position: [-4.8, 0.2, -92.1], size: [0.45, 2.6, 0.45], theme: 'warning', decorative: true },
      { id: 'm2-post4r', position: [4.8, 0.2, -92.1], size: [0.45, 2.6, 0.45], theme: 'warning', decorative: true },
    ],
    movingPlatforms: [
      // Wide and slow (2.5 m/s peak): the first timing lesson
      {
        id: 'm2-mp1',
        start: [-2.5, 0, -17],
        end: [2.5, 0, -17],
        size: [5, 0.6, 7.8],
        speed: 1.0,
        phaseOffset: 2.8,
        theme: 'warning',
      },
      // Scissor pair: they pass the centre together, moving in opposite directions
      {
        id: 'm2-mp2',
        start: [2.4, 0, -60.8],
        end: [-2.4, 0, -60.8],
        size: [4.4, 0.6, 7.6],
        speed: 1.25,
        phaseOffset: 0.2,
        theme: 'warning',
      },
      {
        id: 'm2-mp3',
        start: [-2.4, 0, -74.6],
        end: [2.4, 0, -74.6],
        size: [4.4, 0.6, 7.6],
        speed: 1.25,
        phaseOffset: 0.2 + Math.PI,
        theme: 'warning',
      },
      // Final shuttle: shorter dwell at the centre than the others
      {
        id: 'm2-mp4',
        start: [2.0, 0, -92.1],
        end: [-2.0, 0, -92.1],
        size: [4.4, 0.6, 7],
        speed: 1.1,
        phaseOffset: 0.8,
        theme: 'warning',
      },
    ],
    gems: [
      { id: 'm2-g1', position: [2.2, 0.9, -17], timeBonusMs: 1000 },
      { id: 'm2-g2', position: [1.8, 0.9, -37.4], timeBonusMs: 1000 },
      { id: 'm2-g3', position: [-2.0, 0.9, -60.8], timeBonusMs: 1000 },
      { id: 'm2-g4', position: [2.0, 0.9, -74.6], timeBonusMs: 1000 },
      { id: 'm2-g5', position: [0, 0.9, -98], timeBonusMs: 1000 },
    ],
  },

  // ============================================================================
  // MAP 3: BUMPER BOULEVARD (Difficulty 2)
  // ============================================================================
  {
    id: 3,
    layoutVersion: 2,
    name: 'Bumper Boulevard',
    subtitle: 'Pinball chaos! Weave through or ricochet to victory',
    difficulty: 2,
    skyPreset: 'sunset',
    accentColor: '#f97316',
    spawnPosition: [0, 1.0, 0],
    killPlaneY: -12,
    // A fully railed boulevard (1 m pinball walls from the first bumper to the last): a
    // bumper kick can bang you into a wall but never over it. Three blocks of rising density, each followed by a checkpoint:
    // a wide slalom you can thread straight -> an arrowhead cluster (gem inside it) and a
    // bumper gate -> a narrow chicane gauntlet that forces a weave -> gold finish. Side gems
    // sit on the tight side of a bumper: taking one means threading the gap.
    goalPosition: [0, 0.3, -133],
    // Author: autopilot (scripts/autopilot, route 3, pace x1.15), all 4 gems, no bumper
    // contact, 26.883 s -> 26.9 s.
    medalTimesMs: {
      author: 26900,
      gold: 34500,
      silver: 51000,
      bronze: 86000,
    },
    checkpoints: [
      { id: 'm3-cp1', order: 1, position: [0, 0.3, -50] },
      { id: 'm3-cp2', order: 2, position: [0, 0.3, -88] },
    ],
    blocks: [
      { id: 'm3-b1', position: [0, 0, -5], size: [8, 0.6, 12], theme: 'sunset', rails: 'both' },
      // Slalom
      { id: 'm3-cap1l', position: [-4.5, 0.7, -11.15], size: [1, 0.8, 0.3], theme: 'warning' },
      { id: 'm3-cap1r', position: [4.5, 0.7, -11.15], size: [1, 0.8, 0.3], theme: 'warning' },
      { id: 'm3-b2', position: [0, 0, -29], size: [10, 0.6, 36], theme: 'sunset', rails: 'both', railHeight: 1.0 },
      { id: 'm3-cap2l', position: [-4.5, 0.8, -46.85], size: [1, 1.0, 0.3], theme: 'warning' },
      { id: 'm3-cap2r', position: [4.5, 0.8, -46.85], size: [1, 1.0, 0.3], theme: 'warning' },
      // CP1 deck
      { id: 'm3-b3', position: [0, 0, -51], size: [8, 0.6, 8], theme: 'gold', rails: 'both', railHeight: 1.0 },
      // Arrowhead + gate
      { id: 'm3-cap3l', position: [-4.75, 0.8, -55.15], size: [1.5, 1.0, 0.3], theme: 'warning' },
      { id: 'm3-cap3r', position: [4.75, 0.8, -55.15], size: [1.5, 1.0, 0.3], theme: 'warning' },
      { id: 'm3-b4', position: [0, 0, -70], size: [11, 0.6, 30], theme: 'sunset', rails: 'both', railHeight: 1.0 },
      { id: 'm3-cap4l', position: [-4.75, 0.8, -84.85], size: [1.5, 1.0, 0.3], theme: 'warning' },
      { id: 'm3-cap4r', position: [4.75, 0.8, -84.85], size: [1.5, 1.0, 0.3], theme: 'warning' },
      // CP2 deck
      { id: 'm3-b5', position: [0, 0, -89], size: [8, 0.6, 8], theme: 'gold', rails: 'both', railHeight: 1.0 },
      { id: 'm3-cap5l', position: [-3.5, 0.8, -92.85], size: [1, 1.0, 0.3], theme: 'warning' },
      { id: 'm3-cap5r', position: [3.5, 0.8, -92.85], size: [1, 1.0, 0.3], theme: 'warning' },
      // Chicane gauntlet
      { id: 'm3-b6', position: [0, 0, -108], size: [6, 0.6, 30], theme: 'sunset', rails: 'both', railHeight: 1.0 },
      { id: 'm3-cap6l', position: [-3.75, 0.8, -123.15], size: [1.5, 1.0, 0.3], theme: 'warning' },
      { id: 'm3-cap6r', position: [3.75, 0.8, -123.15], size: [1.5, 1.0, 0.3], theme: 'warning' },
      // Gold finish
      { id: 'm3-b7', position: [0, 0, -130], size: [9, 0.6, 14], theme: 'gold', rails: 'both' },
      // Set-dressing: boulevard lamp posts outside the rails (no collider)
      { id: 'm3-lamp1l', position: [-5.6, 0.5, -15], size: [0.35, 2.6, 0.35], theme: 'gold', decorative: true },
      { id: 'm3-lamp1r', position: [5.6, 0.5, -15], size: [0.35, 2.6, 0.35], theme: 'gold', decorative: true },
      { id: 'm3-lamp2l', position: [-5.6, 0.5, -29], size: [0.35, 2.6, 0.35], theme: 'gold', decorative: true },
      { id: 'm3-lamp2r', position: [5.6, 0.5, -29], size: [0.35, 2.6, 0.35], theme: 'gold', decorative: true },
      { id: 'm3-lamp3l', position: [-5.6, 0.5, -43], size: [0.35, 2.6, 0.35], theme: 'gold', decorative: true },
      { id: 'm3-lamp3r', position: [5.6, 0.5, -43], size: [0.35, 2.6, 0.35], theme: 'gold', decorative: true },
      { id: 'm3-lamp4l', position: [-6.1, 0.5, -59], size: [0.35, 2.6, 0.35], theme: 'gold', decorative: true },
      { id: 'm3-lamp4r', position: [6.1, 0.5, -59], size: [0.35, 2.6, 0.35], theme: 'gold', decorative: true },
      { id: 'm3-lamp5l', position: [-6.1, 0.5, -70], size: [0.35, 2.6, 0.35], theme: 'gold', decorative: true },
      { id: 'm3-lamp5r', position: [6.1, 0.5, -70], size: [0.35, 2.6, 0.35], theme: 'gold', decorative: true },
      { id: 'm3-lamp6l', position: [-6.1, 0.5, -81], size: [0.35, 2.6, 0.35], theme: 'gold', decorative: true },
      { id: 'm3-lamp6r', position: [6.1, 0.5, -81], size: [0.35, 2.6, 0.35], theme: 'gold', decorative: true },
      { id: 'm3-lamp7l', position: [-3.6, 0.5, -97], size: [0.35, 2.6, 0.35], theme: 'gold', decorative: true },
      { id: 'm3-lamp7r', position: [3.6, 0.5, -97], size: [0.35, 2.6, 0.35], theme: 'gold', decorative: true },
      { id: 'm3-lamp8l', position: [-3.6, 0.5, -108], size: [0.35, 2.6, 0.35], theme: 'gold', decorative: true },
      { id: 'm3-lamp8r', position: [3.6, 0.5, -108], size: [0.35, 2.6, 0.35], theme: 'gold', decorative: true },
      { id: 'm3-lamp9l', position: [-3.6, 0.5, -119], size: [0.35, 2.6, 0.35], theme: 'gold', decorative: true },
      { id: 'm3-lamp9r', position: [3.6, 0.5, -119], size: [0.35, 2.6, 0.35], theme: 'gold', decorative: true },
    ],
    bumpers: [
      // Slalom (a straight line threads it; the side gem doesn't)
      { id: 'm3-bmp1', position: [-1.8, 0.75, -18], radius: 0.8 },
      { id: 'm3-bmp2', position: [1.8, 0.75, -25], radius: 0.8 },
      { id: 'm3-bmp3', position: [-1.8, 0.75, -32], radius: 0.8 },
      { id: 'm3-bmp4', position: [1.8, 0.75, -39], radius: 0.8 },
      // Arrowhead (gem inside, open at the back). Bumper kicks add energy, so there is no
      // closed pocket anywhere: a ball can't get trapped ricocheting between bumpers.
      { id: 'm3-bmp5', position: [0, 0.75, -58.5], radius: 0.9 },
      { id: 'm3-bmp6', position: [-2.6, 0.75, -63.5], radius: 0.85 },
      { id: 'm3-bmp7', position: [2.6, 0.75, -63.5], radius: 0.85 },
      // Gate + post
      { id: 'm3-bmp8', position: [-2.4, 0.75, -75], radius: 0.9 },
      { id: 'm3-bmp9', position: [2.4, 0.75, -75], radius: 0.9 },
      { id: 'm3-bmp10', position: [0, 0.75, -80.5], radius: 1.0 },
      // Gauntlet chicanes (no straight line through)
      { id: 'm3-bmp11', position: [-1.3, 0.75, -99], radius: 0.7 },
      { id: 'm3-bmp12', position: [1.3, 0.75, -105.5], radius: 0.7 },
      { id: 'm3-bmp13', position: [-1.3, 0.75, -112], radius: 0.7 },
      { id: 'm3-bmp14', position: [1.3, 0.75, -118.5], radius: 0.7 },
    ],
    gems: [
      { id: 'm3-g1', position: [-3.6, 0.9, -32], timeBonusMs: 1000 },
      { id: 'm3-g2', position: [0, 0.9, -62.8], timeBonusMs: 1500 },
      { id: 'm3-g3', position: [-3.3, 0.9, -80.5], timeBonusMs: 1000 },
      { id: 'm3-g4', position: [1.6, 0.9, -112], timeBonusMs: 1000 },
    ],
  },

  // ============================================================================
  // MAP 4: WINDMILL CROSSING (Difficulty 2)
  // ============================================================================
  {
    id: 4,
    layoutVersion: 2,
    name: 'Windmill Crossing',
    subtitle: 'Ride the spinning cross-bridges without getting swept off',
    difficulty: 2,
    skyPreset: 'day',
    accentColor: '#38bdf8',
    spawnPosition: [0, 1.0, 0],
    killPlaneY: -14,
    // Four windmills: board an arm as it swings into line, ride to the (now flush) hub, and
    // leave when the next arm lines up with the exit. A slow first windmill (hub gem) ->
    // CP1 -> a counter-rotating pair around a railed island (gems out on the side arms:
    // ride out and back while the arm is broadside) -> CP2 -> a faster final windmill.
    // Arms stop 0.37 m short of the decks, so nothing ever clips through a deck, and every
    // deck end closes down to the 3.6 m arm width with caps.
    goalPosition: [0, 0.3, -86.5],
    // Author: autopilot (scripts/autopilot, route 4), all 4 gems, 28.067 s -> 28.1 s.
    medalTimesMs: {
      author: 28100,
      gold: 36000,
      silver: 53500,
      bronze: 90000,
    },
    checkpoints: [
      { id: 'm4-cp1', order: 1, position: [0, 0.3, -25] },
      { id: 'm4-cp2', order: 2, position: [0, 0.3, -63] },
    ],
    blocks: [
      { id: 'm4-b1', position: [0, 0, -5], size: [7, 0.6, 12], theme: 'cobalt', rails: 'both' },
      { id: 'm4-cap1l', position: [-2.65, 0.7, -10.85], size: [1.7, 0.8, 0.3], theme: 'warning' },
      { id: 'm4-cap1r', position: [2.65, 0.7, -10.85], size: [1.7, 0.8, 0.3], theme: 'warning' },
      // CP1 deck
      { id: 'm4-b2', position: [0, 0, -25.94], size: [7, 0.6, 10], theme: 'cobalt', rails: 'both' },
      { id: 'm4-cap2l', position: [-2.65, 0.7, -30.79], size: [1.7, 0.8, 0.3], theme: 'warning' },
      { id: 'm4-cap2r', position: [2.65, 0.7, -30.79], size: [1.7, 0.8, 0.3], theme: 'warning' },
      // Island between the counter-rotating pair
      { id: 'm4-b3', position: [0, 0, -44.88], size: [7, 0.6, 8], theme: 'meadow', rails: 'both' },
      { id: 'm4-cap3l', position: [-2.65, 0.7, -48.73], size: [1.7, 0.8, 0.3], theme: 'warning' },
      { id: 'm4-cap3r', position: [2.65, 0.7, -48.73], size: [1.7, 0.8, 0.3], theme: 'warning' },
      // CP2 deck
      { id: 'm4-b4', position: [0, 0, -63.82], size: [7, 0.6, 10], theme: 'cobalt', rails: 'both' },
      { id: 'm4-cap4l', position: [-2.65, 0.7, -68.67], size: [1.7, 0.8, 0.3], theme: 'warning' },
      { id: 'm4-cap4r', position: [2.65, 0.7, -68.67], size: [1.7, 0.8, 0.3], theme: 'warning' },
      // Goal plaza
      { id: 'm4-b5', position: [0, 0, -84.76], size: [9, 0.6, 12], theme: 'gold', rails: 'both' },
      // Set-dressing: windmill towers under each hub (no collider)
      { id: 'm4-tower1', position: [0, -5.1, -15.97], size: [1.2, 9, 1.2], theme: 'cloud', decorative: true },
      { id: 'm4-tower2', position: [0, -5.1, -35.91], size: [1.2, 9, 1.2], theme: 'cloud', decorative: true },
      { id: 'm4-tower3', position: [0, -5.1, -53.85], size: [1.2, 9, 1.2], theme: 'cloud', decorative: true },
      { id: 'm4-tower4', position: [0, -5.1, -73.79], size: [1.2, 9, 1.2], theme: 'cloud', decorative: true },
    ],
    rotatingHazards: [
      {
        id: 'm4-rh1',
        position: [0, 0, -15.97],
        size: [3.6, 0.6, 9.2],
        angularVelocity: [0, 0.45, 0],
        type: 'cross-bridge',
        color: '#38bdf8',
      },
      {
        id: 'm4-rh2',
        position: [0, 0, -35.91],
        size: [3.6, 0.6, 9.2],
        angularVelocity: [0, -0.55, 0],
        type: 'cross-bridge',
        color: '#a855f7',
      },
      {
        id: 'm4-rh3',
        position: [0, 0, -53.85],
        size: [3.6, 0.6, 9.2],
        angularVelocity: [0, 0.55, 0],
        type: 'cross-bridge',
        color: '#a855f7',
      },
      {
        id: 'm4-rh4',
        position: [0, 0, -73.79],
        size: [3.6, 0.6, 9.2],
        angularVelocity: [0, 0.75, 0],
        type: 'cross-bridge',
        color: '#f59e0b',
      },
    ],
    gems: [
      { id: 'm4-g1', position: [0, 0.9, -15.97], timeBonusMs: 1000 },
      { id: 'm4-g2', position: [-3.4, 0.9, -35.91], timeBonusMs: 2000 },
      { id: 'm4-g3', position: [3.4, 0.9, -53.85], timeBonusMs: 2000 },
      { id: 'm4-g4', position: [0, 0.9, -73.79], timeBonusMs: 1000 },
    ],
  },

  // ============================================================================
  // MAP 5: SWITCHBACK SUMMIT (Difficulty 3)
  // ============================================================================
  {
    id: 5,
    layoutVersion: 2,
    name: 'Switchback Summit',
    subtitle: 'Hit the emerald switch for the turbo shortcut bridge, or take the right switchback!',
    difficulty: 3,
    skyPreset: 'aurora',
    accentColor: '#10b981',
    spawnPosition: [0, 1.0, 0],
    killPlaneY: -15,
    // A real choice at the junction hub: detour 14 m up the left spur to hit the switch and
    // raise the 34 m boosted shortcut, or take the long railed switchback on the right
    // (bumpers on the inside line, its own gem). Every open edge of both hubs is capped, so
    // the only ways on are the spur, the bridge mouth and the switchback arms. Both lines
    // rejoin for the summit zigzag: a 28 m ridge railed on the left only, a walled corner,
    // the west leg, a second corner (checkpoint) and a final ridge railed on the right.
    goalPosition: [-22, 0.3, -124],
    // Author: autopilot (scripts/autopilot, route 5, shortcut line), 2 of 3 gems, 29.233 s
    // -> 29.3 s. The switchback line (its gem only) ran 30.258 s.
    medalTimesMs: {
      author: 29300,
      gold: 37500,
      silver: 55500,
      bronze: 94000,
    },
    checkpoints: [
      { id: 'm5-cp1', order: 1, position: [0, 0.3, -16.5], width: 6.6 },
      { id: 'm5-cp2', order: 2, position: [0, 0.3, -67], width: 3.4 },
      { id: 'm5-cp3', order: 3, position: [-22, 0.3, -101.5], width: 3.4 },
    ],
    blocks: [
      { id: 'm5-b1', position: [0, 0, -7], size: [7, 0.6, 16], theme: 'meadow', rails: 'both' },
      { id: 'm5-cap0l', position: [-3.75, 0.7, -15.15], size: [0.5, 0.8, 0.3], theme: 'warning' },
      { id: 'm5-cap0r', position: [3.75, 0.7, -15.15], size: [0.5, 0.8, 0.3], theme: 'warning' },
      // Junction hub
      { id: 'm5-hub1', position: [0, 0, -19], size: [8, 0.6, 8], theme: 'meadow' },
      { id: 'm5-hub1-wl1', position: [-3.85, 0.7, -16], size: [0.3, 0.8, 2], theme: 'warning' },
      { id: 'm5-hub1-wl2', position: [-3.85, 0.7, -22], size: [0.3, 0.8, 2], theme: 'warning' },
      { id: 'm5-hub1-wr1', position: [3.85, 0.7, -16], size: [0.3, 0.8, 2], theme: 'warning' },
      { id: 'm5-hub1-wr2', position: [3.85, 0.7, -22], size: [0.3, 0.8, 2], theme: 'warning' },
      { id: 'm5-hub1-nl', position: [-3, 0.7, -22.85], size: [2, 0.8, 0.3], theme: 'warning' },
      { id: 'm5-hub1-nr', position: [3, 0.7, -22.85], size: [2, 0.8, 0.3], theme: 'warning' },
      // Left spur to the switch (dead end, capped)
      { id: 'm5-spur', position: [-12, 0, -19], size: [4, 0.6, 16], rotation: [0, Math.PI / 2, 0], theme: 'warning', rails: 'both' },
      { id: 'm5-spur-end', position: [-19.85, 0.7, -19], size: [0.3, 0.8, 4], theme: 'warning' },
      // Right switchback: arm -> long boulevard -> arm
      { id: 'm5-arm1', position: [6.5, 0, -19], size: [4, 0.6, 5], rotation: [0, Math.PI / 2, 0], theme: 'meadow', rails: 'both' },
      { id: 'm5-sb1', position: [11.5, 0, -19], size: [5, 0.6, 8], theme: 'meadow', rails: 'right', railHeight: 1 },
      { id: 'm5-sb1-cap', position: [11.5, 0.7, -15.15], size: [5, 0.8, 0.3], theme: 'warning' },
      { id: 'm5-sb2', position: [11.5, 0, -40], size: [5, 0.6, 34], theme: 'meadow', rails: 'both', railHeight: 1 },
      { id: 'm5-sb3', position: [11.5, 0, -61], size: [5, 0.6, 8], theme: 'meadow', rails: 'right', railHeight: 1 },
      { id: 'm5-sb3-cap', position: [11.5, 0.7, -64.85], size: [5, 0.8, 0.3], theme: 'warning' },
      { id: 'm5-arm2', position: [6.5, 0, -61], size: [4, 0.6, 5], rotation: [0, Math.PI / 2, 0], theme: 'meadow', rails: 'both' },
      // Rejoin hub
      { id: 'm5-hub2', position: [0, 0, -61], size: [8, 0.6, 8], theme: 'gold', rails: 'left' },
      { id: 'm5-hub2-sl', position: [-3, 0.7, -57.15], size: [2, 0.8, 0.3], theme: 'warning' },
      { id: 'm5-hub2-sr', position: [3, 0.7, -57.15], size: [2, 0.8, 0.3], theme: 'warning' },
      { id: 'm5-hub2-wr1', position: [3.85, 0.7, -58], size: [0.3, 0.8, 2], theme: 'warning' },
      { id: 'm5-hub2-wr2', position: [3.85, 0.7, -64], size: [0.3, 0.8, 2], theme: 'warning' },
      { id: 'm5-hub2-nl', position: [-3, 0.7, -64.85], size: [2, 0.8, 0.3], theme: 'warning' },
      { id: 'm5-hub2-nr', position: [3, 0.7, -64.85], size: [2, 0.8, 0.3], theme: 'warning' },
      // Summit ridge: narrow, railed on the left only, then a walled corner and the west leg
      { id: 'm5-ridge', position: [0, 0, -79], size: [4, 0.6, 28], theme: 'meadow', rails: 'left' },
      { id: 'm5-c1', position: [0, 0, -96], size: [6, 0.6, 6], theme: 'meadow' },
      { id: 'm5-c1-sl', position: [-2.5, 0.7, -93.15], size: [1, 0.8, 0.3], theme: 'warning' },
      { id: 'm5-c1-sr', position: [2.5, 0.7, -93.15], size: [1, 0.8, 0.3], theme: 'warning' },
      { id: 'm5-c1-e', position: [2.85, 0.7, -96], size: [0.3, 0.8, 5.4], theme: 'warning' },
      { id: 'm5-c1-n', position: [0, 0.7, -98.85], size: [6, 0.8, 0.3], theme: 'warning' },
      { id: 'm5-leg', position: [-11, 0, -96], size: [4, 0.6, 16], rotation: [0, Math.PI / 2, 0], theme: 'meadow', rails: 'both' },
      { id: 'm5-c2', position: [-22, 0, -96], size: [6, 0.6, 6], theme: 'meadow' },
      { id: 'm5-c2-s', position: [-22, 0.7, -93.15], size: [6, 0.8, 0.3], theme: 'warning' },
      { id: 'm5-c2-w', position: [-24.85, 0.7, -96], size: [0.3, 0.8, 5.4], theme: 'warning' },
      { id: 'm5-c2-nl', position: [-24.5, 0.7, -98.85], size: [1, 0.8, 0.3], theme: 'warning' },
      { id: 'm5-c2-nr', position: [-19.5, 0.7, -98.85], size: [1, 0.8, 0.3], theme: 'warning' },
      { id: 'm5-f3', position: [-22, 0, -109], size: [4, 0.6, 20], theme: 'meadow', rails: 'right' },
      // Goal deck
      { id: 'm5-b8', position: [-22, 0, -123], size: [8, 0.6, 8], theme: 'gold', rails: 'both' },
      { id: 'm5-b8-sl', position: [-25, 0.7, -119.15], size: [2, 0.8, 0.3], theme: 'warning' },
      { id: 'm5-b8-sr', position: [-19, 0.7, -119.15], size: [2, 0.8, 0.3], theme: 'warning' },
      { id: 'm5-b8-end', position: [-22, 0.7, -126.85], size: [7.4, 0.8, 0.3], theme: 'warning' },
      // Set-dressing: crystal markers at the junction (no collider)
      { id: 'm5-crys1', position: [-5.2, 0.6, -13.6], size: [0.6, 2.2, 0.6], theme: 'crystal', decorative: true },
      { id: 'm5-crys2', position: [5.2, 0.6, -13.6], size: [0.6, 2.2, 0.6], theme: 'crystal', decorative: true },
      { id: 'm5-crys3', position: [5.2, 0.6, -55.6], size: [0.6, 2.2, 0.6], theme: 'crystal', decorative: true },
      { id: 'm5-crys4', position: [-5.2, 0.6, -55.6], size: [0.6, 2.2, 0.6], theme: 'crystal', decorative: true },
      { id: 'm5-crys5', position: [4.2, 0.6, -100.2], size: [0.6, 2.2, 0.6], theme: 'crystal', decorative: true },
      { id: 'm5-crys6', position: [-18.6, 0.6, -101.2], size: [0.6, 2.2, 0.6], theme: 'crystal', decorative: true },
      { id: 'm5-crys7', position: [-18.6, 0.6, -90.8], size: [0.6, 2.2, 0.6], theme: 'crystal', decorative: true },
      { id: 'm5-crys8', position: [-27.2, 0.6, -120.2], size: [0.6, 2.2, 0.6], theme: 'crystal', decorative: true },
      { id: 'm5-crys9', position: [-16.8, 0.6, -120.2], size: [0.6, 2.2, 0.6], theme: 'crystal', decorative: true },
    ],
    switchBridges: [
      {
        id: 'm5-sw1',
        switchPosition: [-18, 0.3, -19],
        bridgePosition: [0, 0, -40],
        bridgeSize: [4, 0.6, 34],
        color: '#10b981',
      },
    ],
    boostPads: [
      { id: 'm5-bp1', position: [0, 0.3, -28], size: [2.8, 4.5], force: 15, color: '#10b981' },
    ],
    bumpers: [
      // edge bumpers: the centre line (and its gem) clears them by 1.5 m; hug a rail and
      // they kick you back to the middle (no ball-sized gap to the rail, so no pocket)
      { id: 'm5-bmp1', position: [10, 0.75, -30], radius: 0.7 },
      { id: 'm5-bmp2', position: [13, 0.75, -40], radius: 0.7 },
      { id: 'm5-bmp3', position: [10, 0.75, -50], radius: 0.7 },
    ],
    gems: [
      { id: 'm5-g1', position: [-16.5, 0.9, -19], timeBonusMs: 1000 },
      { id: 'm5-g2', position: [0, 0.9, -48], timeBonusMs: 1000 },
      { id: 'm5-g3', position: [11.5, 0.9, -40], timeBonusMs: 1500 },
    ],
  },

  // ============================================================================
  // MAP 6: PENDULUM PERIL (Difficulty 3)
  // ============================================================================
  {
    id: 6,
    layoutVersion: 2,
    name: 'Pendulum Peril',
    subtitle: 'Time your run past five sweeping beams over the lava',
    difficulty: 3,
    skyPreset: 'neon',
    accentColor: '#f72585',
    spawnPosition: [0, 1.0, 0],
    killPlaneY: -14,
    // Five sweepers in rising speed, staged in pairs: catwalk -> sweep pad -> catwalk -> sweep
    // pad -> pocket deck (checkpoint), twice, then a last, longest, fastest sweeper before the
    // gold finish. Catwalks are railed on alternating sides; the sweep pads are open, sized so
    // the bar tips stop 0.3 m short of the pad edges and its end caps (nothing clips), and
    // there is no strip the bar cannot reach: you pass beside the hub between two sweeps.
    // Gems sit inside three sweep circles on the lane; a lava sheet below catches falls.
    goalPosition: [0, 0.3, -128],
    // Author: autopilot (scripts/autopilot, route 6), all 4 gems, run clock 32.017 s minus
    // 3.0 s of gems = 29.017 s -> 29.1 s.
    medalTimesMs: {
      author: 29100,
      gold: 37000,
      silver: 55500,
      bronze: 93000,
    },
    checkpoints: [
      { id: 'm6-cp1', order: 1, position: [0, 0.3, -46.3], width: 6.0 },
      { id: 'm6-cp2', order: 2, position: [0, 0.3, -91.7], width: 6.6 },
    ],
    blocks: [
      { id: 'm6-b1', position: [0, 0, -5], size: [7, 0.6, 12], theme: 'cyber', rails: 'both' },
      { id: 'm6-cap1l', position: [-2.75, 0.7, -10.85], size: [1.5, 0.8, 0.3], theme: 'warning' },
      { id: 'm6-cap1r', position: [2.75, 0.7, -10.85], size: [1.5, 0.8, 0.3], theme: 'warning' },
      { id: 'm6-w1', position: [0, 0, -16.0], size: [4, 0.6, 10], theme: 'cyber', rails: 'left' },
      // Sweeper 1: 6.2 m bar, omega 1.4
      { id: 'm6-p1', position: [0, 0, -24.7], size: [6.8, 0.6, 7.4], theme: 'warning' },
      { id: 'm6-p1-sl', position: [-2.7, 0.7, -21.15], size: [1.4, 0.8, 0.3], theme: 'warning' },
      { id: 'm6-p1-sr', position: [2.7, 0.7, -21.15], size: [1.4, 0.8, 0.3], theme: 'warning' },
      { id: 'm6-p1-nl', position: [-2.7, 0.7, -28.25], size: [1.4, 0.8, 0.3], theme: 'warning' },
      { id: 'm6-p1-nr', position: [2.7, 0.7, -28.25], size: [1.4, 0.8, 0.3], theme: 'warning' },
      { id: 'm6-w2', position: [0, 0, -32.4], size: [4, 0.6, 8], theme: 'cyber', rails: 'right' },
      // Sweeper 2: 6.2 m bar, omega -1.7
      { id: 'm6-p2', position: [0, 0, -40.1], size: [6.8, 0.6, 7.4], theme: 'warning' },
      { id: 'm6-p2-sl', position: [-2.7, 0.7, -36.55], size: [1.4, 0.8, 0.3], theme: 'warning' },
      { id: 'm6-p2-sr', position: [2.7, 0.7, -36.55], size: [1.4, 0.8, 0.3], theme: 'warning' },
      // Pocket deck 1 (checkpoint)
      { id: 'm6-k1', position: [0, 0, -49.3], size: [6.8, 0.6, 11], theme: 'cyber', rails: 'both' },
      { id: 'm6-k1-nl', position: [-2.7, 0.7, -54.65], size: [1.4, 0.8, 0.3], theme: 'warning' },
      { id: 'm6-k1-nr', position: [2.7, 0.7, -54.65], size: [1.4, 0.8, 0.3], theme: 'warning' },
      { id: 'm6-w3', position: [0, 0, -59.8], size: [4, 0.6, 10], theme: 'cyber', rails: 'right' },
      // Sweeper 3: 7.0 m bar, omega 2.0
      { id: 'm6-p3', position: [0, 0, -68.9], size: [7.6, 0.6, 8.2], theme: 'warning' },
      { id: 'm6-p3-sl', position: [-2.9, 0.7, -64.95], size: [1.8, 0.8, 0.3], theme: 'warning' },
      { id: 'm6-p3-sr', position: [2.9, 0.7, -64.95], size: [1.8, 0.8, 0.3], theme: 'warning' },
      { id: 'm6-p3-nl', position: [-2.9, 0.7, -72.85], size: [1.8, 0.8, 0.3], theme: 'warning' },
      { id: 'm6-p3-nr', position: [2.9, 0.7, -72.85], size: [1.8, 0.8, 0.3], theme: 'warning' },
      { id: 'm6-w4', position: [0, 0, -77.0], size: [4, 0.6, 8], theme: 'cyber', rails: 'left' },
      // Sweeper 4: 7.0 m bar, omega -2.3
      { id: 'm6-p4', position: [0, 0, -85.1], size: [7.6, 0.6, 8.2], theme: 'warning' },
      { id: 'm6-p4-sl', position: [-2.9, 0.7, -81.15], size: [1.8, 0.8, 0.3], theme: 'warning' },
      { id: 'm6-p4-sr', position: [2.9, 0.7, -81.15], size: [1.8, 0.8, 0.3], theme: 'warning' },
      // Pocket deck 2 (checkpoint)
      { id: 'm6-k2', position: [0, 0, -94.7], size: [7.6, 0.6, 11], theme: 'cyber', rails: 'both' },
      { id: 'm6-k2-nl', position: [-2.9, 0.7, -100.05], size: [1.8, 0.8, 0.3], theme: 'warning' },
      { id: 'm6-k2-nr', position: [2.9, 0.7, -100.05], size: [1.8, 0.8, 0.3], theme: 'warning' },
      { id: 'm6-w5', position: [0, 0, -105.2], size: [4, 0.6, 10], theme: 'cyber', rails: 'left' },
      // Sweeper 5: 7.6 m bar, omega 2.6
      { id: 'm6-p5', position: [0, 0, -114.6], size: [8.2, 0.6, 8.8], theme: 'warning' },
      { id: 'm6-p5-sl', position: [-3.05, 0.7, -110.35], size: [2.1, 0.8, 0.3], theme: 'warning' },
      { id: 'm6-p5-sr', position: [3.05, 0.7, -110.35], size: [2.1, 0.8, 0.3], theme: 'warning' },
      // Goal deck
      { id: 'm6-b9', position: [0, 0, -125.5], size: [8.2, 0.6, 13], theme: 'gold', rails: 'both' },
      { id: 'm6-b9-end', position: [0, 0.7, -131.85], size: [7.6, 0.8, 0.3], theme: 'warning' },
      // Set-dressing: neon pivot pylons beside each sweeper (no collider)
      { id: 'm6-pyl1l', position: [-4.3, 0.9, -24.7], size: [0.5, 3.0, 0.5], theme: 'cyber', decorative: true },
      { id: 'm6-pyl1r', position: [4.3, 0.9, -24.7], size: [0.5, 3.0, 0.5], theme: 'cyber', decorative: true },
      { id: 'm6-pyl2l', position: [-4.3, 0.9, -40.1], size: [0.5, 3.0, 0.5], theme: 'cyber', decorative: true },
      { id: 'm6-pyl2r', position: [4.3, 0.9, -40.1], size: [0.5, 3.0, 0.5], theme: 'cyber', decorative: true },
      { id: 'm6-pyl3l', position: [-4.7, 0.9, -68.9], size: [0.5, 3.0, 0.5], theme: 'cyber', decorative: true },
      { id: 'm6-pyl3r', position: [4.7, 0.9, -68.9], size: [0.5, 3.0, 0.5], theme: 'cyber', decorative: true },
      { id: 'm6-pyl4l', position: [-4.7, 0.9, -85.1], size: [0.5, 3.0, 0.5], theme: 'cyber', decorative: true },
      { id: 'm6-pyl4r', position: [4.7, 0.9, -85.1], size: [0.5, 3.0, 0.5], theme: 'cyber', decorative: true },
      { id: 'm6-pyl5l', position: [-5.0, 0.9, -114.6], size: [0.5, 3.0, 0.5], theme: 'cyber', decorative: true },
      { id: 'm6-pyl5r', position: [5.0, 0.9, -114.6], size: [0.5, 3.0, 0.5], theme: 'cyber', decorative: true },
    ],
    rotatingHazards: [
      {
        id: 'm6-rh1',
        position: [0, 0.7, -24.7],
        size: [6.2, 0.55, 0.55],
        angularVelocity: [0, 1.4, 0],
        type: 'hazard',
        color: '#f43f5e',
      },
      {
        id: 'm6-rh2',
        position: [0, 0.7, -40.1],
        size: [6.2, 0.55, 0.55],
        angularVelocity: [0, -1.7, 0],
        type: 'hazard',
        color: '#f43f5e',
      },
      {
        id: 'm6-rh3',
        position: [0, 0.7, -68.9],
        size: [7.0, 0.55, 0.55],
        angularVelocity: [0, 2.0, 0],
        type: 'hazard',
        color: '#f43f5e',
      },
      {
        id: 'm6-rh4',
        position: [0, 0.7, -85.1],
        size: [7.0, 0.55, 0.55],
        angularVelocity: [0, -2.3, 0],
        type: 'hazard',
        color: '#f43f5e',
      },
      {
        id: 'm6-rh5',
        position: [0, 0.7, -114.6],
        size: [7.6, 0.55, 0.55],
        angularVelocity: [0, 2.6, 0],
        type: 'hazard',
        color: '#f43f5e',
      },
    ],
    killZones: [
      { id: 'm6-lava', position: [0, -5, -66], size: [30, 2, 150], visual: 'lava' },
    ],
    gems: [
      { id: 'm6-g1', position: [1.8, 0.9, -24.7], timeBonusMs: 500 },
      { id: 'm6-g2', position: [2.4, 0.9, -45.5], timeBonusMs: 500 },
      { id: 'm6-g3', position: [1.8, 0.9, -68.9], timeBonusMs: 1000 },
      { id: 'm6-g4', position: [1.8, 0.9, -114.6], timeBonusMs: 1000 },
    ],
  },

  // ============================================================================
  // MAP 7: CASCADE COASTER (Difficulty 4)
  // ============================================================================
  {
    id: 7,
    layoutVersion: 2,
    name: 'Cascade Coaster',
    subtitle: 'Three ice drops, chicanes to scrub speed, and a ferry over the last gap',
    difficulty: 4,
    skyPreset: 'day',
    accentColor: '#38bdf8',
    spawnPosition: [0, 1.0, 0],
    killPlaneY: -30,
    // A 16 m descent in three ice ramps (20, 24, 26 m; steeper each time) with 1 m rails.
    // Between them, railed grip flats where chicane stubs make you scrub the speed you
    // just built (checkpoint on each). Each ramp's gem sits on the exit line that sets up
    // the next chicane, so you commit to a side on the way down. The last flat is a braking
    // straight to a 7 m gap crossed on a sideways ferry, then the gold finish.
    goalPosition: [0, -16.062, -140],
    medalTimesMs: {
      author: 9200,
      gold: 11500,
      silver: 17500,
      bronze: 30000,
    },
    checkpoints: [
      { id: 'm7-cp1', order: 1, position: [0, -3.673, -32.6], width: 6.2 },
      { id: 'm7-cp2', order: 2, position: [0, -9.378, -69.9], width: 6.2 },
      { id: 'm7-cp3', order: 3, position: [0, -16.062, -119], width: 6.2 },
    ],
    blocks: [
      { id: 'm7-b1', position: [0, 0, -5], size: [7, 0.6, 12], theme: 'cobalt', rails: 'both' },
      { id: 'm7-cap1l', position: [-3.0, 0.7, -10.85], size: [1.0, 0.8, 0.3], theme: 'warning' },
      { id: 'm7-cap1r', position: [3.0, 0.7, -10.85], size: [1.0, 0.8, 0.3], theme: 'warning' },
      // Ice ramp 1: 20 m at 0.2 rad (drop 3.973 m), 1 m rails
      { id: 'm7-r1', position: [0, -1.981, -20.741], size: [5, 0.6, 20], rotation: [-0.2, 0, 0], railHeight: 1, theme: 'ice', rails: 'both' },
      // Flat 1: speed control, a chicane, checkpoint
      { id: 'm7-f1', position: [0, -3.973, -37.601], size: [7, 0.6, 14], theme: 'cobalt', rails: 'both' },
      { id: 'm7-f1-sl', position: [-3.0, -3.273, -30.751], size: [1.0, 0.8, 0.3], theme: 'warning' },
      { id: 'm7-f1-sr', position: [3.0, -3.273, -30.751], size: [1.0, 0.8, 0.3], theme: 'warning' },
      { id: 'm7-f1-stl5', position: [-2.0, -3.273, -35.601], size: [3, 0.8, 0.4], theme: 'warning' },
      { id: 'm7-f1-str9', position: [2.0, -3.273, -40.101], size: [3, 0.8, 0.4], theme: 'warning' },
      { id: 'm7-f1-nl', position: [-3.0, -3.273, -44.451], size: [1.0, 0.8, 0.3], theme: 'warning' },
      { id: 'm7-f1-nr', position: [3.0, -3.273, -44.451], size: [1.0, 0.8, 0.3], theme: 'warning' },
      // Ice ramp 2: 24 m at 0.24 rad (drop 5.705 m), 1 m rails
      { id: 'm7-r2', position: [0, -6.817, -56.186], size: [5, 0.6, 24], rotation: [-0.24, 0, 0], railHeight: 1, theme: 'ice', rails: 'both' },
      // Flat 2: longer chicane, checkpoint
      { id: 'm7-f2', position: [0, -9.678, -75.913], size: [7, 0.6, 16], theme: 'cobalt', rails: 'both' },
      { id: 'm7-f2-sl', position: [-3.0, -8.978, -68.063], size: [1.0, 0.8, 0.3], theme: 'warning' },
      { id: 'm7-f2-sr', position: [3.0, -8.978, -68.063], size: [1.0, 0.8, 0.3], theme: 'warning' },
      { id: 'm7-f2-str5', position: [2.0, -8.978, -72.913], size: [3, 0.8, 0.4], theme: 'warning' },
      { id: 'm7-f2-stl9', position: [-2.0, -8.978, -77.413], size: [3, 0.8, 0.4], theme: 'warning' },
      { id: 'm7-f2-str13', position: [2.0, -8.978, -80.913], size: [3, 0.8, 0.4], theme: 'warning' },
      { id: 'm7-f2-nl', position: [-3.0, -8.978, -83.763], size: [1.0, 0.8, 0.3], theme: 'warning' },
      { id: 'm7-f2-nr', position: [3.0, -8.978, -83.763], size: [1.0, 0.8, 0.3], theme: 'warning' },
      // Ice ramp 3: 26 m at 0.26 rad (drop 6.684 m), 1 m rails
      { id: 'm7-r3', position: [0, -13.01, -96.399], size: [5, 0.6, 26], rotation: [-0.26, 0, 0], railHeight: 1, theme: 'ice', rails: 'both' },
      // Flat 3: braking straight before the ferry gap
      { id: 'm7-f3', position: [0, -16.362, -117.04], size: [7, 0.6, 16], theme: 'cobalt', rails: 'both' },
      { id: 'm7-f3-sl', position: [-3.0, -15.662, -109.19], size: [1.0, 0.8, 0.3], theme: 'warning' },
      { id: 'm7-f3-sr', position: [3.0, -15.662, -109.19], size: [1.0, 0.8, 0.3], theme: 'warning' },
      // Goal deck
      { id: 'm7-b9', position: [0, -16.362, -138.04], size: [8, 0.6, 12], theme: 'gold', rails: 'both' },
      { id: 'm7-b9-end', position: [0, -15.662, -143.89], size: [7.4, 0.8, 0.3], theme: 'warning' },
      // Set-dressing: ice pylons at each ramp lip (no collider)
      { id: 'm7-pyl1l', position: [-4.4, -2.873, -31.601], size: [0.6, 2.6, 0.6], theme: 'ice', decorative: true },
      { id: 'm7-pyl1r', position: [4.4, -2.873, -31.601], size: [0.6, 2.6, 0.6], theme: 'ice', decorative: true },
      { id: 'm7-pyl2l', position: [-4.4, -8.578, -68.913], size: [0.6, 2.6, 0.6], theme: 'ice', decorative: true },
      { id: 'm7-pyl2r', position: [4.4, -8.578, -68.913], size: [0.6, 2.6, 0.6], theme: 'ice', decorative: true },
      { id: 'm7-pyl3l', position: [-4.4, -15.262, -110.04], size: [0.6, 2.6, 0.6], theme: 'ice', decorative: true },
      { id: 'm7-pyl3r', position: [4.4, -15.262, -110.04], size: [0.6, 2.6, 0.6], theme: 'ice', decorative: true },
    ],
    movingPlatforms: [
      {
        // sideways ferry: x = -2.6 cos(t * 0.9); in line with the decks twice per cycle
        id: 'm7-mp1',
        start: [-2.6, -16.362, -128.54],
        end: [2.6, -16.362, -128.54],
        size: [5, 0.6, 6.6],
        speed: 0.9,
        theme: 'warning',
      },
    ],
    gems: [
      { id: 'm7-g1', position: [1.7, -2.65, -28.5], timeBonusMs: 1000 },
      { id: 'm7-g2', position: [-1.7, -8.26, -65.81], timeBonusMs: 1000 },
      { id: 'm7-g3', position: [-1.7, -14.9, -106.94], timeBonusMs: 1500 },
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

