import type { SupabaseClient } from "@supabase/supabase-js";

export type ScoreRow = {
  topic_id: string;
  topic: string;
  score: number;
  rating: "weak" | "medium" | "strong";
  reason: string | null;
  attempt_id: string;
  created_at: string;
};

const one = (x: any) => (Array.isArray(x) ? x[0] : x);

/** All topic scores, oldest first. */
export async function fetchScoreHistory(supabase: SupabaseClient, userId: string): Promise<ScoreRow[]> {
  const { data } = await supabase
    .from("topic_scores")
    .select("topic_id, score, rating, reason, attempt_id, topics(name), attempts(created_at)")
    .eq("user_id", userId);

  return (data ?? [])
    .map((r: any) => ({
      topic_id: r.topic_id,
      topic: one(r.topics)?.name ?? "Unknown",
      score: Number(r.score),
      rating: r.rating,
      reason: r.reason,
      attempt_id: r.attempt_id,
      created_at: one(r.attempts)?.created_at ?? "",
    }))
    .sort((a: ScoreRow, b: ScoreRow) => a.created_at.localeCompare(b.created_at));
}

/** Most recent score for each topic. */
export function latestPerTopic(rows: ScoreRow[]): ScoreRow[] {
  const map = new Map<string, ScoreRow>();
  for (const r of rows) map.set(r.topic_id, r); // rows are oldest-first, so last wins
  return [...map.values()];
}

/** Rows for a line chart: one row per attempt, one key per topic plus Overall. */
export function buildChartData(rows: ScoreRow[]) {
  const attemptIds: string[] = [];
  for (const r of rows) if (!attemptIds.includes(r.attempt_id)) attemptIds.push(r.attempt_id);
  const topics = [...new Set(rows.map((r) => r.topic))];

  const data = attemptIds.map((id, i) => {
    const these = rows.filter((r) => r.attempt_id === id);
    const row: Record<string, number | string> = { attempt: `Attempt ${i + 1}` };
    for (const r of these) row[r.topic] = r.score;
    row.Overall = Math.round(these.reduce((s, r) => s + r.score, 0) / these.length);
    return row;
  });
  return { data, topics };
}
