import React, { useEffect, useState, useCallback } from 'react';
import { subscribeToRoom, pushGameState } from '../firebase/rooms.js';
import { reducer } from '../game/gameState.js';
import GameBoard from './GameBoard.jsx';
import ScoreScreen from './ScoreScreen.jsx';
import BombAnimation from './BombAnimation.jsx';

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

  // ── Loading ──
  if (!gameState) {
    return (
      <div className="pass-screen">
        <div className="pass-card">
          <div className="pass-icon">🌐</div>
          <p style={{ color: '#aaa' }}>Connecting to room {roomCode}...</p>
        </div>
      </div>
    );
  }

  const { phase, currentPlayerIndex } = gameState;
  const isMyTurn = currentPlayerIndex === playerIndex;
  const currentPlayerName =
    gameState.players[currentPlayerIndex]?.name || `Player ${currentPlayerIndex + 1}`;

  // ── Bomb animation ──
  if (phase === 'bomb' && !showScores) {
    return (
      <BombAnimation
        onComplete={() => setShowScores(true)}
      />
    );
  }

  // ── Score / game-over screen ──
  if (phase === 'game-over' || (phase === 'bomb' && showScores)) {
    return (
      <ScoreScreen
        state={gameState}
        onPlayAgain={null}
        onSetup={onExit}
        addGameResult={null}
        customActions={
          <button className="btn btn-secondary" onClick={onExit}>
            Back to Lobby
          </button>
        }
      />
    );
  }

  // ── Main game board ──
  // We pass a wrapped dispatch; if it's not the current player's turn the
  // dispatch silently no-ops. The waiting overlay informs the user.
  return (
    <div style={{ position: 'relative' }}>
      <GameBoard
        state={gameState}
        dispatch={dispatch}
        viewerIndex={playerIndex}
        onGameOver={() => {
          // bomb phase triggers score via BombAnimation.onComplete above
          // normal game-over is reflected through phase change from Firebase
        }}
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
  );
}
