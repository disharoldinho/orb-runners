import http from 'node:http';
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

const EMOTE_POOL = ['👋', '🔥', '😱', '👑'];

function generateLobbyCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * Active Lobby Rooms Map
 * key: lobbyCode (e.g. 'PUBLIC' or 'ORB777')
 */
const rooms = new Map();

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
  return room;
}

// Initialize the default Public room
createRoom({
  code: 'PUBLIC',
  name: 'Global Summit Server',
  password: '',
  isPublic: true,
  includeBots: true,
});

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
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.wasm': 'application/wasm',
};

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
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'online', rooms: summary }));
    return;
  }

  // Serve built production frontend from dist/ if available
  if (fs.existsSync(DIST_DIR)) {
    const safePath = path.normalize(reqUrl === '/' ? '/index.html' : reqUrl).replace(/^(\.\.[/\\])+/, '');
    let filePath = path.join(DIST_DIR, safePath);
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(DIST_DIR, 'index.html');
    }
    if (fs.existsSync(filePath)) {
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
      fs.createReadStream(filePath).pipe(res);
      return;
    }
  }

  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Orb Runners Summit Multiplayer Server is running.');
});

const wss = new WebSocketServer({ server: httpServer });

wss.on('connection', (ws) => {
  let currentRoomCode = null;
  const clientId = `climber-${Math.random().toString(36).slice(2, 9)}`;

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(String(raw));

      if (msg.type === 'join-or-create') {
        // Leave previous room if any
        if (currentRoomCode && rooms.has(currentRoomCode)) {
          rooms.get(currentRoomCode).clients.delete(ws);
        }

        const mode = msg.mode || 'public';
        let targetRoom = null;

        if (mode === 'public') {
          targetRoom = rooms.get('PUBLIC');
        } else if (mode === 'create') {
          let code = String(msg.lobbyCode || '')
            .toUpperCase()
            .replace(/[^A-Z0-9-]/g, '')
            .slice(0, 10);
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
        } else if (mode === 'join') {
          const code = String(msg.lobbyCode || '')
            .toUpperCase()
            .trim();
          const candidate = rooms.get(code);
          if (!candidate) {
            ws.send(
              JSON.stringify({
                type: 'lobby-error',
                message: `Lobby "${code || 'UNKNOWN'}" not found. Verify the Lobby Code with your host!`,
              })
            );
            return;
          }
          const suppliedPass = String(msg.password || '').trim();
          if (candidate.password && candidate.password !== suppliedPass) {
            ws.send(
              JSON.stringify({
                type: 'lobby-error',
                message: 'Incorrect Lobby Password! Please check the password and try again.',
              })
            );
            return;
          }
          targetRoom = candidate;
        }

        if (!targetRoom) {
          targetRoom = rooms.get('PUBLIC');
        }

        currentRoomCode = targetRoom.code;
        const initialClimber = msg.climber || {};
        targetRoom.clients.set(ws, {
          id: clientId,
          name: String(initialClimber.name || 'Climber').slice(0, 18),
          position: initialClimber.position || [0, 1.0, 0],
          yaw: initialClimber.yaw || 0,
          altitudeM: initialClimber.altitudeM || 0,
          peakAltitudeM: initialClimber.peakAltitudeM || 0,
          avatar: initialClimber.avatar,
          emote: null,
          isBot: false,
        });

        ws.send(
          JSON.stringify({
            type: 'lobby-joined',
            clientId,
            lobbyCode: targetRoom.code,
            lobbyName: targetRoom.name,
            mode: targetRoom.isPublic ? 'public' : 'private',
            includeBots: targetRoom.includeBots,
            hasPassword: Boolean(targetRoom.password),
          })
        );
      } else if (msg.type === 'state-update' && currentRoomCode) {
        const room = rooms.get(currentRoomCode);
        if (!room) return;
        const existing = room.clients.get(ws);
        if (!existing) return;

        room.clients.set(ws, {
          ...existing,
          name: String(msg.name || existing.name).slice(0, 18),
          position: Array.isArray(msg.position) ? msg.position : existing.position,
          yaw: typeof msg.yaw === 'number' ? msg.yaw : existing.yaw,
          altitudeM: typeof msg.altitudeM === 'number' ? msg.altitudeM : existing.altitudeM,
          peakAltitudeM:
            typeof msg.peakAltitudeM === 'number' ? msg.peakAltitudeM : existing.peakAltitudeM,
          avatar: msg.avatar || existing.avatar,
          emote: msg.emote || null,
          isBot: false,
        });
      }
    } catch {
      // ignore malformed messages
    }
  });

  // Without an 'error' listener, ws re-throws protocol errors (invalid opcode,
  // bad UTF-8, oversized payload, abrupt socket resets) as an unhandled
  // EventEmitter 'error', crashing the whole server and every lobby with it.
  // ws terminates the socket after emitting, so 'close' still runs cleanup.
  ws.on('error', (err) => {
    console.warn(`[Orb Runners Summit Server] WebSocket error from ${clientId}: ${err.message}`);
  });

  ws.on('close', () => {
    if (currentRoomCode && rooms.has(currentRoomCode)) {
      const room = rooms.get(currentRoomCode);
      room.clients.delete(ws);
      // Clean up empty private rooms after everyone leaves
      if (!room.isPublic && room.clients.size === 0) {
        rooms.delete(currentRoomCode);
      }
    }
  });
});

// 20Hz Server Broadcast Loop
const startTime = Date.now();
setInterval(() => {
  const elapsedSec = (Date.now() - startTime) / 1000;
  const botStates = sampleBotStates(elapsedSec);

  for (const room of rooms.values()) {
    if (room.clients.size === 0) continue;

    const humanClimbers = Array.from(room.clients.values());
    const allClimbers = room.includeBots ? [...humanClimbers, ...botStates] : humanClimbers;

    const payload = JSON.stringify({
      type: 'room-state',
      lobbyCode: room.code,
      lobbyName: room.name,
      climbers: allClimbers,
    });

    for (const clientWs of room.clients.keys()) {
      if (clientWs.readyState === 1) {
        clientWs.send(payload);
      }
    }
  }
}, 50);

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(
    `[Orb Runners Summit Server] Listening on http://0.0.0.0:${PORT} and ws://0.0.0.0:${PORT} (Public + Private Lobbies Ready)`
  );
});

