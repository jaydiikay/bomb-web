import { createDeck, shuffle } from './deck.js';
import { isBomb, canPlayCard, requiresSecondCard, getValidSecondCards } from './rules.js';
import { scoreHand } from './scoring.js';

export function createInitialState(players) {
  const deck = shuffle(createDeck());
  const numPlayers = players.length;
  const cardsPerPlayer = 7;

  const hands = players.map(() => []);
  for (let i = 0; i < cardsPerPlayer; i++) {
    for (let p = 0; p < numPlayers; p++) {
      hands[p].push(deck.pop());
    }
  }

  // Place first face-up card (skip special cards as starting card)
  let topCard = deck.pop();
  // If top card is a special that would be awkward to start with, put it at bottom and draw another
  while (
    (topCard.rank === '2' || topCard.rank === '8' || topCard.rank === 'J' || isBomb(topCard)) &&
    deck.length > 0
  ) {
    deck.unshift(topCard);
    topCard = deck.pop();
  }

  const playersWithHands = players.map((p, i) => ({
    id: p.id || i,
    name: p.name,
    hand: hands[i],
  }));

  return {
    players: playersWithHands,
    drawPile: [...deck],
    discardPile: [],
    topCard,
    currentPlayerIndex: 0,
    direction: 1,       // 1 = anti-clockwise (index+1), -1 = clockwise (index-1)
    reverseOnce: false, // 4-card: reverse direction for one turn
    pendingDraw: 0,     // accumulated draw count from stacked 2s
    phase: 'pass-and-play', // 'pass-and-play' | 'playing' | 'awaiting-second' | 'bomb' | 'game-over'
    selectedCard: null,  // for 8/J second-card selection
    winner: null,
    loser: null,
    endReason: null,    // 'normal' | 'bomb' | 'bomb-last'
    scores: [],
    message: null,
  };
}

function nextPlayerIndex(state, overrideDirection) {
  const { players, currentPlayerIndex, direction, reverseOnce } = state;
  const n = players.length;
  const dir = overrideDirection !== undefined ? overrideDirection : (reverseOnce ? -direction : direction);
  return ((currentPlayerIndex + dir) % n + n) % n;
}

function recycleDiscard(state) {
  // Shuffle all discard except top card into new draw pile
  if (state.discardPile.length === 0) return state;
  const newDraw = shuffle([...state.discardPile]);
  return {
    ...state,
    drawPile: newDraw,
    discardPile: [],
  };
}

function ensureDrawPile(state) {
  if (state.drawPile.length === 0) {
    return recycleDiscard(state);
  }
  return state;
}

function drawCards(state, playerIndex, count) {
  let s = { ...state };
  const newHands = s.players.map((p) => ({ ...p, hand: [...p.hand] }));

  for (let i = 0; i < count; i++) {
    s = ensureDrawPile(s);
    if (s.drawPile.length === 0) break; // No cards left anywhere
    const [card, ...rest] = s.drawPile;
    newHands[playerIndex].hand.push(card);
    s = { ...s, drawPile: rest };
  }

  s = { ...s, players: newHands };
  return s;
}

function advanceTurn(state) {
  const { players, reverseOnce, direction } = state;
  const n = players.length;
  const dir = reverseOnce ? -direction : direction;
  const next = ((state.currentPlayerIndex + dir) % n + n) % n;
  return {
    ...state,
    currentPlayerIndex: next,
    reverseOnce: false,
    phase: 'pass-and-play',
    message: null,
  };
}

function computeScores(state) {
  return state.players.map((p) => ({
    playerId: p.id,
    name: p.name,
    score: scoreHand(p.hand),
    hand: [...p.hand],
  }));
}

function handleBombEnd(state, triggeringPlayerIndex) {
  const scores = computeScores(state);
  const triggeringPlayer = state.players[triggeringPlayerIndex];
  const triggeringScore = scores.find((s) => s.playerId === triggeringPlayer.id);

  let winner;
  let loser;

  // Check if the bomb was played as the last card
  const triggeringHand = state.players[triggeringPlayerIndex].hand;
  const bombWasLastCard = triggeringHand.length === 0;

  if (bombWasLastCard) {
    // Bomb as last card: that player wins; highest scorer among OTHERS loses
    winner = triggeringPlayer;
    const others = scores.filter((s) => s.playerId !== triggeringPlayer.id);
    const maxScore = Math.max(...others.map((s) => s.score));
    const loserEntry = others.find((s) => s.score === maxScore);
    loser = state.players.find((p) => p.id === loserEntry.playerId);
    return {
      ...state,
      phase: 'bomb',
      scores,
      winner,
      loser,
      endReason: 'bomb-last',
    };
  } else {
    // Mid-game bomb: lowest scorer wins, highest loses
    const minScore = Math.min(...scores.map((s) => s.score));
    const maxScore = Math.max(...scores.map((s) => s.score));
    const winnerEntry = scores.find((s) => s.score === minScore);
    const loserEntry = scores.find((s) => s.score === maxScore);
    winner = state.players.find((p) => p.id === winnerEntry.playerId);
    loser = state.players.find((p) => p.id === loserEntry.playerId);
    return {
      ...state,
      phase: 'bomb',
      scores,
      winner,
      loser,
      endReason: 'bomb',
    };
  }
}

