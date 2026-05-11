export function getCardPoints(card) {
  const { rank, suit } = card;

  if (rank === '7' && suit === 'hearts') return 500;

  switch (rank) {
    case 'A':  return 1;
    case '2':  return 20;
    case '3':  return 3;
    case '4':  return 20;
    case '5':  return 5;
    case '6':  return 6;
    case '7':  return 7;
    case '8':  return 8;
    case '9':  return 9;
    case '10': return 10;
    case 'J':  return 45;
    case 'Q':  return 2;
    case 'K':  return 4;
    default:   return 0;
  }
}

export function scoreHand(hand) {
  return hand.reduce((total, card) => total + getCardPoints(card), 0);
}
