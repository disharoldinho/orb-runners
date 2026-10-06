import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { WebSocketServer } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.resolve(__dirname, '../dist');

const PORT = Number(process.env.PORT || process.env.SUMMIT_PORT || 5174);

/**
 * Summit centerline waypoints for the server-side AI Climber Bots.
 *
 * The 9-stage spiral route is generated from `src/levels/summitMap.ts` (the same data the
 * game renders) into `server/summitWaypoints.json` by `npm run summit:waypoints`, so bots
 * always ride the real road, through every Base Camp, in order. Points are ~[x, surface+0.6, z].
 */
function buildSummitWaypoints() {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'summitWaypoints.json'), 'utf8'));
    if (Array.isArray(data.waypoints) && data.waypoints.length >= 2) return data.waypoints;
    throw new Error('no waypoints in file');
  } catch (err) {
    console.warn(
      `[summit] could not load server/summitWaypoints.json (${err.message}); ` +
        'run `npm run summit:waypoints`. Bots will idle at base camp.'
    );
    return [
      [0, 1.0, 0],
      [0, 1.0, -8],
    ];
  }
}

/** Cumulative arc length per waypoint so bots move at a real speed in m/s. */
function buildArcLengths(pts) {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) {
    const [a, b] = [pts[i - 1], pts[i]];
    cum.push(cum[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]));
  }
  return cum;
}

const WAYPOINTS = buildSummitWaypoints();
const WAYPOINT_DIST = buildArcLengths(WAYPOINTS);
const ROUTE_LENGTH = WAYPOINT_DIST[WAYPOINT_DIST.length - 1];
/** Seconds a bot celebrates on the summit before looping back to base camp. */
const SUMMIT_REST_SEC = 12;

const BOT_PROFILES = [
  {
    id: 'bot-nova',
    name: 'Nova [BOT]',
    speed: 0.34,
    phase: 0.08,
    laneOffset: -1.1,
    avatar: {
      name: 'Nova',
      bodyType: 'bot',
      eyeType: 'sparkle',
      mouthType: 'grin',
      hatType: 'halo',
      primaryColor: '#00f5d4',
      secondaryColor: '#e0f2fe',
      orbStyle: 'neon',
    },
  },
  {
    id: 'bot-mochi',
    name: 'Mochi [BOT]',
    speed: 0.27,
    phase: 0.26,
    laneOffset: 1.05,
    avatar: {
      name: 'Mochi',
      bodyType: 'critter',
      eyeType: 'happy',
      mouthType: 'cat',
      hatType: 'crown',
      primaryColor: '#f72585',
      secondaryColor: '#ffe4e6',
      orbStyle: 'candy',
    },
  },
  {
    id: 'bot-zephyr',
    name: 'Zephyr [BOT]',
    speed: 0.39,
    phase: 0.48,
    laneOffset: -0.65,
    avatar: {
      name: 'Zephyr',
      bodyType: 'bean',
      eyeType: 'shades',
      mouthType: 'mustache',
      hatType: 'propeller',
      primaryColor: '#f59e0b',
      secondaryColor: '#fef3c7',
      orbStyle: 'starlight',
    },
  },
  {
    id: 'bot-pixel',
    name: 'Pixel [BOT]',
    speed: 0.23,
    phase: 0.69,
    laneOffset: 0.85,
    avatar: {
      name: 'Pixel',
      bodyType: 'blob',
      eyeType: 'googly',
      mouthType: 'tongue',
      hatType: 'viking',
      primaryColor: '#a855f7',
      secondaryColor: '#f3e8ff',
      orbStyle: 'clear',
    },
  },
  {
    id: 'bot-blaze',
    name: 'Blaze [BOT]',
    speed: 0.44,
    phase: 0.85,
    laneOffset: 0.0,
    avatar: {
      name: 'Blaze',
      bodyType: 'critter',
      eyeType: 'determined',
      mouthType: 'grin',
      hatType: 'wizard',
      primaryColor: '#ef4444',
      secondaryColor: '#fee2e2',
      orbStyle: 'neon',
    },
  },
];

