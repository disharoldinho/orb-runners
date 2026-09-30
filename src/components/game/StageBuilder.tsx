import { useMemo } from 'react';
import { LevelData } from '../../types/level';
import { BoostPad } from '../obstacles/BoostPad';
import { Bumper } from '../obstacles/Bumper';
import { CheckpointGate } from '../obstacles/CheckpointGate';
import { CollectibleGem, GoalGate } from '../obstacles/GoalGate';
import { KillZone, WindZone } from '../obstacles/HazardZones';
import { JumpPad } from '../obstacles/JumpPad';
import { MovingPlatform } from '../obstacles/MovingPlatform';
import { RotatingHazard } from '../obstacles/RotatingHazard';
import { StaticBlock } from '../obstacles/StaticBlock';
import { ToggleSwitch } from '../obstacles/ToggleSwitch';
import { getBlockLayers, isHiddenBlock } from '../../levels/visualLayers';


/**
 * The Summit's old boxy decorative mountain core is replaced by the procedural terrain
 * (environment/SummitWorld). Decorative only: these blocks never had colliders.
 */
const isReplacedByTerrain = isHiddenBlock;

interface StageBuilderProps {
  level: LevelData;
}

export function StageBuilder({ level }: StageBuilderProps) {
  // depth-bias layers for blocks that genuinely share a surface (levels/visualLayers)
  const layers = useMemo(() => getBlockLayers(level), [level]);
  return (
    <group>
      {/* Static Blocks, Ramps, & Rails */}
      {level.blocks.filter((block) => !isReplacedByTerrain(block.id)).map((block) => (
        <StaticBlock key={block.id} {...block} layer={layers.get(block.id) ?? 0} />
      ))}

      {/* Kinematic Moving Platforms */}
      {level.movingPlatforms?.map((plat) => (
        <MovingPlatform key={plat.id} {...plat} />
      ))}

      {/* Kinematic Rotating Hazards, Bridges & Windmills */}
      {level.rotatingHazards?.map((haz) => (
        <RotatingHazard key={haz.id} {...haz} />
      ))}

      {/* Pinball Bumpers */}
      {level.bumpers?.map((bumper) => (
        <Bumper key={bumper.id} {...bumper} />
      ))}

      {/* Trackmania Turbo Boost Pads */}
      {level.boostPads?.map((bp) => (
        <BoostPad key={bp.id} {...bp} />
      ))}

      {/* Pneumatic Spring Jump Pads */}
      {level.jumpPads?.map((jp) => (
        <JumpPad key={jp.id} {...jp} />
      ))}

      {/* Pressure Plate Switches & Deployable Shortcut Bridges */}
      {level.switchBridges?.map((sw) => (
        <ToggleSwitch key={sw.id} {...sw} />
      ))}

      {/* Trackmania Sector Checkpoints */}
      {level.checkpoints?.map((cp) => (
        <CheckpointGate key={cp.id} {...cp} />
      ))}

      {/* Time-Bonus Collectible Gems */}
      {level.gems?.map((gem) => (
        <CollectibleGem key={gem.id} {...gem} />
      ))}

      {/* Kill volumes (lava, chasms, shortcut catchers) */}
      {level.killZones?.map((kz) => (
        <KillZone key={kz.id} {...kz} />
      ))}

      {/* Wind / gust zones */}
      {level.windZones?.map((wz) => (
        <WindZone key={wz.id} {...wz} />
      ))}

      {/* Ceremonial Goal Gate */}
      <GoalGate
        position={level.goalPosition}
        rotation={level.goalRotation}
        movingRange={level.goalMovingRange}
        movingSpeed={level.goalMovingSpeed}
      />
    </group>
  );
}
