import React, { useEffect, useState, useCallback } from 'react';
import { subscribeToRoom, pushGameState, removePlayerFromRoom, restartGame } from '../firebase/rooms.js';
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
  const [showScores, setShowScores] = useState(false);
  // Live room players from Firebase (updated when someone joins/leaves)
  const [roomPlayers, setRoomPlayers] = useState(players);
  // Effective index re-derived from UID so it stays correct after a Play Again reindex
  const [effectivePlayerIndex, setEffectivePlayerIndex] = useState(playerIndex);

  // Subscribe to the room — keep game state and player list in sync
  useEffect(() => {
    const unsub = subscribeToRoom(roomCode, (roomData) => {
      if (roomData?.gameState) {
        setGameState(normalizeGameState(roomData.gameState));
      }
      if (roomData?.players) {
        setRoomPlayers(roomData.players);
        // Re-derive our index in case players were reindexed on Play Again
        const mine = roomData.players.find((p) => p.uid === uid);
        if (mine != null) setEffectivePlayerIndex(mine.index);
      }
    });
    return unsub;
  }, [roomCode, uid]);

  // Reset showScores when a new game begins so the bomb animation works again
  useEffect(() => {
    if (gameState?.phase === 'playing') setShowScores(false);
  }, [gameState?.phase]);

  async function handlePlayAgain() {
    // Use live roomPlayers (departed players already removed) and reindex sequentially
    const updatedRoomPlayers = roomPlayers.map((p, i) => ({ ...p, index: i }));
    const gamePlayers = updatedRoomPlayers.map((p, i) => ({ id: i, name: p.name }));
    const fresh = createInitialState(gamePlayers);
    const onlineState = { ...fresh, phase: 'playing', isOnline: true };
    try {
      await restartGame(roomCode, updatedRoomPlayers, onlineState);
    } catch (err) {
      console.error('Failed to restart game:', err);
    }
  }

  async function handleExit() {
    try {
      await removePlayerFromRoom(roomCode, uid);
    } catch (err) {
      console.error('Failed to remove from room:', err);
    }
    onExit();
  }

  // dispatch: only acts when it is this client's turn
  const dispatch = useCallback(
    async (action) => {
      if (!gameState) return;
      if (gameState.currentPlayerIndex !== effectivePlayerIndex) return;

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
    [gameState, effectivePlayerIndex, roomCode]
  );

  const myName = gameState
    ? (gameState.players[effectivePlayerIndex]?.name || roomPlayers[effectivePlayerIndex]?.name || 'Player')
    : (roomPlayers[effectivePlayerIndex]?.name || 'Player');

  // Chat is always rendered (position: fixed) so players can message at any phase
  const chat = (
    <Chat roomCode={roomCode} playerName={myName} playerIndex={effectivePlayerIndex} />
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
  const isMyTurn = currentPlayerIndex === effectivePlayerIndex;
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
              <button className="btn btn-secondary" onClick={handleExit}>
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
          viewerIndex={effectivePlayerIndex}
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
