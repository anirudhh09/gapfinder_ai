export type Rating = "weak" | "medium" | "strong";

const WEIGHTS: Record<string, number> = { easy: 1, medium: 2, hard: 3 };

/** Difficulty-weighted score 0-100. Pure code, no LLM. */
export function weightedScore(
  items: { isCorrect: boolean; difficulty?: string | null }[]
): number {
  let got = 0;
  let total = 0;
  for (const it of items) {
    const w = WEIGHTS[it.difficulty ?? "medium"] ?? 2;
    total += w;
    if (it.isCorrect) got += w;
  }
  return total === 0 ? 0 : Math.round((got / total) * 100);
}

/** under 40 = weak, 40-70 = medium, over 70 = strong */
export function rate(score: number): Rating {
  if (score < 40) return "weak";
  if (score <= 70) return "medium";
  return "strong";
}
