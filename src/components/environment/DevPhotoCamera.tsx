import { useFrame } from '@react-three/fiber';

declare global {
  interface Window {
    __orbCam?: { pos: [number, number, number]; look: [number, number, number] } | null;
  }
}

/**
 * Dev-only photo camera for screenshot tooling: when `window.__orbCam` is set, it
 * overrides the chase camera for that frame. Stripped from production builds.
 */
export function DevPhotoCamera() {
  useFrame(({ camera }) => {
    const c = typeof window !== 'undefined' ? window.__orbCam : null;
    if (!c) return;
    camera.position.set(...c.pos);
    camera.lookAt(...c.look);
  });
  return null;
}
