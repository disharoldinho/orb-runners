import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';
import { SUMMIT_BOT_WAYPOINTS, SUMMIT_LEVEL_ID } from '../../levels/summitMap';
import { livePhysics, useGameStore } from '../../store/useGameStore';
import { RemoteClimberState } from '../../types/game';
import { CharacterModel } from './CharacterModel';
import { ORB_RADIUS, OrbShell } from './PlayerOrb';

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

function RemoteClimberMesh({ climber }: { climber: RemoteClimberState }) {
  const outerGroupRef = useRef<THREE.Group>(null);
  const shellMeshRef = useRef<THREE.Group>(null);
  const charGroupRef = useRef<THREE.Group>(null);
  const targetPos = useRef(new THREE.Vector3(...climber.position));

  useEffect(() => {
    targetPos.current.set(climber.position[0], climber.position[1], climber.position[2]);
  }, [climber.position]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    if (!outerGroupRef.current) return;

    const prevX = outerGroupRef.current.position.x;
    const prevZ = outerGroupRef.current.position.z;

    outerGroupRef.current.position.lerp(targetPos.current, 1 - Math.exp(-14 * dt));

    const moveDist = Math.hypot(
      outerGroupRef.current.position.x - prevX,
      outerGroupRef.current.position.z - prevZ
    );

    if (shellMeshRef.current && moveDist > 0.0005) {
      shellMeshRef.current.rotation.x += (moveDist / ORB_RADIUS) * 0.85;
      shellMeshRef.current.rotation.z += (moveDist / ORB_RADIUS) * 0.35;
    }

    if (charGroupRef.current) {
      const targetQ = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 1, 0),
        climber.yaw
      );
      charGroupRef.current.quaternion.slerp(targetQ, 1 - Math.exp(-10 * dt));
    }
  });

  return (
    <group ref={outerGroupRef} position={climber.position}>
      {/* Rolling Outer Glass Shell */}
      <group ref={shellMeshRef}>
        <OrbShell
          style={climber.avatar?.orbStyle || 'clear'}
          primaryColor={climber.avatar?.primaryColor || '#38bdf8'}
        />
      </group>

      {/* Upright Inner 3D Character */}
      <group ref={charGroupRef}>
        <CharacterModel config={climber.avatar} />
      </group>

      {/* Floating Nametag, Live Altitude & Emote Billboard */}
      <Billboard position={[0, ORB_RADIUS + 0.68, 0]}>
        {climber.emote && (
          <Text
            position={[0, 0.56, 0]}
            fontSize={0.48}
            anchorX="center"
            anchorY="middle"
          >
            {climber.emote}
          </Text>
        )}
        <Text
          position={[0, 0.14, 0]}
          fontSize={0.21}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.025}
          outlineColor="#090d16"
        >
          {climber.name}
        </Text>
        <Text
          position={[0, -0.1, 0]}
          fontSize={0.16}
          color="#fbbf24"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.02}
          outlineColor="#090d16"
        >
          {`${climber.altitudeM}m`}
        </Text>
      </Billboard>
    </group>
  );
}

function LocalPlayerEmoteBillboard() {
  const groupRef = useRef<THREE.Group>(null);
  const emoteTextRef = useRef<{ text: string } | null>(null);
  const activeEmoteRef = useRef<string | null>(null);

  useFrame(() => {
    if (!groupRef.current) return;
    const [bx, by, bz] = livePhysics.ballPosition;
    groupRef.current.position.set(bx, by + ORB_RADIUS + 0.85, bz);

    const isFresh =
      livePhysics.localEmote && performance.now() - livePhysics.localEmoteTimestamp < 3200;
    groupRef.current.visible = Boolean(isFresh);
    if (isFresh && emoteTextRef.current && activeEmoteRef.current !== livePhysics.localEmote) {
      activeEmoteRef.current = livePhysics.localEmote;
      emoteTextRef.current.text = livePhysics.localEmote || '';
    }
  });

  return (
    <group ref={groupRef} visible={false}>
      <Billboard>
        <Text
          ref={emoteTextRef}
          fontSize={0.55}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.03}
          outlineColor="#090d16"
        >
          👋
        </Text>
      </Billboard>
    </group>
  );
}

