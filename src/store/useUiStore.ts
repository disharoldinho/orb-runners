import { create } from 'zustand';
import { disableGyro, enableGyro, recalibrateGyro } from '../input/touchInput';

/** Transient UI-only state (never persisted, never touches gameplay). */
interface UiState {
  /** In-run menu sheet (settings, leaderboard, secondary actions). */
  menuOpen: boolean;
  gyroOn: boolean;
  toast: string | null;
  setMenuOpen: (open: boolean) => void;
  toggleMenu: () => void;
  showToast: (msg: string) => void;
  toggleGyro: () => Promise<void>;
  recalibrate: () => void;
  resetGyro: () => void;
}

let toastTimer = 0;

export const useUiStore = create<UiState>((set, get) => ({
  menuOpen: false,
  gyroOn: false,
  toast: null,
  setMenuOpen: (menuOpen) => set({ menuOpen }),
  toggleMenu: () => set({ menuOpen: !get().menuOpen }),
  showToast: (toast) => {
    window.clearTimeout(toastTimer);
    set({ toast });
    toastTimer = window.setTimeout(() => set({ toast: null }), 2600);
  },
  toggleGyro: async () => {
    if (get().gyroOn) {
      disableGyro();
      set({ gyroOn: false });
      get().showToast('Tilt steering off');
      return;
    }
    const result = await enableGyro(); // must run inside the tap handler (iOS permission)
    if (result.ok) {
      set({ gyroOn: true });
      get().showToast('Tilt steering on: current angle set as level');
    } else {
      get().showToast(result.reason);
    }
  },
  recalibrate: () => {
    recalibrateGyro();
    get().showToast('Level recalibrated');
  },
  resetGyro: () => {
    disableGyro();
    set({ gyroOn: false, menuOpen: false });
  },
}));
