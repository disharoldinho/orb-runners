import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AvatarConfig } from '../../types/avatar';
import { livePhysics, useGameStore } from '../../store/useGameStore';

interface CharacterModelProps {
  config: AvatarConfig;
  isPreview?: boolean;
}

export function CharacterModel({ config, isPreview = false }: CharacterModelProps) {
  const rootRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const propellerRef = useRef<THREE.Group>(null);
  const haloRef = useRef<THREE.Mesh>(null);
  const leftEarRef = useRef<THREE.Mesh>(null);
  const rightEarRef = useRef<THREE.Mesh>(null);

  const runPhase = useRef(0);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    const playPhase = useGameStore.getState().playPhase;

    const speed = isPreview ? 2.2 : livePhysics.ballSpeed;
    const isGrounded = isPreview ? true : livePhysics.isGrounded;
    const timeSinceBumper = performance.now() - livePhysics.lastBumperHitTime;

    // Advance running cycle phase proportional to ball speed
    runPhase.current += dt * (2.5 + speed * 2.1);
    const strideAmt = isPreview ? 0.35 : THREE.MathUtils.clamp(speed / 6.5, 0, 1.15);

    // Leg & Arm procedural animations
    if (leftLegRef.current && rightLegRef.current) {
      if (!isPreview && playPhase === 'goal') {
        leftLegRef.current.rotation.x = Math.sin(t * 12) * 0.5;
        rightLegRef.current.rotation.x = -Math.sin(t * 12) * 0.5;
      } else {
        leftLegRef.current.rotation.x = Math.sin(runPhase.current) * 0.85 * strideAmt;
        rightLegRef.current.rotation.x = -Math.sin(runPhase.current) * 0.85 * strideAmt;
      }
    }

    if (leftArmRef.current && rightArmRef.current) {
      if (!isPreview && (playPhase === 'fallout' || !isGrounded)) {
        // Panic flailing arms when airborne or falling out!
        leftArmRef.current.rotation.z = 2.3 + Math.sin(t * 24) * 0.35;
        rightArmRef.current.rotation.z = -2.3 - Math.cos(t * 24) * 0.35;
        leftArmRef.current.rotation.x = Math.cos(t * 20) * 0.4;
        rightArmRef.current.rotation.x = -Math.cos(t * 20) * 0.4;
      } else if (!isPreview && playPhase === 'goal') {
        // Victory cheer arms up!
        leftArmRef.current.rotation.z = 2.4 + Math.sin(t * 10) * 0.25;
        rightArmRef.current.rotation.z = -2.4 - Math.sin(t * 10) * 0.25;
        leftArmRef.current.rotation.x = 0;
        rightArmRef.current.rotation.x = 0;
      } else {
        // Normal running arm swing
        leftArmRef.current.rotation.z = 0.45 + Math.abs(Math.sin(runPhase.current)) * 0.15;
        rightArmRef.current.rotation.z = -0.45 - Math.abs(Math.sin(runPhase.current)) * 0.15;
        leftArmRef.current.rotation.x = -Math.sin(runPhase.current) * 0.75 * strideAmt;
        rightArmRef.current.rotation.x = Math.sin(runPhase.current) * 0.75 * strideAmt;
      }
    }

    // Body bounce & bumper squash-and-stretch
    if (rootRef.current) {
      let bounceY = Math.abs(Math.sin(runPhase.current)) * 0.045 * strideAmt;
      if (!isPreview && playPhase === 'goal') {
        bounceY = Math.abs(Math.sin(t * 8)) * 0.16;
      }
      rootRef.current.position.y = -0.22 + bounceY;

      if (!isPreview && timeSinceBumper < 420) {
        const wobble = Math.sin((timeSinceBumper / 420) * Math.PI * 4) * (1 - timeSinceBumper / 420);
        rootRef.current.scale.set(1 + wobble * 0.35, 1 - wobble * 0.3, 1 + wobble * 0.35);
      } else {
        rootRef.current.scale.set(1, 1, 1);
      }
    }

    // Head bob & critter ears wiggle
    if (headRef.current) {
      headRef.current.rotation.z = Math.sin(runPhase.current * 0.5) * 0.06 * strideAmt;
      headRef.current.rotation.y = isPreview ? Math.sin(t * 1.5) * 0.18 : 0;
    }

    if (leftEarRef.current && rightEarRef.current) {
      leftEarRef.current.rotation.z = 0.2 + Math.sin(runPhase.current) * 0.12;
      rightEarRef.current.rotation.z = -0.2 - Math.sin(runPhase.current) * 0.12;
    }

    // Spin propeller hat
    if (propellerRef.current) {
      propellerRef.current.rotation.y += dt * (8 + speed * 3.5);
    }

    // Bob golden halo
    if (haloRef.current) {
      haloRef.current.position.y = 0.42 + Math.sin(t * 4) * 0.03;
      haloRef.current.rotation.z = Math.sin(t * 2) * 0.08;
    }
  });

  const { primaryColor, secondaryColor, bodyType, eyeType, mouthType, hatType } = config;

  return (
    <group ref={rootRef} position={[0, -0.22, 0]}>
      {/* ================= TORSO / BODY ================= */}
      {bodyType === 'bean' && (
        <group position={[0, 0.16, 0]}>
          <mesh castShadow>
            <capsuleGeometry args={[0.17, 0.14, 12, 24]} />
            <meshStandardMaterial color={primaryColor} roughness={0.35} />
          </mesh>
          {/* Belly patch */}
          <mesh position={[0, -0.02, 0.13]} scale={[0.75, 0.85, 0.4]}>
            <sphereGeometry args={[0.14, 16, 16]} />
            <meshStandardMaterial color={secondaryColor} roughness={0.45} />
          </mesh>
        </group>
      )}

      {bodyType === 'blob' && (
        <group position={[0, 0.14, 0]}>
          <mesh castShadow scale={[1.12, 0.95, 1.08]}>
            <sphereGeometry args={[0.21, 24, 24]} />
            <meshStandardMaterial color={primaryColor} roughness={0.25} />
          </mesh>
          <mesh position={[0, -0.03, 0.15]} scale={[0.8, 0.7, 0.45]}>
            <sphereGeometry args={[0.16, 16, 16]} />
            <meshStandardMaterial color={secondaryColor} roughness={0.4} />
          </mesh>
        </group>
      )}

      {bodyType === 'bot' && (
        <group position={[0, 0.16, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.32, 0.3, 0.24]} />
            <meshStandardMaterial color={primaryColor} metalness={0.45} roughness={0.3} />
          </mesh>
          {/* Glowing chest screen */}
          <mesh position={[0, 0.01, 0.125]}>
            <boxGeometry args={[0.2, 0.14, 0.02]} />
            <meshStandardMaterial
              color={secondaryColor}
              emissive={secondaryColor}
              emissiveIntensity={0.45}
            />
          </mesh>
        </group>
      )}

      {bodyType === 'critter' && (
        <group position={[0, 0.16, 0]}>
          <mesh castShadow>
            <capsuleGeometry args={[0.175, 0.13, 12, 24]} />
            <meshStandardMaterial color={primaryColor} roughness={0.4} />
          </mesh>
          {/* Belly */}
          <mesh position={[0, -0.02, 0.135]} scale={[0.78, 0.85, 0.38]}>
            <sphereGeometry args={[0.14, 16, 16]} />
            <meshStandardMaterial color={secondaryColor} roughness={0.5} />
          </mesh>
          {/* Fluffy Puff Tail */}
          <mesh position={[0, -0.05, -0.18]}>
            <sphereGeometry args={[0.075, 12, 12]} />
            <meshStandardMaterial color={secondaryColor} roughness={0.6} />
          </mesh>
        </group>
      )}

      {/* ================= HEAD & FACE ================= */}
      <group ref={headRef} position={[0, 0.38, 0]}>
        {/* Head Base */}
        {bodyType === 'bot' ? (
          <group>
            <mesh castShadow>
              <boxGeometry args={[0.34, 0.26, 0.28]} />
              <meshStandardMaterial color={primaryColor} metalness={0.4} roughness={0.3} />
            </mesh>
            {/* Side antenna bolts */}
            <mesh position={[-0.19, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.035, 0.035, 0.06, 12]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.8} roughness={0.2} />
            </mesh>
            <mesh position={[0.19, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.035, 0.035, 0.06, 12]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.8} roughness={0.2} />
            </mesh>
          </group>
        ) : (
          <mesh castShadow scale={[1.08, 0.96, 1.02]}>
            <sphereGeometry args={[0.19, 24, 24]} />
            <meshStandardMaterial color={primaryColor} roughness={0.35} />
          </mesh>
        )}

        {/* Critter Ears */}
        {bodyType === 'critter' && (
          <group>
            <mesh
              ref={leftEarRef}
              position={[-0.11, 0.22, 0]}
              rotation={[0, 0, 0.2]}
              castShadow
            >
              <capsuleGeometry args={[0.045, 0.16, 8, 12]} />
              <meshStandardMaterial color={primaryColor} roughness={0.4} />
            </mesh>
            <mesh
              ref={rightEarRef}
              position={[0.11, 0.22, 0]}
              rotation={[0, 0, -0.2]}
              castShadow
            >
              <capsuleGeometry args={[0.045, 0.16, 8, 12]} />
              <meshStandardMaterial color={primaryColor} roughness={0.4} />
            </mesh>
          </group>
        )}

        {/* Rosy Blush Cheeks */}
        <mesh position={[-0.12, -0.03, 0.155]} scale={[1.2, 0.8, 0.5]}>
          <sphereGeometry args={[0.032, 12, 12]} />
          <meshStandardMaterial color="#ff758f" roughness={0.6} />
        </mesh>
        <mesh position={[0.12, -0.03, 0.155]} scale={[1.2, 0.8, 0.5]}>
          <sphereGeometry args={[0.032, 12, 12]} />
          <meshStandardMaterial color="#ff758f" roughness={0.6} />
        </mesh>

        {/* ================= EYES ================= */}
        <group position={[0, 0.03, bodyType === 'bot' ? 0.145 : 0.17]}>
          {eyeType === 'googly' && (
            <>
              <group position={[-0.07, 0, 0]}>
                <mesh scale={[1, 1, 0.45]}>
                  <sphereGeometry args={[0.052, 16, 16]} />
                  <meshStandardMaterial color="#ffffff" roughness={0.1} />
                </mesh>
                <mesh position={[0.006, -0.005, 0.022]}>
                  <sphereGeometry args={[0.028, 12, 12]} />
                  <meshStandardMaterial color="#111827" roughness={0.1} />
                </mesh>
              </group>
              <group position={[0.07, 0, 0]}>
                <mesh scale={[1, 1, 0.45]}>
                  <sphereGeometry args={[0.052, 16, 16]} />
                  <meshStandardMaterial color="#ffffff" roughness={0.1} />
                </mesh>
                <mesh position={[-0.006, 0.005, 0.022]}>
                  <sphereGeometry args={[0.028, 12, 12]} />
                  <meshStandardMaterial color="#111827" roughness={0.1} />
                </mesh>
              </group>
            </>
          )}

          {eyeType === 'happy' && (
            <>
              <mesh position={[-0.07, 0, 0.01]} rotation={[0, 0, 0.15]}>
                <torusGeometry args={[0.036, 0.011, 8, 16, Math.PI]} />
                <meshStandardMaterial color="#111827" roughness={0.2} />
              </mesh>
              <mesh position={[0.07, 0, 0.01]} rotation={[0, 0, -0.15]}>
                <torusGeometry args={[0.036, 0.011, 8, 16, Math.PI]} />
                <meshStandardMaterial color="#111827" roughness={0.2} />
              </mesh>
            </>
          )}

          {eyeType === 'sparkle' && (
            <>
              {[-0.07, 0.07].map((xOffset, i) => (
                <group key={i} position={[xOffset, 0, 0]}>
                  <mesh scale={[1, 1.15, 0.45]}>
                    <sphereGeometry args={[0.048, 16, 16]} />
                    <meshStandardMaterial color="#1e1b4b" roughness={0.05} />
                  </mesh>
                  {/* Big Starlight Catchlight */}
                  <mesh position={[0.014, 0.018, 0.022]}>
                    <sphereGeometry args={[0.016, 10, 10]} />
                    <meshBasicMaterial color="#ffffff" />
                  </mesh>
                  <mesh position={[-0.012, -0.014, 0.022]}>
                    <sphereGeometry args={[0.008, 8, 8]} />
                    <meshBasicMaterial color="#ffffff" />
                  </mesh>
                </group>
              ))}
            </>
          )}

          {eyeType === 'determined' && (
            <>
              {[-0.07, 0.07].map((xOffset, i) => (
                <group key={i} position={[xOffset, 0, 0]}>
                  <mesh scale={[1, 1, 0.45]}>
                    <sphereGeometry args={[0.045, 16, 16]} />
                    <meshStandardMaterial color="#ffffff" />
                  </mesh>
                  <mesh position={[0, -0.004, 0.02]}>
                    <sphereGeometry args={[0.025, 12, 12]} />
                    <meshStandardMaterial color="#0f172a" />
                  </mesh>
                  {/* Angled speedrunner brow */}
                  <mesh
                    position={[0, 0.042, 0.018]}
                    rotation={[0, 0, i === 0 ? -0.38 : 0.38]}
                  >
                    <boxGeometry args={[0.085, 0.018, 0.02]} />
                    <meshStandardMaterial color="#0f172a" />
                  </mesh>
                </group>
              ))}
            </>
          )}

          {eyeType === 'derpy' && (
            <>
              <group position={[-0.072, 0.01, 0]}>
                <mesh scale={[1.1, 1.1, 0.45]}>
                  <sphereGeometry args={[0.052, 16, 16]} />
                  <meshStandardMaterial color="#ffffff" />
                </mesh>
                <mesh position={[0.022, 0.012, 0.022]}>
                  <sphereGeometry args={[0.022, 12, 12]} />
                  <meshStandardMaterial color="#0f172a" />
                </mesh>
              </group>
              <group position={[0.072, -0.01, 0]}>
                <mesh scale={[0.92, 0.92, 0.45]}>
                  <sphereGeometry args={[0.052, 16, 16]} />
                  <meshStandardMaterial color="#ffffff" />
                </mesh>
                <mesh position={[-0.022, -0.015, 0.022]}>
                  <sphereGeometry args={[0.026, 12, 12]} />
                  <meshStandardMaterial color="#0f172a" />
                </mesh>
              </group>
            </>
          )}

          {eyeType === 'shades' && (
            <group position={[0, 0.005, 0.015]}>
              {/* Bridge bar */}
              <mesh position={[0, 0.02, 0]}>
                <boxGeometry args={[0.26, 0.018, 0.02]} />
                <meshStandardMaterial color="#0f172a" metalness={0.8} roughness={0.1} />
              </mesh>
              {/* Left & Right Dark Lenses */}
              <mesh position={[-0.07, -0.005, 0]}>
                <boxGeometry args={[0.105, 0.068, 0.022]} />
                <meshStandardMaterial color="#090d16" metalness={0.9} roughness={0.05} />
              </mesh>
              <mesh position={[0.07, -0.005, 0]}>
                <boxGeometry args={[0.105, 0.068, 0.022]} />
                <meshStandardMaterial color="#090d16" metalness={0.9} roughness={0.05} />
              </mesh>
              {/* Cool shine streak */}
              <mesh position={[-0.08, 0.005, 0.013]} rotation={[0, 0, 0.4]}>
                <boxGeometry args={[0.014, 0.05, 0.005]} />
                <meshBasicMaterial color="#ffffff" />
              </mesh>
              <mesh position={[0.06, 0.005, 0.013]} rotation={[0, 0, 0.4]}>
                <boxGeometry args={[0.014, 0.05, 0.005]} />
                <meshBasicMaterial color="#ffffff" />
              </mesh>
            </group>
          )}
        </group>

        {/* ================= MOUTH ================= */}
        <group position={[0, -0.055, bodyType === 'bot' ? 0.148 : 0.172]}>
          {mouthType === 'cat' && (
            <>
              <mesh position={[-0.024, 0, 0]} rotation={[Math.PI, 0, 0]}>
                <torusGeometry args={[0.024, 0.008, 8, 12, Math.PI]} />
                <meshStandardMaterial color="#111827" />
              </mesh>
              <mesh position={[0.024, 0, 0]} rotation={[Math.PI, 0, 0]}>
                <torusGeometry args={[0.024, 0.008, 8, 12, Math.PI]} />
                <meshStandardMaterial color="#111827" />
              </mesh>
            </>
          )}

          {mouthType === 'grin' && (
            <group>
              <mesh rotation={[Math.PI, 0, 0]}>
                <torusGeometry args={[0.045, 0.01, 8, 16, Math.PI]} />
                <meshStandardMaterial color="#111827" />
              </mesh>
              <mesh position={[0, -0.012, -0.003]}>
                <boxGeometry args={[0.068, 0.022, 0.01]} />
                <meshBasicMaterial color="#ffffff" />
              </mesh>
            </group>
          )}

          {mouthType === 'shock' && (
            <mesh>
              <torusGeometry args={[0.028, 0.009, 10, 16]} />
              <meshStandardMaterial color="#111827" />
            </mesh>
          )}

          {mouthType === 'tongue' && (
            <group>
              <mesh rotation={[Math.PI, 0, 0]}>
                <torusGeometry args={[0.036, 0.009, 8, 16, Math.PI]} />
                <meshStandardMaterial color="#111827" />
              </mesh>
              <mesh position={[0.01, -0.032, 0.006]} rotation={[0.2, 0, 0.1]}>
                <capsuleGeometry args={[0.018, 0.02, 8, 12]} />
                <meshStandardMaterial color="#ff4d6d" roughness={0.3} />
              </mesh>
            </group>
          )}

          {mouthType === 'mustache' && (
            <group position={[0, 0.008, 0.01]}>
              <mesh position={[-0.038, 0, 0]} rotation={[0, 0, 0.32]}>
                <capsuleGeometry args={[0.018, 0.055, 8, 12]} />
                <meshStandardMaterial color="#3f2e21" roughness={0.6} />
              </mesh>
              <mesh position={[0.038, 0, 0]} rotation={[0, 0, -0.32]}>
                <capsuleGeometry args={[0.018, 0.055, 8, 12]} />
                <meshStandardMaterial color="#3f2e21" roughness={0.6} />
              </mesh>
            </group>
          )}
        </group>

        {/* ================= HATS & HEADGEAR ================= */}
        <group position={[0, bodyType === 'bot' ? 0.13 : 0.16, 0]}>
          {hatType === 'propeller' && (
            <group>
              {/* Beanie dome */}
              <mesh position={[0, 0, 0]} scale={[1, 0.65, 1]}>
                <sphereGeometry args={[0.155, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
                <meshStandardMaterial color="#ef4444" roughness={0.4} />
              </mesh>
              {/* Brim */}
              <mesh position={[0, 0.01, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.15, 0.022, 8, 24]} />
                <meshStandardMaterial color="#3b82f6" roughness={0.4} />
              </mesh>
              {/* Spinning Propeller Blade */}
              <group ref={propellerRef} position={[0, 0.115, 0]}>
                <mesh>
                  <cylinderGeometry args={[0.018, 0.018, 0.05, 8]} />
                  <meshStandardMaterial color="#facc15" metalness={0.7} roughness={0.2} />
                </mesh>
                <mesh position={[0, 0.02, 0]}>
                  <boxGeometry args={[0.28, 0.012, 0.038]} />
                  <meshStandardMaterial color="#facc15" metalness={0.5} roughness={0.2} />
                </mesh>
              </group>
            </group>
          )}

          {hatType === 'crown' && (
            <group position={[0, 0.05, 0]}>
              <mesh>
                <cylinderGeometry args={[0.135, 0.11, 0.11, 8]} />
                <meshStandardMaterial color="#fbbf24" metalness={0.85} roughness={0.15} />
              </mesh>
              {/* Ruby front gem */}
              <mesh position={[0, 0, 0.12]}>
                <octahedronGeometry args={[0.032]} />
                <meshStandardMaterial color="#e11d48" emissive="#e11d48" emissiveIntensity={0.4} />
              </mesh>
            </group>
          )}

          {hatType === 'wizard' && (
            <group position={[0, 0.02, 0]}>
              {/* Wide Brim */}
              <mesh rotation={[0, 0, 0]}>
                <cylinderGeometry args={[0.25, 0.25, 0.02, 20]} />
                <meshStandardMaterial color="#4338ca" roughness={0.5} />
              </mesh>
              {/* Gold Band */}
              <mesh position={[0, 0.025, 0]}>
                <cylinderGeometry args={[0.145, 0.155, 0.035, 16]} />
                <meshStandardMaterial color="#fbbf24" metalness={0.7} roughness={0.2} />
              </mesh>
              {/* Tall Cone */}
              <mesh position={[0, 0.18, -0.01]} rotation={[-0.12, 0, 0]}>
                <coneGeometry args={[0.145, 0.32, 16]} />
                <meshStandardMaterial color="#4338ca" roughness={0.5} />
              </mesh>
            </group>
          )}

          {hatType === 'viking' && (
            <group position={[0, 0.01, 0]}>
              <mesh scale={[1, 0.75, 1]}>
                <sphereGeometry args={[0.165, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
                <meshStandardMaterial color="#64748b" metalness={0.75} roughness={0.25} />
              </mesh>
              {/* Left & Right Horns */}
              <mesh position={[-0.18, 0.08, 0]} rotation={[0, 0, 0.55]}>
                <coneGeometry args={[0.045, 0.18, 12]} />
                <meshStandardMaterial color="#fef3c7" roughness={0.3} />
              </mesh>
              <mesh position={[0.18, 0.08, 0]} rotation={[0, 0, -0.55]}>
                <coneGeometry args={[0.045, 0.18, 12]} />
                <meshStandardMaterial color="#fef3c7" roughness={0.3} />
              </mesh>
            </group>
          )}

          {hatType === 'chef' && (
            <group position={[0, 0.04, 0]}>
              <mesh>
                <cylinderGeometry args={[0.135, 0.13, 0.08, 16]} />
                <meshStandardMaterial color="#f8fafc" roughness={0.4} />
              </mesh>
              <mesh position={[0, 0.11, 0]} scale={[1.15, 0.85, 1.15]}>
                <sphereGeometry args={[0.15, 16, 16]} />
                <meshStandardMaterial color="#ffffff" roughness={0.5} />
              </mesh>
            </group>
          )}

          {hatType === 'halo' && (
            <mesh ref={haloRef} position={[0, 0.18, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.15, 0.024, 12, 28]} />
              <meshStandardMaterial
                color="#fde047"
                emissive="#facc15"
                emissiveIntensity={0.85}
                metalness={0.9}
                roughness={0.1}
              />
            </mesh>
          )}
        </group>
      </group>

      {/* ================= ARMS ================= */}
      <group ref={leftArmRef} position={[-0.2, 0.22, 0]}>
        <mesh position={[-0.04, -0.07, 0]} castShadow>
          <capsuleGeometry args={[0.045, 0.1, 8, 12]} />
          <meshStandardMaterial color={primaryColor} roughness={0.35} />
        </mesh>
      </group>
      <group ref={rightArmRef} position={[0.2, 0.22, 0]}>
        <mesh position={[0.04, -0.07, 0]} castShadow>
          <capsuleGeometry args={[0.045, 0.1, 8, 12]} />
          <meshStandardMaterial color={primaryColor} roughness={0.35} />
        </mesh>
      </group>

      {/* ================= LEGS / FEET ================= */}
      <group ref={leftLegRef} position={[-0.085, 0.02, 0]}>
        <mesh position={[0, -0.06, 0.02]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <capsuleGeometry args={[0.052, 0.07, 8, 12]} />
          <meshStandardMaterial color={secondaryColor} roughness={0.4} />
        </mesh>
      </group>
      <group ref={rightLegRef} position={[0.085, 0.02, 0]}>
        <mesh position={[0, -0.06, 0.02]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <capsuleGeometry args={[0.052, 0.07, 8, 12]} />
          <meshStandardMaterial color={secondaryColor} roughness={0.4} />
        </mesh>
      </group>
    </group>
  );
}
