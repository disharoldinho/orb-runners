import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Low-poly stylised scenery props built from primitives, merged into one geometry per
 * prop (vertex-coloured) with a high and a low level of detail. Instanced by the
 * environment components; nothing here ever gets a collider.
 */
export type DecorKind =
  | 'pine'
  | 'snowpine'
  | 'birch'
  | 'rock'
  | 'crystal'
  | 'cactus'
  | 'ice'
  | 'basalt'
  | 'deadtree'
  | 'tuft';

export interface DecorInstance {
  kind: DecorKind;
  x: number;
  y: number;
  z: number;
  rotY: number;
  scale: number;
  /** Colour tint multiplier (0.8..1.2 around white). */
  tint: number;
}

/**
 * Horizontal footprint radius (m, at scale 1) of each prop's high-detail mesh. Used to keep
 * props from growing into each other; scripts/checkMapVisuals.mjs verifies it against the
 * real geometry.
 */
export const DECOR_RADIUS: Record<DecorKind, number> = {
  pine: 1.7,
  snowpine: 1.7,
  birch: 1.85,
  rock: 1.62,
  crystal: 1.37,
  cactus: 1.26,
  ice: 1.38,
  basalt: 1.44,
  deadtree: 1.33,
  tuft: 0.31,
};

/**
 * Minimum-spacing helper: props (except ground-cover tufts) must keep their trunks at least
 * `k` x (sum of footprint radii) apart, so canopies and rocks never grow through each other.
 */
export function makeSpacing(k = 0.5, cell = 6) {
  const grid = new Map<string, { x: number; z: number; r: number }[]>();
  const key = (x: number, z: number) => `${Math.floor(x / cell)},${Math.floor(z / cell)}`;
  return {
    fits(kind: DecorKind, x: number, z: number, scale: number) {
      if (kind === 'tuft') return true;
      const r = DECOR_RADIUS[kind] * scale;
      const gx = Math.floor(x / cell);
      const gz = Math.floor(z / cell);
      for (let i = gx - 1; i <= gx + 1; i++)
        for (let j = gz - 1; j <= gz + 1; j++)
          for (const o of grid.get(`${i},${j}`) ?? [])
            if (Math.hypot(o.x - x, o.z - z) < k * (o.r + r)) return false;
      return true;
    },
    add(kind: DecorKind, x: number, z: number, scale: number) {
      if (kind === 'tuft') return;
      const k2 = key(x, z);
      const arr = grid.get(k2) ?? [];
      arr.push({ x, z, r: DECOR_RADIUS[kind] * scale });
      grid.set(k2, arr);
    },
  };
}

/** Billboard cloud puff: centre and size (the quad spans 1.6·s wide by s tall). */
export type Puff = [x: number, y: number, z: number, scale: number];

function part(
  g: THREE.BufferGeometry,
  color: string,
  pos: [number, number, number],
  rot: [number, number, number] = [0, 0, 0],
  scale: [number, number, number] = [1, 1, 1],
) {
  const geo = (g.index ? g.toNonIndexed() : g.clone()) as THREE.BufferGeometry;
  geo.deleteAttribute('uv');
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3(...pos),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)),
    new THREE.Vector3(...scale),
  );
  geo.applyMatrix4(m);
  const c = new THREE.Color(color);
  const n = geo.getAttribute('position').count;
  const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    // subtle per-vertex value jitter so flat-shaded facets read
    const j = 0.9 + ((i * 7919) % 13) / 60;
    col[i * 3] = c.r * j;
    col[i * 3 + 1] = c.g * j;
    col[i * 3 + 2] = c.b * j;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}

function merge(parts: THREE.BufferGeometry[]) {
  const g = mergeGeometries(parts, false)!;
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}

const cyl = (rt: number, rb: number, h: number, s: number) =>
  new THREE.CylinderGeometry(rt, rb, h, s, 1);
const cone = (r: number, h: number, s: number) => new THREE.ConeGeometry(r, h, s, 1);

