import { ref, set, onValue, off, get, update } from 'firebase/database';
import { signInAnonymously } from 'firebase/auth';
import { db, auth } from './config.js';

export async function signInAsGuest() {
  const result = await signInAnonymously(auth);
  return result.user;
}

export function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export async function createRoom(hostName) {
  const user = await signInAsGuest();
  const roomCode = generateRoomCode();
  const roomRef = ref(db, `rooms/${roomCode}`);
  await set(roomRef, {
    host: { uid: user.uid, name: hostName },
    players: [{ uid: user.uid, name: hostName, index: 0 }],
    status: 'waiting', // 'waiting' | 'playing' | 'finished'
    gameState: null,
    createdAt: Date.now(),
  });
  return { roomCode, uid: user.uid };
}

export async function joinRoom(roomCode, playerName) {
  const user = await signInAsGuest();
  const roomRef = ref(db, `rooms/${roomCode}`);
  const snap = await get(roomRef);
  if (!snap.exists()) throw new Error('Room not found');
  const room = snap.val();
  if (room.status !== 'waiting') throw new Error('Game already started');
  if (room.players.length >= 7) throw new Error('Room is full');
  const newPlayer = { uid: user.uid, name: playerName, index: room.players.length };
  await update(roomRef, {
    players: [...room.players, newPlayer],
  });
  return { roomCode, uid: user.uid, playerIndex: newPlayer.index };
}

export async function startGame(roomCode, initialGameState) {
  const roomRef = ref(db, `rooms/${roomCode}`);
  await update(roomRef, {
    status: 'playing',
    gameState: initialGameState,
  });
}

export async function pushGameState(roomCode, gameState) {
  const roomRef = ref(db, `rooms/${roomCode}/gameState`);
  await set(roomRef, gameState);
}

export function subscribeToRoom(roomCode, callback) {
  const roomRef = ref(db, `rooms/${roomCode}`);
  onValue(roomRef, (snap) => callback(snap.val()));
  return () => off(roomRef);
}
