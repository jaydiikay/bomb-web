import React from 'react';
import Card from './Card.jsx';
import { canPlayCard, getValidSecondCards } from '../game/rules.js';

export default function PlayerHand({
  hand,
  onPlayCard,
  topCard,
  pendingDraw,
  phase,
  selectedCard,
  onSelectSecond,
}) {
  if (phase === 'awaiting-second') {
    const validSeconds = selectedCard ? getValidSecondCards(selectedCard, hand) : [];
    const validIds = new Set(validSeconds.map((c) => c.id));

    return (
      <div className="player-hand">
        <div className="hand-label">
          Choose a second card (same suit or rank as {selectedCard?.rank}{' '}
          {selectedCard?.suit === 'hearts'
            ? '♥'
            : selectedCard?.suit === 'diamonds'
            ? '♦'
            : selectedCard?.suit === 'clubs'
            ? '♣'
            : '♠'}
          ):
        </div>
        <div className="cards-row">
          {hand.map((card) => (
            <Card
              key={card.id}
              card={card}
              onClick={() => validIds.has(card.id) && onSelectSecond(card.id)}
              disabled={!validIds.has(card.id)}
            />
          ))}
        </div>
      </div>
    );
  }

  const playableIds = new Set(
    hand.filter((c) => canPlayCard(c, topCard, pendingDraw)).map((c) => c.id)
  );

  return (
    <div className="player-hand">
      <div className="hand-label">Your cards ({hand.length}):</div>
      <div className="cards-row">
        {hand.map((card) => {
          const playable = playableIds.has(card.id);
          return (
            <Card
              key={card.id}
              card={card}
              onClick={() => playable && onPlayCard(card.id)}
              disabled={!playable}
            />
          );
        })}
      </div>
    </div>
  );
}
