import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { GraphicsQuality } from '../../graphics/quality';
import { buildCampaignScenery, CAMPAIGN_STYLES } from '../../graphics/campaignScenery';
import { LevelData, SkyPreset } from '../../types/level';
import { CloudPuffs } from './CloudPuffs';
import { InstancedDecor } from './InstancedDecor';

/**
 * Floating sky islands around a campaign course: jagged rock undersides with grassy
 * (or snowy / crystal) tops and instanced flora. Placed clear of the track; one merged
 * mesh for all islands plus instanced props. Purely visual.
 */
export function CampaignWorld({
  level,
  preset,
  quality,
  cloudColor,
  cloudShade,
}: {
  level: LevelData;
  preset: SkyPreset;
  quality: GraphicsQuality;
  cloudColor: string;
  cloudShade: string;
}) {
  const style = CAMPAIGN_STYLES[preset] ?? CAMPAIGN_STYLES.day;
  const { geo, decor, puffs } = useMemo(
    () => buildCampaignScenery(level, style, quality),
    [level, style, quality],
  );

  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }),
    [],
  );
  useEffect(() => () => geo.dispose(), [geo]);

  return (
    <group>
      <mesh geometry={geo} material={mat} />
      <InstancedDecor
        items={decor}
        nearDist={quality === 'low' ? 60 : 110}
        farDist={400}
        chunk={200}
      />
      <CloudPuffs puffs={puffs} color={cloudColor} shade={cloudShade} opacity={0.85} />
    </group>
  );
}
