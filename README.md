# 🔮 Orb Runners

A 3D arcade physics platformer and multiplayer vertical climb built with **React 18, TypeScript, Vite, Three.js (`@react-three/fiber`, `@react-three/drei`), Rapier 3D Physics (`@react-three/rapier`), and Zustand**.

Inspired by *Super Monkey Ball* (board-tilt gravity physics with an upright decoupled 3D character inside a refractive glass orb), *Trackmania* (millisecond speedrun timer, Author/Gold/Silver/Bronze medals, Personal Best Ghost replays, sector checkpoint splits, and turbo boost chevrons), and *PEAK* (**Reach the Summit**: a 25-stage, 5-phase, 250m vertical multiplayer mountain odyssey with Public & Private Lobbies).

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start the Vite dev server (http://localhost:5173)
npm run dev

# 3. Start the Summit Multiplayer WebSocket & HTTP server (port 5174)
npm run server
```

### Online Play via Single-Port Tunnel
Vite proxies `/ws-summit` directly to `ws://localhost:5174`, so only port `5173` needs to be exposed for online multiplayer:
```bash
ssh -R 80:localhost:5173 nokey@localhost.run
# or: npx cloudflared tunnel --url http://localhost:5173
```

---

## 🧭 Architecture Overview (For Developers & AI Collaborators: Antigravity + Grok Bot)

### 1. Core Physics & Stage Tilt Mechanics
- **[`src/components/game/TiltController.tsx`](src/components/game/TiltController.tsx)**:
  - Rather than applying direct movement forces to the ball, player inputs (`WASD` / Arrow Keys / Gamepad Left Stick) tilt the gravity vector up to `MAX_TILT_RAD = 17.5°` (`0.305 rad`) relative to the camera's yaw (`livePhysics.cameraYaw`).
  - **Design Rule for Uphill Slopes**: Because maximum board tilt is `17.5°`, any unassisted uphill ramp should have a slope angle below `14°` (e.g., `10m` rise over `50m` run = `11.3°`), or include [`BoostPad`](src/components/obstacles/BoostPad.tsx) strips oriented with the ramp's pitch `[rx, ry, rz]`.
- **[`src/components/game/PlayerOrb.tsx`](src/components/game/PlayerOrb.tsx)**:
  - Dynamic Rapier rigid body (`ball` collider, `radius = 0.52`, `mass = 1.8`, `linearDamping = 0.34`, `angularDamping = 0.28`, `ccd = true`).
  - Renders a custom refractive glass `OrbShell` that rotates with the rigid body while the inner [`CharacterModel`](src/components/game/CharacterModel.tsx) remains upright and leans into the velocity vector.

### 2. Gadgets & Obstacles (`src/components/obstacles/`)
- **[`JumpPad.tsx`](src/components/obstacles/JumpPad.tsx)**:
  - Supports deterministic ballistic trajectories via `targetPosition: [tx, ty, tz]` and `arcHeight`. When triggered, it computes the exact launch velocity vector `setLinvel({ x: vx, y: vy, z: vz }, true)` compensating for gravity (`g = 20.5`) and `linearDamping = 0.34` so the player lands squarely on the target terrace regardless of entry speed.
- **[`BoostPad.tsx`](src/components/obstacles/BoostPad.tsx)**:
  - Applies directional acceleration along the pad's 3D Euler orientation `[rx, ry, rz]` so boost pads placed on uphill ramps push parallel to the slope.
- **[`CheckpointGate.tsx`](src/components/obstacles/CheckpointGate.tsx)**:
  - Sector checkpoints for the 15 Campaign maps and Biome Base Camps (`Camp 1`–`Camp 5`) in Summit Mode.

### 3. Game Modes & Level Definitions (`src/levels/`)
- **[`src/levels/maps.ts`](src/levels/maps.ts)**:
  - Contains all **15 Official Speedrun Campaign Stages** (`MAPS`), complete with Author/Gold/Silver/Bronze target times, checkpoints, moving platforms, rotating hazards, switch bridges, bumpers, boost pads, and jump pads.
- **[`src/levels/summitMap.ts`](src/levels/summitMap.ts)**:
  - Defines **Reach the Summit (`SUMMIT_MAP`, ID `999`)**, a continuous `~2.05 km` mountain highway ascending `0m → 250m` across **25 interconnected stages** and **5 themed phases (`SUMMIT_PHASES`)**:
    1. **Phase I (`0m–50m`, Stages 1–5)**: *Emerald Foothills* (`meadow` theme, `day` sky)
    2. **Phase II (`50m–100m`, Stages 6–10)**: *Cobalt Skyworks* (`cobalt` theme, `sunset` sky)
    3. **Phase III (`100m–150m`, Stages 11–15)**: *Sunset Pinball Canyon* (`sunset` theme, `neon` sky)
    4. **Phase IV (`150m–200m`, Stages 16–20)**: *Cyber Glacier Spire* (`ice` theme, `aurora` sky)
    5. **Phase V (`200m–250m`, Stages 21–25)**: *Celestial Golden Crown* (`gold` theme, `citadel` sky)

### 4. Multiplayer Server (`server/summitServer.mjs`)
- **[`server/summitServer.mjs`](server/summitServer.mjs)**:
  - Node.js HTTP + WebSocket server (`ws`) supporting the **Global Public Server (`PUBLIC`)** and **Private Lobbies** with custom **Lobby Codes**, optional **Passwords**, and toggleable server-synced **AI Climber Bots** (`WAYPOINTS` synced with `summitMap.ts`).
- **[`src/components/game/SummitMultiplayer.tsx`](src/components/game/SummitMultiplayer.tsx)**:
  - Renders remote climbers' 3D glass orbs, custom avatars, floating altitude/nameplates, and 3D emote popups (`1`–`4` keys).
