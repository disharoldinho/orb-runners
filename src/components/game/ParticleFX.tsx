import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface ParticleData {
  active: boolean;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  age: number;
  maxAge: number;
  scale: number;
  rotSpeed: THREE.Vector3;
  rotation: THREE.Euler;
}

interface ShockwaveData {
  active: boolean;
  position: THREE.Vector3;
  color: THREE.Color;
  age: number;
  maxAge: number;
  maxRadius: number;
}

const MAX_PARTICLES = 160;
const MAX_SHOCKWAVES = 12;

// Global non-React pool queues so any obstacle or orb collision can spawn 3D FX with zero overhead
const particlePool: ParticleData[] = Array.from({ length: MAX_PARTICLES }, () => ({
  active: false,
  position: new THREE.Vector3(),
  velocity: new THREE.Vector3(),
  color: new THREE.Color('#ffffff'),
  age: 0,
  maxAge: 0.6,
  scale: 0.15,
  rotSpeed: new THREE.Vector3(),
  rotation: new THREE.Euler(),
}));

const shockwavePool: ShockwaveData[] = Array.from({ length: MAX_SHOCKWAVES }, () => ({
  active: false,
  position: new THREE.Vector3(),
  color: new THREE.Color('#facc15'),
  age: 0,
  maxAge: 0.45,
  maxRadius: 2.5,
}));

let nextParticleIdx = 0;
let nextShockwaveIdx = 0;

export function spawnParticleBurst(
  pos: [number, number, number],
  colorHex: string,
  count: number = 22,
  speed: number = 6.5,
  scale: number = 0.14
) {
  const baseColor = new THREE.Color(colorHex);
  for (let i = 0; i < count; i++) {
    const p = particlePool[nextParticleIdx];
    nextParticleIdx = (nextParticleIdx + 1) % MAX_PARTICLES;

    p.active = true;
    p.position.set(pos[0], pos[1], pos[2]);

    const theta = Math.random() * Math.PI * 2;
    const upward = 0.25 + Math.random() * 0.85;
    const horiz = (0.35 + Math.random() * 0.75) * speed;

    p.velocity.set(
      Math.cos(theta) * horiz,
      upward * speed * 0.75,
      Math.sin(theta) * horiz
    );
    p.color.copy(baseColor).offsetHSL((Math.random() - 0.5) * 0.08, 0, (Math.random() - 0.5) * 0.15);
    p.age = 0;
    p.maxAge = 0.38 + Math.random() * 0.32;
    p.scale = scale * (0.7 + Math.random() * 0.6);
    p.rotSpeed.set(
      (Math.random() - 0.5) * 14,
      (Math.random() - 0.5) * 14,
      (Math.random() - 0.5) * 14
    );
    p.rotation.set(0, 0, 0);
  }
}

export function spawnShockwave(
  pos: [number, number, number],
  colorHex: string = '#facc15',
  maxRadius: number = 2.6,
  duration: number = 0.42
) {
  const sw = shockwavePool[nextShockwaveIdx];
  nextShockwaveIdx = (nextShockwaveIdx + 1) % MAX_SHOCKWAVES;
  sw.active = true;
  sw.position.set(pos[0], pos[1], pos[2]);
  sw.color.set(colorHex);
  sw.age = 0;
  sw.maxAge = duration;
  sw.maxRadius = maxRadius;
}

export function ParticleFX() {
  const instancedRef = useRef<THREE.InstancedMesh>(null);
  const shockwaveRefs = useRef<(THREE.Mesh | null)[]>([]);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const mesh = instancedRef.current;

    if (mesh) {
      let anyUpdated = false;
      for (let i = 0; i < MAX_PARTICLES; i++) {
        const p = particlePool[i];
        if (!p.active) {
          dummy.scale.set(0, 0, 0);
          dummy.updateMatrix();
          mesh.setMatrixAt(i, dummy.matrix);
          continue;
        }

        anyUpdated = true;
        p.age += dt;
        if (p.age >= p.maxAge) {
          p.active = false;
          dummy.scale.set(0, 0, 0);
          dummy.updateMatrix();
          mesh.setMatrixAt(i, dummy.matrix);
          continue;
        }

        const lifeRatio = 1 - p.age / p.maxAge;
        p.velocity.y -= 16.0 * dt; // Gravity on sparks
        p.position.addScaledVector(p.velocity, dt);
        p.rotation.x += p.rotSpeed.x * dt;
        p.rotation.y += p.rotSpeed.y * dt;
        p.rotation.z += p.rotSpeed.z * dt;

        dummy.position.copy(p.position);
        dummy.rotation.copy(p.rotation);
        const s = p.scale * lifeRatio;
        dummy.scale.set(s, s, s);
        dummy.updateMatrix();

        mesh.setMatrixAt(i, dummy.matrix);
        mesh.setColorAt(i, p.color);
      }

      if (anyUpdated) {
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      }
    }

    // Update Shockwave Rings
    for (let i = 0; i < MAX_SHOCKWAVES; i++) {
      const sw = shockwavePool[i];
      const swMesh = shockwaveRefs.current[i];
      if (!swMesh) continue;

      if (!sw.active) {
        swMesh.visible = false;
        continue;
      }

      sw.age += dt;
      if (sw.age >= sw.maxAge) {
        sw.active = false;
        swMesh.visible = false;
        continue;
      }

      swMesh.visible = true;
      const progress = sw.age / sw.maxAge;
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const radius = 0.25 + easeOut * sw.maxRadius;

      swMesh.position.copy(sw.position);
      swMesh.scale.set(radius, radius, 1);

      const mat = swMesh.material as THREE.MeshBasicMaterial;
      mat.color.copy(sw.color);
      mat.opacity = (1 - progress) * 0.85;
    }
  });

  return (
    <group>
      <instancedMesh
        ref={instancedRef}
        args={[undefined, undefined, MAX_PARTICLES]}
        frustumCulled={false}
      >
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial
          roughness={0.15}
          metalness={0.8}
          emissive="#ffffff"
          emissiveIntensity={0.45}
        />
      </instancedMesh>

      {Array.from({ length: MAX_SHOCKWAVES }).map((_, idx) => (
        <mesh
          key={idx}
          ref={(el) => {
            shockwaveRefs.current[idx] = el;
          }}
          rotation={[-Math.PI / 2, 0, 0]}
          visible={false}
        >
          <ringGeometry args={[0.78, 1.0, 32]} />
          <meshBasicMaterial
            color="#facc15"
            transparent
            opacity={0}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}