// Legacy emoji ids: understood by every client version.
const EMOTE_POOL = ['👋', '🔥', '😱', '👑'];

function generateLobbyCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/** Position along the route for a bot, looping climb -> summit rest -> restart. */
function locateOnRoute(dist) {
  let lo = 0;
  let hi = WAYPOINT_DIST.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (WAYPOINT_DIST[mid] <= dist) lo = mid;
    else hi = mid;
  }
  const segLen = WAYPOINT_DIST[hi] - WAYPOINT_DIST[lo] || 1;
  return { segIdx: lo, frac: Math.min(1, Math.max(0, (dist - WAYPOINT_DIST[lo]) / segLen)) };
}

function sampleBotStates(elapsedSec) {
  return BOT_PROFILES.map((bot, idx) => {
    // bot.speed is a relative pace; map it to ~4.5-8 m/s along the road.
    const metersPerSec = 2.5 + bot.speed * 12;
    const cycleSec = ROUTE_LENGTH / metersPerSec + SUMMIT_REST_SEC;
    const t = (elapsedSec + bot.phase * cycleSec) % cycleSec;
    const dist = Math.min(ROUTE_LENGTH, t * metersPerSec);
    const { segIdx, frac } = locateOnRoute(dist);

    const p0 = WAYPOINTS[segIdx];
    const p1 = WAYPOINTS[Math.min(WAYPOINTS.length - 1, segIdx + 1)];

    // Gentle rolling bob (waypoints are dense, so no big hops that would clip rails/ceilings)
    const bobY = Math.abs(Math.sin(elapsedSec * 2.2 + idx)) * 0.25;
    const x = p0[0] + (p1[0] - p0[0]) * frac + Math.sin(elapsedSec * 1.7 + idx) * 0.45 + bot.laneOffset * 0.4;
    const y = p0[1] + (p1[1] - p0[1]) * frac + bobY;
    const z = p0[2] + (p1[2] - p0[2]) * frac + Math.cos(elapsedSec * 1.5 + idx) * 0.45;

    const dx = p1[0] - p0[0];
    const dz = p1[2] - p0[2];
    const yaw = Math.atan2(dx, dz);
    const altitudeM = Math.max(0, Math.round(y - 1.0));

    // Periodic celebratory emotes
    const emoteCycle = Math.floor((elapsedSec + idx * 7) % 19);
    const emote = emoteCycle < 2 ? EMOTE_POOL[(idx + Math.floor(elapsedSec / 19)) % EMOTE_POOL.length] : null;

    return {
      id: bot.id,
      name: bot.name,
      position: [Number(x.toFixed(2)), Number(y.toFixed(2)), Number(z.toFixed(2))],
      yaw: Number(yaw.toFixed(2)),
      altitudeM,
      peakAltitudeM: altitudeM,
      avatar: bot.avatar,
      emote,
      isBot: true,
    };
  });
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.wasm': 'application/wasm',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.txt': 'text/plain; charset=utf-8',
};

/** Largest accepted client message (avatar + position is ~0.5 KB). */
const MAX_MESSAGE_BYTES = 16 * 1024;
/** Sockets that miss this many heartbeat pings in a row are dropped (dead phone / tunnel). */
const HEARTBEAT_MS = 15000;
const COORD_LIMIT = 5000;

