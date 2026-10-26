import type { SupabaseClient } from "@supabase/supabase-js";
import { generateObject } from "ai";
import { llm } from "./ai/llm";
import { QuestionsSchema } from "./ai/schemas";
import { QUIZ_SYSTEM } from "./ai/prompts";
import { retrieve } from "./rag/retrieve";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * RETRIEVE the topic's chunks, then GENERATE questions from only those chunks.
 * The model returns a passage NUMBER (not a UUID); we map it back to the real
 * chunk id in code, so every question carries a verified source_chunk_id.
 */
async function questionsForTopic(
  supabase: SupabaseClient,
  userId: string,
  quizId: string,
  topic: { id: string; name: string },
  perTopic: number
) {
  const hits = await retrieve(supabase, userId, topic.name, { topK: 4, topicId: topic.id });
  if (!hits.length) return [];

  const context = hits
    .map((h, i) => `[${i + 1}] (${h.section_title ?? "untitled section"}, p.${h.page})\n${h.content}`)
    .join("\n\n");

  const { object } = await generateObject({
    model: llm,
    schema: QuestionsSchema,
    system: QUIZ_SYSTEM,
    prompt: `Topic: ${topic.name}\nWrite exactly ${perTopic} multiple-choice questions.\n\nContext:\n${context}`,
  });

  return object.questions
    .filter((q) => q.sourceNumber >= 1 && q.sourceNumber <= hits.length && q.options.length === 4)
    .map((q) => ({
      user_id: userId,
      quiz_id: quizId,
      topic_id: topic.id,
      question: q.question,
      options: shuffle(q.options),
      correct_answer: q.options[q.correctIndex],
      difficulty: q.difficulty,
      source_chunk_id: hits[q.sourceNumber - 1].id,
    }));
}

export async function generateQuiz(
  supabase: SupabaseClient,
  userId: string,
  opts: { perTopic?: number; maxTopics?: number } = {}
) {
  const { perTopic = 3, maxTopics = 10 } = opts;
  const { data: topics } = await supabase
    .from("topics").select("id, name").eq("user_id", userId).is("parent_id", null).limit(maxTopics);
  if (!topics?.length) throw new Error("Build the topic map first.");

  const { data: quiz, error } = await supabase
    .from("quizzes").insert({ user_id: userId }).select("id").single();
  if (error) throw new Error(error.message);

  const rows: any[] = [];
  let firstError: unknown = null;
  // small batches keep us under free-tier rate limits
  for (let i = 0; i < topics.length; i += 3) {
    const batch = topics.slice(i, i + 3);
    const results = await Promise.allSettled(
      batch.map((t: any) => questionsForTopic(supabase, userId, quiz.id, t, perTopic))
    );
    for (const r of results) {
      if (r.status === "fulfilled") rows.push(...r.value);
      else firstError = firstError ?? r.reason;
    }
  }

  if (!rows.length) {
    await supabase.from("quizzes").delete().eq("id", quiz.id);
    throw firstError instanceof Error ? firstError : new Error("Could not generate questions.");
  }
  const { error: qErr } = await supabase.from("questions").insert(rows);
  if (qErr) throw new Error(qErr.message);
  return { quizId: quiz.id as string, questions: rows.length };
}
