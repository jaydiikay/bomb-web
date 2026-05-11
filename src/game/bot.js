import { canPlayCard, requiresSecondCard, getValidSecondCards, isBomb } from './rules.js';

/**
 * Returns an action object the bot should dispatch, or null if the bot cannot/should not act.
 *
 * @param {object} state  - current game state
 * @param {number} botPlayerIndex - which player index the bot controls
 * @returns {object|null}
 */
export function getBotAction(state, botPlayerIndex) {
  const { phase, currentPlayerIndex, players, topCard, pendingDraw, selectedCard } = state;

  // Phase: awaiting-second — bot must play a second card or cancel
  if (phase === 'awaiting-second') {
    if (currentPlayerIndex !== botPlayerIndex) return null;
    const player = players[botPlayerIndex];
    if (!selectedCard) return { type: 'CANCEL_SECOND' };
    const validSeconds = getValidSecondCards(selectedCard, player.hand);
    if (validSeconds.length === 0) return { type: 'CANCEL_SECOND' };
    return { type: 'PLAY_PAIR', secondCardId: validSeconds[0].id };
  }

  // Phase: drew-card — bot must end its turn
  if (phase === 'drew-card') {
    if (currentPlayerIndex !== botPlayerIndex) return null;
    return { type: 'END_DRAWN_TURN' };
  }

  // Phase: pass-and-play — bot reveals its hand
  if (phase === 'pass-and-play') {
    if (currentPlayerIndex !== botPlayerIndex) return null;
    return { type: 'REVEAL_HAND' };
  }

  // Any other non-playing phase
  if (phase !== 'playing') return null;

  // Not bot's turn
  if (currentPlayerIndex !== botPlayerIndex) return null;

  const player = players[botPlayerIndex];
  const hand = player.hand;

  // Gather all cards the bot can legally play right now
  const playable = hand.filter((c) => canPlayCard(c, topCard, pendingDraw));

  if (playable.length === 0) return { type: 'DRAW_CARD' };

  // Priority 1: if there's a pending draw, block with a 2
  if (pendingDraw > 0) {
    const two = playable.find((c) => c.rank === '2');
    if (two) return { type: 'PLAY_CARD', cardId: two.id };
  }

  // Separate cards into categories
  const specials = playable.filter(
    (c) => c.rank === '8' || c.rank === 'J' || c.rank === '4' || c.rank === '2'
  );
  const bombs = playable.filter((c) => isBomb(c));
  const regulars = playable.filter(
    (c) => !requiresSecondCard(c) && !isBomb(c) && c.rank !== '4' && c.rank !== '2'
  );

  // Priority 2: play a regular (non-special) card first
  if (regulars.length > 0) {
    return { type: 'PLAY_CARD', cardId: regulars[0].id };
  }

  // Priority 3: play a non-bomb special (2, 4, 8, J) — but not the Bomb unless forced
  if (specials.length > 0) {
    // Prefer 2 to put pressure on the next player, then 4, then 8/J
    const two = specials.find((c) => c.rank === '2');
    if (two) return { type: 'PLAY_CARD', cardId: two.id };

    const four = specials.find((c) => c.rank === '4');
    if (four) return { type: 'PLAY_CARD', cardId: four.id };

    const eightOrJ = specials.find((c) => requiresSecondCard(c));
    if (eightOrJ) return { type: 'PLAY_CARD', cardId: eightOrJ.id };

    // Fallback: play whatever special is first
    return { type: 'PLAY_CARD', cardId: specials[0].id };
  }

  // Priority 4: play the Bomb only if it's the last card (or it's literally the only playable card)
  if (bombs.length > 0) {
    const bomb = bombs[0];
    // Play bomb as last card (heroic win) or when it's truly the only option
    if (hand.length === 1 || playable.length === bombs.length) {
      return { type: 'PLAY_CARD', cardId: bomb.id };
    }
  }

  // Draw if nothing else is viable
  return { type: 'DRAW_CARD' };
}
