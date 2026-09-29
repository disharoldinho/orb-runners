import {
  BlockDef,
  BlockTheme,
  BoostPadDef,
  BumperDef,
  CheckpointDef,
  GemDef,
  JumpPadDef,
  LevelData,
  MovingPlatformDef,
  RotatingHazardDef,
  SwitchBridgeDef,
  Vec3,
} from '../types/level';

export const SUMMIT_LEVEL_ID = 999;

export interface SummitPhaseInfo {
  id: number;
  name: string;
  subtitle: string;
  minAltitudeM: number;
  maxAltitudeM: number;
  skyPreset: LevelData['skyPreset'];
  accentColor: string;
  theme: BlockTheme;
}

export const SUMMIT_PHASES: SummitPhaseInfo[] = [
  {
    id: 1,
    name: 'PHASE I • EMERALD FOOTHILLS',
    subtitle: 'Lush garden boulevards, gentle uphill slopes & viaduct vaults',
    minAltitudeM: 0,
    maxAltitudeM: 50,
    skyPreset: 'day',
    accentColor: '#10b981',
    theme: 'meadow',
  },
  {
    id: 2,
    name: 'PHASE II • COBALT SKYWORKS',
    subtitle: 'Hydro-turbine highways, oscillating sky-ferries & twin windmills',
    minAltitudeM: 50,
    maxAltitudeM: 100,
    skyPreset: 'sunset',
    accentColor: '#38bdf8',
    theme: 'cobalt',
  },
  {
    id: 3,
    name: 'PHASE III • SUNSET PINBALL CANYON',
    subtitle: 'Crimson canyon switchbacks, pinball bumper bowls & switch bridges',
    minAltitudeM: 100,
    maxAltitudeM: 150,
    skyPreset: 'neon',
    accentColor: '#f97316',
    theme: 'sunset',
  },
  {
    id: 4,
    name: 'PHASE IV • CYBER GLACIER SPIRE',
    subtitle: 'Crystalline frost highways, neon catwalks & laser pendulums',
    minAltitudeM: 150,
    maxAltitudeM: 200,
    skyPreset: 'aurora',
    accentColor: '#00f5d4',
    theme: 'ice',
  },
  {
    id: 5,
    name: 'PHASE V • CELESTIAL GOLDEN CROWN',
    subtitle: 'Royal obsidian-and-gold sanctums ascending to the 250m Summit!',
    minAltitudeM: 200,
    maxAltitudeM: 250,
    skyPreset: 'citadel',
    accentColor: '#fbbf24',
    theme: 'gold',
  },
];

export function getSummitPhaseForAltitude(altM: number): SummitPhaseInfo {
  for (let i = SUMMIT_PHASES.length - 1; i >= 0; i--) {
    if (altM >= SUMMIT_PHASES[i].minAltitudeM) {
      return SUMMIT_PHASES[i];
    }
  }
  return SUMMIT_PHASES[0];
}

/**
 * Helper that builds a 100% flush, lip-free uphill ramp along -Z
 * connecting (x, yStart, zStart) to (x, yEnd, zEnd).
 * With dz = 50m and dy = 10m, pitch = 11.3° < 17.5° MAX_TILT_RAD,
 * so the player can roll uphill purely by tilting forward (W) even from a standstill!
 */
function createUphillRamp(
  id: string,
  x: number,
  yStart: number,
  zStart: number,
  yEnd: number,
  zEnd: number,
  width: number,
  theme: BlockTheme,
  rails: BlockDef['rails'] = 'both'
): { block: BlockDef; pitch: number; midY: number; midZ: number } {
  const dz = Math.abs(zEnd - zStart);
  const dy = yEnd - yStart;
  const slopeLen = Math.hypot(dz, dy) + 0.4;
  const pitch = Math.atan2(dy, dz); // positive rx tilts -Z upward
  const midY = Number(((yStart + yEnd) * 0.5 - 0.03).toFixed(2));
  const midZ = Number(((zStart + zEnd) * 0.5).toFixed(2));

  return {
    block: {
      id,
      position: [x, midY, midZ],
      size: [width, 0.8, Number(slopeLen.toFixed(2))],
      rotation: [Number(pitch.toFixed(4)), 0, 0],
      theme,
      rails,
    },
    pitch,
    midY,
    midZ,
  };
}

