import { LevelData } from '../../types/level';
import { BoostPad } from '../obstacles/BoostPad';
import { Bumper } from '../obstacles/Bumper';
import { CheckpointGate } from '../obstacles/CheckpointGate';
import { CollectibleGem, GoalGate } from '../obstacles/GoalGate';
import { JumpPad } from '../obstacles/JumpPad';
import { MovingPlatform } from '../obstacles/MovingPlatform';
import { RotatingHazard } from '../obstacles/RotatingHazard';
import { StaticBlock } from '../obstacles/StaticBlock';
import { ToggleSwitch } from '../obstacles/ToggleSwitch';

interface StageBuilderProps {
  level: LevelData;
}

export function StageBuilder({ level }: StageBuilderProps) {
  return (
    <group>
      {/* Static Blocks, Ramps, & Rails */}
      {level.blocks.map((block) => (
        <StaticBlock key={block.id} {...block} />
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
