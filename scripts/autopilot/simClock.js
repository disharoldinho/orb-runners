// Injected before the app loads (page.evaluateOnNewDocument). Replaces the frame clock with a
// virtual one: every animation frame advances performance.now() by exactly 1/60 s, however
// long the (software-rendered) frame really took. The game's physics (fixed 1/120 s steps,
// so exactly 2 per frame), input smoothing, camera and run timer therefore see a perfect
// 60 fps machine, and a run is reproducible from its inputs.
(() => {
  const FRAME_MS = 1000 / 60;
  let vt = 0;
  let nextId = 1;
  const queue = new Map();
  performance.now = () => vt;
  window.requestAnimationFrame = (cb) => {
    const id = nextId++;
    queue.set(id, cb);
    return id;
  };
  window.cancelAnimationFrame = (id) => queue.delete(id);
  const sim = {
    frame: 0,
    /** Called before each frame (the autopilot sets its stick input here). */
    beforeFrame: null,
    /** Called after each frame (bookkeeping). */
    afterFrame: null,
    paused: false,
  };
  window.__sim = sim;

  // Timers run on the virtual clock too, so the game's READY/GO countdown (1.15 s) and the
  // fall-out respawn delay (1.55 s) last exactly as long as for a player, in simulated time.
  const realSetTimeout = window.setTimeout.bind(window);
  const timers = new Map();
  let nextTimer = 1;
  window.setTimeout = (fn, ms = 0, ...args) => {
    const id = nextTimer++;
    timers.set(id, { due: vt + Math.max(0, Number(ms) || 0), fn, args, every: 0 });
    return id;
  };
  window.setInterval = (fn, ms = 0, ...args) => {
    const id = nextTimer++;
    const every = Math.max(FRAME_MS, Number(ms) || 0);
    timers.set(id, { due: vt + every, fn, args, every });
    return id;
  };
  window.clearTimeout = window.clearInterval = (id) => timers.delete(id);
  const runTimers = () => {
    const due = [...timers.entries()]
      .filter(([, t]) => t.due <= vt)
      .sort((a, b) => a[1].due - b[1].due);
    for (const [id, t] of due) {
      if (!timers.has(id)) continue;
      if (t.every) t.due += t.every;
      else timers.delete(id);
      try {
        if (typeof t.fn === 'function') t.fn(...t.args);
      } catch (e) {
        console.error('timer', e);
      }
    }
  };
  const tick = () => {
    if (!sim.paused) {
      try {
        sim.beforeFrame?.(sim);
      } catch (e) {
        console.error('autopilot beforeFrame', e);
      }
      vt += FRAME_MS;
      sim.frame++;
      runTimers();
      const cbs = [...queue.values()];
      queue.clear();
      for (const cb of cbs) cb(vt);
      try {
        sim.afterFrame?.(sim);
      } catch (e) {
        console.error('autopilot afterFrame', e);
      }
    }
    // Yield a macrotask so React/zustand work scheduled by this frame runs before the next.
    channel.port2.postMessage(0);
  };
  const channel = new MessageChannel();
  channel.port1.onmessage = () => realSetTimeout(tick, 0);
  realSetTimeout(tick, 0);
})();