export function SummitMultiplayer() {
  const currentLevelId = useGameStore((s) => s.currentLevelId);
  const summitLobby = useGameStore((s) => s.summitLobby);
  const remoteClimbers = useGameStore((s) => s.remoteClimbers);
  const setRemoteClimbers = useGameStore((s) => s.setRemoteClimbers);
  const setSummitLobbyState = useGameStore((s) => s.setSummitLobbyState);
  const setScreen = useGameStore((s) => s.setScreen);
  const recordPeakAltitude = useGameStore((s) => s.recordPeakAltitude);

  const clientIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (currentLevelId !== SUMMIT_LEVEL_ID) return;

    let ws: WebSocket | null = null;
    let stateInterval: ReturnType<typeof setInterval> | null = null;
    let fallbackInterval: ReturnType<typeof setInterval> | null = null;
    let isDisposed = false;

    const startOfflineFallbackBots = () => {
      if (isDisposed) return;
      const lobbyState = useGameStore.getState().summitLobby;
      if (!lobbyState.includeBots) {
        setRemoteClimbers([]);
        return;
      }
      const startTime = performance.now() / 1000;
      fallbackInterval = setInterval(() => {
        const elapsed = performance.now() / 1000 - startTime;
        const totalSegs = SUMMIT_BOT_WAYPOINTS.length - 1;
        const bots: RemoteClimberState[] = FALLBACK_BOTS.map((bot, idx) => {
          const speed = 0.26 + idx * 0.05;
          const phase = idx * 0.22;
          const prog = ((elapsed * speed * 0.045 + phase) % 1.0) * totalSegs;
          const segIdx = Math.min(totalSegs - 1, Math.floor(prog));
          const frac = prog - segIdx;
          const p0 = SUMMIT_BOT_WAYPOINTS[segIdx];
          const p1 = SUMMIT_BOT_WAYPOINTS[segIdx + 1];
          const arcY = Math.sin(frac * Math.PI) * 1.75;
          const x = p0[0] + (p1[0] - p0[0]) * frac + Math.sin(elapsed * 1.5 + idx) * 0.65;
          const y = p0[1] + (p1[1] - p0[1]) * frac + arcY;
          const z = p0[2] + (p1[2] - p0[2]) * frac + Math.cos(elapsed * 1.4 + idx) * 0.65;
          const yaw = Math.atan2(p1[0] - p0[0], p1[2] - p0[2]);
          const altitudeM = Math.max(0, Math.round(y - 1.0));
          return {
            ...bot,
            position: [x, y, z],
            yaw,
            altitudeM,
            peakAltitudeM: Math.max(altitudeM, altitudeM + 15),
            emote: Math.floor(elapsed + idx * 5) % 18 < 2 ? '👋' : null,
          };
        });
        setRemoteClimbers(bots);
      }, 60);
    };

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws-summit`;

    try {
      ws = new WebSocket(wsUrl);
    } catch {
      startOfflineFallbackBots();
      return;
    }

    ws.onopen = () => {
      if (isDisposed || !ws) return;
      const state = useGameStore.getState();
      const actionMode =
        state.summitLobby.mode === 'public'
          ? 'public'
          : state.summitLobby.action || 'join';

      ws.send(
        JSON.stringify({
          type: 'join-or-create',
          mode: actionMode,
          lobbyCode: state.summitLobby.lobbyCode,
          lobbyName: state.summitLobby.lobbyName,
          password: state.summitLobby.password,
          includeBots: state.summitLobby.includeBots,
          climber: {
            name: state.avatar.name || 'Runner',
            position: livePhysics.ballPosition,
            yaw: livePhysics.cameraYaw + Math.PI,
            altitudeM: Math.round(livePhysics.currentAltitudeM),
            peakAltitudeM: Math.round(livePhysics.peakAltitudeM),
            avatar: state.avatar,
          },
        })
      );
    };

    ws.onmessage = (event) => {
      if (isDisposed) return;
      try {
        const msg = JSON.parse(String(event.data));
        if (msg.type === 'lobby-joined') {
          clientIdRef.current = msg.clientId;
          setSummitLobbyState({
            isConnected: true,
            lobbyCode: msg.lobbyCode,
            lobbyName: msg.lobbyName,
            mode: msg.mode,
            action: msg.mode === 'public' ? 'public' : 'join',
            includeBots: msg.includeBots,
            errorMessage: null,
          });
        } else if (msg.type === 'lobby-error') {
          setSummitLobbyState({
            isConnected: false,
            errorMessage: msg.message || 'Could not join lobby',
          });
          setScreen('summit-lobby');
        } else if (msg.type === 'room-state' && Array.isArray(msg.climbers)) {
          const myId = clientIdRef.current;
          const others = (msg.climbers as RemoteClimberState[]).filter((c) => c.id !== myId);
          setRemoteClimbers(others);
        }
      } catch {
        // ignore parse errors
      }
    };

    ws.onerror = () => {
      if (isDisposed) return;
      setSummitLobbyState({ isConnected: false });
      if (!fallbackInterval) {
        startOfflineFallbackBots();
      }
    };

    ws.onclose = () => {
      if (isDisposed) return;
      setSummitLobbyState({ isConnected: false });
      if (!fallbackInterval) {
        startOfflineFallbackBots();
      }
    };

    stateInterval = setInterval(() => {
      const curAlt = Math.round(livePhysics.currentAltitudeM);
      recordPeakAltitude(curAlt);

      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      const state = useGameStore.getState();
      const activeEmote =
        livePhysics.localEmote && performance.now() - livePhysics.localEmoteTimestamp < 3200
          ? livePhysics.localEmote
          : null;

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
          emote: activeEmote,
        })
      );
    }, 50);

    return () => {
      isDisposed = true;
      if (stateInterval) clearInterval(stateInterval);
      if (fallbackInterval) clearInterval(fallbackInterval);
      if (ws) {
        try {
          ws.close();
        } catch {
          // ignore
        }
      }
    };
  }, [
    currentLevelId,
    summitLobby.mode,
    summitLobby.lobbyCode,
    summitLobby.password,
    summitLobby.includeBots,
    setRemoteClimbers,
    setSummitLobbyState,
    setScreen,
    recordPeakAltitude,
  ]);

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