function build(kind: DecorKind, lod: 0 | 1): THREE.BufferGeometry {
  switch (kind) {
    case 'pine':
    case 'snowpine': {
      const leaf = kind === 'pine' ? '#2f6b3a' : '#4c7a62';
      const tip = kind === 'pine' ? '#3d8a48' : '#eef6ff';
      if (lod === 1)
        return merge([
          part(cone(1.7, 4.8, 5), leaf, [0, 3.0, 0]),
          part(cyl(0.2, 0.3, 1.2, 4), '#5b3a24', [0, 0.6, 0]),
        ]);
      return merge([
        part(cyl(0.22, 0.34, 1.6, 6), '#5b3a24', [0, 0.8, 0]),
        part(cone(1.7, 2.6, 8), leaf, [0, 2.3, 0]),
        part(cone(1.3, 2.3, 8), leaf, [0, 3.5, 0], [0, 0.4, 0]),
        part(cone(0.85, 1.9, 7), tip, [0, 4.6, 0], [0, 0.8, 0]),
      ]);
    }
    case 'birch': {
      if (lod === 1)
        return merge([
          part(new THREE.IcosahedronGeometry(1.6, 0), '#8cc152', [0, 3.8, 0]),
          part(cyl(0.14, 0.18, 3, 4), '#e8e4da', [0, 1.5, 0]),
        ]);
      return merge([
        part(cyl(0.14, 0.2, 3.4, 6), '#ece8de', [0, 1.7, 0]),
        part(new THREE.IcosahedronGeometry(1.55, 0), '#93c85a', [0, 4.1, 0]),
        part(new THREE.IcosahedronGeometry(1.1, 0), '#a7d46a', [0.7, 3.4, 0.3], [0.5, 0.3, 0]),
        part(new THREE.IcosahedronGeometry(0.9, 0), '#7fb44c', [-0.6, 3.6, -0.4], [0.2, 1.0, 0]),
      ]);
    }
    case 'rock':
      if (lod === 1)
        return merge([
          part(
            new THREE.OctahedronGeometry(1, 0),
            '#7b8090',
            [0, 0.4, 0],
            [0, 0, 0],
            [1.3, 0.8, 1.1],
          ),
        ]);
      return merge([
        part(
          new THREE.DodecahedronGeometry(1, 0),
          '#7b8090',
          [0, 0.45, 0],
          [0.3, 0.5, 0.1],
          [1.35, 0.85, 1.1],
        ),
        part(new THREE.DodecahedronGeometry(0.55, 0), '#8a8f9e', [0.95, 0.2, 0.5], [0.8, 0.2, 0.4]),
      ]);
    case 'crystal': {
      const c = '#c084fc';
      if (lod === 1)
        return merge([
          part(new THREE.OctahedronGeometry(0.8, 0), c, [0, 1.6, 0], [0, 0, 0], [0.8, 2.6, 0.8]),
        ]);
      return merge([
        part(new THREE.OctahedronGeometry(0.8, 0), c, [0, 1.7, 0], [0, 0, 0.08], [0.8, 2.8, 0.8]),
        part(
          new THREE.OctahedronGeometry(0.55, 0),
          '#e9d5ff',
          [0.8, 0.9, 0.3],
          [0.2, 0.4, -0.5],
          [0.8, 2.2, 0.8],
        ),
        part(
          new THREE.OctahedronGeometry(0.5, 0),
          '#a855f7',
          [-0.7, 0.8, -0.2],
          [-0.3, 0.9, 0.45],
          [0.8, 2.0, 0.8],
        ),
      ]);
    }
    case 'cactus': {
      const g = '#4d8a3a';
      if (lod === 1) return merge([part(cyl(0.35, 0.4, 3.4, 5), g, [0, 1.7, 0])]);
      return merge([
        part(cyl(0.34, 0.4, 3.6, 8), g, [0, 1.8, 0]),
        part(new THREE.SphereGeometry(0.34, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), g, [0, 3.6, 0]),
        part(cyl(0.22, 0.22, 1.1, 6), g, [0.55, 1.6, 0], [0, 0, Math.PI / 2]),
        part(cyl(0.22, 0.24, 1.4, 6), g, [1.05, 2.25, 0]),
        part(cyl(0.2, 0.2, 0.9, 6), g, [-0.5, 2.1, 0], [0, 0, Math.PI / 2]),
        part(cyl(0.2, 0.22, 1.0, 6), g, [-0.9, 2.55, 0]),
      ]);
    }
    case 'ice': {
      const c = '#cfe9ff';
      if (lod === 1) return merge([part(cone(0.7, 3.2, 4), c, [0, 1.6, 0])]);
      return merge([
        part(cone(0.7, 3.4, 5), c, [0, 1.7, 0], [0.1, 0, 0.12]),
        part(cone(0.45, 2.2, 5), '#e8f4ff', [0.8, 1.0, 0.2], [0.2, 0, -0.5]),
        part(cone(0.4, 1.8, 5), '#b9dcf7', [-0.6, 0.8, -0.3], [-0.3, 0, 0.5]),
      ]);
    }
    case 'basalt': {
      const c = '#2b2626';
      if (lod === 1) return merge([part(cyl(0.9, 0.9, 3, 6), c, [0, 1.5, 0])]);
      return merge([
        part(cyl(0.55, 0.55, 3.4, 6), c, [0, 1.7, 0]),
        part(cyl(0.5, 0.5, 2.4, 6), '#3a3232', [0.95, 1.2, 0.1]),
        part(cyl(0.5, 0.5, 1.6, 6), '#231f1f', [-0.5, 0.8, 0.85]),
        part(cyl(0.45, 0.45, 2.9, 6), '#302a2a', [-0.45, 1.45, -0.8]),
      ]);
    }
    case 'deadtree': {
      const c = '#4a4038';
      if (lod === 1) return merge([part(cyl(0.12, 0.26, 4, 4), c, [0, 2, 0])]);
      return merge([
        part(cyl(0.12, 0.28, 4.2, 6), c, [0, 2.1, 0]),
        part(cyl(0.05, 0.1, 1.8, 5), c, [0.6, 3.1, 0], [0, 0, -0.9]),
        part(cyl(0.05, 0.09, 1.5, 5), c, [-0.5, 2.6, 0.2], [0.3, 0, 0.9]),
        part(cyl(0.04, 0.07, 1.0, 5), c, [0.1, 4.0, 0.4], [0.7, 0, 0.3]),
      ]);
    }
    case 'tuft':
    default: {
      const c = '#7cc454';
      return merge([
        part(cone(0.12, 0.7, 3), c, [0, 0.35, 0], [0.1, 0, 0.15]),
        part(cone(0.1, 0.55, 3), '#94d465', [0.2, 0.27, 0.1], [0, 0, -0.35]),
        part(cone(0.1, 0.6, 3), '#6bb848', [-0.18, 0.3, -0.05], [0.2, 0, 0.4]),
        part(cone(0.09, 0.45, 3), '#a3dc72', [0.05, 0.22, -0.2], [-0.4, 0, 0]),
      ]);
    }
  }
}

