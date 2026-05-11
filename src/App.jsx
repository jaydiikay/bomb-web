import React, { useReducer, useState } from 'react';
import { useAuth } from './auth/useAuth.js';
import { createInitialState, reducer } from './game/gameState.js';
import AuthScreen from './components/AuthScreen.jsx';
import SetupScreen from './components/SetupScreen.jsx';
import GameBoard from './components/GameBoard.jsx';
import ScoreScreen from './components/ScoreScreen.jsx';
import LobbyScreen from './components/LobbyScreen.jsx';
import OnlineGame from './components/OnlineGame.jsx';

// Screens:
//   'auth'         — login / register
//   'home'         — choose Local Game vs Online Game
//   'setup'        — local game setup (player names)
//   'game'         — local game in progress
//   'scores'       — local game score screen
//   'lobby'        — online lobby (create / join room)
//   'online-game'  — online game in progress
export default function App() {
  const auth = useAuth();
  const [screen, setScreen] = useState('auth');
  const [players, setPlayers] = useState(null);
  const [gameKey, setGameKey] = useState(0);
  const [activeGameState, setActiveGameState] = useState(null);

  // Online game session info
  const [onlineSession, setOnlineSession] = useState(null);
  // { roomCode, uid, playerIndex, players }

  // ── Auth ──
  function handleAuthDone() {
    setScreen('home');
  }

  // ── Home screen ──
  function handleChooseLocal() {
    setScreen('setup');
  }

  function handleChooseOnline() {
    setScreen('lobby');
  }

  // ── Local game ──
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

  // ── Online game ──
  function handleGameStart(session) {
    // session = { roomCode, uid, playerIndex, players }
    setOnlineSession(session);
    setScreen('online-game');
  }

  function handleOnlineExit() {
    setOnlineSession(null);
    setScreen('lobby');
  }

  function handleBackToHome() {
    setScreen('home');
  }

  return (
    <div className="app">
      {screen === 'auth' && (
        <AuthScreen onAuth={handleAuthDone} useAuthHook={auth} />
      )}

      {screen === 'home' && (
        <HomeScreen
          currentUser={auth.currentUser}
          onLocal={handleChooseLocal}
          onOnline={handleChooseOnline}
          onLogout={() => { auth.logout(); setScreen('auth'); }}
        />
      )}

      {screen === 'setup' && (
        <SetupScreen
          onStart={handleStart}
          currentUser={auth.currentUser}
          onLogout={() => { auth.logout(); setScreen('auth'); }}
          onBack={handleBackToHome}
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

      {screen === 'lobby' && (
        <LobbyScreen
          currentUser={auth.currentUser}
          onGameStart={handleGameStart}
          onBack={handleBackToHome}
        />
      )}

      {screen === 'online-game' && onlineSession && (
        <OnlineGame
          roomCode={onlineSession.roomCode}
          uid={onlineSession.uid}
          playerIndex={onlineSession.playerIndex}
          players={onlineSession.players}
          onExit={handleOnlineExit}
        />
      )}
    </div>
  );
}

// ── Home screen component ──
function HomeScreen({ currentUser, onLocal, onOnline, onLogout }) {
  return (
    <div className="setup-screen">
      <div className="setup-card" style={{ textAlign: 'center', maxWidth: 420 }}>
        <div className="setup-header" style={{ justifyContent: 'center', flexDirection: 'column', gap: '0.5rem' }}>
          <h1>💣 Bomb Card Game</h1>
          {currentUser && (
            <div className="setup-user">
              Logged in as <strong>{currentUser.username}</strong>
              <button className="btn btn-ghost btn-small" onClick={onLogout}>
                Logout
              </button>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '2rem' }}>
          <button
            className="btn btn-primary btn-large"
            style={{ width: '100%' }}
            onClick={onLocal}
          >
            Local Game
          </button>
          <button
            className="btn btn-secondary btn-large"
            style={{ width: '100%' }}
            onClick={onOnline}
          >
            Online Game
          </button>
        </div>

        <p style={{ marginTop: '1.5rem', color: '#888', fontSize: '0.85rem' }}>
          Local — pass the device between players.
          <br />
          Online — play over the internet with friends.
        </p>
      </div>
    </div>
  );
}

// ── Inner component that owns the reducer and can be re-mounted cleanly via key ──
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
