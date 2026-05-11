import React, { useState, useEffect, useRef } from 'react';
import { createRoom, joinRoom, startGame, subscribeToRoom } from '../firebase/rooms.js';
import { createInitialState } from '../game/gameState.js';

// status: 'idle' | 'creating' | 'waiting-host' | 'joining' | 'waiting-player' | 'error'

export default function LobbyScreen({ currentUser, onGameStart, onBack }) {
  const [tab, setTab] = useState('host'); // 'host' | 'join'

  // Shared fields
  const [hostName, setHostName] = useState(currentUser?.username || '');
  const [joinName, setJoinName] = useState(currentUser?.username || '');
  const [roomCodeInput, setRoomCodeInput] = useState('');

  // State machine
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

  // After room created / joined
  const [roomCode, setRoomCode] = useState(null);
  const [uid, setUid] = useState(null);
  const [playerIndex, setPlayerIndex] = useState(null);
  const [room, setRoom] = useState(null);

  const unsubRef = useRef(null);

  // Subscribe to room once we have a roomCode
  useEffect(() => {
    if (!roomCode) return;
    const unsub = subscribeToRoom(roomCode, (roomData) => {
      setRoom(roomData);
      // If the host started the game, transition to OnlineGame
      if (
        roomData &&
        roomData.status === 'playing' &&
        roomData.gameState
      ) {
        if (unsub) unsub();
        onGameStart({
          roomCode,
          uid,
          playerIndex,
          players: roomData.players,
        });
      }
    });
    unsubRef.current = unsub;
    return () => {
      if (unsubRef.current) unsubRef.current();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode]);

  async function handleCreateRoom() {
    const name = hostName.trim();
    if (!name) { setError('Please enter your name.'); return; }
    setError(null);
    setStatus('creating');
    try {
      const result = await createRoom(name);
      setRoomCode(result.roomCode);
      setUid(result.uid);
      setPlayerIndex(0);
      setStatus('waiting-host');
    } catch (err) {
      setError(err.message || 'Failed to create room.');
      setStatus('idle');
    }
  }

  async function handleJoinRoom() {
    const name = joinName.trim();
    const code = roomCodeInput.trim().toUpperCase();
    if (!name) { setError('Please enter your name.'); return; }
    if (code.length !== 6) { setError('Room code must be 6 characters.'); return; }
    setError(null);
    setStatus('joining');
    try {
      const result = await joinRoom(code, name);
      setRoomCode(result.roomCode);
      setUid(result.uid);
      setPlayerIndex(result.playerIndex);
      setStatus('waiting-player');
    } catch (err) {
      setError(err.message || 'Failed to join room.');
      setStatus('idle');
    }
  }

  async function handleStartGame() {
    if (!room || !roomCode) return;
    const gamePlayers = room.players.map((p, i) => ({
      id: i,
      name: p.name,
    }));
    const initialState = createInitialState(gamePlayers);
    // For online play, skip pass-and-play: set phase to 'playing' directly
    const onlineState = { ...initialState, phase: 'playing' };
    try {
      await startGame(roomCode, onlineState);
      // The subscription will pick up the state change and call onGameStart
    } catch (err) {
      setError(err.message || 'Failed to start game.');
    }
  }

  function handleRoomCodeChange(e) {
    setRoomCodeInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6));
  }

  const isIdle = status === 'idle';
  const isCreating = status === 'creating';
  const isJoining = status === 'joining';
  const isWaitingHost = status === 'waiting-host';
  const isWaitingPlayer = status === 'waiting-player';

  const players = room?.players || [];
  const canStart = isWaitingHost && players.length >= 2;

  return (
    <div className="setup-screen">
      <div className="setup-card" style={{ maxWidth: 480 }}>
        <div className="setup-header">
          <h1>💣 Online Play</h1>
          <button className="btn btn-ghost btn-small" onClick={onBack}>
            Back
          </button>
        </div>

        {/* Tab bar — only show when not in a room yet */}
        {!isWaitingHost && !isWaitingPlayer && (
          <div className="auth-tabs" style={{ marginBottom: '1.5rem' }}>
            <button
              className={`auth-tab${tab === 'host' ? ' auth-tab-active' : ''}`}
              onClick={() => { setTab('host'); setError(null); }}
            >
              Host a Game
            </button>
            <button
              className={`auth-tab${tab === 'join' ? ' auth-tab-active' : ''}`}
              onClick={() => { setTab('join'); setError(null); }}
            >
              Join a Game
            </button>
          </div>
        )}

        {error && (
          <div className="auth-error" style={{ marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        {/* ── HOST TAB ── */}
        {tab === 'host' && !isWaitingHost && !isWaitingPlayer && (
          <div>
            <div className="setup-section">
              <label className="setup-label">Your Name</label>
              <input
                className="setup-input"
                type="text"
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                placeholder="Enter your name"
                maxLength={20}
                disabled={isCreating}
              />
            </div>
            <button
              className="btn btn-primary btn-large"
              style={{ width: '100%' }}
              onClick={handleCreateRoom}
              disabled={isCreating}
            >
              {isCreating ? 'Creating Room...' : 'Create Room'}
            </button>
          </div>
        )}

        {/* ── JOIN TAB ── */}
        {tab === 'join' && !isWaitingHost && !isWaitingPlayer && (
          <div>
            <div className="setup-section">
              <label className="setup-label">Your Name</label>
              <input
                className="setup-input"
                type="text"
                value={joinName}
                onChange={(e) => setJoinName(e.target.value)}
                placeholder="Enter your name"
                maxLength={20}
                disabled={isJoining}
              />
            </div>
            <div className="setup-section">
              <label className="setup-label">Room Code</label>
              <input
                className="setup-input"
                type="text"
                value={roomCodeInput}
                onChange={handleRoomCodeChange}
                placeholder="e.g. A3BX7K"
                maxLength={6}
                disabled={isJoining}
                style={{ letterSpacing: '0.2em', fontWeight: 700, fontSize: '1.2rem' }}
              />
            </div>
            <button
              className="btn btn-primary btn-large"
              style={{ width: '100%' }}
              onClick={handleJoinRoom}
              disabled={isJoining}
            >
              {isJoining ? 'Joining...' : 'Join Room'}
            </button>
          </div>
        )}

        {/* ── WAITING ROOM (host) ── */}
        {isWaitingHost && (
          <div>
            <p style={{ color: '#aaa', fontSize: '0.88rem', marginBottom: '0.25rem' }}>
              Share this code with your friends:
            </p>
            <div className="room-code-display">{roomCode}</div>

            <div className="lobby-players">
              <label className="setup-label">
                Players ({players.length} / 7)
              </label>
              {players.map((p, i) => (
                <div key={i} className="lobby-player-row">
                  <span style={{ color: i === 0 ? 'var(--gold)' : '#eee' }}>
                    {i === 0 ? '★ ' : ''}
                    {p.name}
                  </span>
                  {i === 0 && (
                    <span style={{ fontSize: '0.75rem', color: '#888', marginLeft: 'auto' }}>
                      Host
                    </span>
                  )}
                </div>
              ))}
            </div>

            <button
              className="btn btn-primary btn-large"
              style={{ width: '100%', marginTop: '1rem' }}
              onClick={handleStartGame}
              disabled={!canStart}
            >
              {canStart
                ? `Start Game (${players.length} players)`
                : 'Waiting for players... (need 2+)'}
            </button>

            <button
              className="btn btn-ghost"
              style={{ width: '100%', marginTop: '0.5rem' }}
              onClick={onBack}
            >
              Cancel
            </button>
          </div>
        )}

        {/* ── WAITING ROOM (player) ── */}
        {isWaitingPlayer && (
          <div>
            <p style={{ color: '#aaa', fontSize: '0.88rem', marginBottom: '0.25rem' }}>
              Room code:
            </p>
            <div className="room-code-display">{roomCode}</div>

            <div className="lobby-players">
              <label className="setup-label">
                Players ({players.length} / 7)
              </label>
              {players.map((p, i) => (
                <div key={i} className="lobby-player-row">
                  <span style={{ color: i === 0 ? 'var(--gold)' : '#eee' }}>
                    {i === 0 ? '★ ' : ''}
                    {p.name}
                  </span>
                  {i === 0 && (
                    <span style={{ fontSize: '0.75rem', color: '#888', marginLeft: 'auto' }}>
                      Host
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div
              style={{
                textAlign: 'center',
                color: '#aaa',
                marginTop: '1.5rem',
                fontSize: '0.95rem',
              }}
            >
              Waiting for the host to start the game...
            </div>

            <button
              className="btn btn-ghost"
              style={{ width: '100%', marginTop: '1rem' }}
              onClick={onBack}
            >
              Leave Room
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
