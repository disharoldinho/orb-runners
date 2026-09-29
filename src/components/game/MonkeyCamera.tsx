import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { livePhysics, useGameStore } from '../../store/useGameStore';

/** Shortest-path angle delta in [-PI, PI] */
function angleDelta(current: number, target: number): number {
  return THREE.MathUtils.euclideanModulo(target - current + Math.PI, Math.PI * 2) - Math.PI;
}

/** Critically damped 2nd-order angle spring */
function smoothDampAngle(
  current: number,
  target: number,
  velocityRef: { value: number },
  smoothTime: number,
  maxSpeed: number,
  dt: number
): number {
  const delta = angleDelta(current, target);
  const adjustedTarget = current + delta;
  const omega = 2.0 / Math.max(0.0001, smoothTime);
  const x = omega * dt;
  const exp = 1.0 / (1.0 + x + 0.48 * x * x + 0.235 * x * x * x);
  let change = current - adjustedTarget;
  const maxChange = maxSpeed * smoothTime;
  change = THREE.MathUtils.clamp(change, -maxChange, maxChange);
  const tempTarget = current - change;
  const temp = (velocityRef.value + omega * change) * dt;
  velocityRef.value = (velocityRef.value - omega * temp) * exp;
  return tempTarget + (change + temp) * exp;
}

