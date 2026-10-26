import type { SupabaseClient } from "@supabase/supabase-js";
import { embedQuery } from "./embed";

export type Retrieved = {
  id: string;
  document_id: string;
  content: string;
  page: number | null;
  section_title: string | null;
  similarity: number;
};

export async function retrieve(
  supabase: SupabaseClient,
  userId: string,
  query: string,
  opts: { topK?: number; topicId?: string; minSimilarity?: number; excludeSyllabus?: boolean } = {}
): Promise<Retrieved[]> {
  const { topK = 5, topicId, minSimilarity = 0, excludeSyllabus = false } = opts;
  const queryEmbedding = await embedQuery(query);

  const { data, error } = await supabase.rpc("match_chunks", {
    query_embedding: queryEmbedding,
    p_user_id: userId,
    match_count: topK,
    p_topic_id: topicId ?? null,
    p_exclude_syllabus: excludeSyllabus,
  });
  if (error) throw new Error(error.message);

  return (data as Retrieved[]).filter((c) => c.similarity >= minSimilarity);
}
