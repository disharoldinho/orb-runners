import { Component, ErrorInfo, Fragment, ReactNode } from 'react';

let webglSupport: boolean | null = null;

/** True when the browser can create a WebGL context at all (checked once, then cached). */
export function isWebGLAvailable(): boolean {
  if (webglSupport !== null) return webglSupport;
  try {
    const canvas = document.createElement('canvas');
    webglSupport = Boolean(
      window.WebGLRenderingContext && (canvas.getContext('webgl2') || canvas.getContext('webgl')),
    );
  } catch {
    webglSupport = false;
  }
  return webglSupport;
}

type FallbackKind = 'crash' | 'no-webgl' | 'context-lost';

const COPY: Record<FallbackKind, { title: string; body: string }> = {
  crash: {
    title: 'The 3D view crashed',
    body: 'Something went wrong while drawing the stage. Your medals and personal bests are saved.',
  },
  'no-webgl': {
    title: '3D graphics unavailable',
    body: 'Orb Runners needs WebGL, which this browser or device has turned off or does not support. Try enabling hardware acceleration or another browser.',
  },
  'context-lost': {
    title: 'Graphics interrupted',
    body: 'The browser reset the 3D graphics (this can happen when the GPU is busy or the device is low on memory). Trying to recover…',
  },
};

/** Full-screen sticker card shown instead of (or over) the 3D stage when it can't render. */
export function GameFallback({
  kind,
  detail,
  onRetry,
  onExit,
}: {
  kind: FallbackKind;
  detail?: string;
  onRetry?: () => void;
  onExit: () => void;
}) {
  const copy = COPY[kind];
  return (
    <div className="game-fallback" role="alertdialog" aria-labelledby="game-fallback-title">
      <div className="card game-fallback-card">
        <h2 id="game-fallback-title">{copy.title}</h2>
        <p>{copy.body}</p>
        {detail && <code className="game-fallback-detail">{detail}</code>}
        <div className="game-fallback-actions">
          {onRetry && (
            <button className="btn btn-go" onClick={onRetry}>
              {kind === 'context-lost' ? 'Reload stage' : 'Try again'}
            </button>
          )}
          <button className="btn btn-paper" onClick={onExit}>
            Back to menu
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Wraps a decorative preview canvas (menu runner, character creator): renders nothing when
 * WebGL is unavailable or the preview throws, instead of taking the whole app down with it.
 */
export class PreviewCanvasGuard extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    console.warn('[Orb Runners] 3D preview disabled:', error.message);
  }

  render() {
    if (this.state.failed || !isWebGLAvailable()) return null;
    return this.props.children;
  }
}

interface BoundaryProps {
  children: ReactNode;
  /** Leave the run (e.g. back to the main menu). */
  onExit: () => void;
}

interface BoundaryState {
  error: Error | null;
  /** Bumped by "Try again" so the 3D tree remounts from scratch. */
  attempt: number;
}

/**
 * Catches render errors in the game view (the R3F <Canvas> re-throws errors from its scene
 * here) and shows a fallback instead of a blank page. Also short-circuits to a friendly
 * screen when WebGL isn't available at all.
 */
export class GameErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { error: null, attempt: 0 };

  static getDerivedStateFromError(error: Error): Partial<BoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[Orb Runners] game view crashed:', error, info.componentStack);
  }

  private retry = () => this.setState((s) => ({ error: null, attempt: s.attempt + 1 }));

  private exit = () => {
    this.setState({ error: null });
    this.props.onExit();
  };

  render() {
    if (!isWebGLAvailable()) return <GameFallback kind="no-webgl" onExit={this.exit} />;
    if (this.state.error) {
      return (
        <GameFallback
          kind="crash"
          detail={this.state.error.message}
          onRetry={this.retry}
          onExit={this.exit}
        />
      );
    }
    return <Fragment key={this.state.attempt}>{this.props.children}</Fragment>;
  }
}
