# Bomb Card Game (Web)

Browser-based implementation of the Bomb card game.

## Setup

```bash
npm install && npm run dev
```

## Rules

- Standard 52-card deck, up to 7 players, each dealt 7 cards
- Play a card that matches the top card's **suit** or **rank**
- If you can't play, draw a card
- **2** — next player draws 2 (stackable; play your own 2 to block)
- **4** — reverses direction for one turn (2 players: go again)
- **8 / J** — must play with a second card of same suit or rank
- **7♥ (Bomb)** — immediately ends the game with a dramatic explosion!

### Winning
- **Normal**: first to empty hand wins; highest scorer loses
- **Bomb (mid-game)**: lowest score wins, highest loses
- **Bomb as last card**: that player wins; highest scorer among others loses

### Card Points
A=1, 2=20, 3=3, 4=20, 5=5, 6=6, 7=7, 7♥=500, 8=8, 9=9, 10=10, J=45, Q=2, K=4

## Tech Stack

- React 18 + Vite
- Plain JavaScript/JSX (no TypeScript)
- localStorage for accounts and game history
- Pass-and-play (share one screen)
