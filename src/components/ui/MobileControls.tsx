import { useCallback, useEffect, useRef, useState } from 'react';
import { Crosshair, Flag, RotateCcw, Smartphone, X } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';
import {
  disableGyro,
  enableGyro,
  gyroSupported,
  recalibrateGyro,
  touchInput,
} from '../../input/touchInput';

/** Max knob travel in px; full deflection = full board tilt (MAX_TILT_RAD). */
const STICK_RADIUS = 52;

/**
 * Floating virtual joystick: touching anywhere in the bottom-left zone places
 * the stick under the thumb; dragging feeds `touchInput.stickX/Y` (gamepad
 * left-stick convention: x right, y down).
 */
function VirtualJoystick() {
  const zoneRef = useRef<HTMLDivElement>(null);
  const baseRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const pointerId = useRef<number | null>(null);
  const origin = useRef({ x: 0, y: 0 });
  const [active, setActive] = useState(false);

  const reset = useCallback(() => {
    pointerId.current = null;
    touchInput.stickX = 0;
    touchInput.stickY = 0;
    if (knobRef.current) knobRef.current.style.transform = 'translate(-50%, -50%)';
    if (baseRef.current) {
      baseRef.current.style.left = '';
      baseRef.current.style.top = '';
    }
    setActive(false);
  }, []);

  // Never leave the board tilted if the component unmounts mid-drag.
  useEffect(() => reset, [reset]);

  const update = (clientX: number, clientY: number) => {
    let dx = clientX - origin.current.x;
    let dy = clientY - origin.current.y;
    const dist = Math.hypot(dx, dy);
    if (dist > STICK_RADIUS) {
      dx = (dx / dist) * STICK_RADIUS;
      dy = (dy / dist) * STICK_RADIUS;
    }
    touchInput.stickX = dx / STICK_RADIUS;
    touchInput.stickY = dy / STICK_RADIUS;
    if (knobRef.current) {
      knobRef.current.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    }
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerId.current !== null || !zoneRef.current || !baseRef.current) return;
    e.preventDefault();
    pointerId.current = e.pointerId;
    zoneRef.current.setPointerCapture(e.pointerId);
    const zoneRect = zoneRef.current.getBoundingClientRect();
    origin.current = { x: e.clientX, y: e.clientY };
    baseRef.current.style.left = `${e.clientX - zoneRect.left}px`;
    baseRef.current.style.top = `${e.clientY - zoneRect.top}px`;
    setActive(true);
    update(e.clientX, e.clientY);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== pointerId.current) return;
    update(e.clientX, e.clientY);
  };

  const onPointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== pointerId.current) return;
    reset();
  };

  return (
    <div
      ref={zoneRef}
      className="joystick-zone"
      data-testid="virtual-joystick"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onLostPointerCapture={onPointerEnd}
    >
      <div ref={baseRef} className={`joystick-base ${active ? 'active' : ''}`}>
        <div ref={knobRef} className="joystick-knob" />
      </div>
    </div>
  );
}

/** On-screen controls for touch devices, shown only while playing. */
export function MobileControls() {
  const startRun = useGameStore((s) => s.startRun);
  const respawnAtCheckpoint = useGameStore((s) => s.respawnAtCheckpoint);
  const crossedCheckpoints = useGameStore((s) => s.crossedCheckpoints.length);
  const playPhase = useGameStore((s) => s.playPhase);

  const [gyroOn, setGyroOn] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [isPortrait, setIsPortrait] = useState(false);
  const [hideRotateHint, setHideRotateHint] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(orientation: portrait)');
    const sync = () => setIsPortrait(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  // Turn the gyro listener off when leaving the stage.
  useEffect(() => () => disableGyro(), []);

  // iOS Safari ignores user-scalable=no for pinch; block its gesture events during play.
  useEffect(() => {
    const prevent = (e: Event) => e.preventDefault();
    document.addEventListener('gesturestart', prevent, { passive: false });
    return () => document.removeEventListener('gesturestart', prevent);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(id);
  }, [toast]);

  const toggleGyro = async () => {
    if (gyroOn) {
      disableGyro();
      setGyroOn(false);
      setToast('Tilt steering off');
      return;
    }
    const result = await enableGyro(); // called directly from the tap (iOS permission)
    if (result.ok) {
      setGyroOn(true);
      setToast('Tilt steering on: current angle set as level');
    } else {
      setToast(result.reason);
    }
  };

  const recalibrate = () => {
    recalibrateGyro();
    setToast('Level recalibrated');
  };

  if (playPhase === 'goal') return null;

  return (
    <div className="mobile-controls">
      <VirtualJoystick />

      <div className="mobile-action-cluster">
        {gyroSupported() && (
          <div className="mobile-gyro-row">
            {gyroOn && (
              <button className="mobile-btn small" onClick={recalibrate} aria-label="Recalibrate tilt">
                <Crosshair size={18} />
                <span>Level</span>
              </button>
            )}
            <button
              className={`mobile-btn small ${gyroOn ? 'on' : ''}`}
              onClick={toggleGyro}
              aria-pressed={gyroOn}
              aria-label="Toggle tilt steering"
            >
              <Smartphone size={18} />
              <span>Tilt {gyroOn ? 'On' : 'Off'}</span>
            </button>
          </div>
        )}
        <div className="mobile-main-row">
          <button className="mobile-btn" onClick={startRun} aria-label="Reset stage">
            <RotateCcw size={22} />
            <span>Reset</span>
          </button>
          <button
            className="mobile-btn primary"
            onClick={respawnAtCheckpoint}
            aria-label="Respawn at checkpoint"
          >
            <Flag size={22} />
            <span>{crossedCheckpoints > 0 ? 'Respawn' : 'Restart'}</span>
          </button>
        </div>
      </div>

      {toast && <div className="mobile-toast">{toast}</div>}

      {isPortrait && !hideRotateHint && (
        <div className="rotate-hint">
          <Smartphone size={16} className="rotate-hint-icon" />
          <span>Rotate to landscape for a wider view</span>
          <button onClick={() => setHideRotateHint(true)} aria-label="Dismiss">
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
