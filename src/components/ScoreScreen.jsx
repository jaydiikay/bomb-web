import React, { useEffect } from 'react';

function suitSymbol(suit) {
  return { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' }[suit] || suit;
}

export default function ScoreScreen({ state, onPlayAgain, onSetup, addGameResult, customActions }) {
  const { scores, winner, loser, endReason, players, tiebreakerRounds } = state;

  useEffect(() => {
    if (addGameResult && scores && winner) {
      addGameResult({
        players: players.map((p) => p.name),
        scores: scores.map((s) => ({ name: s.name, score: s.score })),
        winner: winner.name,
        loser: loser?.name,
        endReason,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isBombEnd = endReason === 'bomb' || endReason === 'bomb-last';

  const sortedScores = [...(scores || [])].sort((a, b) => a.score - b.score);

  return (
    <div className="score-screen">
      <div className="score-card">
        {isBombEnd ? (
          <>
            <div className="score-header score-bomb">
              <span className="score-bomb-emoji">💣</span>
              <h1>Bomb Triggered!</h1>
              <p className="score-sub">
                {endReason === 'bomb-last'
                  ? `${winner?.name} played the 7♥ as their last card and wins!`
                  : 'Lowest score wins!'}
              </p>
            </div>
          </>
        ) : (
          <div className="score-header score-normal">
            <h1>Game Over!</h1>
            <p className="score-sub">
              {winner?.name} emptied their hand first!
            </p>
          </div>
        )}

        <div className="score-winner-banner">
          <span className="score-trophy">🏆</span>
          <span>
            <strong>{winner?.name}</strong> wins!
          </span>
        </div>

        {loser && (
          <div className="score-loser-banner">
            <span>😢</span>
            <span>
              <strong>{loser.name}</strong> loses (highest score)
            </span>
          </div>
        )}

        <table className="score-table">
          <thead>
            <tr>
              <th>Player</th>
              <th>Score</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {sortedScores.map((s) => {
              const isWinner = s.playerId === winner?.id;
              const isLoser = s.playerId === loser?.id;
              return (
                <tr
                  key={s.playerId}
                  className={isWinner ? 'row-winner' : isLoser ? 'row-loser' : ''}
                >
                  <td>{s.name}</td>
                  <td>{s.score}</td>
                  <td>
                    {isWinner ? '🏆 Winner' : isLoser ? '😢 Loser' : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {tiebreakerRounds && tiebreakerRounds.length > 0 && (
          <div className="tiebreaker-section">
            <h3>🎲 Tiebreaker</h3>
            <p>Players were tied! Each drew a card:</p>
            {tiebreakerRounds.map((r, i) => (
              <div key={i} className="tiebreaker-row">
                <strong>{r.playerName}</strong> drew {r.card.rank}{suitSymbol(r.card.suit)} (+{r.addedPoints} pts)
              </div>
            ))}
          </div>
        )}

        <div className="score-cards-detail">
          <h3>Cards in hand:</h3>
          {(scores || []).map((s) => (
            <div key={s.playerId} className="score-hand-detail">
              <strong>{s.name}:</strong>{' '}
              {s.hand && s.hand.length > 0
                ? s.hand.map((c) => {
                    const sym =
                      c.suit === 'hearts'
                        ? '♥'
                        : c.suit === 'diamonds'
                        ? '♦'
                        : c.suit === 'clubs'
                        ? '♣'
                        : '♠';
                    return (
                      <span
                        key={c.id}
                        className={
                          c.suit === 'hearts' || c.suit === 'diamonds'
                            ? 'card-inline red'
                            : 'card-inline black'
                        }
                      >
                        {c.rank}
                        {sym}
                      </span>
                    );
                  })
                : 'Empty hand'}
            </div>
          ))}
        </div>

        <div className="score-actions">
          {customActions ? (
            customActions
          ) : (
            <>
              {onPlayAgain && (
                <button className="btn btn-primary" onClick={onPlayAgain}>
                  Play Again (same players)
                </button>
              )}
              {onSetup && (
                <button className="btn btn-secondary" onClick={onSetup}>
                  Back to Setup
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
