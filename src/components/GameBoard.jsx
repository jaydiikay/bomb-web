import React from 'react';
import Card from './Card.jsx';
import PlayerHand from './PlayerHand.jsx';
import TurnIndicator from './TurnIndicator.jsx';
import BombAnimation from './BombAnimation.jsx';
import { canPlayCard } from '../game/rules.js';

function suitSymbol(suit) {
  return { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' }[suit] || suit;
}

function cardRotation(cardId) {
  let h = 0;
  for (const c of cardId) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return ((h % 25) - 12); // -12 to +12 degrees
}

function cardOffset(cardId) {
  let h = 0;
  for (const c of cardId) h = (h * 17 + c.charCodeAt(0)) & 0xffff;
  const x = ((h % 21) - 10); // -10 to +10 px
  const y = (((h >> 4) % 15) - 7); // -7 to +7 px
  return { x, y };
}

function computeNextPlayerIndex(state) {
  const { players, currentPlayerIndex, direction, reverseOnce } = state;
  const n = players.length;
  const dir = reverseOnce ? -direction : direction;
  return ((currentPlayerIndex + dir) % n + n) % n;
}

// viewerIndex: which player is sitting at this device. Defaults to currentPlayerIndex
// (local play). In online mode, pass the logged-in player's index.
export default function GameBoard({ state, dispatch, onGameOver, viewerIndex }) {
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
    drawnCards,
    message,
  } = state;

  const effectiveViewer = viewerIndex !== undefined ? viewerIndex : currentPlayerIndex;
  const isMyTurn = effectiveViewer === currentPlayerIndex;
  const currentPlayer = players[currentPlayerIndex];
  const viewerPlayer = players[effectiveViewer];

  const nextPlayerIndex = computeNextPlayerIndex(state);
  const nextPlayer = players[nextPlayerIndex];
  // Don't show "Next up" when the same player goes again (e.g. 4-card with 2 players)
  const nextPlayerName = nextPlayerIndex !== currentPlayerIndex ? nextPlayer.name : null;

  // Show all players except the viewer around the board
  const otherPlayers = players
    .map((p, i) => ({ ...p, index: i }))
    .filter((p) => p.index !== effectiveViewer);

  const hasPlayableCard = viewerPlayer.hand.some((c) =>
    canPlayCard(c, topCard, pendingDraw)
  );

  function handlePlayCard(cardId) {
    if (isMyTurn) dispatch({ type: 'PLAY_CARD', cardId });
  }

  function handleSelectSecond(cardId) {
    if (isMyTurn) dispatch({ type: 'PLAY_PAIR', secondCardId: cardId });
  }

  function handleDraw() {
    if (isMyTurn) dispatch({ type: 'DRAW_CARD' });
  }

  function handleCancelSecond() {
    if (isMyTurn) dispatch({ type: 'CANCEL_SECOND' });
  }

  // Draw pile is always clickable. During awaiting-second it acts as "draw instead".
  function handleDrawPileClick() {
    if (!isMyTurn) return;
    if (phase === 'awaiting-second') {
      dispatch({ type: 'CANCEL_SECOND' });
    } else if (phase === 'playing') {
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

  // Drew-card screen: show what the player drew before passing the device
  if (phase === 'drew-card') {
    return (
      <div className="pass-screen">
        <div className="pass-card">
          <div className="pass-icon">🃏</div>
          <h2>{currentPlayer.name} drew:</h2>
          <div className="drew-cards-row">
            {drawnCards.length > 0 ? (
              drawnCards.map((c) => <Card key={c.id} card={c} />)
            ) : (
              <p style={{ color: '#aaa' }}>No cards left in the draw pile.</p>
            )}
          </div>
          <button
            className="btn btn-primary btn-large"
            style={{ marginTop: '1.5rem' }}
            onClick={() => dispatch({ type: 'END_DRAWN_TURN' })}
          >
            End Turn
          </button>
        </div>
      </div>
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
        {otherPlayers.map((p) => {
          const isActive = p.index === currentPlayerIndex;
          const isNext = p.index === nextPlayerIndex && !isActive;
          return (
            <div
              key={p.id}
              className={`other-player${isActive ? ' other-player-active' : isNext ? ' other-player-next' : ''}`}
            >
              <div className="other-player-name">
                {isActive && <span className="playing-arrow">▶ </span>}
                {!isActive && isNext && <span className="next-arrow">▶ </span>}
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
          );
        })}
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
          <div className="discard-pile-area">
            {state.discardPile.slice(-5).map((card) => {
              const rot = cardRotation(card.id);
              const off = cardOffset(card.id);
              return (
                <Card
                  key={card.id}
                  card={card}
                  style={{
                    transform: `translate(${off.x}px, ${off.y}px) rotate(${rot}deg)`,
                  }}
                />
              );
            })}
            {topCard && (
              <Card
                key={topCard.id}
                card={topCard}
                style={{
                  transform: `translate(${cardOffset(topCard.id).x}px, ${cardOffset(topCard.id).y}px) rotate(${cardRotation(topCard.id)}deg)`,
                  zIndex: 10,
                }}
              />
            )}
          </div>
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

      {/* Viewer's hand — always shows this device's player */}
      <div className="bottom-area">
        <div className="viewer-name-label">
          <span className="viewer-name-text">{viewerPlayer.name}</span>
          {isMyTurn
            ? <span className="viewer-name-turn">Your turn</span>
            : <span className="viewer-name-wait">Waiting...</span>
          }
        </div>
        <PlayerHand
          hand={viewerPlayer.hand}
          onPlayCard={handlePlayCard}
          topCard={topCard}
          pendingDraw={pendingDraw}
          phase={isMyTurn ? phase : 'playing'}
          selectedCard={selectedCard}
          onSelectSecond={handleSelectSecond}
        />

        {isMyTurn && phase === 'playing' && (
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
