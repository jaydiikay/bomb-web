import React, { useState } from 'react';

export default function AuthScreen({ onAuth, useAuthHook }) {
  const [tab, setTab] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login, register, error, currentUser, gameHistory, logout } = useAuthHook;

  // If already logged in, show history
  if (currentUser) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <h2>Welcome, {currentUser.username}!</h2>
          <button className="btn btn-primary" onClick={onAuth}>
            Continue to Game
          </button>
          <button className="btn btn-ghost" onClick={logout}>
            Logout
          </button>

          {gameHistory.length > 0 && (
            <div className="history-section">
              <h3>Game History</h3>
              <div className="history-table-wrapper">
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Players</th>
                      <th>Winner</th>
                      <th>End Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gameHistory.map((g, i) => (
                      <tr key={i}>
                        <td>{new Date(g.date).toLocaleDateString()}</td>
                        <td>{g.players?.join(', ')}</td>
                        <td>{g.winner}</td>
                        <td>
                          {g.endReason === 'bomb'
                            ? '💣 Bomb'
                            : g.endReason === 'bomb-last'
                            ? '💣 Bomb (last card)'
                            : 'Normal'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  function handleSubmit(e) {
    e.preventDefault();
    let success;
    if (tab === 'login') {
      success = login(username, password);
    } else {
      success = register(username, password);
    }
    if (success) {
      onAuth();
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <h1>💣 Bomb Card Game</h1>

        <div className="auth-tabs">
          <button
            className={`auth-tab${tab === 'login' ? ' auth-tab-active' : ''}`}
            onClick={() => setTab('login')}
          >
            Login
          </button>
          <button
            className={`auth-tab${tab === 'register' ? ' auth-tab-active' : ''}`}
            onClick={() => setTab('register')}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="auth-error">{error}</div>}

          <label className="auth-label">Username</label>
          <input
            className="auth-input"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter username"
            autoComplete="username"
          />

          <label className="auth-label">Password</label>
          <input
            className="auth-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
          />

          <button type="submit" className="btn btn-primary btn-large">
            {tab === 'login' ? 'Login' : 'Register'}
          </button>
        </form>

        <button
          className="btn btn-ghost"
          onClick={onAuth}
          style={{ marginTop: '1rem' }}
        >
          Play as Guest
        </button>
      </div>
    </div>
  );
}
