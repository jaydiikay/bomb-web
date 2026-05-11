export function isBomb(card) {
  return card.rank === '7' && card.suit === 'hearts';
}

export function canPlayCard(card, topCard, pendingDraw) {
  // If there's a pending draw (from stacked 2s), only a 2 can block it
  if (pendingDraw > 0) {
    return card.rank === '2';
  }
  // Otherwise: must match suit or rank
  return card.suit === topCard.suit || card.rank === topCard.rank;
}

export function requiresSecondCard(card) {
  return card.rank === '8' || card.rank === 'J';
}

export function getValidSecondCards(firstCard, hand) {
  return hand.filter(
    (c) =>
      c.id !== firstCard.id &&
      (c.suit === firstCard.suit || c.rank === firstCard.rank)
  );
}
