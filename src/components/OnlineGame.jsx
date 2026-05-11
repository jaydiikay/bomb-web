import React, { useEffect, useState, useCallback } from 'react';
import { subscribeToRoom, pushGameState } from '../firebase/rooms.js';
import { reducer, createInitialState } from '../game/gameState.js';
import GameBoard from './GameBoard.jsx';
import ScoreScreen from './ScoreScreen.jsx';
import BombAnimation from './BombAnimation.jsx';
import Chat from './Chat.jsx';

// Firebase RTDB drops empty arrays; restore them so game logic doesn't crash.
function normalizeGameState(gs) {
  if (!gs) return null;
  return {
    ...gs,
    drawPile: gs.drawPile ?? [],
    discardPile: gs.discardPile ?? [],
    drawnCards: gs.drawnCards ?? [],
    scores: gs.scores ?? [],
    players: (gs.players ?? []).map((p) => ({
      ...p,
      hand: p.hand ?? [],
    })),
  };
}

/**
 * OnlineGame — wraps GameBoard for online play.
 *
 * Props:
 *   roomCode    {string}   — the Firebase room code
 *   uid         {string}   — current user's Firebase UID
 *   playerIndex {number}   — this client's player index in the game
 *   players     {array}    — room players array (from Firebase)
 *   onExit      {function} — called when the player wants to leave
 */
export default function OnlineGame({ roomCode, uid, playerIndex, players, onExit }) {
  const [gameState, setGameState] = useState(null);
  // Track whether we've already called the bomb-complete transition
  const [showScores, setShowScores] = useState(false);

  // Subscribe to the room — keep local state in sync with Firebase
  useEffect(() => {
    const unsub = subscribeToRoom(roomCode, (roomData) => {
      if (roomData?.gameState) {
        setGameState(normalizeGameState(roomData.gameState));
      }
    });
    return unsub;
  }, [roomCode]);

  // Reset showScores when a new game begins so the bomb animation works again
  useEffect(() => {
    if (gameState?.phase === 'playing') setShowScores(false);
  }, [gameState?.phase]);

  async function handlePlayAgain() {
    if (!gameState) return;
    const gamePlayers = gameState.players.map((p, i) => ({ id: i, name: p.name }));
    const fresh = createInitialState(gamePlayers);
    const onlineState = { ...fresh, phase: 'playing', isOnline: true };
    try {
      await pushGameState(roomCode, onlineState);
    } catch (err) {
      console.error('Failed to restart game:', err);
    }
  }

  // dispatch: only acts when it is this client's turn
  const dispatch = useCallback(
    async (action) => {
      if (!gameState) return;
      if (gameState.currentPlayerIndex !== playerIndex) return;

      const newState = reducer(gameState, action);
      // Optimistically update local state for instant UI feedback
      setGameState(newState);
      // Push to Firebase so other clients receive it
      try {
        await pushGameState(roomCode, newState);
      } catch (err) {
        // On error, the subscription will eventually restore the correct state
        console.error('Failed to push game state:', err);
      }
    },
    [gameState, playerIndex, roomCode]
  );

  const myName = gameState
    ? (gameState.players[playerIndex]?.name || players[playerIndex]?.name || 'Player')
    : (players[playerIndex]?.name || 'Player');

  // Chat is always rendered (position: fixed) so players can message at any phase
  const chat = (
    <Chat roomCode={roomCode} playerName={myName} playerIndex={playerIndex} />
  );

  // ── Loading ──
  if (!gameState) {
    return (
      <>
        <div className="pass-screen">
          <div className="pass-card">
            <div className="pass-icon">🌐</div>
            <p style={{ color: '#aaa' }}>Connecting to room {roomCode}...</p>
          </div>
        </div>
        {chat}
      </>
    );
  }

  const { phase, currentPlayerIndex } = gameState;
  const isMyTurn = currentPlayerIndex === playerIndex;
  const currentPlayerName =
    gameState.players[currentPlayerIndex]?.name || `Player ${currentPlayerIndex + 1}`;

  // ── Bomb animation ──
  if (phase === 'bomb' && !showScores) {
    return (
      <>
        <BombAnimation onComplete={() => setShowScores(true)} />
        {chat}
      </>
    );
  }

  // ── Score / game-over screen ──
  if (phase === 'game-over' || (phase === 'bomb' && showScores)) {
    return (
      <>
        <ScoreScreen
          state={gameState}
          onPlayAgain={null}
          onSetup={null}
          addGameResult={null}
          customActions={
            <>
              <button className="btn btn-primary" onClick={handlePlayAgain}>
                Play Again (same players)
              </button>
              <button className="btn btn-secondary" onClick={onExit}>
                Back to Lobby
              </button>
            </>
          }
        />
        {chat}
      </>
    );
  }

  // ── Main game board ──
  return (
    <>
      <div style={{ position: 'relative' }}>
        <GameBoard
          state={gameState}
          dispatch={dispatch}
          viewerIndex={playerIndex}
          onGameOver={() => {}}
        />

        {/* Waiting overlay — shown when it's not my turn (including drew-card phase) */}
        {!isMyTurn && (phase === 'playing' || phase === 'drew-card' || phase === 'awaiting-second') && (
          <div className="waiting-overlay">
            <div className="waiting-card">
              Waiting for {currentPlayerName}...
            </div>
          </div>
        )}
      </div>
      {chat}
    </>
  );
}
