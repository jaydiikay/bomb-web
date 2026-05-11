import React from 'react';
import Card from './Card.jsx';
import PlayerHand from './PlayerHand.jsx';
import TurnIndicator from './TurnIndicator.jsx';
import BombAnimation from './BombAnimation.jsx';
import { canPlayCard } from '../game/rules.js';

function computeNextPlayerIndex(state) {
  const { players, currentPlayerIndex, direction, reverseOnce } = state;
  const n = players.length;
  const dir = reverseOnce ? -direction : direction;
  return ((currentPlayerIndex + dir) % n + n) % n;
}

export default function GameBoard({ state, dispatch, onGameOver }) {
  const {
    players,
    drawPile,
    topCard,
    currentPlayerIndex,
    direction,
    pendingDraw,
    phase,
    selectedCard,
    isChained,
    message,
  } = state;

  const currentPlayer = players[currentPlayerIndex];
  const nextPlayerIndex = computeNextPlayerIndex(state);
  const nextPlayer = players[nextPlayerIndex];
  // Don't show "Next up" when the same player goes again (e.g. 4-card with 2 players)
  const nextPlayerName = nextPlayerIndex !== currentPlayerIndex ? nextPlayer.name : null;

  // Players other than current (for display around board)
  const otherPlayers = players
    .map((p, i) => ({ ...p, index: i }))
    .filter((p) => p.index !== currentPlayerIndex);

  const hasPlayableCard = currentPlayer.hand.some((c) =>
    canPlayCard(c, topCard, pendingDraw)
  );

  function handlePlayCard(cardId) {
    dispatch({ type: 'PLAY_CARD', cardId });
  }

  function handleSelectSecond(cardId) {
    dispatch({ type: 'PLAY_PAIR', secondCardId: cardId });
  }

  function handleDraw() {
    dispatch({ type: 'DRAW_CARD' });
  }

  function handleCancelSecond() {
    dispatch({ type: 'CANCEL_SECOND' });
  }

  // Draw pile is always clickable. During awaiting-second it acts as "draw instead".
  function handleDrawPileClick() {
    if (phase === 'awaiting-second') {
      dispatch({ type: 'CANCEL_SECOND' });
    } else {
      dispatch({ type: 'DRAW_CARD' });
    }
  }

  function handleReveal() {
    dispatch({ type: 'REVEAL_HAND' });
  }

  // Bomb animation phase
  if (phase === 'bomb') {
    return (
      <BombAnimation
        onComplete={() => {
          onGameOver && onGameOver();
        }}
      />
    );
  }

  // Pass-and-play screen: show "Pass to Player X" before revealing hand
  if (phase === 'pass-and-play') {
    return (
      <div className="pass-screen">
        <div className="pass-card">
          <div className="pass-icon">🃏</div>
          <h2>Pass the device to</h2>
          <h1 className="pass-name">{currentPlayer.name}</h1>
          {pendingDraw > 0 ? (
            <p className="pass-penalty">
              ⚠ You must draw {pendingDraw} card{pendingDraw > 1 ? 's' : ''} — a 2 was played against you!
            </p>
          ) : (
            <p className="pass-sub">Tap when ready to view your hand</p>
          )}
          <button className="btn btn-primary btn-large" onClick={handleReveal}>
            Show My Cards
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="game-board">
      {/* Top bar */}
      <TurnIndicator
        playerName={currentPlayer.name}
        direction={direction}
        pendingDraw={pendingDraw}
        phase={phase}
        nextPlayerName={nextPlayerName}
        isChained={isChained}
      />

      {/* Other players */}
      <div className="other-players">
        {otherPlayers.map((p) => (
          <div key={p.id} className={`other-player${p.index === nextPlayerIndex ? ' other-player-next' : ''}`}>
            <div className="other-player-name">
              {p.index === nextPlayerIndex && <span className="next-arrow">▶ </span>}
              {p.name}
            </div>
            <div className="other-player-cards">
              {Array.from({ length: Math.min(p.hand.length, 7) }).map((_, i) => (
                <div
                  key={i}
                  className="face-down-stack"
                  style={{ marginLeft: i === 0 ? 0 : -18 }}
                />
              ))}
              {p.hand.length > 7 && (
                <span className="card-overflow">+{p.hand.length - 7}</span>
              )}
            </div>
            <div className="other-player-count">{p.hand.length} cards</div>
          </div>
        ))}
      </div>

      {/* Center: piles */}
      <div className="center-area">
        <div className="pile-area">
          <div className="pile-label">Draw Pile</div>
          <div className="draw-pile-stack">
            <Card faceDown onClick={handleDrawPileClick} />
            <div className="pile-count">{drawPile.length}</div>
          </div>
        </div>

        <div className="pile-area">
          <div className="pile-label">Discard Pile</div>
          {topCard && <Card card={topCard} />}
        </div>
      </div>

      {/* Message banner */}
      {message && (
        <div className="message-banner">
          {message}
          <button
            className="btn btn-small btn-ghost"
            onClick={() => dispatch({ type: 'CLEAR_MESSAGE' })}
          >
            OK
          </button>
        </div>
      )}

      {/* Draw-instead button when awaiting a second card */}
      {phase === 'awaiting-second' && (
        <div className="cancel-bar">
          <span className="cancel-hint">No match? </span>
          <button className="btn btn-secondary" onClick={handleCancelSecond}>
            Draw 1 Card Instead
          </button>
        </div>
      )}

      {/* Current player hand */}
      <div className="bottom-area">
        <PlayerHand
          hand={currentPlayer.hand}
          onPlayCard={handlePlayCard}
          topCard={topCard}
          pendingDraw={pendingDraw}
          phase={phase}
          selectedCard={selectedCard}
          onSelectSecond={handleSelectSecond}
        />

        {phase === 'playing' && (
          <button className="btn btn-secondary draw-btn" onClick={handleDraw}>
            {pendingDraw > 0
              ? `Draw ${pendingDraw} cards (forced)`
              : 'Draw a card'}
          </button>
        )}
      </div>
    </div>
  );
}
