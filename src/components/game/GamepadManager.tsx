import { useEffect, useRef } from 'react';
import { MAPS } from '../../levels/maps';
import { useGameStore } from '../../store/useGameStore';
import { useUiStore } from '../../store/useUiStore';

/**
 * Global Gamepad / Controller listener that runs at 60fps across all screens
 * (Main Menu, Character Creator, and In-Game HUD/Physics).
 * Supports Xbox, PlayStation (DualShock/DualSense), Switch Pro, and generic controllers.
 */
export function GamepadManager() {
  const prevButtons = useRef<boolean[]>(new Array(20).fill(false));

  useEffect(() => {
    const onConnect = (e: GamepadEvent) => {
      useGameStore.getState().setGamepadStatus(true, e.gamepad.id);
    };

    const onDisconnect = () => {
      const pads = navigator.getGamepads ? Array.from(navigator.getGamepads()).filter(Boolean) : [];
      if (pads.length === 0) {
        useGameStore.getState().setGamepadStatus(false, null);
      }
    };

    window.addEventListener('gamepadconnected', onConnect);
    window.addEventListener('gamepaddisconnected', onDisconnect);

    let rafId = 0;

    const pollGamepad = () => {
      if (navigator.getGamepads) {
        const pads = navigator.getGamepads();
        let activePad: Gamepad | null = null;
        for (const p of pads) {
          if (p && p.connected) {
            activePad = p;
            break;
          }
        }

        const state = useGameStore.getState();

        if (activePad) {
          if (!state.gamepadConnected) {
            state.setGamepadStatus(true, activePad.id);
          }

          const pressed = (idx: number): boolean => Boolean(activePad?.buttons[idx]?.pressed);
          const justPressed = (idx: number): boolean =>
            pressed(idx) && !prevButtons.current[idx];

          // ================= IN-GAME CONTROLLER ACTIONS =================
          if (state.screen === 'playing') {
            // Y (3) or RB (5): Instant Full-Track Reset (00:00.000)
            if (justPressed(3) || justPressed(5)) {
              state.startRun();
            }

            // B (1) or LB (4): Standing Checkpoint Respawn!
            if (justPressed(1) || justPressed(4)) {
              if (state.playPhase === 'goal') {
                state.setScreen('menu');
              } else {
                state.respawnAtCheckpoint();
              }
            }

            // X (2): Toggle Personal Best Ghost
            if (justPressed(2)) {
              state.toggleGhost();
            }

            // A (0): On Goal screen, advance to Next Stage (or Replay on final map)
            if (justPressed(0) && state.playPhase === 'goal') {
              if (state.currentLevelId < MAPS.length) {
                state.selectLevel(state.currentLevelId + 1);
              } else {
                state.startRun();
              }
            }

            // Back / Select (8): Return to Stage Select Menu
            if (justPressed(8)) {
              state.setScreen('menu');
            }

            // Start (9): open / close the run menu sheet
            if (justPressed(9) && state.playPhase !== 'goal') {
              useUiStore.getState().toggleMenu();
            }
          }

          // ================= MAIN MENU CONTROLLER NAVIGATION =================
          else if (state.screen === 'menu') {
            // D-Pad Left (14) / Right (15) / Up (12) / Down (13) cycles selected stage
            if (justPressed(15) || justPressed(13)) {
              const nextId = state.currentLevelId < MAPS.length ? state.currentLevelId + 1 : 1;
              useGameStore.setState({ currentLevelId: nextId });
            }
            if (justPressed(14) || justPressed(12)) {
              const prevId = state.currentLevelId > 1 ? state.currentLevelId - 1 : MAPS.length;
              useGameStore.setState({ currentLevelId: prevId });
            }

            // A (0) or Start (9): Launch highlighted stage!
            if (justPressed(0) || justPressed(9)) {
              state.selectLevel(state.currentLevelId);
            }

            // X (2): Open Character Creator Studio
            if (justPressed(2)) {
              state.setScreen('character-creator');
            }
          }

          // ================= CHARACTER CREATOR CONTROLLER ACTIONS =================
          else if (state.screen === 'character-creator') {
            // B (1) or Back (8): Return to Main Menu
            if (justPressed(1) || justPressed(8)) {
              state.setScreen('menu');
            }
          }

          // Save button states for edge detection on next frame
          for (let i = 0; i < 20; i++) {
            prevButtons.current[i] = pressed(i);
          }
        }
      }

      rafId = requestAnimationFrame(pollGamepad);
    };

    rafId = requestAnimationFrame(pollGamepad);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('gamepadconnected', onConnect);
      window.removeEventListener('gamepaddisconnected', onDisconnect);
    };
  }, []);

  return null;
}