export function MonkeyCamera() {
  const { camera } = useThree();
  const playPhase = useGameStore((s) => s.playPhase);
  const runAttemptId = useGameStore((s) => s.runAttemptId);
  const checkpointRespawnTick = useGameStore((s) => s.checkpointRespawnTick);

  const smoothedPivot = useRef(new THREE.Vector3(0, 1.5, 0));
  const smoothedCamPos = useRef(new THREE.Vector3(0, 4.5, 7.5));
  const smoothedLookAt = useRef(new THREE.Vector3(0, 1.2, -2));
  const smoothedUp = useRef(new THREE.Vector3(0, 1, 0));
  const smoothedFov = useRef(52);
  const visualPitch = useRef(0);
  const visualRoll = useRef(0);
  const yawVelocity = useRef({ value: 0 });

  const falloutFrozenPos = useRef(new THREE.Vector3(0, 5, 6));
  const countdownTimer = useRef(0);
  const goalOrbitAngle = useRef(0);

  useEffect(() => {
    const [bx, by, bz] = livePhysics.ballPosition;
    const yaw = livePhysics.cameraYaw;

    smoothedPivot.current.set(bx, by + 0.35, bz);
    smoothedCamPos.current.set(
      bx + Math.sin(yaw) * 8.5,
      by + 4.8,
      bz + Math.cos(yaw) * 8.5
    );
    smoothedLookAt.current.set(
      bx - Math.sin(yaw) * 1.5,
      by + 0.25,
      bz - Math.cos(yaw) * 1.5
    );
    smoothedUp.current.set(0, 1, 0);
    visualPitch.current = 0;
    visualRoll.current = 0;
    yawVelocity.current.value = 0;
    countdownTimer.current = 0;
    goalOrbitAngle.current = yaw;

    camera.position.copy(smoothedCamPos.current);
    camera.up.set(0, 1, 0);
    camera.lookAt(smoothedLookAt.current);
  }, [runAttemptId, checkpointRespawnTick, camera]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const [bx, by, bz] = livePhysics.ballPosition;
    const [vx, , vz] = livePhysics.ballVelocity;
    const horizSpeed = Math.hypot(vx, vz);
    const totalSpeed = livePhysics.ballSpeed;

    // Velocity-Reactive FOV Warp (52° at rest -> up to 64° at high speed!)
    if (camera instanceof THREE.PerspectiveCamera) {
      const targetFov =
        playPhase === 'playing'
          ? 52 + THREE.MathUtils.clamp((totalSpeed - 2.0) / 14.0, 0, 1) * 12.0
          : 52;
      smoothedFov.current = THREE.MathUtils.lerp(
        smoothedFov.current,
        targetFov,
        1 - Math.exp(-6 * dt)
      );
      if (Math.abs(camera.fov - smoothedFov.current) > 0.05) {
        camera.fov = smoothedFov.current;
        camera.updateProjectionMatrix();
      }
    }

    if (playPhase === 'fallout') {
      const targetLook = new THREE.Vector3(bx, by, bz);
      smoothedLookAt.current.lerp(targetLook, 1 - Math.exp(-6 * dt));
      smoothedCamPos.current.lerp(falloutFrozenPos.current, 1 - Math.exp(-2.5 * dt));
      smoothedUp.current.lerp(new THREE.Vector3(0, 1, 0), 1 - Math.exp(-5 * dt));

      camera.position.copy(smoothedCamPos.current);
      camera.up.copy(smoothedUp.current);
      camera.lookAt(smoothedLookAt.current);
      return;
    }

    if (playPhase === 'goal') {
      goalOrbitAngle.current += dt * 1.1;
      const orbitDist = 4.4;
      const targetPivot = new THREE.Vector3(bx, by + 0.25, bz);
      smoothedPivot.current.lerp(targetPivot, 1 - Math.exp(-6 * dt));

      const desiredGoalCam = new THREE.Vector3(
        smoothedPivot.current.x + Math.sin(goalOrbitAngle.current) * orbitDist,
        smoothedPivot.current.y + 1.65,
        smoothedPivot.current.z + Math.cos(goalOrbitAngle.current) * orbitDist
      );

      smoothedCamPos.current.lerp(desiredGoalCam, 1 - Math.exp(-5 * dt));
      smoothedLookAt.current.lerp(smoothedPivot.current, 1 - Math.exp(-8 * dt));
      smoothedUp.current.lerp(new THREE.Vector3(0, 1, 0), 1 - Math.exp(-6 * dt));

      camera.position.copy(smoothedCamPos.current);
      camera.up.copy(smoothedUp.current);
      camera.lookAt(smoothedLookAt.current);
      return;
    }

    // Smoothly align camera yaw behind the ball's horizontal velocity using a damped spring
    if (playPhase === 'playing' && horizSpeed > 1.8) {
      const currentYaw = livePhysics.cameraYaw;
      const camForwardX = -Math.sin(currentYaw);
      const camForwardZ = -Math.cos(currentYaw);
      const normVx = vx / horizSpeed;
      const normVz = vz / horizSpeed;
      const forwardDot = camForwardX * normVx + camForwardZ * normVz;

      if (forwardDot > -0.25 || horizSpeed > 6.5) {
        const velocityYaw = Math.atan2(-vx, -vz);
        const smoothTime = THREE.MathUtils.lerp(
          0.95,
          0.38,
          THREE.MathUtils.clamp((horizSpeed - 1.8) / 10.0, 0, 1)
        );
        livePhysics.cameraYaw = smoothDampAngle(
          currentYaw,
          velocityYaw,
          yawVelocity.current,
          smoothTime,
          1.65,
          dt
        );
      }
    } else {
      yawVelocity.current.value *= Math.exp(-6 * dt);
    }

    const visualLerp = 1 - Math.exp(-7.5 * dt);
    visualPitch.current = THREE.MathUtils.lerp(
      visualPitch.current,
      livePhysics.tiltPitch,
      visualLerp
    );
    visualRoll.current = THREE.MathUtils.lerp(
      visualRoll.current,
      livePhysics.tiltRoll,
      visualLerp
    );

    const targetPivot = new THREE.Vector3(bx, by + 0.38, bz);
    smoothedPivot.current.lerp(targetPivot, 1 - Math.exp(-10.5 * dt));

    const yaw = livePhysics.cameraYaw;
    const pitch = visualPitch.current;
    const roll = visualRoll.current;

    let baseDist = 7.1;
    let baseElevation = 0.38;
    let extraYaw = livePhysics.cameraPeekYaw;

    if (playPhase === 'countdown') {
      countdownTimer.current += dt;
      const introProgress = THREE.MathUtils.clamp(countdownTimer.current / 1.15, 0, 1);
      const ease = 1 - Math.pow(1 - introProgress, 3);
      baseDist = THREE.MathUtils.lerp(9.8, 7.1, ease);
      baseElevation = THREE.MathUtils.lerp(0.65, 0.38, ease);
      extraYaw += THREE.MathUtils.lerp(0.35, 0, ease);
    }

    const effectiveElevation = THREE.MathUtils.clamp(
      baseElevation + pitch * 0.42 + livePhysics.cameraPeekPitch,
      0.12,
      1.05
    );
    const effectiveYaw = yaw + extraYaw;

    const horizontalDist = baseDist * Math.cos(effectiveElevation);
    const verticalDist = baseDist * Math.sin(effectiveElevation);

    const localOffsetX = -Math.sin(roll * 0.4) * baseDist * 0.16;
    const localOffsetZ = horizontalDist;
    const localOffsetY = verticalDist;

    const cosYaw = Math.cos(effectiveYaw);
    const sinYaw = Math.sin(effectiveYaw);

    const worldOffsetX = localOffsetX * cosYaw + localOffsetZ * sinYaw;
    const worldOffsetZ = -localOffsetX * sinYaw + localOffsetZ * cosYaw;

    const desiredCamPos = new THREE.Vector3(
      smoothedPivot.current.x + worldOffsetX,
      smoothedPivot.current.y + localOffsetY,
      smoothedPivot.current.z + worldOffsetZ
    );

    smoothedCamPos.current.lerp(desiredCamPos, 1 - Math.exp(-12 * dt));
    camera.position.copy(smoothedCamPos.current);

    falloutFrozenPos.current.copy(smoothedCamPos.current).add(new THREE.Vector3(0, 1.8, 0));

    const rollAngle = roll * 0.36;
    const localUpX = -Math.sin(rollAngle);
    const localUpY = Math.cos(rollAngle);
    const desiredUp = new THREE.Vector3(
      localUpX * cosYaw,
      localUpY,
      -localUpX * sinYaw
    ).normalize();

    smoothedUp.current.lerp(desiredUp, 1 - Math.exp(-10 * dt)).normalize();
    camera.up.copy(smoothedUp.current);

    const lookAheadDist = 1.45;
    const desiredLookTarget = new THREE.Vector3(
      smoothedPivot.current.x - Math.sin(effectiveYaw) * lookAheadDist,
      smoothedPivot.current.y + 0.12 - Math.sin(pitch) * 0.32,
      smoothedPivot.current.z - Math.cos(effectiveYaw) * lookAheadDist
    );

    smoothedLookAt.current.lerp(desiredLookTarget, 1 - Math.exp(-14 * dt));
    camera.lookAt(smoothedLookAt.current);
  });

  return null;
}
