# 🤖 AGENTS.md — Multi-Agent Collaboration Guide (Antigravity & Grok Bot)

Welcome! This repository (**Orb Runners**) is co-developed by **Antigravity** and **Grok Bot** alongside the project creator. Follow these guidelines and invariants whenever modifying or extending the codebase so both agents stay 100% in sync.

---

## 🛠️ Tech Stack & Commands

- **Frontend Framework:** React 18 + TypeScript + Vite (`src/`)
- **3D Engine & Physics:** Three.js (`@react-three/fiber`, `@react-three/drei`) + Rapier 3D (`@react-three/rapier`)
- **State Management:** Zustand (`src/store/useGameStore.ts`)
- **Multiplayer Backend:** Node.js HTTP + WebSocket server (`server/summitServer.mjs` using `ws`)

### Key Scripts
- `npm run dev` — Starts the Vite development server on `http://localhost:5173` (automatically proxies `/ws-summit` to `ws://localhost:5174`).
- `npm run server` — Starts the Summit Multiplayer WebSocket & static HTTP server on port `5174`.
- `npm run build` — Runs `tsc -b && vite build`. **Always verify `npm run build` exits with code 0 before committing!**

---

## ⚖️ Critical Physics & Level Design Invariants

1. **Super Monkey Ball Board-Tilt Gravity (`src/components/game/TiltController.tsx`)**:
   - The player does **not** push the ball directly. Instead, `WASD` / Arrow Keys / Gamepad Left Stick tilt the gravity vector up to `MAX_TILT_RAD = 17.5°` (`0.305 rad`) relative to `livePhysics.cameraYaw`.
   - **Uphill Slope Limit**: Any uphill ramp must have a pitch angle $\theta = \text{atan2}(\Delta y, \Delta z) < 14^\circ$ (for example, `10m` rise over `50m` horizontal run = $11.3^\circ$) so the player can roll uphill purely by holding `W` even from a standstill, **OR** it must have [`BoostPad`](src/components/obstacles/BoostPad.tsx) strips with `rotation: [pitch, 0, 0]` to propel the orb up the incline.
2. **Player Orb RigidBody (`src/components/game/PlayerOrb.tsx`)**:
   - Uses `colliders="ball"` (`radius = 0.52`), `mass = 1.8`, `linearDamping = 0.34`, `angularDamping = 0.28`, `gravity = [0, -20.5, 0]`, and `ccd = true`.
3. **Deterministic Ballistic Jump Pads (`src/components/obstacles/JumpPad.tsx`)**:
   - Always prefer specifying `targetPosition: [tx, ty, tz]` and `arcHeight` on `JumpPadDef` (`src/types/level.ts`).
   - `JumpPad.tsx` solves the exact ballistic velocity vector compensating for `g = 20.5` and `linearDamping = 0.34` and applies it via `rigidBody.setLinvel({ x: vx, y: vy, z: vz }, true)` so the player lands squarely on the target platform regardless of approach speed.
4. **Reach the Summit (`src/levels/summitMap.ts` & `server/summitServer.mjs`)**:
   - `SUMMIT_MAP` (`id: 999`) is a 25-stage, 5-phase continuous climb from `0m` to `250m` (`SUMMIT_PHASES`).
   - Whenever stage geometry or centerline coordinates in `src/levels/summitMap.ts` are modified, update `buildSummitWaypoints()` in `server/summitServer.mjs` so the server-side AI Climber Bots follow the updated mountain highway.

---

## 📂 Directory Structure

```text
├── server/
│   └── summitServer.mjs          # Public & Private Lobby WebSocket + HTTP server (port 5174)
├── src/
│   ├── components/
│   │   ├── game/
│   │   │   ├── CharacterModel.tsx    # Custom 3D buddy inside the orb
│   │   │   ├── GameCanvas.tsx        # Three.js Canvas, dynamic sky themes, lighting & post-FX
│   │   │   ├── GamepadManager.tsx    # HTML5 Gamepad API polling & shortcuts
│   │   │   ├── GhostOrb.tsx          # Personal Best speedrun ghost replay renderer
│   │   │   ├── MonkeyCamera.tsx      # Velocity-ahead banking camera rig
│   │   │   ├── OrbSpeedTrail.tsx     # Dynamic ribbon trail & sonic speed rings
│   │   │   ├── ParticleFX.tsx        # Instanced 3D particle bursts (sparks, confetti, rings)
│   │   │   ├── PlayerOrb.tsx         # Rapier ball physics + PBR glass OrbShell
│   │   │   ├── StageBuilder.tsx      # Declarative JSON level renderer
│   │   │   ├── SummitMultiplayer.tsx # Remote climbers, nameplates, and 3D emote popups
│   │   │   └── TiltController.tsx    # Camera-relative gravity tilt & visual board tilt
│   │   ├── obstacles/
│   │   │   ├── BoostPad.tsx          # 3D-oriented turbo chevron strips
│   │   │   ├── Bumper.tsx            # Pinball shockwave bumpers
│   │   │   ├── CheckpointGate.tsx    # Campaign checkpoints & Summit Biome Base Camps
│   │   │   ├── GoalGate.tsx          # Finish arch + time-bonus gems
│   │   │   ├── JumpPad.tsx           # Deterministic ballistic spring launcher
│   │   │   ├── MovingPlatform.tsx    # Kinematic oscillating platforms
│   │   │   ├── RotatingHazard.tsx    # Spinning bars, windmills & cross-bridges
│   │   │   ├── StaticBlock.tsx       # Themed platforms & guardrails
│   │   │   └── ToggleSwitch.tsx      # Switch-activated energy bridges
│   │   └── ui/
│   │       ├── CharacterCreator.tsx  # Live 3D Character & Orb Customizer
│   │       ├── HUD.tsx               # Speedometer, Tilt Radar, Thermometer, Leaderboard
│   │       ├── MainMenu.tsx          # Campaign stage selector & Summit launcher
│   │       ├── SoundManager.ts       # Procedural Web Audio synthesizer SFX
│   │       └── SummitLobbyModal.tsx  # Public server & Private Lobby (Code/Password) modal
│   ├── levels/
│   │   ├── maps.ts                   # 15 Official Speedrun Campaign Stages
│   │   └── summitMap.ts              # 25-Stage, 5-Phase "Reach the Summit" Mega-Climb (0m-250m)
│   ├── store/
│   │   └── useGameStore.ts           # Zustand state, PB ghosts, medals, and multiplayer state
│   └── types/
│       ├── avatar.ts
│       ├── game.ts
│       └── level.ts
```
