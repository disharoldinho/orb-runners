import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SUMMIT_BOT_WAYPOINTS, SUMMIT_LEVEL_ID } from '../../levels/summitMap';
import { livePhysics, useGameStore } from '../../store/useGameStore';
import { RemoteClimberState } from '../../types/game';
import { CharacterModel } from './CharacterModel';
import { ORB_RADIUS, OrbShell } from './PlayerOrb';
import { EmoteBubble, NameTag } from './StickerTags';

const FALLBACK_BOTS: Omit<
  RemoteClimberState,
  'position' | 'yaw' | 'altitudeM' | 'peakAltitudeM' | 'emote'
>[] = [
  {
    id: 'local-bot-nova',
    name: 'Nova [BOT]',
    isBot: true,
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
    id: 'local-bot-mochi',
    name: 'Mochi [BOT]',
    isBot: true,
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
    id: 'local-bot-zephyr',
    name: 'Zephyr [BOT]',
    isBot: true,
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
    id: 'local-bot-blaze',
    name: 'Blaze [BOT]',
    isBot: true,
    avatar: {
      name: 'Blaze',
      bodyType: 'blob',
      eyeType: 'determined',
      mouthType: 'tongue',
      hatType: 'wizard',
      primaryColor: '#ef4444',
      secondaryColor: '#fee2e2',
      orbStyle: 'neon',
    },
  },
];

const UP = new THREE.Vector3(0, 1, 0);

function RemoteClimberMesh({ climber }: { climber: RemoteClimberState }) {
  const outerGroupRef = useRef<THREE.Group>(null);
  const shellMeshRef = useRef<THREE.Group>(null);
  const charGroupRef = useRef<THREE.Group>(null);
  const targetPos = useRef(new THREE.Vector3(...climber.position));
  const targetQ = useRef(new THREE.Quaternion());
  const yawRef = useRef(climber.yaw);
  yawRef.current = climber.yaw;
  const snapped = useRef(false);

  useEffect(() => {
    targetPos.current.set(climber.position[0], climber.position[1], climber.position[2]);
  }, [climber.position]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const g = outerGroupRef.current;
    if (!g) return;
    // Teleports (respawn at camp, joining mid-climb) snap instead of sliding across the map.
    if (!snapped.current || g.position.distanceToSquared(targetPos.current) > 36) {
      g.position.copy(targetPos.current);
      snapped.current = true;
    }
    const prevX = g.position.x;
    const prevZ = g.position.z;
    g.position.lerp(targetPos.current, 1 - Math.exp(-14 * dt));
    const moveDist = Math.hypot(g.position.x - prevX, g.position.z - prevZ);
    if (shellMeshRef.current && moveDist > 0.0005) {
      shellMeshRef.current.rotation.x += (moveDist / ORB_RADIUS) * 0.85;
      shellMeshRef.current.rotation.z += (moveDist / ORB_RADIUS) * 0.35;
    }
    if (charGroupRef.current) {
      targetQ.current.setFromAxisAngle(UP, yawRef.current);
      charGroupRef.current.quaternion.slerp(targetQ.current, 1 - Math.exp(-10 * dt));
    }
  });

  const accent = climber.avatar?.primaryColor || '#3fa9ff';
  return (
    <group ref={outerGroupRef} position={climber.position}>
      {/* Rolling Outer Glass Shell */}
      <group ref={shellMeshRef}>
        <OrbShell style={climber.avatar?.orbStyle || 'clear'} primaryColor={accent} />
      </group>

      {/* Upright Inner 3D Character */}
      <group ref={charGroupRef}>
        <CharacterModel config={climber.avatar} />
      </group>

      {/* Sticker name tag with live altitude, and the emote bubble above it */}
      <NameTag
        position={[0, ORB_RADIUS + 0.5, 0]}
        spec={{
          name: climber.name,
          badge: `${climber.altitudeM}m`,
          accent,
          isBot: Boolean(climber.isBot),
        }}
      />
      <EmoteBubble emote={climber.emote} position={[0, ORB_RADIUS + 1.12, 0]} />
    </group>
  );
}

