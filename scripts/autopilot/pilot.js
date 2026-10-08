// In-page autopilot. Evaluated in the game page (Vite dev server) after the app has loaded:
//   window.__startPilot(stageId, route, opts) -> starts the stage and steers it.
// It only touches the same input the on-screen joystick uses (touchInput.stickX/Y), so the
// run goes through the game's own TiltController smoothing, camera, physics and timer.
window.__startPilot = async (stageId, route, opts = {}) => {
  const { useGameStore, livePhysics, getLevelById } = await import('/src/store/useGameStore.ts');
  const { touchInput } = await import('/src/input/touchInput.ts');
  const level = getLevelById(stageId);
  const G = 20.5;
  const A_MAX = G * Math.sin((17.5 * Math.PI) / 180); // horizontal accel at full tilt
  const kp = opts.kp ?? 2.6;
  const lookahead = opts.lookahead ?? 2.2;
  const speedScale = opts.speedScale ?? 1;
  // A rolling solid sphere only gets 5/7 of the tilt's gravity component as acceleration.
  const A_ROLL = (5 / 7) * A_MAX;
  const brake = opts.brake ?? 0.75 * A_ROLL;
  const maxSimS = opts.maxSimS ?? 150;

  // Route points: { p: [x, y, z], v: target speed after this point (m/s), hold?: condition }
  const pts = route.points.map((w) => ({ ...w, p: w.p.length === 2 ? [w.p[0], 0, w.p[1]] : w.p }));
  const segLen = [];
  for (let i = 0; i < pts.length - 1; i++) {
    segLen.push(Math.hypot(pts[i + 1].p[0] - pts[i].p[0], pts[i + 1].p[2] - pts[i].p[2]));
  }

  // Physics time since the attempt's <Physics> mounted (obstacles run on it): 2 steps/frame.
  let mountFrame = window.__sim.frame;
  let lastAttempt = useGameStore.getState().runAttemptId;
  // Physics time of the current attempt's world (same clock as platforms/spinners/goal).
  const physT = () => livePhysics.physicsTimeS;

  const byId = (list, id) => (level[list] || []).find((o) => o.id === id);
  /** Moving platform centre at physics time t (same formula as MovingPlatform.tsx). */
  const platformPos = (id, t) => {
    const d = byId('movingPlatforms', id);
    const f = (1 - Math.cos(t * d.speed + (d.phaseOffset ?? 0))) * 0.5;
    return d.start.map((s, i) => s + (d.end[i] - s) * f);
  };
  const hazardYaw = (id, t) => {
    const d = byId('rotatingHazards', id);
    return d.angularVelocity[1] * t;
  };
  const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  /** Time to cover d metres starting at v0, accelerating (rolling, ~full tilt) up to vcap. */
  const travelTime = (d, v0, vcap) => {
    const A = 0.9 * A_ROLL;
    if (v0 >= vcap) return d / vcap;
    const da = (vcap * vcap - v0 * v0) / (2 * A);
    if (d <= da) return (-v0 + Math.sqrt(v0 * v0 + 2 * A * d)) / A;
    return (vcap - v0) / A + (d - da) / vcap;
  };
  // v0: speed when leaving the hold point; vcap: this profile's speed on the next segment
  const holdOk = (h, t, v0 = 0, vcap = 6, extraDist = 0) => {
    if (!h) return true;
    if (h.type === 'align') {
      // Spinning bridge: after travelling h.dist metres from the hold point (at this pilot's
      // pace), an arm must be within [lo, hi] rad of lining up with the route. Signed in the
      // direction of rotation: negative = still swinging into line.
      const d = byId('rotatingHazards', h.id);
      const w = d.angularVelocity[1];
      const mod = h.mod ?? Math.PI / 2;
      let a = (w * (t + travelTime(h.dist + extraDist, v0, vcap))) % mod;
      if (a < 0) a += mod;
      let rel = a > mod / 2 ? a - mod : a; // nearest alignment, signed by yaw
      if (w < 0) rel = -rel;
      return (h.windows ?? [h.window]).some(([lo, hi]) => rel >= lo && rel <= hi);
    }
    if (h.type === 'time') return t >= h.t;
    if (h.type === 'platform') {
      // platform centre (at t + lead) within [min, max] on axis
      const p = platformPos(h.id, t + (h.lead ?? 0));
      const v = p[h.axis ?? 0];
      return v >= h.min && v <= h.max;
    }
    if (h.type === 'phase') {
      // moving platform oscillation phase (t * speed + phaseOffset, mod 2PI) within window;
      // position = start + (end - start) * (1 - cos(phase)) / 2
      const d = byId('movingPlatforms', h.id);
      let a = ((t + (h.lead ?? 0)) * d.speed + (d.phaseOffset ?? 0)) % (2 * Math.PI);
      if (a < 0) a += 2 * Math.PI;
      const wins = h.windows ?? [[h.min, h.max]];
      return wins.some(([lo, hi]) => a >= lo && a <= hi);
    }
    if (h.type === 'hazard') {
      // bar/bridge yaw (mod period) within window; `mod` = PI for symmetric bars, PI/2 for crosses
      const mod = h.mod ?? Math.PI;
      let a = hazardYaw(h.id, t + (h.lead ?? 0)) % mod;
      if (a < 0) a += mod;
      const wins = h.windows ?? [[h.min, h.max]];
      return wins.some(([lo, hi]) => a >= lo && a <= hi);
    }
    return true;
  };

  let seg = 0; // current polyline segment
  let holdIndex = -1; // point index we are holding at (if any)
  const released = new Set();
  const trace = [];
  const result = { done: false };
  window.__pilotResult = result;
  let falls = 0;
  let lastPhase = null;
  let playingFrames = 0;
  let bumps = 0;
  let lastBump = livePhysics.lastBumperHitTime;

  const setStick = (wx, wz) => {
    // World-space desired horizontal accel fraction -> board tilt in camera frame -> stick.
    const yaw = livePhysics.cameraYaw;
    const c = Math.cos(yaw);
    const s = Math.sin(yaw);
    const localGx = wx * c - wz * s;
    const localGz = wx * s + wz * c;
    let roll = localGx;
    let pitch = -localGz;
    const m = Math.hypot(roll, pitch);
    if (m < 1e-4) {
      touchInput.stickX = 0;
      touchInput.stickY = 0;
      return;
    }
    const mm = Math.min(1, m);
    roll /= m;
    pitch /= m;
    // invert TiltController's radial deadzone (0.08) and response curve (^1.3)
    const raw = 0.08 + 0.92 * Math.pow(mm, 1 / 1.3);
    touchInput.stickX = roll * raw;
    touchInput.stickY = -pitch * raw;
  };

  const projOn = (k, x, z) => {
    const a = pts[k].p;
    const b = pts[k + 1].p;
    const dx = b[0] - a[0];
    const dz = b[2] - a[2];
    const L2 = dx * dx + dz * dz || 1e-9;
    let u = ((x - a[0]) * dx + (z - a[2]) * dz) / L2;
    u = Math.max(0, Math.min(1, u));
    return { seg: k, u, dist: Math.hypot(x - (a[0] + dx * u), z - (a[2] + dz * u)) };
  };
  const project = (x, z, from, span = 4) => {
    // Progress along the route is sequential: move to the next segment only once the current
    // one is finished (or the next is clearly closer, i.e. a cut corner). A nearest-segment
    // search would jump onto the return leg of an out-and-back excursion.
    // Never project past an unreleased hold (overshooting it must not skip the wait).
    let end = Math.min(pts.length - 1, from + span);
    for (let j = from + 1; j < end; j++) {
      if (pts[j].hold && !released.has(j)) {
        end = j;
        break;
      }
    }
    let cur = projOn(from, x, z);
    while (cur.seg + 1 < end) {
      const next = projOn(cur.seg + 1, x, z);
      const tip = pts[cur.seg + 1].p;
      const reached = Math.hypot(x - tip[0], z - tip[2]) < 0.6;
      if (cur.u >= 0.999 || reached || next.dist < cur.dist - 0.6) cur = next;
      else break;
    }
    return cur;
  };
  const projectGlobal = (x, z) => {
    let best = projOn(0, x, z);
    for (let k = 1; k < pts.length - 1; k++) {
      const p = projOn(k, x, z);
      if (p.dist < best.dist - 1e-6) best = p;
    }
    return best;
  };

  const pointAlong = (k, u, ahead) => {
    // walk `ahead` metres along the polyline from (k, u), stopping at an unreleased hold
    let dist = ahead + u * segLen[k];
    while (k < segLen.length) {
      const hold = pts[k + 1].hold && !released.has(k + 1);
      if (dist <= segLen[k] || hold || k === segLen.length - 1) {
        const t = Math.min(1, dist / (segLen[k] || 1e-9));
        const a = pts[k].p;
        const b = pts[k + 1].p;
        return { x: a[0] + (b[0] - a[0]) * t, z: a[2] + (b[2] - a[2]) * t, k };
      }
      dist -= segLen[k];
      k++;
    }
    const e = pts[pts.length - 1].p;
    return { x: e[0], z: e[2], k: pts.length - 2 };
  };
  const distToNextHold = (k, u) => {
    let d = (1 - u) * segLen[k];
    for (let j = k + 1; j < pts.length; j++) {
      if (pts[j].hold && !released.has(j)) return { d, j };
      if (j < segLen.length) d += segLen[j];
    }
    return null;
  };

  // Warm-up: the first attempt loads Rapier's wasm, which takes real time, so its physics
  // starts late. Restart once the world is stepping; the measured attempt then runs like a
  // player's restart: physics (and every moving obstacle) starts with the READY/GO
  // countdown, which lasts 1.15 s of simulated time.
  let warming = true;
  window.__sim.beforeFrame = () => {
    const st = useGameStore.getState();
    if (warming) {
      touchInput.stickX = 0;
      touchInput.stickY = 0;
      if (livePhysics.physicsTimeS > 0.1) {
        warming = false;
        st.startRun();
      }
      return;
    }
    if (st.runAttemptId !== lastAttempt) {
      lastAttempt = st.runAttemptId;
      mountFrame = window.__sim.frame;
    }
    if (st.playPhase !== lastPhase) {
      if (st.playPhase === 'fallout') falls++;
      if (st.playPhase === 'playing' && lastPhase === 'fallout') {
        // respawned at a checkpoint: re-acquire the route near the respawn point
        const [rx, , rz] = livePhysics.ballPosition;
        seg = projectGlobal(rx, rz).seg;
      }
      lastPhase = st.playPhase;
    }
    if (st.playPhase === 'goal' && !result.done) {
      Object.assign(result, {
        done: true,
        success: true,
        elapsedMs: Math.round(st.elapsedMs),
        runClockMs: Math.round(st.runClockMs),
        gems: st.collectedGems.length,
        totalGems: (level.gems || []).length,
        saved: (() => {
          // what finishRun persisted (records the stage's layout version)
          try {
            const pr = JSON.parse(localStorage.getItem('orb_runners_progress_v1') || '{}')[stageId];
            const gh = JSON.parse(localStorage.getItem('orb_runners_ghosts_v1') || '{}')[stageId];
            return {
              layoutVersion: pr?.layoutVersion,
              medal: pr?.medal,
              ghostLayoutVersion: gh?.layoutVersion,
            };
          } catch {
            return null;
          }
        })(),
        missedGems: (level.gems || [])
          .map((g) => g.id)
          .filter((id) => !st.collectedGems.includes(id)),
        bumps,
        checkpoints: st.crossedCheckpoints.length,
        falls,
        simS: +(playingFrames / 60).toFixed(2),
        trace,
      });
      touchInput.stickX = 0;
      touchInput.stickY = 0;
      return;
    }
    if (st.playPhase !== 'playing') {
      touchInput.stickX = 0;
      touchInput.stickY = 0;
      return;
    }
    playingFrames++;
    if (livePhysics.lastBumperHitTime !== lastBump) {
      lastBump = livePhysics.lastBumperHitTime;
      bumps++;
      trace.push(['bump', ...livePhysics.ballPosition.map((v) => +v.toFixed(2))]);
    }
    if (playingFrames / 60 > maxSimS || falls > (opts.maxFalls ?? 0)) {
      if (!result.done) {
        Object.assign(result, {
          done: true,
          success: false,
          reason: falls > (opts.maxFalls ?? 0) ? 'fell' : 'timeout',
          elapsedMs: Math.round(st.elapsedMs),
          falls,
          seg,
          pos: livePhysics.ballPosition.map((v) => +v.toFixed(2)),
          checkpoints: st.crossedCheckpoints.length,
          gems: st.collectedGems.length,
          trace,
        });
      }
      touchInput.stickX = 0;
      touchInput.stickY = 0;
      return;
    }
    const [x, y, z] = livePhysics.ballPosition;
    const [vx, , vz] = livePhysics.ballVelocity;
    if (playingFrames % 15 === 0)
      trace.push([
        +(playingFrames / 60).toFixed(2),
        +x.toFixed(2),
        +y.toFixed(2),
        +z.toFixed(2),
        Math.round(st.runClockMs),
        +physT().toFixed(3),
        ...(opts.traceIds || []).map((id) => +platformPos(id, physT())[0].toFixed(2)),
      ]);
    const pr = project(x, z, seg);
    seg = pr.seg;
    const t = physT();
    // release holds whose condition is met once we are close to them
    const nh = distToNextHold(pr.seg, pr.u);
    // ... or roll straight through if, at the current speed, we would reach the hold point
    // inside its window (how a player times a moving obstacle without stopping)
    if (nh) {
      const h = pts[nh.j].hold;
      const v = Math.hypot(livePhysics.ballVelocity[0], livePhysics.ballVelocity[2]);
      const vcap = (pts[nh.j].v ?? 8) * speedScale;
      let rel = false;
      if (nh.d < (h.radius ?? 1.2) && holdOk(h, t, v, vcap, nh.d)) rel = true;
      else if (v > 1 && pr.seg === nh.j - 1 && nh.d < (h.predict ?? 5)) {
        // (only on the hold's own approach segment, i.e. while actually heading for it)
        // align holds model the whole run from here; others assume the current speed holds
        rel = h.type === 'align' ? holdOk(h, t, v, vcap, nh.d) : holdOk(h, t + nh.d / v, v, vcap);
      }
      if (rel) {
        released.add(nh.j);
        trace.push(['release', nh.j, +t.toFixed(3), +nh.d.toFixed(2), +v.toFixed(2)]);
      }
    }
    const la = pointAlong(pr.seg, pr.u, lookahead);
    let dx = la.x - x;
    let dz = la.z - z;
    const dl = Math.hypot(dx, dz) || 1e-9;
    dx /= dl;
    dz /= dl;
    let vt = (pts[pr.seg].v ?? 8) * speedScale;
    const nh2 = distToNextHold(pr.seg, pr.u);
    if (nh2) vt = Math.min(vt, Math.sqrt(2 * brake * Math.max(0, nh2.d - 0.15)));
    // also respect slower upcoming points (corner speed caps)
    let ahead = (1 - pr.u) * segLen[pr.seg];
    for (let j = pr.seg + 1; j < pts.length - 1 && ahead < 25; j++) {
      const vj = (pts[j].v ?? 8) * speedScale;
      vt = Math.min(vt, Math.sqrt(vj * vj + 2 * brake * ahead));
      ahead += segLen[j];
    }
    const ax = (dx * vt - vx) * kp;
    const az = (dz * vt - vz) * kp;
    setStick(ax / A_MAX, az / A_MAX);
  };
  useGameStore.getState().selectLevel(stageId);
  return true;
};
