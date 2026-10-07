import http from 'node:http';
import zlib from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
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
        'run `npm run summit:waypoints`. Bots will idle at base camp.',
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
    const x =
      p0[0] +
      (p1[0] - p0[0]) * frac +
      Math.sin(elapsedSec * 1.7 + idx) * 0.45 +
      bot.laneOffset * 0.4;
    const y = p0[1] + (p1[1] - p0[1]) * frac + bobY;
    const z = p0[2] + (p1[2] - p0[2]) * frac + Math.cos(elapsedSec * 1.5 + idx) * 0.45;

    const dx = p1[0] - p0[0];
    const dz = p1[2] - p0[2];
    const yaw = Math.atan2(dx, dz);
    const altitudeM = Math.max(0, Math.round(y - 1.0));

    // Periodic celebratory emotes
    const emoteCycle = Math.floor((elapsedSec + idx * 7) % 19);
    const emote =
      emoteCycle < 2 ? EMOTE_POOL[(idx + Math.floor(elapsedSec / 19)) % EMOTE_POOL.length] : null;

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
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.mjs': 'application/javascript; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.wasm': 'application/wasm',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
};
/** Worth gzipping (already-compressed formats like woff2/png/mp3 are not). */
const COMPRESSIBLE_EXT = new Set([
  '.html',
  '.js',
  '.mjs',
  '.css',
  '.json',
  '.map',
  '.svg',
  '.webmanifest',
  '.txt',
  '.wasm',
  '.ico',
]);
const GZIP_MIN_BYTES = 1024;

/**
 * Serves the built client from `distDir`:
 *  - existing files with their MIME type; `/assets/*` (content-hashed by Vite) are cached
 *    for a year as immutable, everything else (index.html, favicon, ...) is `no-cache`
 *    (revalidated via ETag / 304);
 *  - a missing path that looks like a file (has an extension, or is under /assets/) is a
 *    real 404, so a stale index.html never gets a 200 HTML page for its old JS bundle;
 *  - any other path is an SPA route and gets index.html;
 *  - gzip for text formats when the client accepts it (compressed once per file version).
 * Returns false when there is no build to serve.
 */
function createStaticHandler(distDir) {
  const root = distDir ? path.resolve(distDir) : null;
  /** filePath -> { key, promise<Buffer> } */
  const gzipCache = new Map();

  const gzipped = (filePath, stat) => {
    const key = `${stat.size}-${stat.mtimeMs}`;
    const hit = gzipCache.get(filePath);
    if (hit && hit.key === key) return hit.promise;
    const promise = fs.promises
      .readFile(filePath)
      .then(
        (buf) =>
          new Promise((resolve, reject) =>
            zlib.gzip(buf, { level: 9 }, (err, out) => (err ? reject(err) : resolve(out))),
          ),
      );
    gzipCache.set(filePath, { key, promise });
    promise.catch(() => gzipCache.delete(filePath));
    return promise;
  };

  const sendText = (res, status, text, extra = {}) => {
    res.writeHead(status, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      ...extra,
    });
    res.end(text);
  };

  return function serveStatic(req, res, reqUrl) {
    if (!root || !fs.existsSync(path.join(root, 'index.html'))) return false;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      sendText(res, 405, 'Method Not Allowed', { Allow: 'GET, HEAD' });
      return true;
    }
    let decoded;
    try {
      decoded = decodeURIComponent(reqUrl);
    } catch {
      sendText(res, 400, 'Bad Request');
      return true;
    }
    if (decoded.includes('\0')) {
      sendText(res, 400, 'Bad Request');
      return true;
    }
    const relative = decoded === '/' ? 'index.html' : `.${decoded}`;
    let filePath = path.resolve(root, relative);
    if (filePath !== root && !filePath.startsWith(root + path.sep)) {
      sendText(res, 404, 'Not Found');
      return true;
    }
    let stat;
    try {
      stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        filePath = path.join(filePath, 'index.html');
        stat = fs.statSync(filePath);
      }
    } catch {
      stat = null;
    }
    const isAssetPath = decoded.startsWith('/assets/') || path.extname(decoded) !== '';
    if (!stat || !stat.isFile()) {
      if (isAssetPath) {
        sendText(res, 404, 'Not Found');
        return true;
      }
      filePath = path.join(root, 'index.html'); // SPA route
      stat = fs.statSync(filePath);
    }

    const ext = path.extname(filePath).toLowerCase();
    // Judge by the resolved file, not the raw URL (`/assets/../index.html` is not immutable).
    const isHashedAsset = path.relative(root, filePath).startsWith(`assets${path.sep}`);
    const etag = `W/"${stat.size.toString(16)}-${Math.floor(stat.mtimeMs).toString(16)}"`;
    const headers = {
      'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
      'Cache-Control': isHashedAsset ? 'public, max-age=31536000, immutable' : 'no-cache',
      ETag: etag,
      'Last-Modified': stat.mtime.toUTCString(),
      'X-Content-Type-Options': 'nosniff',
    };
    const compressible = COMPRESSIBLE_EXT.has(ext) && stat.size >= GZIP_MIN_BYTES;
    if (compressible) headers.Vary = 'Accept-Encoding';
    if (req.headers['if-none-match'] === etag) {
      res.writeHead(304, headers);
      res.end();
      return true;
    }
    const wantsGzip = compressible && /\bgzip\b/.test(String(req.headers['accept-encoding'] || ''));
    if (wantsGzip) {
      gzipped(filePath, stat).then(
        (body) => {
          res.writeHead(200, {
            ...headers,
            'Content-Encoding': 'gzip',
            'Content-Length': body.length,
          });
          res.end(req.method === 'HEAD' ? undefined : body);
        },
        () => {
          if (!res.headersSent) sendText(res, 500, 'Internal Server Error');
        },
      );
      return true;
    }
    res.writeHead(200, { ...headers, 'Content-Length': stat.size });
    if (req.method === 'HEAD') {
      res.end();
      return true;
    }
    const stream = fs.createReadStream(filePath);
    stream.on('error', () => res.destroy());
    stream.pipe(res);
    return true;
  };
}

