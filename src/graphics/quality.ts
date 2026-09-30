/**
 * Graphics quality presets. Purely visual: nothing here may influence physics,
 * colliders, tilt or level data. Heavier effects are gated per tier so
 * low-end devices keep a smooth frame rate.
 */
export type GraphicsQuality = 'low' | 'medium' | 'high';

export const GRAPHICS_QUALITY_ORDER: GraphicsQuality[] = ['low', 'medium', 'high'];

export const GRAPHICS_QUALITY_LABEL: Record<GraphicsQuality, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

export interface GraphicsPreset {
  /** Device-pixel-ratio clamp; PerformanceMonitor may scale down towards minDpr. */
  minDpr: number;
  maxDpr: number;
  /** Real-time shadow map from the sun light (0 = shadows disabled). */
  shadowMapSize: number;
  /** Half-extent (m) of the orthographic shadow frustum that follows the orb. */
  shadowExtent: number;
  /** PCSS contact-hardening soft shadows (drei SoftShadows). */
  softShadows: boolean;
  /** Cube-map resolution for the Lightformer image-based-lighting environment. */
  envResolution: number;
  /** Post-processing chain (bloom, vignette, SMAA, tone mapping). */
  postFX: boolean;
  /** Screen-space ambient occlusion (N8AO). */
  ambientOcclusion: boolean;
  bloomIntensity: number;
  sparkleCount: number;
  starCount: number;
}

export const GRAPHICS_PRESETS: Record<GraphicsQuality, GraphicsPreset> = {
  low: {
    minDpr: 0.75,
    maxDpr: 1,
    shadowMapSize: 0,
    shadowExtent: 24,
    softShadows: false,
    envResolution: 128,
    postFX: false,
    ambientOcclusion: false,
    bloomIntensity: 0,
    sparkleCount: 60,
    starCount: 1000,
  },
  medium: {
    minDpr: 1,
    maxDpr: 1.5,
    shadowMapSize: 1024,
    shadowExtent: 26,
    softShadows: false,
    envResolution: 256,
    postFX: true,
    ambientOcclusion: false,
    bloomIntensity: 0.4,
    sparkleCount: 110,
    starCount: 1800,
  },
  high: {
    minDpr: 1,
    maxDpr: 2,
    shadowMapSize: 2048,
    shadowExtent: 30,
    softShadows: true,
    envResolution: 512,
    postFX: true,
    ambientOcclusion: true,
    bloomIntensity: 0.5,
    sparkleCount: 140,
    starCount: 2200,
  },
};

export const DEFAULT_GRAPHICS_QUALITY: GraphicsQuality = 'medium';

export function isGraphicsQuality(value: unknown): value is GraphicsQuality {
  return value === 'low' || value === 'medium' || value === 'high';
}