const cleanName = (v, fallback) => {
  const s = String(v ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
    .slice(0, 18);
  return s || fallback;
};
const finite = (v, fallback, lim = COORD_LIMIT) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.max(-lim, Math.min(lim, v)) : fallback;
const cleanPosition = (v, fallback) =>
  Array.isArray(v) && v.length === 3 && v.every((n) => typeof n === 'number' && Number.isFinite(n))
    ? v.map((n) => Math.max(-COORD_LIMIT, Math.min(COORD_LIMIT, Number(n.toFixed(2)))))
    : fallback;
/**
 * Emote allowlist: sticker ids (current clients) plus the legacy emoji the first four
 * emotes used (older clients still send those; current clients send them too for wave /
 * fire / whoa / crown so older builds keep rendering them). Anything else is dropped.
 */
const EMOTE_IDS = new Set(['wave', 'fire', 'whoa', 'crown', 'laugh', 'thumbs', 'heart', 'gg', '👋', '🔥', '😱', '👑']);
const cleanEmote = (v) => (typeof v === 'string' && EMOTE_IDS.has(v) ? v : null);
const AVATAR_KEYS = ['name', 'bodyType', 'eyeType', 'mouthType', 'hatType', 'primaryColor', 'secondaryColor', 'orbStyle'];
const cleanAvatar = (v, fallback) => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return fallback;
  const out = {};
  for (const k of AVATAR_KEYS) if (typeof v[k] === 'string') out[k] = v[k].slice(0, 32);
  return out;
};
const cleanCode = (v) =>
  String(v ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
    .slice(0, 10);

/**
 * Creates the Summit HTTP + WebSocket server (not listening yet).
 * Lobby rules:
 *  - one room per socket; joining/creating another room leaves the old one first,
 *    and an empty private room is deleted the moment its last climber leaves
 *    (socket close OR switching lobby);
 *  - a failed join (unknown code / wrong password) leaves the climber where they were;
 *  - PUBLIC always exists.
 */
export function createSummitServer({ distDir = DIST_DIR, tickMs = 50, heartbeatMs = HEARTBEAT_MS, log = console } = {}) {
  const rooms = new Map();

  function createRoom({ code, name, password = '', isPublic = false, includeBots = true }) {
    const room = {
      code,
      name: name || (isPublic ? 'Global Summit Server' : `Summit Room ${code}`),
      password: String(password || '').trim().slice(0, 64),
      isPublic,
      includeBots: Boolean(includeBots),
      clients: new Map(), // ws -> climberState
      createdAt: Date.now(),
    };
    rooms.set(code, room);
    return room;
  }

  createRoom({ code: 'PUBLIC', name: 'Global Summit Server', isPublic: true, includeBots: true });

  function leaveRoom(ws, code) {
    const room = code ? rooms.get(code) : null;
    if (!room) return;
    room.clients.delete(ws);
    if (!room.isPublic && room.clients.size === 0) rooms.delete(code);
  }

  const httpServer = http.createServer((req, res) => {
    let reqUrl = (req.url || '/').split('?')[0];
    try {
      reqUrl = decodeURIComponent(reqUrl);
    } catch {
      res.writeHead(400);
      res.end('Bad request');
      return;
    }

    if (reqUrl === '/api/lobbies') {
      const summary = Array.from(rooms.values()).map((r) => ({
        code: r.isPublic ? r.code : `${r.code.slice(0, 2)}***`,
        name: r.name,
        isPublic: r.isPublic,
        hasPassword: Boolean(r.password),
        playersOnline: r.clients.size,
        includeBots: r.includeBots,
      }));
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify({ status: 'online', rooms: summary }));
      return;
    }

    // Serve the built frontend from dist/ (never outside it).
    if (distDir && fs.existsSync(distDir)) {
      const root = path.resolve(distDir);
      let filePath = path.resolve(root, '.' + path.posix.normalize('/' + reqUrl));
      if (!filePath.startsWith(root + path.sep) && filePath !== root) filePath = path.join(root, 'index.html');
      let isFallback = false;
      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        // Unknown asset files are real 404s; unknown routes fall back to the SPA shell.
        if (/\.[a-z0-9]+$/i.test(reqUrl) && reqUrl !== '/') {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('Not found');
          return;
        }
        filePath = path.join(root, 'index.html');
        isFallback = true;
      }
      if (fs.existsSync(filePath)) {
        const ext = path.extname(filePath).toLowerCase();
        const hashed = !isFallback && /[\\/]assets[\\/]/.test(filePath);
        res.writeHead(200, {
          'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
          // Vite assets are content-hashed; the HTML shell must always revalidate so a
          // refreshed preview never mixes an old shell with deleted asset hashes.
          'Cache-Control': hashed ? 'public, max-age=31536000, immutable' : 'no-cache',
        });
        fs.createReadStream(filePath).pipe(res);
        return;
      }
    }

    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Orb Runners Summit Multiplayer Server is running.');
  });

  const wss = new WebSocketServer({ server: httpServer, maxPayload: MAX_MESSAGE_BYTES });

  wss.on('connection', (ws) => {
    let currentRoomCode = null;
    const clientId = `climber-${Math.random().toString(36).slice(2, 9)}`;
    ws.isAlive = true;
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    const send = (obj) => {
      if (ws.readyState === 1) ws.send(JSON.stringify(obj));
    };
    const lobbyError = (message, code) => send({ type: 'lobby-error', message, code, lobbyCode: currentRoomCode });

    ws.on('message', (raw) => {
      let msg;
      try {
        msg = JSON.parse(String(raw));
      } catch {
        return; // ignore malformed messages
      }
      if (!msg || typeof msg !== 'object') return;
      ws.isAlive = true;

      if (msg.type === 'join-or-create') {
        const mode = msg.mode === 'create' || msg.mode === 'join' ? msg.mode : 'public';
        let targetRoom = null;

        if (mode === 'public') {
          targetRoom = rooms.get('PUBLIC');
        } else if (mode === 'create') {
          let code = cleanCode(msg.lobbyCode);
          if (!code || code === 'PUBLIC' || rooms.has(code)) {
            do {
              code = generateLobbyCode();
            } while (rooms.has(code));
          }
          targetRoom = createRoom({
            code,
            name: String(msg.lobbyName || `Private Climb ${code}`).slice(0, 32),
            password: String(msg.password || ''),
            isPublic: false,
            includeBots: msg.includeBots !== false,
          });
        } else {
          const code = cleanCode(msg.lobbyCode);
          let candidate = rooms.get(code);
          // Reconnecting host whose room emptied while they were offline: recreate it
          // under the same code (only when the code is free and valid).
          if (!candidate && msg.recreate && code && code !== 'PUBLIC') {
            candidate = createRoom({
              code,
              name: String(msg.lobbyName || `Private Climb ${code}`).slice(0, 32),
              password: String(msg.password || ''),
              isPublic: false,
              includeBots: msg.includeBots !== false,
            });
          }
          if (!candidate) {
            // Stay in the current room (if any): a typo must not strand the climber.
            lobbyError(`Lobby "${code || 'UNKNOWN'}" not found. Verify the Lobby Code with your host!`, 'not-found');
            return;
          }
          const suppliedPass = String(msg.password || '').trim();
          if (candidate.password && candidate.password !== suppliedPass) {
            lobbyError('Incorrect Lobby Password! Please check the password and try again.', 'bad-password');
            return;
          }
          targetRoom = candidate;
        }

        const initialClimber = msg.climber && typeof msg.climber === 'object' ? msg.climber : {};
        const previous = currentRoomCode ? rooms.get(currentRoomCode)?.clients.get(ws) : null;
        // Leave the old room only now that the new one is certain (deletes it if it empties).
        if (currentRoomCode && currentRoomCode !== targetRoom.code) leaveRoom(ws, currentRoomCode);
        currentRoomCode = targetRoom.code;
        targetRoom.clients.set(ws, {
          id: clientId,
          name: cleanName(initialClimber.name ?? previous?.name, 'Climber'),
          position: cleanPosition(initialClimber.position, previous?.position ?? [0, 1.0, 0]),
          yaw: finite(initialClimber.yaw, previous?.yaw ?? 0, 100),
          altitudeM: finite(initialClimber.altitudeM, 0, 10000),
          peakAltitudeM: finite(initialClimber.peakAltitudeM, 0, 10000),
          avatar: cleanAvatar(initialClimber.avatar, previous?.avatar),
          emote: null,
          isBot: false,
        });

        send({
          type: 'lobby-joined',
          clientId,
          lobbyCode: targetRoom.code,
          lobbyName: targetRoom.name,
          mode: targetRoom.isPublic ? 'public' : 'private',
          includeBots: targetRoom.includeBots,
          hasPassword: Boolean(targetRoom.password),
        });
      } else if (msg.type === 'leave') {
        leaveRoom(ws, currentRoomCode);
        currentRoomCode = null;
      } else if (msg.type === 'state-update' && currentRoomCode) {
        const room = rooms.get(currentRoomCode);
        const existing = room?.clients.get(ws);
        if (!existing) return;
        room.clients.set(ws, {
          ...existing,
          name: cleanName(msg.name, existing.name),
          position: cleanPosition(msg.position, existing.position),
          yaw: finite(msg.yaw, existing.yaw, 100),
          altitudeM: finite(msg.altitudeM, existing.altitudeM, 10000),
          peakAltitudeM: finite(msg.peakAltitudeM, existing.peakAltitudeM, 10000),
          avatar: msg.avatar ? cleanAvatar(msg.avatar, existing.avatar) : existing.avatar,
          emote: cleanEmote(msg.emote),
          isBot: false,
        });
      }
    });

    // Without an 'error' listener, ws re-throws protocol errors (invalid opcode,
    // bad UTF-8, oversized payload, abrupt socket resets) as an unhandled
    // EventEmitter 'error', crashing the whole server and every lobby with it.
    // ws terminates the socket after emitting, so 'close' still runs cleanup.
    ws.on('error', (err) => {
      log.warn(`[Orb Runners Summit Server] WebSocket error from ${clientId}: ${err.message}`);
    });

    ws.on('close', () => {
      leaveRoom(ws, currentRoomCode);
      currentRoomCode = null;
    });
  });

  // Heartbeat: phones that lose signal (or a dropped tunnel) never send 'close', which
  // left frozen "ghost" climbers in rooms forever. Ping; terminate after a missed pong.
  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      if (ws.isAlive === false) {
        ws.terminate();
        continue;
      }
      ws.isAlive = false;
      try {
        ws.ping();
      } catch {
        // socket already closing
      }
    }
  }, heartbeatMs);

  // 20Hz broadcast loop
  const startTime = Date.now();
  const broadcast = setInterval(() => {
    const elapsedSec = (Date.now() - startTime) / 1000;
    let botStates = null;
    for (const room of rooms.values()) {
      if (room.clients.size === 0) continue;
      const humanClimbers = Array.from(room.clients.values());
      if (room.includeBots && !botStates) botStates = sampleBotStates(elapsedSec);
      const allClimbers = room.includeBots ? [...humanClimbers, ...botStates] : humanClimbers;
      const payload = JSON.stringify({
        type: 'room-state',
        lobbyCode: room.code,
        lobbyName: room.name,
        climbers: allClimbers,
      });
      for (const clientWs of room.clients.keys()) {
        if (clientWs.readyState === 1 && clientWs.bufferedAmount < 1 << 20) clientWs.send(payload);
      }
    }
  }, tickMs);

  function close() {
    clearInterval(heartbeat);
    clearInterval(broadcast);
    for (const ws of wss.clients) ws.terminate();
    wss.close();
    return new Promise((resolve) => httpServer.close(() => resolve()));
  }

  return { httpServer, wss, rooms, close };
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  const server = createSummitServer();
  server.httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(
      `[Orb Runners Summit Server] Listening on http://0.0.0.0:${PORT} and ws://0.0.0.0:${PORT} (Public + Private Lobbies Ready)`
    );
  });
  const shutdown = () => {
    server.close().then(() => process.exit(0));
    setTimeout(() => process.exit(0), 2000).unref();
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