const cleanPassword = (v) =>
  typeof v === 'string' || typeof v === 'number' ? String(v).trim().slice(0, 64) : '';
const cleanCode = (v) =>
  String(v ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
    .slice(0, 10);

// ---------------------------------------------------------------------------------------------
// Input validation and limits. Everything a client sends is rebuilt from these sanitisers;
// no client field is ever relayed as-is.
// ---------------------------------------------------------------------------------------------

/** Largest accepted WebSocket message; ws closes the socket (1009) on anything bigger. */
const MAX_MESSAGE_BYTES = 16 * 1024;
/** Ping interval; a socket that misses one pong is terminated on the next tick. */
const HEARTBEAT_MS = 15000;
/** |x|, |y|, |z| clamp for positions (the Summit fits well inside this). */
const COORD_LIMIT = 5000;
/** Skip a socket's room-state while it has this much unsent data (slow / stuck client). */
const MAX_BUFFERED_BYTES = 1 << 20;

/**
 * Tunable limits (createSummitServer({ limits }) overrides them, e.g. in tests).
 * The browser client sends one join per socket and 20 state-updates per second.
 */
export const DEFAULT_LIMITS = Object.freeze({
  /** Token bucket for all messages of one socket: sustained rate and burst. */
  msgPerSec: 40,
  msgBurst: 80,
  /** Messages over budget are dropped; this many dropped in a row closes the socket (1008). */
  maxDroppedMsgs: 200,
  /** Separate bucket for join-or-create (room creation / password guessing). */
  joinPerSec: 1,
  joinBurst: 8,
  maxConnections: 2000,
  maxPrivateRooms: 500,
  maxPrivateRoomClients: 16,
  maxPublicClients: 64,
});

/** Strips control characters (C0, DEL, C1) and bidi overrides, trims, caps by code points. */
const cleanText = (v, max, fallback = '') => {
  if (typeof v !== 'string' && typeof v !== 'number') return fallback;
  const text = Array.from(
    String(v)
      .replace(/[\p{Cc}\u202A-\u202E\u2066-\u2069]/gu, '')
      .trim(),
  )
    .slice(0, max)
    .join('')
    .trim();
  return text || fallback;
};
const finite = (v, fallback, lim = COORD_LIMIT) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.max(-lim, Math.min(lim, v)) : fallback;
/** Yaw wrapped to [-π, π] (the client's camera yaw grows without bound; clients slerp). */
const cleanYaw = (v, fallback) =>
  typeof v === 'number' && Number.isFinite(v)
    ? Math.round(Math.atan2(Math.sin(v), Math.cos(v)) * 1000) / 1000
    : fallback;
const cleanPosition = (v, fallback) =>
  Array.isArray(v) && v.length === 3 && v.every((n) => typeof n === 'number' && Number.isFinite(n))
    ? v.map((n) => Math.round(Math.max(-COORD_LIMIT, Math.min(COORD_LIMIT, n)) * 100) / 100)
    : fallback;

/**
 * Emote allowlist: the legacy emoji payloads current clients send (wave / fire / whoa /
 * crown) plus the sticker ids used by the polish-pass client. Anything else is dropped.
 */
const EMOTE_IDS = new Set([
  'wave',
  'fire',
  'whoa',
  'crown',
  'laugh',
  'thumbs',
  'heart',
  'gg',
  '👋',
  '🔥',
  '😱',
  '👑',
]);
const cleanEmote = (v) => (typeof v === 'string' && EMOTE_IDS.has(v) ? v : null);

/** Server-side copy of the client's default avatar; every relayed avatar is complete. */
const DEFAULT_AVATAR = Object.freeze({
  name: 'Pip',
  bodyType: 'critter',
  eyeType: 'googly',
  mouthType: 'cat',
  hatType: 'propeller',
  primaryColor: '#FF9F1C',
  secondaryColor: '#FFF5E1',
  orbStyle: 'clear',
});
const AVATAR_ID_KEYS = ['bodyType', 'eyeType', 'mouthType', 'hatType', 'orbStyle'];
const AVATAR_COLOR_KEYS = ['primaryColor', 'secondaryColor'];
const ID_RE = /^[A-Za-z0-9_-]{1,32}$/;
const COLOR_RE = /^#(?:[0-9a-fA-F]{3}){1,2}$/;
/** Rebuilds an avatar from known keys only (ids, hex colours, a short name). */
const cleanAvatar = (v, fallback = DEFAULT_AVATAR) => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return fallback;
  const base = fallback || DEFAULT_AVATAR;
  const out = { name: cleanText(v.name, 32, base.name) };
  for (const k of AVATAR_ID_KEYS)
    out[k] = typeof v[k] === 'string' && ID_RE.test(v[k]) ? v[k] : base[k];
  for (const k of AVATAR_COLOR_KEYS) {
    out[k] = typeof v[k] === 'string' && COLOR_RE.test(v[k]) ? v[k] : base[k];
  }
  return out;
};

