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
 * Generate the exact 25-stage Summit centerline waypoints (0m -> 250m, ~2.05km)
 * matching `src/levels/summitMap.ts` so server-side AI Climber Bots
 * physically ascend the 5-Phase mountain highway alongside players.
 */
function buildSummitWaypoints() {
  const pts = [[0, 1.0, 0]];
  let curX = 0;
  let curY = 0;
  let curZ = -14;

  const stageTargetX = [
    0,
    0, 0, 0, 0, 12,
    12, 12, 12, 0, 0,
    0, 0, -12, -12, -12,
    -12, -12, 0, 0, 0,
    0, 0, 0, 0, 0,
  ];
  const RISE_PER_STAGE = 10.0;
  const RAMP_SPAN_Z = 50.0;

  for (let stage = 1; stage <= 25; stage++) {
    const nextY = Number((curY + RISE_PER_STAGE).toFixed(2));
    const targetX = stageTargetX[stage];
    const rampEndZ = curZ - RAMP_SPAN_Z;
    const midY = Number(((curY + nextY) * 0.5).toFixed(2));
    const midZ = Number(((curZ + rampEndZ) * 0.5).toFixed(2));

    // Mid-ramp waypoint
    pts.push([curX, midY + 1.0, midZ]);

    // Top of ramp entry terrace
    let deckZ = rampEndZ;
    pts.push([curX, nextY + 1.0, deckZ - 7.0]);
    deckZ -= 14.0;

    // Feature deck span
    if (stage === 4 || stage === 8 || stage === 22) {
      pts.push([curX, nextY + 1.0, deckZ - 7.0]);
      deckZ -= 14.0;
    } else if (stage === 7 || stage === 21) {
      pts.push([curX, nextY + 1.0, deckZ - 5.5]);
      deckZ -= 11.0;
    } else if (stage === 12 || stage === 18) {
      pts.push([curX, nextY + 1.0, deckZ - 8.0]);
      deckZ -= 16.0;
    } else if (stage === 13 || stage === 17) {
      pts.push([curX, nextY + 1.0, deckZ - 9.0]);
      deckZ -= 18.0;
    }

    // Stage Exit Plaza / S-curve
    const isBiomeCamp = stage % 5 === 0 && stage < 25;
    const isPreSummitCamp = stage === 23;
    const isFinalSummit = stage === 25;
    const plazaLen = isFinalSummit ? 24.0 : isBiomeCamp || isPreSummitCamp ? 16.0 : 12.0;
    const plazaCenterZ = deckZ - plazaLen * 0.5;

    pts.push([targetX, nextY + 1.0, plazaCenterZ]);

    curX = targetX;
    curY = nextY;
    curZ = deckZ - plazaLen;
  }
  return pts;
}

const WAYPOINTS = buildSummitWaypoints();

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

function sampleBotStates(elapsedSec) {
  const totalSegments = WAYPOINTS.length - 1;
  return BOT_PROFILES.map((bot, idx) => {
    const cycleProgress = ((elapsedSec * bot.speed * 0.045 + bot.phase) % 1.0) * totalSegments;
    const segIdx = Math.min(totalSegments - 1, Math.floor(cycleProgress));
    const frac = cycleProgress - segIdx;

    const p0 = WAYPOINTS[segIdx];
    const p1 = WAYPOINTS[segIdx + 1];

    // Smooth arc with jump parabola when ascending between terraces
    const jumpArcY = Math.sin(frac * Math.PI) * 1.85;
    const x = p0[0] + (p1[0] - p0[0]) * frac + Math.sin(elapsedSec * 1.7 + idx) * 0.65 + bot.laneOffset * 0.4;
    const y = p0[1] + (p1[1] - p0[1]) * frac + jumpArcY;
    const z = p0[2] + (p1[2] - p0[2]) * frac + Math.cos(elapsedSec * 1.5 + idx) * 0.65;

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
      peakAltitudeM: Math.max(altitudeM, Math.min(220, altitudeM + 18)),
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

