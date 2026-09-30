import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GraphicsQuality } from '../../graphics/quality';
import { buildTerrainGeometry, getSummitTerrain, SummitTerrain } from '../../graphics/summitTerrain';
import {
  cloudBelt,
  DECOR_DENSITY,
  DECOR_FAR,
  DECOR_NEAR,
  PUFFS,
  scatterDecor,
  TERRAIN_CELL,
} from '../../graphics/summitScenery';
import { makeTerrainMaterial } from '../../graphics/terrainMaterial';
import { SUMMIT_BOT_WAYPOINTS, SUMMIT_MAP } from '../../levels/summitMap';
import { livePhysics } from '../../store/useGameStore';
import { CloudPuffs } from './CloudPuffs';
import { InstancedDecor } from './InstancedDecor';


export function getSummitTerrainFor(quality: GraphicsQuality): SummitTerrain {
  return getSummitTerrain(SUMMIT_MAP, SUMMIT_BOT_WAYPOINTS, TERRAIN_CELL[quality]);
}

/**
 * The Summit's world: a procedural mountain carved around the spiral road, instanced
 * scenery by altitude band, and cumulus belts. All visual, no colliders.
 */
export function SummitWorld({
  quality,
  cloudColor,
  cloudShade,
}: {
  quality: GraphicsQuality;
  cloudColor: string;
  cloudShade: string;
}) {
  const terrain = useMemo(() => getSummitTerrainFor(quality), [quality]);
  const geo = useMemo(() => buildTerrainGeometry(terrain), [terrain]);
  const mat = useMemo(
    () => makeTerrainMaterial(quality, terrain.center, terrain.halfExtent),
    [quality, terrain],
  );
  const decor = useMemo(() => scatterDecor(terrain, DECOR_DENSITY[quality]), [terrain, quality]);
  const puffs = useMemo(() => cloudBelt(terrain, PUFFS[quality], SUMMIT_BOT_WAYPOINTS), [terrain, quality]);
  useEffect(() => () => geo.dispose(), [geo]);
  useEffect(() => () => mat.dispose(), [mat]);

  return (
    <group>
      <mesh geometry={geo} material={mat} receiveShadow={quality !== 'low'} />
      <InstancedDecor
        items={decor}
        nearDist={DECOR_NEAR[quality]}
        farDist={DECOR_FAR[quality]}
        castShadow={quality === 'high'}
      />
      <CloudPuffs puffs={puffs} color={cloudColor} shade={cloudShade} opacity={0.88} />
    </group>
  );
}

/**
 * Keeps the chase camera above the (collider-less) mountain surface. Must be mounted
 * after MonkeyCamera so it runs after the camera has been placed for the frame.
 */
export function TerrainCameraGuard({ quality }: { quality: GraphicsQuality }) {
  const terrain = useMemo(() => getSummitTerrainFor(quality), [quality]);
  const ball = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera }) => {
    const h = terrain.sample(camera.position.x, camera.position.z) + 1.6;
    if (camera.position.y < h) {
      camera.position.y = h;
      const [bx, by, bz] = livePhysics.ballPosition;
      camera.lookAt(ball.set(bx, by + 0.6, bz));
    }
  });
  return null;
}
