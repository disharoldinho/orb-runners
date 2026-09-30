import * as THREE from 'three';
import type { Vec3 } from '../types/level';

/**
 * Small geometry kit for finding coplanar (z-fighting) faces in level data. Pure (no React),
 * shared by the renderer (visual layers) and scripts/checkMapVisuals.mjs.
 */
export interface Face {
  /** outward unit normal (world) */
  n: THREE.Vector3;
  /** plane offset: n · p for points p on the face */
  d: number;
  /** convex polygon (world), any winding */
  poly: THREE.Vector3[];
  /** local axis index (0 x, 1 y, 2 z) and sign of the source box face, for box faces */
  axis?: number;
  sign?: number;
}

export interface Part {
  faces: Face[];
  min: THREE.Vector3;
  max: THREE.Vector3;
}

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();

/** World matrix for an object at `position` with Euler XYZ `rotation`. */
export function objectMatrix(position: Vec3, rotation: Vec3 = [0, 0, 0]) {
  return new THREE.Matrix4().compose(
    new THREE.Vector3(...position),
    _q.setFromEuler(new THREE.Euler(rotation[0], rotation[1], rotation[2], 'XYZ')),
    new THREE.Vector3(1, 1, 1),
  );
}

function finish(faces: Face[]): Part {
  const min = new THREE.Vector3(Infinity, Infinity, Infinity);
  const max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
  for (const f of faces)
    for (const p of f.poly) {
      min.min(p);
      max.max(p);
    }
  return { faces, min, max };
}

/** Faces of a box of `size` centred at local `offset` under `matrix` (optionally rotated). */
export function boxPart(matrix: THREE.Matrix4, offset: Vec3, size: Vec3, localRot?: Vec3): Part {
  const m = _m.copy(matrix).multiply(objectMatrix(offset, localRot ?? [0, 0, 0]));
  const h = size.map((s) => s / 2);
  const faces: Face[] = [];
  const nm = new THREE.Matrix3().getNormalMatrix(m);
  for (let axis = 0; axis < 3; axis++)
    for (const sign of [-1, 1]) {
      const a1 = (axis + 1) % 3;
      const a2 = (axis + 2) % 3;
      const corners: THREE.Vector3[] = [];
      for (const [s1, s2] of [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ]) {
        const v = [0, 0, 0];
        v[axis] = sign * h[axis];
        v[a1] = s1 * h[a1];
        v[a2] = s2 * h[a2];
        corners.push(new THREE.Vector3(v[0], v[1], v[2]).applyMatrix4(m));
      }
      const ln = [0, 0, 0];
      ln[axis] = sign;
      const n = new THREE.Vector3(ln[0], ln[1], ln[2]).applyMatrix3(nm).normalize();
      faces.push({ n, d: n.dot(corners[0]), poly: corners, axis, sign });
    }
  return finish(faces);
}

/** Top and bottom discs of a vertical cylinder (curved side ignored). */
export function cylinderPart(
  matrix: THREE.Matrix4,
  offset: Vec3,
  rTop: number,
  rBottom: number,
  height: number,
  segs = 16,
): Part {
  const m = _m.copy(matrix).multiply(objectMatrix(offset));
  const nm = new THREE.Matrix3().getNormalMatrix(m);
  const disc = (y: number, r: number, sign: number): Face => {
    const poly: THREE.Vector3[] = [];
    for (let i = 0; i < segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      poly.push(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r).applyMatrix4(m));
    }
    const n = new THREE.Vector3(0, sign, 0).applyMatrix3(nm).normalize();
    return { n, d: n.dot(poly[0]), poly, axis: 1, sign };
  };
  return finish([disc(height / 2, rTop, 1), disc(-height / 2, rBottom, -1)]);
}

/** A single horizontal-ish quad (e.g. the lava sheet). */
export function quadPart(matrix: THREE.Matrix4, offset: Vec3, sx: number, sz: number): Part {
  const b = boxPart(matrix, offset, [sx, 0, sz]);
  return finish([b.faces[3]]); // +y face
}

