import React, { useState } from 'react';

export default function SetupScreen({ onStart, currentUser, onLogout, onBack }) {
  const [playerCount, setPlayerCount] = useState(2);
  const [names, setNames] = useState(
    Array.from({ length: 7 }, (_, i) => `Player ${i + 1}`)
  );
  const [isBots, setIsBots] = useState(Array(7).fill(false));

  function handleNameChange(index, value) {
    setNames((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  function handleBotToggle(index) {
    setIsBots((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
    // Auto-fill name when enabling bot
    if (!isBots[index]) {
      setNames((prev) => {
        const next = [...prev];
        if (!next[index] || next[index] === `Player ${index + 1}`) {
          next[index] = `Bot ${index + 1}`;
        }
        return next;
      });
    }
  }

  function handleCountChange(e) {
    setPlayerCount(Number(e.target.value));
  }

  function handleStart() {
    const players = names.slice(0, playerCount).map((name, i) => ({
      id: i,
      name: name.trim() || `Player ${i + 1}`,
      isBot: isBots[i],
    }));
    // Require at least one human player
    if (players.every((p) => p.isBot)) {
      alert('At least one player must be human!');
      return;
    }
    onStart(players);
  }

  return (
    <div className="setup-screen">
      <div className="setup-card">
        <div className="setup-header">
          <h1>💣 Bomb Card Game</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {onBack && (
              <button className="btn btn-ghost btn-small" onClick={onBack}>
                Back
              </button>
            )}
            {currentUser && (
              <div className="setup-user">
                Logged in as <strong>{currentUser.username}</strong>
                <button className="btn btn-ghost btn-small" onClick={onLogout}>
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="setup-section">
          <label className="setup-label">Number of Players</label>
          <select
            className="setup-select"
            value={playerCount}
            onChange={handleCountChange}
          >
            {[2, 3, 4, 5, 6, 7].map((n) => (
              <option key={n} value={n}>
                {n} Players
              </option>
            ))}
          </select>
        </div>

        <div className="setup-section">
          <label className="setup-label">Player Names</label>
          <div className="setup-names">
            {Array.from({ length: playerCount }).map((_, i) => (
              <div key={i} className="setup-player-row">
                <input
                  className={`setup-input${isBots[i] ? ' setup-input-bot' : ''}`}
                  type="text"
                  value={names[i]}
                  placeholder={isBots[i] ? `Bot ${i + 1}` : `Player ${i + 1}`}
                  onChange={(e) => handleNameChange(i, e.target.value)}
                  maxLength={20}
                  disabled={isBots[i]}
                />
                <button
                  className={`btn btn-small bot-toggle${isBots[i] ? ' bot-toggle-on' : ''}`}
                  onClick={() => handleBotToggle(i)}
                  title={isBots[i] ? 'Switch to human' : 'Switch to bot'}
                >
                  🤖
                </button>
              </div>
            ))}
          </div>
        </div>

        <button className="btn btn-primary btn-large" onClick={handleStart}>
          Start Game
        </button>

        <div className="setup-rules">
          <h3>Quick Rules</h3>
          <ul>
            <li>Play a card matching the top card's suit or rank</li>
            <li><strong>2</strong> — next player draws 2 (stackable)</li>
            <li><strong>4</strong> — reverses direction for one turn</li>
            <li><strong>8 / J</strong> — must play with a second card</li>
            <li><strong>7♥ (Bomb)</strong> — ends the game immediately!</li>
            <li>First to empty hand wins; highest points loses</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