const geoCache = new Map<string, THREE.BufferGeometry>();
export function getDecorGeometry(kind: DecorKind, lod: 0 | 1): THREE.BufferGeometry {
  const k = `${kind}|${lod}`;
  let g = geoCache.get(k);
  if (!g) {
    g = build(kind, lod);
    geoCache.set(k, g);
  }
  return g;
}

const matCache = new Map<string, THREE.Material>();
/** Shared decor materials: vertex-coloured matte, glowing crystal, glassy ice. */
export function getDecorMaterial(kind: DecorKind): THREE.Material {
  const key = kind === 'crystal' ? 'crystal' : kind === 'ice' ? 'ice' : 'matte';
  let m = matCache.get(key);
  if (m) return m;
  if (key === 'crystal') {
    m = new THREE.MeshStandardMaterial({
      vertexColors: true,
      emissive: new THREE.Color('#a855f7'),
      emissiveIntensity: 0.9,
      roughness: 0.12,
      metalness: 0.2,
      flatShading: true,
    });
  } else if (key === 'ice') {
    m = new THREE.MeshStandardMaterial({
      vertexColors: true,
      emissive: new THREE.Color('#7dd3fc'),
      emissiveIntensity: 0.18,
      roughness: 0.08,
      metalness: 0.1,
      flatShading: true,
    });
  } else {
    m = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.88,
      metalness: 0.0,
      flatShading: true,
    });
  }
  matCache.set(key, m);
  return m;
}
