import { useEffect } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';

declare global {
  interface Window {
    __orbCam?: { pos: [number, number, number]; look: [number, number, number] } | null;
    /** Dev-only: live renderer + scene for the leak / play-through test scripts. */
    __orbGl?: { gl: THREE.WebGLRenderer; scene: THREE.Scene } | null;
  }
}

/**
 * Dev-only photo camera for screenshot tooling: when `window.__orbCam` is set, it
 * overrides the chase camera for that frame. Stripped from production builds.
 */
export function DevPhotoCamera() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    window.__orbGl = { gl, scene };
    return () => {
      if (window.__orbGl?.gl === gl) window.__orbGl = null;
    };
  }, [gl, scene]);
  useFrame(({ camera }) => {
    const c = typeof window !== 'undefined' ? window.__orbCam : null;
    if (!c) return;
    camera.position.set(...c.pos);
    camera.lookAt(...c.look);
  });
  return null;
}