function handleNormalWin(state, winningPlayerIndex) {
  const scores = computeScores(state);
  const winner = state.players[winningPlayerIndex];
  const others = scores.filter((s) => s.playerId !== winner.id);
  const maxScore = Math.max(...others.map((s) => s.score));
  const loserEntry = others.find((s) => s.score === maxScore);
  const loser = state.players.find((p) => p.id === loserEntry?.playerId);

  return {
    ...state,
    phase: 'game-over',
    scores,
    winner,
    loser,
    endReason: 'normal',
  };
}

export function reducer(state, action) {
  switch (action.type) {
    case 'REVEAL_HAND': {
      // Player confirmed they are looking at their hand
      return { ...state, phase: 'playing' };
    }

    case 'PLAY_CARD': {
      const { cardId } = action;
      const { currentPlayerIndex, players, pendingDraw, topCard } = state;
      const player = players[currentPlayerIndex];
      const card = player.hand.find((c) => c.id === cardId);

      if (!card) return state;
      if (!canPlayCard(card, topCard, pendingDraw)) return state;

      // Remove card from hand
      const newHand = player.hand.filter((c) => c.id !== cardId);
      const newPlayers = players.map((p, i) =>
        i === currentPlayerIndex ? { ...p, hand: newHand } : p
      );
      let newState = {
        ...state,
        players: newPlayers,
        discardPile: [...state.discardPile, state.topCard],
        topCard: card,
      };

      // Check for bomb (7 of hearts)
      if (isBomb(card)) {
        return handleBombEnd(newState, currentPlayerIndex);
      }

      // Check for win (hand empty)
      if (newHand.length === 0) {
        return handleNormalWin(newState, currentPlayerIndex);
      }

      // Handle special cards
      if (card.rank === '2') {
        // Stack the draw
        newState = { ...newState, pendingDraw: pendingDraw + 2 };
        return advanceTurn(newState);
      }

      if (card.rank === '4') {
        const n = players.length;
        if (n === 2) {
          // Current player goes again — don't advance
          newState = { ...newState, pendingDraw: 0 };
          return { ...newState, phase: 'pass-and-play', message: null };
        } else {
          // Next turn is reversed (clockwise), then back to anti-clockwise
          newState = { ...newState, reverseOnce: true, pendingDraw: 0 };
          return advanceTurn(newState);
        }
      }

      if (requiresSecondCard(card)) {
        // Check if player has valid second cards
        const validSeconds = getValidSecondCards(card, newHand);
        if (validSeconds.length === 0) {
          // No valid second card — must draw instead (undo the play)
          // Actually per rules: cannot play the 8/J if no valid second card
          // Revert: put card back
          const revertPlayers = players.map((p, i) =>
            i === currentPlayerIndex ? { ...p } : p
          );
          return {
            ...state,
            message: `No valid second card for ${card.rank}! You must draw instead.`,
            phase: 'playing',
          };
        }
        return {
          ...newState,
          phase: 'awaiting-second',
          selectedCard: card,
          pendingDraw: 0,
        };
      }

      // Regular card
      newState = { ...newState, pendingDraw: 0 };
      return advanceTurn(newState);
    }

    case 'PLAY_PAIR': {
      // Play 8/J + second card
      const { secondCardId } = action;
      const { currentPlayerIndex, players, selectedCard } = state;
      const player = players[currentPlayerIndex];
      const secondCard = player.hand.find((c) => c.id === secondCardId);

      if (!secondCard) return state;

      const newHand = player.hand.filter((c) => c.id !== secondCardId);
      const newPlayers = players.map((p, i) =>
        i === currentPlayerIndex ? { ...p, hand: newHand } : p
      );

      let newState = {
        ...state,
        players: newPlayers,
        discardPile: [...state.discardPile, state.topCard, selectedCard],
        topCard: secondCard,
        selectedCard: null,
        pendingDraw: 0,
      };

      // Check for bomb as second card
      if (isBomb(secondCard)) {
        return handleBombEnd(newState, currentPlayerIndex);
      }

      // Check win
      if (newHand.length === 0) {
        return handleNormalWin(newState, currentPlayerIndex);
      }

      return advanceTurn(newState);
    }

    case 'DRAW_CARD': {
      const { currentPlayerIndex, pendingDraw } = state;
      const drawCount = pendingDraw > 0 ? pendingDraw : 1;

      let newState = drawCards(state, currentPlayerIndex, drawCount);
      newState = { ...newState, pendingDraw: 0 };
      return advanceTurn(newState);
    }

    case 'CANCEL_SECOND': {
      // Cancel awaiting-second and put the first card back in hand
      const { currentPlayerIndex, players, selectedCard } = state;
      if (!selectedCard) return state;
      const newPlayers = players.map((p, i) =>
        i === currentPlayerIndex
          ? { ...p, hand: [...p.hand, selectedCard] }
          : p
      );
      // Also restore top card from discard
      const newDiscard = [...state.discardPile];
      const restoredTop = newDiscard.pop();
      return {
        ...state,
        players: newPlayers,
        topCard: restoredTop || state.topCard,
        discardPile: newDiscard,
        selectedCard: null,
        phase: 'playing',
        message: null,
      };
    }

    case 'NEXT_TURN': {
      return advanceTurn(state);
    }

    case 'CLEAR_MESSAGE': {
      return { ...state, message: null };
    }

    default:
      return state;
  }
}
