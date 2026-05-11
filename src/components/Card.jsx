import React from 'react';

const SUIT_SYMBOLS = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

const RED_SUITS = new Set(['hearts', 'diamonds']);

export default function Card({ card, onClick, selected, disabled, faceDown, style }) {
  if (faceDown) {
    return (
      <div className={`card card-back${disabled ? ' card-disabled' : ''}`} onClick={onClick} style={style}>
        <div className="card-back-pattern" />
      </div>
    );
  }

  if (!card) return null;

  const isRed = RED_SUITS.has(card.suit);
  const symbol = SUIT_SYMBOLS[card.suit];
  const colorClass = isRed ? 'card-red' : 'card-black';
  const selectedClass = selected ? ' card-selected' : '';
  const disabledClass = disabled ? ' card-disabled' : '';

  return (
    <div
      className={`card card-face ${colorClass}${selectedClass}${disabledClass}`}
      onClick={disabled ? undefined : onClick}
      style={style}
    >
      <div className="card-corner card-top-left">
        <span className="card-rank">{card.rank}</span>
        <span className="card-suit-small">{symbol}</span>
      </div>
      <div className="card-center-suit">{symbol}</div>
      <div className="card-corner card-bottom-right">
        <span className="card-rank">{card.rank}</span>
        <span className="card-suit-small">{symbol}</span>
      </div>
    </div>
  );
}