function buildSummitLevel(): {
  level: LevelData;
  waypoints: Vec3[];
} {
  const blocks: BlockDef[] = [];
  const boostPads: BoostPadDef[] = [];
  const jumpPads: JumpPadDef[] = [];
  const bumpers: BumperDef[] = [];
  const rotatingHazards: RotatingHazardDef[] = [];
  const movingPlatforms: MovingPlatformDef[] = [];
  const switchBridges: SwitchBridgeDef[] = [];
  const checkpoints: CheckpointDef[] = [];
  const gems: GemDef[] = [];
  const waypoints: Vec3[] = [[0, 1.0, 0]];

  // Starting Base Camp Plaza at [0, 0, 0] -> z = +4 to z = -14 (North edge at z = -14)
  blocks.push({
    id: 'sum-base-plaza',
    position: [0, 0, -5],
    size: [14, 0.8, 18],
    theme: 'meadow',
    rails: 'both',
  });
  // Starter Boost Pad right on Base Camp Plaza so the player immediately launches into Stage 1!
  boostPads.push({
    id: 'sum-base-starter-bp',
    position: [0, 0.42, -9.5],
    size: [3.8, 5.0],
    force: 20,
    color: '#10b981',
  });
  // Decorative Base Camp Twin Pillars
  blocks.push(
    { id: 'sum-base-pil-l', position: [-8.0, 2.5, -12], size: [1.4, 5.4, 1.4], theme: 'gold' },
    { id: 'sum-base-pil-r', position: [8.0, 2.5, -12], size: [1.4, 5.4, 1.4], theme: 'gold' }
  );

  let curX = 0;
  let curY = 0;
  let curZ = -14; // North edge of current terrace

  // Gentle lateral S-curve targets per stage so the 2km mountain highway winds organically
  const stageTargetX: number[] = [
    0,
    0, 0, 0, 0, 12, // Phase I (Stages 1-5)
    12, 12, 12, 0, 0, // Phase II (Stages 6-10)
    0, 0, -12, -12, -12, // Phase III (Stages 11-15)
    -12, -12, 0, 0, 0, // Phase IV (Stages 16-20)
    0, 0, 0, 0, 0, // Phase V (Stages 21-25)
  ];

  // +10.0m altitude gain per stage * 25 stages = +250.0m Golden Summit!
  const RISE_PER_STAGE = 10.0;
  const RAMP_SPAN_Z = 50.0; // atan2(10, 50) = 11.3° slope (easily rollable with 17.5° board tilt!)

  for (let stage = 1; stage <= 25; stage++) {
    const phaseIdx = Math.min(4, Math.floor((stage - 1) / 5));
    const phase = SUMMIT_PHASES[phaseIdx];
    const theme = phase.theme;
    const accent = phase.accentColor;

    const nextY = Number((curY + RISE_PER_STAGE).toFixed(2));
    const targetX = stageTargetX[stage];
    const rampEndZ = curZ - RAMP_SPAN_Z;

    // -------------------------------------------------------------------------
    // STEP A: Seamless Uphill Ascent Segment (curY -> nextY)
    // -------------------------------------------------------------------------
    if (stage === 2 || stage === 16) {
      // Split Twin-Lane Uphill Climb (Left & Right parallel 4.6m-wide uphill ramps)
      const leftRamp = createUphillRamp(
        `sum-s${stage}-ramp-l`,
        curX - 3.0,
        curY,
        curZ,
        nextY,
        rampEndZ,
        4.6,
        theme,
        'left'
      );
      const rightRamp = createUphillRamp(
        `sum-s${stage}-ramp-r`,
        curX + 3.0,
        curY,
        curZ,
        nextY,
        rampEndZ,
        4.6,
        theme,
        'right'
      );
      blocks.push(leftRamp.block, rightRamp.block);

      for (const sideX of [curX - 3.0, curX + 3.0]) {
        for (const frac of [0.2, 0.52, 0.82]) {
          boostPads.push({
            id: `sum-s${stage}-bp-${sideX}-${frac}`,
            position: [
              sideX,
              Number((curY + RISE_PER_STAGE * frac + 0.42).toFixed(2)),
              Number((curZ - RAMP_SPAN_Z * frac).toFixed(2)),
            ],
            rotation: [leftRamp.pitch, 0, 0],
            size: [2.6, 4.8],
            force: 22,
            color: accent,
          });
        }
      }
      waypoints.push([curX, leftRamp.midY + 1.0, leftRamp.midZ]);
    } else if (stage === 3 || stage === 14 || stage === 24) {
      // Guided Ballistic Spring Vault IN CENTER + Full Connected Railed Ramp on the Right!
      // Widen the south departure terrace & north arrival terrace so both paths connect 100% flush.
      blocks.push({
        id: `sum-s${stage}-wide-depart`,
        position: [curX + 2.8, curY, curZ + 3.0],
        size: [18.0, 0.8, 8.0],
        theme,
        rails: 'none',
      });

      const midTerraceY = Number(((curY + nextY) * 0.5).toFixed(2));
      const midTerraceZ = curZ - RAMP_SPAN_Z * 0.5;

      // Center Mid-Air Island Terrace (10m x 14m)
      blocks.push({
        id: `sum-s${stage}-vault-mid`,
        position: [curX, midTerraceY, midTerraceZ],
        size: [10.0, 0.8, 14.0],
        theme: 'warning',
        rails: 'both',
      });

      // Jump Pad #1 on departure edge -> lands squarely on south half of mid-island
      jumpPads.push({
        id: `sum-s${stage}-jp1`,
        position: [curX, curY + 0.45, curZ - 1.2],
        targetPosition: [curX, midTerraceY + 0.4, midTerraceZ + 2.5],
        arcHeight: 4.2,
        radius: 1.6,
        color: accent,
      });

      // Jump Pad #2 on north half of mid-island -> lands squarely on upper stage entry plaza
      jumpPads.push({
        id: `sum-s${stage}-jp2`,
        position: [curX, midTerraceY + 0.45, midTerraceZ - 4.2],
        targetPosition: [curX, nextY + 0.4, rampEndZ - 4.5],
        arcHeight: 4.2,
        radius: 1.6,
        color: accent,
      });

      // Right-hand continuous railed uphill ramp (curX + 6.0)
      const sideRamp = createUphillRamp(
        `sum-s${stage}-bypass-ramp`,
        curX + 6.0,
        curY,
        curZ,
        nextY,
        rampEndZ,
        5.0,
        theme,
        'both'
      );
      blocks.push(sideRamp.block);
      for (const frac of [0.2, 0.52, 0.82]) {
        boostPads.push({
          id: `sum-s${stage}-side-bp-${frac}`,
          position: [
            curX + 6.0,
            Number((curY + RISE_PER_STAGE * frac + 0.42).toFixed(2)),
            Number((curZ - RAMP_SPAN_Z * frac).toFixed(2)),
          ],
          rotation: [sideRamp.pitch, 0, 0],
          size: [2.8, 4.8],
          force: 22,
          color: accent,
        });
      }

      waypoints.push([curX, midTerraceY + 1.2, midTerraceZ]);
    } else {
      // Standard Wide Connected Uphill Highway Ramp (9.2m wide) with 3 Turbo Boost Strips
      const mainRamp = createUphillRamp(
        `sum-s${stage}-ramp`,
        curX,
        curY,
        curZ,
        nextY,
        rampEndZ,
        9.2,
        stage % 4 === 0 ? 'warning' : theme,
        'both'
      );
      blocks.push(mainRamp.block);

      for (const frac of [0.18, 0.5, 0.82]) {
        boostPads.push({
          id: `sum-s${stage}-bp-${frac}`,
          position: [
            curX,
            Number((curY + RISE_PER_STAGE * frac + 0.42).toFixed(2)),
            Number((curZ - RAMP_SPAN_Z * frac).toFixed(2)),
          ],
          rotation: [mainRamp.pitch, 0, 0],
          size: [3.8, 5.2],
          force: 22,
          color: accent,
        });
      }

      // Mid-ramp slalom bumpers on select stages
      if (stage === 6 || stage === 11 || stage === 19) {
        bumpers.push(
          {
            id: `sum-s${stage}-rbmp-l`,
            position: [curX - 2.4, mainRamp.midY + 0.9, mainRamp.midZ],
            radius: 0.75,
          },
          {
            id: `sum-s${stage}-rbmp-r`,
            position: [curX + 2.4, mainRamp.midY + 0.9, mainRamp.midZ],
            radius: 0.75,
          }
        );
      }

      waypoints.push([curX, mainRamp.midY + 1.0, mainRamp.midZ]);
    }

    // -------------------------------------------------------------------------
    // STEP B: Stage Feature Deck at Altitude `nextY`
    // -------------------------------------------------------------------------
    let deckZ = rampEndZ;
    const isVaultStage = stage === 3 || stage === 14 || stage === 24;

    // Entry terrace at top of the uphill ramp (14m long: deckZ to deckZ - 14)
    blocks.push({
      id: `sum-s${stage}-entry`,
      position: [isVaultStage ? curX + 2.5 : curX, nextY, deckZ - 7.0],
      size: [isVaultStage ? 18.0 : 12.0, 0.8, 14.5],
      theme,
      rails: 'none',
    });
    waypoints.push([curX, nextY + 1.0, deckZ - 7.0]);
    deckZ -= 14.0;

    // Collectible Gem on entry terrace
    gems.push({
      id: `sum-s${stage}-gem`,
      position: [curX, nextY + 1.2, deckZ + 7.0],
      timeBonusMs: 2000,
    });

    // Stage-Specific Feature Challenge on the flat plateau
    if (stage === 4 || stage === 8 || stage === 22) {
      // Spinning Cross-Bridge + Always-Open Left Side Bypass + Lower Safety Catch-Basin!
      const bridgeSpan = 14.0;
      const bridgeCenterZ = deckZ - bridgeSpan * 0.5;

      rotatingHazards.push({
        id: `sum-s${stage}-cb`,
        position: [curX, nextY, bridgeCenterZ],
        size: [4.0, 0.7, bridgeSpan + 1.2],
        angularVelocity: [0, stage === 8 ? -0.72 : 0.68, 0],
        type: 'cross-bridge',
        color: accent,
      });

      // Always-open Left Side Bypass Bridge so climbers never get stuck waiting
      blocks.push({
        id: `sum-s${stage}-cb-bypass`,
        position: [curX - 4.5, nextY, bridgeCenterZ],
        size: [3.4, 0.75, bridgeSpan + 1.2],
        theme,
        rails: 'left',
      });

      // Lower Safety Catch-Basin 2.2m underneath with a ballistic Jump Pad back onto the main deck
      blocks.push({
        id: `sum-s${stage}-safety-net`,
        position: [curX, nextY - 2.2, bridgeCenterZ],
        size: [15.0, 0.7, bridgeSpan + 4.0],
        theme: 'warning',
        rails: 'both',
      });
      jumpPads.push({
        id: `sum-s${stage}-safety-jp`,
        position: [curX, nextY - 1.75, bridgeCenterZ - 3.5],
        targetPosition: [curX, nextY + 0.4, deckZ - bridgeSpan - 4.5],
        arcHeight: 3.4,
        radius: 1.6,
        color: '#10b981',
      });

      waypoints.push([curX, nextY + 1.0, bridgeCenterZ]);
      deckZ -= bridgeSpan;
    } else if (stage === 7 || stage === 21) {
      // Wide Oscillating Sky-Ferry + Parallel Fixed Speedrunner Bridge
      const ferrySpan = 11.0;
      const ferryCenterZ = deckZ - ferrySpan * 0.5;

      movingPlatforms.push({
        id: `sum-s${stage}-ferry`,
        start: [curX - 3.0, nextY, ferryCenterZ],
        end: [curX + 3.0, nextY, ferryCenterZ],
        size: [5.6, 0.75, ferrySpan - 0.4],
        speed: 1.65,
        theme: 'warning',
      });

      blocks.push({
        id: `sum-s${stage}-skillbeam`,
        position: [curX - 4.6, nextY, ferryCenterZ],
        size: [2.4, 0.75, ferrySpan + 0.8],
        theme: 'gold',
        rails: 'left',
      });

      waypoints.push([curX, nextY + 1.0, ferryCenterZ]);
      deckZ -= ferrySpan;
    } else if (stage === 12 || stage === 18) {
      // Switchbridge Ravine: Center Switch-Activated Turbo Bridge + Right Railed Detour
      const ravineSpan = 16.0;
      const ravineCenterZ = deckZ - ravineSpan * 0.5;

      switchBridges.push({
        id: `sum-s${stage}-sw`,
        switchPosition: [curX - 3.2, nextY + 0.38, deckZ + 4.0],
        bridgePosition: [curX, nextY, ravineCenterZ],
        bridgeSize: [4.8, 0.75, ravineSpan + 1.0],
        color: accent,
      });

      blocks.push({
        id: `sum-s${stage}-bypass`,
        position: [curX + 4.4, nextY, ravineCenterZ],
        size: [3.8, 0.75, ravineSpan + 1.2],
        theme,
        rails: 'right',
      });

      waypoints.push([curX, nextY + 1.0, ravineCenterZ]);
      deckZ -= ravineSpan;
    } else if (stage === 13 || stage === 17) {
      // Pinball Bumper Bowl (Stage 13) or Sweeping Laser Pendulum Boulevard (Stage 17)
      const arenaLen = 18.0;
      const arenaCenterZ = deckZ - arenaLen * 0.5;

      blocks.push({
        id: `sum-s${stage}-arena`,
        position: [curX, nextY, arenaCenterZ],
        size: [12.5, 0.8, arenaLen + 0.8],
        theme: stage === 17 ? 'cyber' : 'citadel',
        rails: 'both',
      });

      if (stage === 13) {
        bumpers.push(
          { id: 'sum-s13-b1', position: [curX, nextY + 0.85, arenaCenterZ + 4.5], radius: 0.95 },
          { id: 'sum-s13-b2', position: [curX - 3.0, nextY + 0.85, arenaCenterZ], radius: 0.85 },
          { id: 'sum-s13-b3', position: [curX + 3.0, nextY + 0.85, arenaCenterZ], radius: 0.85 },
          { id: 'sum-s13-b4', position: [curX, nextY + 0.85, arenaCenterZ - 4.5], radius: 0.95 }
        );
      } else {
        rotatingHazards.push(
          {
            id: 'sum-s17-rh1',
            position: [curX, nextY + 0.8, arenaCenterZ + 4.0],
            size: [7.0, 0.55, 0.55],
            angularVelocity: [0, 2.0, 0],
            type: 'hazard',
            color: '#f72585',
          },
          {
            id: 'sum-s17-rh2',
            position: [curX, nextY + 0.8, arenaCenterZ - 4.0],
            size: [7.0, 0.55, 0.55],
            angularVelocity: [0, -2.2, 0],
            type: 'hazard',
            color: '#00f5d4',
          }
        );
      }

      waypoints.push([curX, nextY + 1.0, arenaCenterZ]);
      deckZ -= arenaLen;
    }

    // -------------------------------------------------------------------------
    // STEP C: Stage Exit / S-Curve Boulevard & Biome Base Camp Checkpoints
    // -------------------------------------------------------------------------
    const isBiomeCamp = stage % 5 === 0 && stage < 25;
    const isPreSummitCamp = stage === 23;
    const isFinalSummit = stage === 25;

    const minX = Math.min(curX, targetX);
    const maxX = Math.max(curX, targetX);
    const shiftSpanX = Math.abs(targetX - curX);
    const plazaLen = isFinalSummit ? 24.0 : isBiomeCamp || isPreSummitCamp ? 16.0 : 12.0;
    const plazaCenterZ = deckZ - plazaLen * 0.5;

    if (shiftSpanX > 0.1) {
      const midShiftX = (minX + maxX) * 0.5;
      blocks.push({
        id: `sum-s${stage}-scurve`,
        position: [midShiftX, nextY, plazaCenterZ],
        size: [shiftSpanX + 12.5, 0.8, plazaLen + 1.2],
        theme: isBiomeCamp ? 'gold' : theme,
        rails: 'both',
      });
    } else {
      blocks.push({
        id: `sum-s${stage}-plaza`,
        position: [targetX, nextY, plazaCenterZ],
        size: [isFinalSummit ? 18.0 : 12.0, 0.8, plazaLen + 1.0],
        theme: isFinalSummit || isBiomeCamp || isPreSummitCamp ? 'gold' : theme,
        rails: 'both',
      });
    }

    if (isBiomeCamp || isPreSummitCamp || isFinalSummit) {
      blocks.push(
        {
          id: `sum-s${stage}-arch-l`,
          position: [targetX - 6.8, nextY + 2.6, plazaCenterZ],
          size: [1.4, 5.6, 1.4],
          theme: 'gold',
        },
        {
          id: `sum-s${stage}-arch-r`,
          position: [targetX + 6.8, nextY + 2.6, plazaCenterZ],
          size: [1.4, 5.6, 1.4],
          theme: 'gold',
        }
      );
    }

    if (isBiomeCamp) {
      const campOrder = stage / 5;
      const nextPhase = SUMMIT_PHASES[Math.min(4, campOrder)];
      checkpoints.push({
        id: `sum-cp-${campOrder}`,
        order: campOrder,
        position: [targetX, nextY + 0.4, plazaCenterZ],
        label: `CAMP ${campOrder} (${Math.round(nextY)}M) • ${nextPhase.name.split('•')[1]?.trim() || ''}`,
      });
    } else if (isPreSummitCamp) {
      checkpoints.push({
        id: 'sum-cp-5',
        order: 5,
        position: [targetX, nextY + 0.4, plazaCenterZ],
        label: `CAMP 5 (${Math.round(nextY)}M) • FINAL CROWN`,
      });
    }

    waypoints.push([targetX, nextY + 1.0, plazaCenterZ]);

    curX = targetX;
    curY = nextY;
    curZ = deckZ - plazaLen;
  }

  const level: LevelData = {
    id: SUMMIT_LEVEL_ID,
    name: 'Reach the Summit',
    subtitle: '5-Phase, 25-Stage Continuous Mountain Odyssey (0m → 250m)',
    difficulty: 5,
    skyPreset: 'day',
    accentColor: '#fbbf24',
    spawnPosition: [0, 1.0, 0],
    killPlaneY: -28,
    goalPosition: [curX, curY + 0.4, curZ + 7.5],
    isSummitMode: true,
    summitTargetAltitudeM: 250,
    medalTimesMs: {
      author: 120000,
      gold: 165000,
      silver: 250000,
      bronze: 420000,
    },
    checkpoints,
    blocks,
    boostPads,
    jumpPads,
    bumpers,
    rotatingHazards,
    movingPlatforms,
    switchBridges,
    gems,
  };

  return { level, waypoints };
}

const BuiltSummit = buildSummitLevel();
export const SUMMIT_MAP: LevelData = BuiltSummit.level;
export const SUMMIT_BOT_WAYPOINTS: Vec3[] = BuiltSummit.waypoints;
