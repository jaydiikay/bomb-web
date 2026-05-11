import React from 'react';

export default function TurnIndicator({ playerName, direction, pendingDraw, phase }) {
  const directionLabel = direction === 1 ? 'Anti-clockwise ↺' : 'Clockwise ↻';

  return (
    <div className="turn-indicator">
      <span className="turn-player">
        {phase === 'awaiting-second'
          ? `${playerName} — choose second card`
          : `${playerName}'s Turn`}
      </span>
      <span className="turn-direction">{directionLabel}</span>
      {pendingDraw > 0 && (
        <span className="turn-pending-draw">⚠ Next player draws {pendingDraw}!</span>
      )}
    </div>
  );
}
