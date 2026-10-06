/**
 * Procedural WebAudio sound effects.
 *
 * All voices run through one master bus (gain -> soft limiter) so overlapping effects never
 * clip, every voice gets a 4 ms attack (no onset clicks) and a clean exponential release,
 * repeated triggers of the same effect inside a few ms are merged, and the context is
 * unlocked on the first user gesture (iOS/Safari start it suspended) and suspended while
 * the tab is hidden.
 */

type Wave = OscillatorType;
interface Voice {
  type: Wave;
  /** Start frequency (Hz) and optional [time offset (s), Hz, 'exp' | 'step'] changes. */
  freq: number;
  changes?: [number, number, 'exp' | 'step'][];
  peak: number;
  /** Seconds until the voice has decayed to silence. */
  dur: number;
  /** Start delay (s) relative to "now". */
  delay?: number;
}

const ATTACK_S = 0.004;
/** Same-effect retriggers closer than this are merged (e.g. two bumper contacts in a frame). */
const RETRIGGER_S = 0.045;

class SoundManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private lastPlayed = new Map<string, number>();
  private _muted = false;
  private unlockBound = false;

  public get muted() {
    return this._muted;
  }
  public set muted(v: boolean) {
    this._muted = v;
    // Muting mid-sound silences it immediately (smoothly) instead of letting it ring out.
    if (this.ctx && this.master) {
      const now = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setTargetAtTime(v ? 0 : 1, now, 0.015);
    }
  }

  constructor() {
    this.bindUnlock();
  }

  /** Create/resume the context inside the first user gesture (required on iOS). */
  private bindUnlock() {
    if (this.unlockBound || typeof window === 'undefined') return;
    this.unlockBound = true;
    const unlock = () => {
      if (this._muted) return; // try again on a later gesture once unmuted
      const ctx = this.ensureContext();
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      // Play a silent 1-sample buffer: fully unlocks output on older iOS.
      try {
        const src = ctx.createBufferSource();
        src.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
        src.connect(ctx.destination);
        src.start(0);
      } catch {
        // ignore
      }
      if (ctx.state !== 'suspended') {
        window.removeEventListener('pointerdown', unlock, true);
        window.removeEventListener('keydown', unlock, true);
        window.removeEventListener('touchend', unlock, true);
      }
    };
    window.addEventListener('pointerdown', unlock, true);
    window.addEventListener('keydown', unlock, true);
    window.addEventListener('touchend', unlock, true);
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (!this.ctx) return;
        if (document.visibilityState === 'hidden') this.ctx.suspend().catch(() => {});
        else if (!this._muted) this.ctx.resume().catch(() => {});
      });
    }
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      try {
        this.ctx = new AudioCtx();
      } catch {
        return null;
      }
      const limiter = this.ctx.createDynamicsCompressor();
      limiter.threshold.value = -10;
      limiter.knee.value = 8;
      limiter.ratio.value = 12;
      limiter.attack.value = 0.002;
      limiter.release.value = 0.12;
      this.master = this.ctx.createGain();
      this.master.gain.value = this._muted ? 0 : 1;
      this.master.connect(limiter);
      limiter.connect(this.ctx.destination);
    }
    return this.ctx;
  }

  private getContext(): AudioContext | null {
    if (this._muted) return null;
    const ctx = this.ensureContext();
    if (!ctx) return null;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
      // Still suspended (no gesture yet / tab hidden): skip instead of queueing a late blip.
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return null;
    }
    return ctx;
  }

  private play(id: string, voices: Voice[]) {
    const ctx = this.getContext();
    if (!ctx || !this.master) return;
    const now = ctx.currentTime;
    const last = this.lastPlayed.get(id);
    if (last !== undefined && now - last < RETRIGGER_S && now >= last) return;
    this.lastPlayed.set(id, now);
    for (const v of voices) {
      const t0 = now + (v.delay ?? 0);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = v.type;
      osc.frequency.setValueAtTime(v.freq, t0);
      for (const [dt, f, mode] of v.changes ?? []) {
        if (mode === 'exp') osc.frequency.exponentialRampToValueAtTime(f, t0 + dt);
        else osc.frequency.setValueAtTime(f, t0 + dt);
      }
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.linearRampToValueAtTime(v.peak, t0 + ATTACK_S);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + v.dur);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(t0);
      osc.stop(t0 + v.dur + 0.02);
      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
      };
    }
  }

  /** Trigger dual-motor controller haptic vibration when a Gamepad is connected */
  public triggerRumble(durationMs: number = 90, strongMagnitude: number = 0.5, weakMagnitude: number = 0.5) {
    if (typeof navigator === 'undefined' || !navigator.getGamepads) return;
    try {
      const pads = navigator.getGamepads();
      for (const pad of pads) {
        if (!pad) continue;
        const actuator = (
          pad as unknown as {
            vibrationActuator?: {
              playEffect?: (
                type: string,
                params: { startDelay: number; duration: number; weakMagnitude: number; strongMagnitude: number }
              ) => Promise<void>;
            };
          }
        ).vibrationActuator;
        if (actuator && typeof actuator.playEffect === 'function') {
          actuator
            .playEffect('dual-rumble', { startDelay: 0, duration: durationMs, weakMagnitude, strongMagnitude })
            .catch(() => {});
        }
      }
    } catch {
      // ignore unsupported vibration errors
    }
  }

  public playCountdownBeep(isFinalGo: boolean = false) {
    if (isFinalGo) this.triggerRumble(110, 0.45, 0.65);
    this.play(isFinalGo ? 'go' : 'ready', [
      isFinalGo
        ? { type: 'triangle', freq: 880, changes: [[0.18, 1320, 'exp']], peak: 0.18, dur: 0.35 }
        : { type: 'sine', freq: 440, peak: 0.18, dur: 0.18 },
    ]);
  }

  public playBumperBoing() {
    this.triggerRumble(145, 0.85, 0.55);
    this.play('bumper', [
      {
        type: 'sine',
        freq: 220,
        changes: [
          [0.12, 680, 'exp'],
          [0.28, 340, 'exp'],
        ],
        peak: 0.25,
        dur: 0.28,
      },
    ]);
  }

  public playCheckpointSplit(isAhead: boolean = true) {
    this.triggerRumble(85, 0.35, 0.75);
    // Crisp Trackmania two-tone electronic split chime
    const freqs = isAhead ? [587.33, 880.0, 1174.66] : [523.25, 659.25, 783.99];
    this.play(
      'split',
      freqs.map((f, i) => ({ type: 'triangle' as Wave, freq: f, peak: 0.18, dur: 0.22, delay: i * 0.045 }))
    );
  }

  public playCheckpointRespawn() {
    this.triggerRumble(95, 0.5, 0.4);
    this.play('respawn', [{ type: 'sine', freq: 330, changes: [[0.14, 660, 'exp']], peak: 0.16, dur: 0.16 }]);
  }

  public playSwitchActivate() {
    this.triggerRumble(100, 0.45, 0.6);
    this.play(
      'switch',
      [523.25, 659.25, 783.99, 1046.5].map((f, i) => ({
        type: 'triangle' as Wave,
        freq: f,
        peak: 0.16,
        dur: 0.18,
        delay: i * 0.05,
      }))
    );
  }

  public playGemPickup() {
    this.triggerRumble(55, 0.2, 0.55);
    this.play('gem', [{ type: 'sine', freq: 987.77, changes: [[0.07, 1318.51, 'step']], peak: 0.18, dur: 0.25 }]);
  }

  public playGoalFanfare() {
    this.triggerRumble(280, 0.9, 0.9);
    this.play(
      'goal',
      [523.25, 659.25, 783.99, 1046.5, 1318.5].map((f, i) => ({
        type: 'triangle' as Wave,
        freq: f,
        peak: 0.2,
        dur: 0.55,
        delay: i * 0.07,
      }))
    );
  }

  public playFallout() {
    this.triggerRumble(220, 0.7, 0.3);
    this.play('fallout', [{ type: 'sawtooth', freq: 420, changes: [[0.55, 95, 'exp']], peak: 0.16, dur: 0.55 }]);
  }

  public playBoostPad() {
    this.triggerRumble(130, 0.75, 0.95);
    this.play('boost', [{ type: 'sawtooth', freq: 180, changes: [[0.24, 1120, 'exp']], peak: 0.19, dur: 0.28 }]);
  }

  public playJumpPad() {
    this.triggerRumble(150, 0.9, 0.6);
    this.play('jump', [{ type: 'triangle', freq: 190, changes: [[0.19, 760, 'exp']], peak: 0.24, dur: 0.24 }]);
  }

  public playEmotePop() {
    this.triggerRumble(45, 0.15, 0.35);
    this.play('emote', [{ type: 'sine', freq: 520, changes: [[0.09, 880, 'exp']], peak: 0.14, dur: 0.11 }]);
  }
}

export const soundFX = new SoundManager();