export function aabbOverlap(a: Part, b: Part, margin = 0.01) {
  return (
    a.min.x <= b.max.x + margin &&
    b.min.x <= a.max.x + margin &&
    a.min.y <= b.max.y + margin &&
    b.min.y <= a.max.y + margin &&
    a.min.z <= b.max.z + margin &&
    b.min.z <= a.max.z + margin
  );
}

type P2 = [number, number];

function area2(p: P2[]) {
  let s = 0;
  for (let i = 0; i < p.length; i++) {
    const [x1, y1] = p[i];
    const [x2, y2] = p[(i + 1) % p.length];
    s += x1 * y2 - x2 * y1;
  }
  return s / 2;
}

function clip(subject: P2[], clipper: P2[]): P2[] {
  let out = subject;
  for (let i = 0; i < clipper.length && out.length; i++) {
    const [ax, ay] = clipper[i];
    const [bx, by] = clipper[(i + 1) % clipper.length];
    const inside = (p: P2) => (bx - ax) * (p[1] - ay) - (by - ay) * (p[0] - ax) >= -1e-9;
    const inter = (p: P2, q: P2): P2 => {
      const a1 = (bx - ax) * (p[1] - ay) - (by - ay) * (p[0] - ax);
      const a2 = (bx - ax) * (q[1] - ay) - (by - ay) * (q[0] - ax);
      const t = a1 / (a1 - a2);
      return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
    };
    const input = out;
    out = [];
    for (let j = 0; j < input.length; j++) {
      const p = input[j];
      const q = input[(j + 1) % input.length];
      const pi = inside(p);
      const qi = inside(q);
      if (pi) out.push(p);
      if (pi !== qi) out.push(inter(p, q));
    }
  }
  return out;
}

/**
 * Overlap area (m²) of two faces that face the same way on (almost) the same plane, i.e. the
 * area that z-fights. 0 when they are not parallel, face opposite ways or are > eps apart.
 */
export function coplanarOverlap(a: Face, b: Face, eps: number): number {
  return coplanarOverlapInfo(a, b, eps)?.area ?? 0;
}

/** Like coplanarOverlap, plus the overlap's centroid (world). null when there is none. */
export function coplanarOverlapInfo(
  a: Face,
  b: Face,
  eps: number,
): { area: number; centroid: THREE.Vector3 } | null {
  if (a.n.dot(b.n) < 0.9995) return null;
  if (Math.abs(b.d - b.n.dot(a.poly[0])) > eps) return null;
  const u = a.poly[1].clone().sub(a.poly[0]).normalize();
  const v = a.n.clone().cross(u);
  const o = a.poly[0];
  const to2 = (p: THREE.Vector3): P2 => {
    const r = p.clone().sub(o);
    return [r.dot(u), r.dot(v)];
  };
  let pa = a.poly.map(to2);
  let pb = b.poly.map(to2);
  if (area2(pa) < 0) pa = pa.reverse();
  if (area2(pb) < 0) pb = pb.reverse();
  const c = clip(pa, pb);
  if (c.length < 3) return null;
  let cx = 0;
  let cy = 0;
  for (const [x, y] of c) {
    cx += x / c.length;
    cy += y / c.length;
  }
  const centroid = o.clone().addScaledVector(u, cx).addScaledVector(v, cy);
  return { area: Math.abs(area2(c)), centroid };
}

/** True if point p lies on face f (within eps of its plane and inside its polygon). */
export function faceContains(f: Face, p: THREE.Vector3, eps: number) {
  if (Math.abs(f.n.dot(p) - f.d) > eps) return false;
  const u = f.poly[1].clone().sub(f.poly[0]).normalize();
  const v = f.n.clone().cross(u);
  const pts = f.poly.map((q) => {
    const r = q.clone().sub(f.poly[0]);
    return [r.dot(u), r.dot(v)] as P2;
  });
  const r = p.clone().sub(f.poly[0]);
  const x = r.dot(u);
  const y = r.dot(v);
  const sgn = area2(pts) < 0 ? -1 : 1;
  for (let i = 0; i < pts.length; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[(i + 1) % pts.length];
    if (sgn * ((bx - ax) * (y - ay) - (by - ay) * (x - ax)) < -1e-6) return false;
  }
  return true;
}