/** Token bucket: `take()` is false when the caller is over its rate. */
function tokenBucket(perSec, burst) {
  let tokens = burst;
  let last = Date.now();
  return {
    take() {
      const now = Date.now();
      tokens = Math.min(burst, tokens + ((now - last) / 1000) * perSec);
      last = now;
      if (tokens < 1) return false;
      tokens -= 1;
      return true;
    },
  };
}

/**
 * Creates the Summit HTTP + WebSocket server (not listening yet), so tests can run it on an
 * ephemeral port and close it again. `npm run server` / `npm start` run it via the CLI block
 * at the bottom of this file.
 *
 * Lobby rules:
 *  - one room per socket; joining/creating another room leaves the old one once the target
 *    is known, and an empty private room is deleted the moment its last climber leaves
 *    (socket close, explicit `leave`, switching lobby, or a failed switch);
 *  - re-joining your own room while alone in it keeps the room;
 *  - creating a taken code gets a fresh random code (never someone else's room);
 *  - PUBLIC always exists.
 */
export function createSummitServer({
  distDir = DIST_DIR,
  tickMs = 50,
  heartbeatMs = HEARTBEAT_MS,
  limits: limitOverrides = {},
  log = console,
} = {}) {
  const limits = { ...DEFAULT_LIMITS, ...limitOverrides };
  /** Active rooms by lobby code ('PUBLIC' or a private code). */
  const rooms = new Map();
  let privateRoomCount = 0;

  function createRoom({ code, name, password = '', isPublic = false, includeBots = true }) {
    const room = {
      code,
      name: name || (isPublic ? 'Global Summit Server' : `Summit Room ${code}`),
      password: String(password || '').trim(),
      isPublic,
      includeBots: Boolean(includeBots),
      clients: new Map(), // ws -> climberState
      createdAt: Date.now(),
    };
    rooms.set(code, room);
    if (!isPublic) privateRoomCount++;
    return room;
  }

  createRoom({ code: 'PUBLIC', name: 'Global Summit Server', isPublic: true, includeBots: true });

  /**
   * Removes a socket from a room and deletes the room if that left a private room empty.
   * `keepCode` protects the room the socket is about to (re)join, so re-joining your own
   * room while alone in it doesn't delete it first.
   */
  function leaveRoom(ws, code, keepCode = null) {
    const room = code ? rooms.get(code) : null;
    if (!room) return;
    room.clients.delete(ws);
    if (!room.isPublic && room.clients.size === 0 && code !== keepCode) {
      rooms.delete(code);
      privateRoomCount--;
    }
  }

  const serveStatic = createStaticHandler(distDir);

  const httpServer = http.createServer((req, res) => {
    const reqUrl = (req.url || '/').split('?')[0];

    // Live public server status endpoint
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

    // Built production frontend from dist/ (if there is one)
    if (serveStatic(req, res, reqUrl)) return;

    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Orb Runners Summit Multiplayer Server is running.');
  });

  const wss = new WebSocketServer({ server: httpServer, maxPayload: MAX_MESSAGE_BYTES });

  wss.on('connection', (ws) => {
    if (wss.clients.size > limits.maxConnections) {
      ws.close(1013, 'Server full');
      return;
    }
    let currentRoomCode = null;
    const clientId = `climber-${Math.random().toString(36).slice(2, 9)}`;
    const msgBucket = tokenBucket(limits.msgPerSec, limits.msgBurst);
    const joinBucket = tokenBucket(limits.joinPerSec, limits.joinBurst);
    let droppedInARow = 0;
    ws.isAlive = true;
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    const send = (obj) => {
      if (ws.readyState === 1) ws.send(JSON.stringify(obj));
    };
    /** Leaves the current room (deleting it if that empties a private room). */
    const leaveCurrent = (keepCode = null) => {
      leaveRoom(ws, currentRoomCode, keepCode);
      currentRoomCode = null;
    };
    // A failed switch (unknown code / wrong password) leaves the previous room, as in #15:
    // the browser client opens a fresh socket per launch and returns to the lobby screen on
    // any lobby-error, so nothing should keep it (or an empty room) around.
    const lobbyError = (message, code) => {
      leaveCurrent();
      send({ type: 'lobby-error', message, code });
    };

    ws.on('message', (raw) => {
      if (!msgBucket.take()) {
        droppedInARow++;
        if (droppedInARow >= limits.maxDroppedMsgs) ws.close(1008, 'Rate limit exceeded');
        return;
      }
      droppedInARow = 0;
      let msg;
      try {
        msg = JSON.parse(String(raw));
      } catch {
        return; // ignore malformed messages
      }
      if (!msg || typeof msg !== 'object') return;
      try {
        handleMessage(msg);
      } catch (err) {
        // A throwing 'message' listener would otherwise take the whole process down.
        log.warn(`[Orb Runners Summit Server] Bad message from ${clientId}: ${err.message}`);
      }
    });

    function handleMessage(msg) {
      if (msg.type === 'join-or-create') {
        if (!joinBucket.take()) {
          // Not a failed switch: the climber stays where it is.
          send({
            type: 'lobby-error',
            message: 'Too many lobby requests. Wait a moment and try again.',
            code: 'rate-limited',
          });
          return;
        }
        const mode = msg.mode === 'create' || msg.mode === 'join' ? msg.mode : 'public';
        let targetRoom;
        let renamedFrom = null;

        if (mode === 'public') {
          targetRoom = rooms.get('PUBLIC');
        } else if (mode === 'create') {
          if (privateRoomCount >= limits.maxPrivateRooms) {
            lobbyError('The server is full right now. Try again in a few minutes.', 'server-full');
            return;
          }
          const requestedCode = cleanCode(msg.lobbyCode);
          let code = requestedCode;
          if (!code || code === 'PUBLIC' || rooms.has(code)) {
            do {
              code = generateLobbyCode();
            } while (rooms.has(code));
          }
          targetRoom = createRoom({
            code,
            name: cleanText(msg.lobbyName, 32, `Private Climb ${code}`),
            password: cleanPassword(msg.password),
            isPublic: false,
            includeBots: msg.includeBots !== false,
          });
          // Tell the host its requested code was taken, so it shares the real one.
          if (requestedCode && requestedCode !== code) renamedFrom = requestedCode;
        } else {
          const code = cleanCode(String(msg.lobbyCode ?? '').trim());
          let candidate = rooms.get(code);
          // Reconnecting host whose room emptied while it was offline (polish-pass client):
          // recreate it under the same code, only when the code is free and valid.
          if (
            !candidate &&
            msg.recreate === true &&
            code &&
            code !== 'PUBLIC' &&
            privateRoomCount < limits.maxPrivateRooms
          ) {
            candidate = createRoom({
              code,
              name: String(msg.lobbyName || `Private Climb ${code}`).slice(0, 32),
              password: String(msg.password || ''),
              isPublic: false,
              includeBots: msg.includeBots !== false,
            });
          }
          if (!candidate) {
            lobbyError(
              `Lobby "${code || 'UNKNOWN'}" not found. Verify the Lobby Code with your host!`,
              'not-found',
            );
            return;
          }
          const suppliedPass = cleanPassword(msg.password);
          if (candidate.password && candidate.password !== suppliedPass) {
            lobbyError(
              'Incorrect Lobby Password! Please check the password and try again.',
              'bad-password',
            );
            return;
          }
          targetRoom = candidate;
        }

        const cap = targetRoom.isPublic ? limits.maxPublicClients : limits.maxPrivateRoomClients;
        if (!targetRoom.clients.has(ws) && targetRoom.clients.size >= cap) {
          lobbyError(`Lobby "${targetRoom.code}" is full.`, 'room-full');
          return;
        }

        leaveCurrent(targetRoom.code);
        currentRoomCode = targetRoom.code;
        const initialClimber =
          msg.climber && typeof msg.climber === 'object' && !Array.isArray(msg.climber)
            ? msg.climber
            : {};
        targetRoom.clients.set(ws, {
          id: clientId,
          name: cleanText(initialClimber.name, 18, 'Climber'),
          position: cleanPosition(initialClimber.position, [0, 1.0, 0]),
          yaw: cleanYaw(initialClimber.yaw, 0),
          altitudeM: finite(initialClimber.altitudeM, 0),
          peakAltitudeM: finite(initialClimber.peakAltitudeM, 0),
          avatar: cleanAvatar(initialClimber.avatar),
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
          ...(renamedFrom ? { renamed: true, requestedCode: renamedFrom } : {}),
        });
      } else if (msg.type === 'leave') {
        leaveCurrent();
      } else if (msg.type === 'state-update' && currentRoomCode) {
        const room = rooms.get(currentRoomCode);
        const existing = room?.clients.get(ws);
        if (!existing) return;
        room.clients.set(ws, {
          id: existing.id,
          name: cleanText(msg.name, 18, existing.name),
          position: cleanPosition(msg.position, existing.position),
          yaw: cleanYaw(msg.yaw, existing.yaw),
          altitudeM: finite(msg.altitudeM, existing.altitudeM),
          peakAltitudeM: finite(msg.peakAltitudeM, existing.peakAltitudeM),
          avatar:
            msg.avatar === undefined ? existing.avatar : cleanAvatar(msg.avatar, existing.avatar),
          emote: cleanEmote(msg.emote),
          isBot: false,
        });
      }
    }

    // Without an 'error' listener, ws re-throws protocol errors (invalid opcode,
    // bad UTF-8, oversized payload, abrupt socket resets) as an unhandled
    // EventEmitter 'error', crashing the whole server and every lobby with it.
    // ws terminates the socket after emitting, so 'close' still runs cleanup.
    ws.on('error', (err) => {
      log.warn(`[Orb Runners Summit Server] WebSocket error from ${clientId}: ${err.message}`);
    });

    ws.on('close', () => {
      // Clean up empty private rooms after everyone leaves
      leaveCurrent();
    });
  });

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
        if (clientWs.readyState === 1 && clientWs.bufferedAmount < MAX_BUFFERED_BYTES) {
          clientWs.send(payload);
        }
      }
    }
  }, tickMs);

  // Heartbeat: frozen tabs, sleeping phones and dropped NATs never send 'close'; without
  // this their climber (and an otherwise empty private room) would linger forever.
  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      if (!ws.isAlive) {
        ws.terminate(); // 'close' runs the usual room cleanup
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

  /** Stops the loops, drops every socket and closes the HTTP server. */
  function close() {
    clearInterval(broadcast);
    clearInterval(heartbeat);
    for (const ws of wss.clients) ws.terminate();
    wss.close();
    return new Promise((resolve) => httpServer.close(() => resolve()));
  }

  return { httpServer, wss, rooms, close };
}

/** True when this file is run directly (`node server/summitServer.mjs`), not imported by tests. */
function isEntryPoint() {
  if (!process.argv[1]) return false;
  try {
    // realpath on both sides: Node resolves symlinks for the main module's import.meta.url.
    return fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (isEntryPoint()) {
  const server = createSummitServer();
  server.httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(
      `[Orb Runners Summit Server] Listening on http://0.0.0.0:${PORT} and ws://0.0.0.0:${PORT} (Public + Private Lobbies Ready)`,
    );
  });
  const shutdown = () => {
    server.close().then(() => process.exit(0));
    setTimeout(() => process.exit(0), 2000).unref();
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
