import { useState, useCallback } from 'react';

const USERS_KEY = 'bomb_users';
const SESSION_KEY = 'bomb_session';
const HISTORY_KEY = 'bomb_history';

function getUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
  } catch {
    return null;
  }
}

function getHistory(username) {
  try {
    const all = JSON.parse(localStorage.getItem(HISTORY_KEY) || '{}');
    return all[username] || [];
  } catch {
    return [];
  }
}

function saveHistory(username, history) {
  try {
    const all = JSON.parse(localStorage.getItem(HISTORY_KEY) || '{}');
    all[username] = history;
    localStorage.setItem(HISTORY_KEY, JSON.stringify(all));
  } catch {
    // ignore
  }
}

export function useAuth() {
  const [currentUser, setCurrentUser] = useState(() => getSession());
  const [error, setError] = useState(null);

  const register = useCallback((username, password) => {
    setError(null);
    if (!username || !password) {
      setError('Username and password are required.');
      return false;
    }
    const users = getUsers();
    if (users[username]) {
      setError('Username already exists.');
      return false;
    }
    users[username] = { username, password };
    saveUsers(users);
    const user = { username };
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    setCurrentUser(user);
    return true;
  }, []);

  const login = useCallback((username, password) => {
    setError(null);
    if (!username || !password) {
      setError('Username and password are required.');
      return false;
    }
    const users = getUsers();
    if (!users[username] || users[username].password !== password) {
      setError('Invalid username or password.');
      return false;
    }
    const user = { username };
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    setCurrentUser(user);
    return true;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setCurrentUser(null);
  }, []);

  const gameHistory = currentUser ? getHistory(currentUser.username) : [];

  const addGameResult = useCallback(
    (result) => {
      if (!currentUser) return;
      const history = getHistory(currentUser.username);
      history.unshift({ ...result, date: new Date().toISOString() });
      saveHistory(currentUser.username, history.slice(0, 50)); // keep last 50
    },
    [currentUser]
  );

  return {
    currentUser,
    error,
    register,
    login,
    logout,
    gameHistory,
    addGameResult,
  };
}
