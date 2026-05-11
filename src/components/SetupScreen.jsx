import React, { useState } from 'react';

export default function SetupScreen({ onStart, currentUser, onLogout, onBack }) {
  const [playerCount, setPlayerCount] = useState(2);
  const [names, setNames] = useState(
    Array.from({ length: 7 }, (_, i) => `Player ${i + 1}`)
  );

  function handleNameChange(index, value) {
    setNames((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  function handleCountChange(e) {
    setPlayerCount(Number(e.target.value));
  }

  function handleStart() {
    const players = names.slice(0, playerCount).map((name, i) => ({
      id: i,
      name: name.trim() || `Player ${i + 1}`,
    }));
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
              <input
                key={i}
                className="setup-input"
                type="text"
                value={names[i]}
                placeholder={`Player ${i + 1}`}
                onChange={(e) => handleNameChange(i, e.target.value)}
                maxLength={20}
              />
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
