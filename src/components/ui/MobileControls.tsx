import { useCallback, useEffect, useRef, useState } from 'react';
import { getLevelById, useGameStore } from '../../store/useGameStore';
import { useUiStore } from '../../store/useUiStore';
import { touchInput } from '../../input/touchInput';
import { Icon } from './icons';

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
      {!active && <span className="joystick-hint">Drag to tilt</span>}
    </div>
  );
}

/**
 * On-screen controls for touch devices, shown only while playing.
 * Deliberately minimal: a floating stick on the left, one big retry/respawn
 * button on the right (plus a small full-restart once a checkpoint is banked).
 * Exit, tilt steering, sound, ghost and graphics live in the run menu sheet.
 */
export function MobileControls() {
  const startRun = useGameStore((s) => s.startRun);
  const respawnAtCheckpoint = useGameStore((s) => s.respawnAtCheckpoint);
  const crossedCheckpoints = useGameStore((s) => s.crossedCheckpoints.length);
  const playPhase = useGameStore((s) => s.playPhase);
  const currentLevelId = useGameStore((s) => s.currentLevelId);
  const isSummit = Boolean(getLevelById(currentLevelId).isSummitMode);
  const gyroOn = useUiStore((s) => s.gyroOn);
  const recalibrate = useUiStore((s) => s.recalibrate);
  const toast = useUiStore((s) => s.toast);
  const menuOpen = useUiStore((s) => s.menuOpen);
  const resetGyro = useUiStore((s) => s.resetGyro);

  const [isPortrait, setIsPortrait] = useState(false);
  const [showRotateHint, setShowRotateHint] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia('(orientation: portrait)');
    const sync = () => setIsPortrait(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  // The rotate suggestion is a one-off nudge, not a permanent banner.
  useEffect(() => {
    const id = window.setTimeout(() => setShowRotateHint(false), 6000);
    return () => window.clearTimeout(id);
  }, []);

  // Turn the gyro listener off when leaving the stage.
  useEffect(() => () => resetGyro(), [resetGyro]);

  // iOS Safari ignores user-scalable=no for pinch; block its gesture events during play.
  useEffect(() => {
    const prevent = (e: Event) => e.preventDefault();
    document.addEventListener('gesturestart', prevent, { passive: false });
    return () => document.removeEventListener('gesturestart', prevent);
  }, []);

  if (playPhase === 'goal') return null;

  const banked = crossedCheckpoints > 0;

  return (
    <div className={`touch-controls ${menuOpen ? 'is-hidden' : ''}`}>
      <VirtualJoystick />

      <div className="touch-cluster">
        {gyroOn && (
          <button
            className="touch-btn small"
            onClick={recalibrate}
            aria-label="Recalibrate tilt level"
          >
            <Icon name="level" size={20} />
          </button>
        )}
        {banked && (
          <button
            className="touch-btn small"
            onClick={startRun}
            aria-label={isSummit ? 'Restart climb from the bottom' : 'Restart stage'}
          >
            <Icon name="restart" size={20} />
          </button>
        )}
        <button
          className="touch-btn big"
          onClick={respawnAtCheckpoint}
          aria-label={banked ? 'Respawn at last checkpoint' : 'Retry from start'}
          data-testid="touch-respawn"
        >
          <Icon name={banked ? 'flag' : 'restart'} size={30} />
          <span>{banked ? (isSummit ? 'Camp' : 'Respawn') : 'Retry'}</span>
        </button>
      </div>

      {toast && <div className="touch-toast">{toast}</div>}

      {isPortrait && showRotateHint && (
        <button className="rotate-hint" onClick={() => setShowRotateHint(false)}>
          <Icon name="rotate" size={18} />
          <span>Landscape gives a wider view</span>
        </button>
      )}
    </div>
  );
}
