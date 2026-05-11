import React, { useState, useEffect, useRef } from 'react';
import { sendMessage, subscribeToMessages } from '../firebase/rooms.js';

export default function Chat({ roomCode, playerName, playerIndex }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [unread, setUnread] = useState(0);
  const seenCountRef = useRef(0);
  const bottomRef = useRef(null);

  useEffect(() => {
    const unsub = subscribeToMessages(roomCode, setMessages);
    return unsub;
  }, [roomCode]);

  // Track unread count when chat is closed
  useEffect(() => {
    if (open) {
      seenCountRef.current = messages.length;
      setUnread(0);
      bottomRef.current?.scrollIntoView({ behavior: 'instant' });
    } else {
      const newCount = messages.length - seenCountRef.current;
      if (newCount > 0) setUnread(newCount);
    }
  }, [messages, open]);

  // Auto-scroll when panel is open and new messages arrive
  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend() {
    const text = input.trim();
    if (!text) return;
    setInput('');
    try {
      await sendMessage(roomCode, playerName, playerIndex, text);
    } catch (err) {
      console.error('Chat send failed:', err);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <>
      <button
        className="chat-toggle-btn"
        onClick={() => setOpen((o) => !o)}
        title="Chat"
      >
        💬
        {unread > 0 && (
          <span className="chat-unread">{unread > 9 ? '9+' : unread}</span>
        )}
      </button>

      {open && (
        <div className="chat-panel">
          <div className="chat-header">
            <span>Chat</span>
            <button
              className="btn btn-ghost btn-small"
              onClick={() => setOpen(false)}
            >
              ✕
            </button>
          </div>

          <div className="chat-messages">
            {messages.length === 0 && (
              <p className="chat-empty">No messages yet. Say hi!</p>
            )}
            {messages.map((msg, i) => {
              const mine = msg.playerIndex === playerIndex;
              return (
                <div key={i} className={`chat-msg${mine ? ' chat-msg-mine' : ''}`}>
                  {!mine && <span className="chat-msg-name">{msg.name}</span>}
                  <span className="chat-msg-bubble">{msg.text}</span>
                  {mine && <span className="chat-msg-name chat-msg-name-mine">You</span>}
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          <div className="chat-input-row">
            <input
              className="chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message…"
              maxLength={200}
              autoFocus
            />
            <button
              className="btn btn-primary btn-small"
              onClick={handleSend}
              disabled={!input.trim()}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
}