const localEmote = () =>
  livePhysics.localEmote && performance.now() - livePhysics.localEmoteTimestamp < 3200
    ? livePhysics.localEmote
    : null;

function LocalPlayerEmoteBillboard() {
  const groupRef = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!groupRef.current) return;
    const [bx, by, bz] = livePhysics.ballPosition;
    groupRef.current.position.set(bx, by, bz);
  });
  return (
    <group ref={groupRef}>
      <EmoteBubble getEmote={localEmote} position={[0, ORB_RADIUS + 0.95, 0]} />
    </group>
  );
}

/** Cumulative route distance per bot waypoint (offline fallback bots move in m/s). */
const FALLBACK_ROUTE_DIST: number[] = SUMMIT_BOT_WAYPOINTS.reduce<number[]>((acc, p, i, arr) => {
  if (i === 0) return [0];
  const q = arr[i - 1];
  acc.push(acc[i - 1] + Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]));
  return acc;
}, []);
const FALLBACK_ROUTE_LENGTH = FALLBACK_ROUTE_DIST[FALLBACK_ROUTE_DIST.length - 1];

/** Reconnect backoff (ms) after the Summit socket drops; the last value repeats. */
const RECONNECT_DELAYS_MS = [800, 1600, 3200, 6000, 10000];

export function SummitMultiplayer() {
  const currentLevelId = useGameStore((s) => s.currentLevelId);
  const summitSession = useGameStore((s) => s.summitSession);
  const remoteClimbers = useGameStore((s) => s.remoteClimbers);

  useEffect(() => {
    if (currentLevelId !== SUMMIT_LEVEL_ID) return;
    const store = useGameStore.getState;
    const { setRemoteClimbers, setSummitLobbyState, setScreen, recordPeakAltitude } = store();

    // What the player asked for when launching; reconnects rejoin what we actually got.
    const requested = { ...store().summitLobby };
    let joined: {
      code: string;
      name: string;
      created: boolean;
      password: string;
      includeBots: boolean;
    } | null = null;

    let ws: WebSocket | null = null;
    let clientId: string | null = null;
    let fallbackInterval: ReturnType<typeof setInterval> | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;
    let isDisposed = false;
    /** Stop reconnecting (e.g. the room is gone after a drop): play on with local bots. */
    let gaveUp = false;

    const stopFallbackBots = () => {
      if (fallbackInterval) clearInterval(fallbackInterval);
      fallbackInterval = null;
    };

    const startOfflineFallbackBots = () => {
      if (isDisposed || fallbackInterval) return;
      const includeBots = joined ? joined.includeBots : requested.includeBots;
      if (!includeBots) {
        setRemoteClimbers([]);
        return;
      }
      const startTime = performance.now() / 1000;
      const tick = () => {
        const elapsed = performance.now() / 1000 - startTime;
        const bots: RemoteClimberState[] = FALLBACK_BOTS.map((bot, idx) => {
          // Walk the real route at ~4.5-6 m/s, rest at the summit, then loop.
          const metersPerSec = 4.5 + idx * 0.6;
          const cycleSec = FALLBACK_ROUTE_LENGTH / metersPerSec + 12;
          const t = (elapsed + idx * 0.22 * cycleSec) % cycleSec;
          const dist = Math.min(FALLBACK_ROUTE_LENGTH, t * metersPerSec);
          let segIdx = 0;
          while (
            segIdx < FALLBACK_ROUTE_DIST.length - 2 &&
            FALLBACK_ROUTE_DIST[segIdx + 1] <= dist
          ) {
            segIdx++;
          }
          const segLen = FALLBACK_ROUTE_DIST[segIdx + 1] - FALLBACK_ROUTE_DIST[segIdx] || 1;
          const frac = Math.min(1, (dist - FALLBACK_ROUTE_DIST[segIdx]) / segLen);
          const p0 = SUMMIT_BOT_WAYPOINTS[segIdx];
          const p1 = SUMMIT_BOT_WAYPOINTS[segIdx + 1];
          const bobY = Math.abs(Math.sin(elapsed * 2.2 + idx)) * 0.25;
          const x = p0[0] + (p1[0] - p0[0]) * frac + Math.sin(elapsed * 1.5 + idx) * 0.45;
          const y = p0[1] + (p1[1] - p0[1]) * frac + bobY;
          const z = p0[2] + (p1[2] - p0[2]) * frac + Math.cos(elapsed * 1.4 + idx) * 0.45;
          const yaw = Math.atan2(p1[0] - p0[0], p1[2] - p0[2]);
          const altitudeM = Math.max(0, Math.round(y - 1.0));
          return {
            ...bot,
            position: [x, y, z],
            yaw,
            altitudeM,
            peakAltitudeM: altitudeM,
            emote: Math.floor(elapsed + idx * 5) % 18 < 2 ? '👋' : null,
          };
        });
        setRemoteClimbers(bots);
      };
      tick();
      fallbackInterval = setInterval(tick, 60);
    };

    const scheduleReconnect = () => {
      if (isDisposed || gaveUp || reconnectTimer) return;
      const delay = RECONNECT_DELAYS_MS[Math.min(attempts, RECONNECT_DELAYS_MS.length - 1)];
      attempts++;
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connect();
      }, delay);
    };

    const joinMessage = () => {
      const state = store();
      const climber = {
        name: state.avatar.name || 'Runner',
        position: livePhysics.ballPosition,
        yaw: livePhysics.cameraYaw + Math.PI,
        altitudeM: Math.round(livePhysics.currentAltitudeM),
        peakAltitudeM: Math.round(livePhysics.peakAltitudeM),
        avatar: state.avatar,
      };
      if (joined) {
        // Rejoin after a drop. The host may recreate its (now empty, deleted) room.
        return joined.code === 'PUBLIC'
          ? { type: 'join-or-create', mode: 'public', climber }
          : {
              type: 'join-or-create',
              mode: 'join',
              lobbyCode: joined.code,
              lobbyName: joined.name,
              password: joined.password,
              includeBots: joined.includeBots,
              recreate: joined.created,
              climber,
            };
      }
      const mode = requested.mode === 'public' ? 'public' : requested.action || 'join';
      return {
        type: 'join-or-create',
        mode,
        lobbyCode: requested.lobbyCode,
        lobbyName: requested.lobbyName,
        password: requested.password,
        includeBots: requested.includeBots,
        climber,
      };
    };

    function connect() {
      if (isDisposed) return;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      let sock: WebSocket;
      try {
        sock = new WebSocket(`${protocol}//${window.location.host}/ws-summit`);
      } catch {
        startOfflineFallbackBots();
        scheduleReconnect();
        return;
      }
      ws = sock;

      sock.onopen = () => {
        if (isDisposed || ws !== sock) return;
        sock.send(JSON.stringify(joinMessage()));
      };

      sock.onmessage = (event) => {
        if (isDisposed || ws !== sock) return;
        let msg: {
          type?: string;
          clientId?: string;
          lobbyCode?: string;
          lobbyName?: string;
          mode?: 'public' | 'private';
          includeBots?: boolean;
          message?: string;
          climbers?: RemoteClimberState[];
        };
        try {
          msg = JSON.parse(String(event.data));
        } catch {
          return;
        }
        if (msg.type === 'lobby-joined' && msg.lobbyCode) {
          attempts = 0;
          clientId = msg.clientId ?? null;
          const wasCreated = joined ? joined.created : requested.action === 'create';
          joined = {
            code: msg.lobbyCode,
            name: msg.lobbyName || msg.lobbyCode,
            created: msg.mode === 'private' && wasCreated,
            password: joined ? joined.password : requested.password,
            includeBots: Boolean(msg.includeBots),
          };
          stopFallbackBots();
          // Updating the store no longer re-runs this effect (it is keyed on summitSession).
          setSummitLobbyState({
            isConnected: true,
            lobbyCode: msg.lobbyCode,
            lobbyName: msg.lobbyName || msg.lobbyCode,
            mode: msg.mode === 'private' ? 'private' : 'public',
            action: msg.mode === 'private' ? (joined.created ? 'create' : 'join') : 'public',
            includeBots: Boolean(msg.includeBots),
            errorMessage: null,
          });
        } else if (msg.type === 'lobby-error') {
          if (!joined) {
            // First join failed (typo / wrong password): back to the lobby screen to fix it.
            setSummitLobbyState({ isConnected: false, errorMessage: msg.message || 'Could not join lobby' });
            setScreen('summit-lobby');
          } else {
            // Rejoin after a drop failed (room closed meanwhile): keep playing offline.
            gaveUp = true;
            setSummitLobbyState({
              isConnected: false,
              errorMessage: msg.message || 'Lost the lobby',
            });
            try {
              sock.close();
            } catch {
              // ignore
            }
            startOfflineFallbackBots();
          }
        } else if (msg.type === 'room-state' && Array.isArray(msg.climbers)) {
          setRemoteClimbers(msg.climbers.filter((c) => c && c.id !== clientId));
        }
      };

      sock.onclose = () => {
        if (isDisposed || ws !== sock) return;
        ws = null;
        setSummitLobbyState({ isConnected: false });
        startOfflineFallbackBots();
        scheduleReconnect();
      };
      // onerror is always followed by onclose; nothing to do here.
      sock.onerror = () => {};
    }

    // Phones suspend sockets in the background: retry right away when the tab returns.
    const onVisible = () => {
      if (document.visibilityState !== 'visible' || isDisposed || gaveUp) return;
      if (!ws || ws.readyState === WebSocket.CLOSED) {
        if (reconnectTimer) clearTimeout(reconnectTimer);
        reconnectTimer = null;
        attempts = 0;
        connect();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onVisible);

    connect();

    const stateInterval = setInterval(() => {
      const curAlt = Math.round(livePhysics.currentAltitudeM);
      recordPeakAltitude(curAlt);
      if (!ws || ws.readyState !== WebSocket.OPEN || !clientId) return;
      const state = store();
      ws.send(
        JSON.stringify({
          type: 'state-update',
          name: state.avatar.name || 'Runner',
          position: [
            Number(livePhysics.ballPosition[0].toFixed(2)),
            Number(livePhysics.ballPosition[1].toFixed(2)),
            Number(livePhysics.ballPosition[2].toFixed(2)),
          ],
          yaw: Number((livePhysics.cameraYaw + Math.PI).toFixed(2)),
          altitudeM: curAlt,
          peakAltitudeM: Math.max(curAlt, state.summitBestAltitudeM),
          avatar: state.avatar,
          emote: localEmote(),
        })
      );
    }, 50);

    return () => {
      isDisposed = true;
      clearInterval(stateInterval);
      stopFallbackBots();
      if (reconnectTimer) clearTimeout(reconnectTimer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onVisible);
      if (ws) {
        const sock = ws;
        ws = null;
        sock.onopen = sock.onmessage = sock.onclose = sock.onerror = null;
        try {
          if (sock.readyState === WebSocket.OPEN) sock.send(JSON.stringify({ type: 'leave' }));
          sock.close();
        } catch {
          // ignore
        }
      }
      setRemoteClimbers([]);
      setSummitLobbyState({ isConnected: false });
    };
  }, [currentLevelId, summitSession]);

  if (currentLevelId !== SUMMIT_LEVEL_ID) return null;

  return (
    <group>
      <LocalPlayerEmoteBillboard />
      {remoteClimbers.map((climber) => (
        <RemoteClimberMesh key={climber.id} climber={climber} />
      ))}
    </group>
  );
}
