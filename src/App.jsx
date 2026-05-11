import React, { useReducer, useState } from 'react';
import { useAuth } from './auth/useAuth.js';
import { createInitialState, reducer } from './game/gameState.js';
import AuthScreen from './components/AuthScreen.jsx';
import SetupScreen from './components/SetupScreen.jsx';
import GameBoard from './components/GameBoard.jsx';
import ScoreScreen from './components/ScoreScreen.jsx';

// Screens: 'auth' | 'setup' | 'game' | 'scores'
export default function App() {
  const auth = useAuth();
  const [screen, setScreen] = useState('auth');
  const [players, setPlayers] = useState(null);
  const [gameKey, setGameKey] = useState(0);
  const [activeGameState, setActiveGameState] = useState(null);

  function handleAuthDone() {
    setScreen('setup');
  }

  function handleStart(chosenPlayers) {
    setPlayers(chosenPlayers);
    const initial = createInitialState(chosenPlayers);
    setActiveGameState(initial);
    setGameKey((k) => k + 1);
    setScreen('game');
  }

  function handleGameOver() {
    setScreen('scores');
  }

  function handlePlayAgain() {
    if (players) {
      const initial = createInitialState(players);
      setActiveGameState(initial);
      setGameKey((k) => k + 1);
      setScreen('game');
    }
  }

  function handleBackToSetup() {
    setScreen('setup');
  }

  return (
    <div className="app">
      {screen === 'auth' && (
        <AuthScreen onAuth={handleAuthDone} useAuthHook={auth} />
      )}
      {screen === 'setup' && (
        <SetupScreen
          onStart={handleStart}
          currentUser={auth.currentUser}
          onLogout={auth.logout}
        />
      )}
      {screen === 'game' && activeGameState && (
        <GameStateManager
          key={gameKey}
          initialState={activeGameState}
          onGameOver={handleGameOver}
          onStateChange={setActiveGameState}
        />
      )}
      {screen === 'scores' && activeGameState && (
        <ScoreScreen
          state={activeGameState}
          onPlayAgain={handlePlayAgain}
          onSetup={handleBackToSetup}
          addGameResult={auth.addGameResult}
        />
      )}
    </div>
  );
}

// Inner component that owns the reducer and can be re-mounted cleanly via key
function GameStateManager({ initialState, onGameOver, onStateChange }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const prevPhaseRef = React.useRef(state.phase);

  React.useEffect(() => {
    onStateChange(state);
    const prev = prevPhaseRef.current;
    prevPhaseRef.current = state.phase;

    // Normal win: transition directly to scores
    if (prev !== 'game-over' && state.phase === 'game-over') {
      onGameOver();
    }
    // Bomb phase: GameBoard shows animation, calls onGameOver when done
  }, [state, onGameOver, onStateChange]);

  return (
    <GameBoard
      state={state}
      dispatch={dispatch}
      onGameOver={onGameOver}
    />
  );
}
