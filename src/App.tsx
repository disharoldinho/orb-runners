import { GameCanvas } from './components/game/GameCanvas';
import { GamepadManager } from './components/game/GamepadManager';
import { CharacterCreator } from './components/ui/CharacterCreator';
import { GameErrorBoundary } from './components/ui/GameFallback';
import { HUD } from './components/ui/HUD';
import { MainMenu } from './components/ui/MainMenu';
import { MobileControls } from './components/ui/MobileControls';
import { SummitLobbyModal } from './components/ui/SummitLobbyModal';
import { useGameStore } from './store/useGameStore';
import { isTouchDevice } from './input/touchInput';

const IS_TOUCH = isTouchDevice();

export function App() {
  const screen = useGameStore((s) => s.screen);
  const exitToMenu = useGameStore((s) => s.exitToMenu);

  return (
    <div className={`app-root ${IS_TOUCH ? 'is-touch' : ''} ${screen === 'playing' ? 'is-playing' : ''}`}>
      <GamepadManager />
      {screen === 'menu' && <MainMenu />}
      {screen === 'character-creator' && <CharacterCreator />}
      {screen === 'summit-lobby' && <SummitLobbyModal />}
      {screen === 'playing' && (
        <GameErrorBoundary onExit={exitToMenu}>
          <GameCanvas />
          <HUD />
          {IS_TOUCH && <MobileControls />}
        </GameErrorBoundary>
      )}
    </div>
  );
}

export default App;

