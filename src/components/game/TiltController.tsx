import { useEffect, useLayoutEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useAfterPhysicsStep, useRapier } from '@react-three/rapier';
import * as THREE from 'three';
import { livePhysics, useGameStore } from '../../store/useGameStore';
import { touchInput } from '../../input/touchInput';

/** Maximum board tilt angle in radians (~17.5 degrees for smooth, controllable precision) */
export const MAX_TILT_RAD = THREE.MathUtils.degToRad(17.5);
/** Base gravitational acceleration in m/s^2 tuned for weighted, smooth marble momentum */
const BASE_GRAVITY = 20.5;

/**
 * Critically damped 2nd-order spring step (Unity SmoothDamp style)
 * Eliminates the harsh instant jerk when pressing keyboard keys!
 */
function smoothDamp(
  current: number,
  target: number,
  velocityRef: { value: number },
  smoothTime: number,
  dt: number
): number {
  const omega = 2.0 / Math.max(0.0001, smoothTime);
  const x = omega * dt;
  const exp = 1.0 / (1.0 + x + 0.48 * x * x + 0.235 * x * x * x);
  const change = current - target;
  const temp = (velocityRef.value + omega * change) * dt;
  velocityRef.value = (velocityRef.value - omega * temp) * exp;
  return target + (change + temp) * exp;
}

/** Radial analog stick deadzone & progressive response curve */
function applyRadialDeadzone(
  rawX: number,
  rawY: number,
  deadzone: number = 0.1
): [number, number] {
  const mag = Math.hypot(rawX, rawY);
  if (mag < deadzone) return [0, 0];
  const normalizedMag = Math.min(1, (mag - deadzone) / (1 - deadzone));
  const curvedMag = Math.pow(normalizedMag, 1.3);
  return [(rawX / mag) * curvedMag, (rawY / mag) * curvedMag];
}

