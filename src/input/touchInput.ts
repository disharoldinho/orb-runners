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

type Vec3 = [number, number, number];

/** Latest world-up direction in device coordinates (x right, y top edge, z out of screen). */
let latestUp: Vec3 | null = null;
/** Calibrated "level" frame in device coordinates: neutral up + screen-aligned axes. */
let neutral: { up: Vec3; right: Vec3; forward: Vec3 } | null = null;
let lastEventTime = 0;
let listening = false;

const DEG = Math.PI / 180;
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
function normalize(v: Vec3): Vec3 {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}

function screenAngle(): number {
  const a =
    window.screen?.orientation?.angle ??
    (window as unknown as { orientation?: number }).orientation ??
    0;
  return ((a % 360) + 360) % 360;
}

/**
 * World "up" in device coordinates from the W3C Z-X'-Y'' Euler angles. Unlike raw
 * beta/gamma deltas this has no gimbal flip: gamma jumps 90 -> -90 (and beta by 180) when
 * the phone passes vertical, which used to throw full opposite tilt when holding the phone
 * upright in landscape. Alpha (compass heading) does not affect gravity.
 */
function deviceUp(betaDeg: number, gammaDeg: number): Vec3 {
  const b = betaDeg * DEG;
  const g = gammaDeg * DEG;
  return [-Math.cos(b) * Math.sin(g), Math.sin(b), Math.cos(b) * Math.cos(g)];
}

/** Screen right / top directions in device coordinates for a screen rotation. */
function screenAxes(angle = screenAngle()): { right: Vec3; top: Vec3 } {
  switch (angle) {
    case 90:
      return { right: [0, -1, 0], top: [1, 0, 0] };
    case 180:
      return { right: [-1, 0, 0], top: [0, -1, 0] };
    case 270:
      return { right: [0, 1, 0], top: [-1, 0, 0] };
    default:
      return { right: [1, 0, 0], top: [0, 1, 0] };
  }
}

/** Level frame: neutral up plus the screen axes made orthogonal to it. */
function makeNeutral(up: Vec3, axes = screenAxes()) {
  const { right: sr, top: st } = axes;
  const r = normalize([sr[0] - dot(sr, up) * up[0], sr[1] - dot(sr, up) * up[1], sr[2] - dot(sr, up) * up[2]]);
  let f: Vec3 = [
    st[0] - dot(st, up) * up[0] - dot(st, r) * r[0],
    st[1] - dot(st, up) * up[1] - dot(st, r) * r[1],
    st[2] - dot(st, up) * up[2] - dot(st, r) * r[2],
  ];
  f = normalize(f);
  return { up, right: r, forward: f };
}

/**
 * Tilt (degrees) relative to the calibrated level pose: right edge down => +right, top edge
 * tipped away => +forward (world up leans toward the raised side in device coordinates).
 */
function tiltDeg(up: Vec3, n: { right: Vec3; forward: Vec3 }): [number, number] {
  const asinDeg = (v: number) => Math.asin(Math.max(-1, Math.min(1, v))) / DEG;
  return [asinDeg(-dot(up, n.right)), asinDeg(-dot(up, n.forward))];
}

function onOrientation(e: DeviceOrientationEvent) {
  if (e.beta == null || e.gamma == null) return;
  const up = deviceUp(e.beta, e.gamma);
  latestUp = up;
  if (!neutral) neutral = makeNeutral(up);

  const [right, forward] = tiltDeg(up, neutral);
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

/** Exposed for tests: [right, forward] tilt in degrees for a pose vs. a neutral pose. */
export function gyroTiltDeg(
  neutralBetaGamma: [number, number],
  betaGamma: [number, number],
  angle = 0
): [number, number] {
  const n = makeNeutral(deviceUp(...neutralBetaGamma), screenAxes(angle));
  return tiltDeg(deviceUp(...betaGamma), n);
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
  latestUp = null;
  lastEventTime = 0;
}

/** Treat the phone's current angle as "level". */
export function recalibrateGyro() {
  neutral = latestUp ? makeNeutral(latestUp) : null;
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
