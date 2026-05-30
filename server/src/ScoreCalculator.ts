// Gartic.io-style scoring

// Guesser: proportional to time remaining, minimum 1 pt
export function calcGuesserScore(remainingSecs: number, totalSecs: number): number {
  return Math.max(1, Math.floor((remainingSecs / totalSecs) * 100));
}

// Drawer: flat +10 pts for each person who guesses correctly
export const DRAWER_POINTS_PER_GUESS = 10;