export function TiltController() {
  const { world } = useRapier();
  const playPhase = useGameStore((s) => s.playPhase);
  const runAttemptId = useGameStore((s) => s.runAttemptId);
  const checkpointRespawnTick = useGameStore((s) => s.checkpointRespawnTick);
  const startRun = useGameStore((s) => s.startRun);
  const respawnAtCheckpoint = useGameStore((s) => s.respawnAtCheckpoint);

  const keys = useRef<{ [key: string]: boolean }>({});
  const pitchVel = useRef({ value: 0 });
  const rollVel = useRef({ value: 0 });

  useEffect(() => {
    pitchVel.current.value = 0;
    rollVel.current.value = 0;
  }, [runAttemptId, checkpointRespawnTick]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const code = e.code;
      keys.current[code] = true;

      if (code === 'KeyR' || code === 'Delete') {
        startRun();
      } else if (code === 'KeyC' || code === 'Backspace') {
        e.preventDefault();
        respawnAtCheckpoint();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keys.current[e.code] = false;
    };

    const clearKeys = () => {
      keys.current = {};
    };

    // Mobile app-switch / tab hide often skips window.blur; visibilitychange is reliable.
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') clearKeys();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clearKeys);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clearKeys);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [startRun, respawnAtCheckpoint]);

  // Run timer = simulated time. It advances once per physics step by that step's length,
  // so it always matches what the simulation did: the old per-frame tick clamped frames to
  // 50 ms while Rapier still simulates up to 500 ms per frame, so hitches gave free time.
  // After-step (not before) so world.timestep is already the fixed 1/120 s, and the store
  // is up to date before this frame's goal/checkpoint/gem sensor events are processed.
  // Physics time of this attempt's world (TiltController mounts with the re-keyed <Physics>).
  const physicsTime = useRef(0);
  useLayoutEffect(() => {
    livePhysics.physicsTimeS = 0;
  }, []);
  useAfterPhysicsStep((stepWorld) => {
    physicsTime.current += stepWorld.timestep;
    livePhysics.physicsTimeS = physicsTime.current;
    const { playPhase: phase, tickTimer } = useGameStore.getState();
    if (phase === 'playing') tickTimer(stepWorld.timestep * 1000);
  });

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);

    let targetPitchInput = 0;
    let targetRollInput = 0;
    let peekYawTarget = 0;
    let peekPitchTarget = 0;

    if (playPhase === 'playing') {
      const k = keys.current;
      if (k['KeyW'] || k['ArrowUp']) targetPitchInput += 1;
      if (k['KeyS'] || k['ArrowDown']) targetPitchInput -= 1;
      if (k['KeyD'] || k['ArrowRight']) targetRollInput += 1;
      if (k['KeyA'] || k['ArrowLeft']) targetRollInput -= 1;

      // Mobile: on-screen joystick uses the same analog path as the gamepad left stick
      const [touchX, touchY] = applyRadialDeadzone(touchInput.stickX, touchInput.stickY, 0.08);
      targetPitchInput -= touchY;
      targetRollInput += touchX;

      // Mobile: device-tilt steering (calibrated, deadzoned and low-passed in touchInput.ts)
      if (touchInput.gyroActive) {
        targetPitchInput -= touchInput.gyroY;
        targetRollInput += touchInput.gyroX;
      }

      if (navigator.getGamepads) {
        const pads = navigator.getGamepads();
        let pad: Gamepad | null = null;
        for (const p of pads) {
          if (p && p.connected) {
            pad = p;
            break;
          }
        }

        if (pad) {
          // Left Stick: 360-degree analog board tilt
          const [stickX, stickY] = applyRadialDeadzone(
            pad.axes[0] ?? 0,
            pad.axes[1] ?? 0,
            0.1
          );
          targetPitchInput -= stickY;
          targetRollInput += stickX;

          // D-Pad fallback for board tilt during gameplay
          if (pad.buttons[12]?.pressed) targetPitchInput += 1;
          if (pad.buttons[13]?.pressed) targetPitchInput -= 1;
          if (pad.buttons[15]?.pressed) targetRollInput += 1;
          if (pad.buttons[14]?.pressed) targetRollInput -= 1;

          // Right Stick: Manual Camera Peek Offset
          const [rStickX, rStickY] = applyRadialDeadzone(
            pad.axes[2] ?? 0,
            pad.axes[3] ?? 0,
            0.12
          );
          peekYawTarget = -rStickX * 0.85;
          peekPitchTarget = rStickY * 0.35;
        }
      }
    }

    // Smooth right-stick camera peek offset
    const peekLerp = 1 - Math.exp(-10 * dt);
    livePhysics.cameraPeekYaw = THREE.MathUtils.lerp(
      livePhysics.cameraPeekYaw,
      peekYawTarget,
      peekLerp
    );
    livePhysics.cameraPeekPitch = THREE.MathUtils.lerp(
      livePhysics.cameraPeekPitch,
      peekPitchTarget,
      peekLerp
    );

    const inputLen = Math.hypot(targetPitchInput, targetRollInput);
    if (inputLen > 1) {
      targetPitchInput /= inputLen;
      targetRollInput /= inputLen;
    }

    const targetPitch = targetPitchInput * MAX_TILT_RAD;
    const targetRoll = targetRollInput * MAX_TILT_RAD;

    const pitchSmoothTime = targetPitchInput === 0 ? 0.14 : 0.19;
    const rollSmoothTime = targetRollInput === 0 ? 0.14 : 0.19;

    livePhysics.tiltPitch = smoothDamp(
      livePhysics.tiltPitch,
      targetPitch,
      pitchVel.current,
      pitchSmoothTime,
      dt
    );
    livePhysics.tiltRoll = smoothDamp(
      livePhysics.tiltRoll,
      targetRoll,
      rollVel.current,
      rollSmoothTime,
      dt
    );

    const pitch = livePhysics.tiltPitch;
    const roll = livePhysics.tiltRoll;
    const yaw = livePhysics.cameraYaw;

    const localGx = BASE_GRAVITY * Math.sin(roll);
    const localGz = -BASE_GRAVITY * Math.sin(pitch);
    const localGy = -BASE_GRAVITY * Math.cos(pitch) * Math.cos(roll);

    const cosYaw = Math.cos(yaw);
    const sinYaw = Math.sin(yaw);

    const worldGx = localGx * cosYaw + localGz * sinYaw;
    const worldGz = -localGx * sinYaw + localGz * cosYaw;

    world.gravity.x = worldGx;
    world.gravity.y = localGy;
    world.gravity.z = worldGz;

    // Rapier puts a resting body to sleep after ~2s, and changing world.gravity
    // does not wake it, so a player who waits after "GO" (common on touch, where
    // you look before you steer) would tilt the board with the orb frozen.
    // Wake sleeping dynamic bodies only while the board is actually tilted.
    if (playPhase === 'playing' && Math.abs(pitch) + Math.abs(roll) > 0.002) {
      world.forEachRigidBody((body) => {
        if (body.isDynamic() && body.isSleeping()) body.wakeUp();
      });
    }
  });

  return null;
}
