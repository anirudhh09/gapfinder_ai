import type { SupabaseClient } from "@supabase/supabase-js";
import { generateObject } from "ai";
import { llm } from "./ai/llm";
import { TopicMapSchema } from "./ai/schemas";
import { TOPIC_MAP_SYSTEM } from "./ai/prompts";
import { retrieve } from "./rag/retrieve";

/**
 * GENERATION: the LLM structures the syllabus text into topics.
 * RETRIEVAL: each topic is linked to its best-matching (non-syllabus) chunks.
 */
export async function buildTopicMap(supabase: SupabaseClient, userId: string) {
  const { data: docs } = await supabase
    .from("documents").select("id").eq("user_id", userId).eq("type", "syllabus");
  if (!docs?.length) throw new Error("Upload a syllabus first.");

  const { data: chunks } = await supabase
    .from("chunks")
    .select("content")
    .in("document_id", docs.map((d: any) => d.id))
    .order("document_id")
    .order("chunk_index");
  const syllabusText = (chunks ?? []).map((c: any) => c.content).join("\n\n").slice(0, 24000);

  const { object } = await generateObject({
    model: llm,
    schema: TopicMapSchema,
    system: TOPIC_MAP_SYSTEM,
    prompt: `Syllabus:\n\n${syllabusText}`,
  });

  // Replace any previous topic map (cascades to topic_chunks, questions, scores)
  await supabase.from("topics").delete().eq("user_id", userId);

  for (const t of object.topics) {
    const { data: parent, error } = await supabase
      .from("topics")
      .insert({ user_id: userId, name: t.name, syllabus_text: t.subtopics.join("; ") })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    if (t.subtopics.length) {
      await supabase.from("topics").insert(
        t.subtopics.map((s) => ({ user_id: userId, name: s, parent_id: parent.id }))
      );
    }

    const hits = await retrieve(supabase, userId, `${t.name}: ${t.subtopics.join(", ")}`, {
      topK: 6,
      excludeSyllabus: true,
    });
    if (hits.length) {
      await supabase.from("topic_chunks").insert(
        hits.map((h) => ({ user_id: userId, topic_id: parent.id, chunk_id: h.id }))
      );
    }
  }
  return { topics: object.topics.length };
}
