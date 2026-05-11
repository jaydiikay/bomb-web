import React from 'react';

export default function TurnIndicator({ playerName, direction, pendingDraw, phase, nextPlayerName, isChained }) {
  const directionLabel = direction === 1 ? 'Anti-clockwise ↺' : 'Clockwise ↻';

  let turnLabel;
  if (phase === 'awaiting-second' && isChained) {
    turnLabel = `${playerName} — choose a card to pair with the chained card`;
  } else if (phase === 'awaiting-second') {
    turnLabel = `${playerName} — choose a second card`;
  } else if (pendingDraw > 0) {
    turnLabel = `${playerName}'s Turn — must draw ${pendingDraw} card${pendingDraw > 1 ? 's' : ''}!`;
  } else {
    turnLabel = `${playerName}'s Turn`;
  }

  return (
    <div className="turn-indicator">
      <span className="turn-player">{turnLabel}</span>
      <span className="turn-direction">{directionLabel}</span>
      {pendingDraw > 0 && (
        <span className="turn-pending-draw">⚠ Draw {pendingDraw}!</span>
      )}
      {nextPlayerName && phase !== 'awaiting-second' && (
        <span className="turn-next-player">Next up: {nextPlayerName}</span>
      )}
    </div>
  );
}
