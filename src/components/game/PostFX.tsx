import { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { Bloom, EffectComposer, N8AO, SMAA, ToneMapping, Vignette } from '@react-three/postprocessing';
import { BlendFunction, Effect, EffectAttribute, ToneMappingMode } from 'postprocessing';
import { GraphicsPreset } from '../../graphics/quality';

/**
 * Replaces non-finite HDR values (NaN/Inf, e.g. from a degenerate specular or
 * iridescence sample) with black and clamps extreme fireflies. Without this, a
 * single bad pixel is smeared by the mipmap bloom blur across the whole frame,
 * turning the canvas fully transparent until the pixel goes away.
 * Flagged as CONVOLUTION so it gets its own pass before bloom reads the buffer;
 * SRC blending avoids `mix(NaN, x, 1.0)` re-introducing the NaN.
 */
class HdrSanitizeEffect extends Effect {
  constructor() {
    super(
      'HdrSanitizeEffect',
      `void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
        bool finite = all(lessThan(abs(inputColor), vec4(65000.0)));
        outputColor = finite
          ? vec4(min(inputColor.rgb, vec3(64.0)), clamp(inputColor.a, 0.0, 1.0))
          : vec4(0.0);
      }`,
      { blendFunction: BlendFunction.SRC, attributes: EffectAttribute.CONVOLUTION }
    );
  }
}

/** Bloom adds light on top of the image; trim exposure so overall brightness matches Low. */
const POSTFX_EXPOSURE_SCALE = 0.96;

/**
 * Post-processing chain (Medium/High quality only).
 *
 * EffectComposer disables renderer tone mapping while mounted, so scene colours
 * stay in linear HDR through the half-float buffers: bloom picks up only
 * genuinely bright emissives (neon trims, pads, gates, sun), and ACES tone
 * mapping is applied once at the end (renderer exposure is still honoured).
 * SMAA runs last on the tone-mapped image, replacing costly MSAA on the
 * half-float render targets. Order: [N8AO] -> sanitize -> bloom + tone mapping
 * + vignette (one merged pass) -> SMAA.
 */
export function PostFX({ preset }: { preset: GraphicsPreset }) {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    const base = gl.toneMappingExposure;
    gl.toneMappingExposure = base * POSTFX_EXPOSURE_SCALE;
    return () => {
      gl.toneMappingExposure = base;
    };
  }, [gl]);

  const sanitize = useMemo(() => new HdrSanitizeEffect(), []);
  useEffect(() => () => sanitize.dispose(), [sanitize]);

  const effects = [
    preset.ambientOcclusion ? (
      <N8AO
        key="ao"
        halfRes
        quality="performance"
        aoRadius={1.4}
        distanceFalloff={0.8}
        intensity={1.6}
      />
    ) : null,
    <primitive key="sanitize" object={sanitize} />,
    <Bloom
      key="bloom"
      mipmapBlur
      intensity={preset.bloomIntensity}
      luminanceThreshold={1.15}
      luminanceSmoothing={0.08}
      radius={0.7}
    />,
    <ToneMapping key="tone" mode={ToneMappingMode.ACES_FILMIC} />,
    <Vignette key="vignette" offset={0.34} darkness={0.4} />,
    <SMAA key="smaa" />,
  ].filter((e): e is JSX.Element => e !== null);

  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      {effects}
    </EffectComposer>
  );
}
