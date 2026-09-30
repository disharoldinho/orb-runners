/**
 * Shared mutable mobile input state, read by TiltController inside useFrame
 * (same pattern as `livePhysics`, so touch/gyro updates never re-render React).
 *
 * Conventions match the gamepad left stick: x = right, y = down, range [-1, 1].
 */
export const touchInput = {
  /** Virtual joystick deflection (raw; TiltController applies the radial deadzone). */
  stickX: 0,
  stickY: 0,
  /** Device-tilt steering, already calibrated, deadzoned and smoothed. */
  gyroX: 0,
  gyroY: 0,
  gyroActive: false,
};

/** True on phones/tablets (coarse primary pointer). `?touch=1` forces it on for testing. */
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const param = new URLSearchParams(window.location.search).get('touch');
  if (param === '1') return true;
  if (param === '0') return false;
  return window.matchMedia?.('(pointer: coarse)').matches ?? false;
}

// ---------------------------------------------------------------------------
// Device-orientation (gyro) steering
// ---------------------------------------------------------------------------

/** Phone tilt (degrees from the calibrated neutral) that maps to full board tilt. */
const GYRO_FULL_TILT_DEG = 22;
/** Radial deadzone as a fraction of full tilt (~2.2 degrees). */
const GYRO_DEADZONE = 0.1;
/** Low-pass time constant (s) to filter sensor jitter before TiltController's own smoothing. */
const GYRO_SMOOTH_TIME = 0.07;

type PermissionFn = () => Promise<'granted' | 'denied' | 'default'>;

let latestBeta: number | null = null;
let latestGamma: number | null = null;
let neutral: { beta: number; gamma: number } | null = null;
let lastEventTime = 0;
let listening = false;

function wrapDeg(d: number): number {
  return ((((d + 180) % 360) + 360) % 360) - 180;
}

function screenAngle(): number {
  const a =
    window.screen?.orientation?.angle ??
    (window as unknown as { orientation?: number }).orientation ??
    0;
  return ((a % 360) + 360) % 360;
}

/**
 * Convert beta/gamma deltas (device frame) into screen-relative
 * [right, forward] tilt, accounting for the current screen rotation.
 * forward = top edge of the screen tipped away from the player.
 */
function toScreenTilt(dBeta: number, dGamma: number): [number, number] {
  switch (screenAngle()) {
    case 90:
      return [dBeta, dGamma];
    case 180:
      return [-dGamma, dBeta];
    case 270:
      return [-dBeta, -dGamma];
    default:
      return [dGamma, -dBeta];
  }
}

function onOrientation(e: DeviceOrientationEvent) {
  if (e.beta == null || e.gamma == null) return;
  latestBeta = e.beta;
  latestGamma = e.gamma;
  if (!neutral) neutral = { beta: e.beta, gamma: e.gamma };

  const [right, forward] = toScreenTilt(
    wrapDeg(e.beta - neutral.beta),
    wrapDeg(e.gamma - neutral.gamma)
  );
  let x = right / GYRO_FULL_TILT_DEG;
  let y = -forward / GYRO_FULL_TILT_DEG; // y = down, like a stick
  const mag = Math.hypot(x, y);
  if (mag < GYRO_DEADZONE) {
    x = 0;
    y = 0;
  } else {
    const scaled = Math.min(1, (mag - GYRO_DEADZONE) / (1 - GYRO_DEADZONE));
    x = (x / mag) * scaled;
    y = (y / mag) * scaled;
  }

  const now = performance.now();
  const dt = lastEventTime ? Math.min(0.1, (now - lastEventTime) / 1000) : 0.016;
  lastEventTime = now;
  const k = 1 - Math.exp(-dt / GYRO_SMOOTH_TIME);
  touchInput.gyroX += (x - touchInput.gyroX) * k;
  touchInput.gyroY += (y - touchInput.gyroY) * k;
}

/** Re-zero on rotation: the neutral pose in the new orientation is different. */
function onScreenRotate() {
  recalibrateGyro();
}

export function gyroSupported(): boolean {
  return typeof window !== 'undefined' && 'DeviceOrientationEvent' in window;
}

/**
 * Enable gyro steering. Must be called from a user gesture (tap) so iOS can
 * show its motion-permission prompt. Calibrates neutral to the current pose.
 */
export async function enableGyro(): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!gyroSupported()) return { ok: false, reason: 'Device tilt is not supported on this device.' };
  if (!window.isSecureContext) {
    return { ok: false, reason: 'Device tilt needs an HTTPS connection.' };
  }
  const requestPermission = (DeviceOrientationEvent as unknown as { requestPermission?: PermissionFn })
    .requestPermission;
  if (typeof requestPermission === 'function') {
    try {
      const result = await requestPermission();
      if (result !== 'granted') return { ok: false, reason: 'Motion access was not allowed.' };
    } catch {
      return { ok: false, reason: 'Motion access was not allowed.' };
    }
  }
  if (!listening) {
    window.addEventListener('deviceorientation', onOrientation);
    window.screen?.orientation?.addEventListener?.('change', onScreenRotate);
    window.addEventListener('orientationchange', onScreenRotate);
    listening = true;
  }
  recalibrateGyro();
  touchInput.gyroActive = true;
  return { ok: true };
}

export function disableGyro() {
  if (listening) {
    window.removeEventListener('deviceorientation', onOrientation);
    window.screen?.orientation?.removeEventListener?.('change', onScreenRotate);
    window.removeEventListener('orientationchange', onScreenRotate);
    listening = false;
  }
  touchInput.gyroActive = false;
  touchInput.gyroX = 0;
  touchInput.gyroY = 0;
  neutral = null;
  latestBeta = null;
  latestGamma = null;
  lastEventTime = 0;
}

/** Treat the phone's current angle as "level". */
export function recalibrateGyro() {
  neutral = latestBeta != null && latestGamma != null ? { beta: latestBeta, gamma: latestGamma } : null;
  touchInput.gyroX = 0;
  touchInput.gyroY = 0;
}

/**
 * When the tab/app is backgrounded the last stick/gyro sample would keep tilting
 * the board (phones especially — orientation keeps firing in a pocket). Zero
 * deflections on hide; on resume, re-zero gyro so the new resting pose is level.
 */
function onVisibilityChange() {
  if (typeof document === 'undefined') return;
  if (document.visibilityState === 'hidden') {
    touchInput.stickX = 0;
    touchInput.stickY = 0;
    touchInput.gyroX = 0;
    touchInput.gyroY = 0;
    lastEventTime = 0;
    return;
  }
  if (touchInput.gyroActive) {
    recalibrateGyro();
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', onVisibilityChange);
}
