/**
 * Splits study time across topics in proportion to weakness.
 * weight = 0.1 + (1 - score/100)^2  -> weak topics get much more time,
 * strong topics still get a short review slot (minimum 10 minutes).
 */
export function allocateMinutes<T extends { score: number }>(
  topics: T[],
  totalMinutes: number
): (T & { minutes: number })[] {
  const weights = topics.map((t) => 0.1 + Math.pow(1 - t.score / 100, 2));
  const sum = weights.reduce((a, b) => a + b, 0) || 1;
  return topics.map((t, i) => ({
    ...t,
    minutes: Math.max(10, Math.round((totalMinutes * weights[i]) / sum / 5) * 5),
  }));
}
