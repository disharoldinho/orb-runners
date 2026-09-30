import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  DecorInstance,
  getDecorGeometry,
  getDecorMaterial,
} from '../../graphics/decorGeometry';

export type { DecorInstance };

interface Batch {
  hi: THREE.InstancedMesh;
  lo: THREE.InstancedMesh | null;
  center: THREE.Vector3;
  radius: number;
}

/**
 * Chunked, instanced, two-level-LOD scenery. Instances are bucketed into square chunks;
 * each chunk/kind is one InstancedMesh (plus a low-poly twin). Per frame, chunks switch
 * between high detail, low detail and hidden by camera distance. No colliders.
 */
export function InstancedDecor({
  items,
  chunk = 160,
  nearDist,
  farDist,
  castShadow = false,
}: {
  items: DecorInstance[];
  chunk?: number;
  nearDist: number;
  farDist: number;
  castShadow?: boolean;
}) {
  const batches = useMemo(() => {
    const groups = new Map<string, DecorInstance[]>();
    for (const it of items) {
      const k = `${Math.floor(it.x / chunk)},${Math.floor(it.z / chunk)},${it.kind}`;
      const arr = groups.get(k);
      if (arr) arr.push(it);
      else groups.set(k, [it]);
    }
    const out: Batch[] = [];
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const p = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    const col = new THREE.Color();
    groups.forEach((list) => {
      const kind = list[0].kind;
      const mat = getDecorMaterial(kind);
      const mk = (lod: 0 | 1) => {
        const mesh = new THREE.InstancedMesh(getDecorGeometry(kind, lod), mat, list.length);
        list.forEach((it, i) => {
          q.setFromAxisAngle(up, it.rotY);
          s.setScalar(it.scale);
          p.set(it.x, it.y, it.z);
          m.compose(p, q, s);
          mesh.setMatrixAt(i, m);
          col.setScalar(it.tint);
          mesh.setColorAt(i, col);
        });
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        mesh.computeBoundingSphere();
        mesh.castShadow = castShadow && lod === 0;
        mesh.receiveShadow = lod === 0;
        mesh.matrixAutoUpdate = false;
        return mesh;
      };
      const hi = mk(0);
      const lo = kind === 'tuft' ? null : mk(1);
      const bs = hi.boundingSphere!;
      out.push({ hi, lo, center: bs.center.clone(), radius: bs.radius });
    });
    return out;
  }, [items, chunk, castShadow]);

  useEffect(
    () => () => {
      for (const b of batches) {
        b.hi.dispose();
        b.lo?.dispose();
      }
    },
    [batches],
  );

  useFrame(({ camera }) => {
    for (const b of batches) {
      const d = Math.max(0, camera.position.distanceTo(b.center) - b.radius);
      const near = d < nearDist;
      b.hi.visible = near;
      if (b.lo) b.lo.visible = !near && d < farDist;
    }
  });

  return (
    <group>
      {batches.map((b, i) => (
        <group key={i}>
          <primitive object={b.hi} />
          {b.lo && <primitive object={b.lo} />}
        </group>
      ))}
    </group>
  );
}
