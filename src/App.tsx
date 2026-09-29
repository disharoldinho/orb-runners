import { GameCanvas } from './components/game/GameCanvas';
import { GamepadManager } from './components/game/GamepadManager';
import { CharacterCreator } from './components/ui/CharacterCreator';
import { HUD } from './components/ui/HUD';
import { MainMenu } from './components/ui/MainMenu';
import { SummitLobbyModal } from './components/ui/SummitLobbyModal';
import { useGameStore } from './store/useGameStore';

export function App() {
  const screen = useGameStore((s) => s.screen);

  return (
    <div className="app-root">
      <GamepadManager />
      {screen === 'menu' && <MainMenu />}
      {screen === 'character-creator' && <CharacterCreator />}
      {screen === 'summit-lobby' && <SummitLobbyModal />}
      {screen === 'playing' && (
        <>
          <GameCanvas />
          <HUD />
        </>
      )}
    </div>
  );
}

export default App;

