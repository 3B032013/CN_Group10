export function calcGuesserScore(remainingSecs: number, totalSecs: number): number {
  return Math.floor((remainingSecs / totalSecs) * 800) + 200;
}

export function calcDrawerBonus(correctGuessers: number): number {
  return Math.min(correctGuessers * 50, 200);
}
