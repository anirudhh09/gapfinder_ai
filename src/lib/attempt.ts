import type { SupabaseClient } from "@supabase/supabase-js";
import { generateObject } from "ai";
import { llm } from "./ai/llm";
import { ExplanationsSchema, ReasonsSchema } from "./ai/schemas";
import { EXPLAIN_SYSTEM, REASON_SYSTEM } from "./ai/prompts";
import { rate, weightedScore } from "./analysis/gap";

const one = (x: any) => (Array.isArray(x) ? x[0] : x);

/**
 * Grading and scoring are done in CODE (deterministic, auditable).
 * The LLM is only used to write explanations and one-line reasons,
 * and always from the cited source passage / actual wrong answers.
 */
export async function submitQuiz(
  supabase: SupabaseClient,
  userId: string,
  quizId: string,
  answers: Record<string, string>
) {
  const { data: qs } = await supabase
    .from("questions")
    .select("id, topic_id, question, options, correct_answer, difficulty, source_chunk_id, topics(name)")
    .eq("quiz_id", quizId)
    .eq("user_id", userId);
  if (!qs?.length) throw new Error("Quiz not found.");

  // source passages (for explanations + citations)
  const chunkIds = qs.map((q: any) => q.source_chunk_id).filter(Boolean);
  const { data: chunks } = await supabase
    .from("chunks")
    .select("id, content, page, section_title, documents(title)")
    .in("id", chunkIds);
  const chunkMap: Record<string, any> = {};
  for (const c of chunks ?? []) chunkMap[c.id] = c;

  // 1. Grade in code
  const graded = qs.map((q: any) => {
    const userAnswer: string | null = answers[q.id] ?? null;
    return { ...q, topicName: one(q.topics)?.name ?? "Topic", userAnswer, isCorrect: userAnswer === q.correct_answer };
  });

  // 2. LLM explains each answer from its source passage
  const explanations: Record<number, string> = {};
  try {
    const { object } = await generateObject({
      model: llm,
      schema: ExplanationsSchema,
      system: EXPLAIN_SYSTEM,
      prompt: graded
        .map((g: any, i: number) =>
          [
            `Item ${i}`,
            `Question: ${g.question}`,
            `Options: ${(g.options as string[]).join(" | ")}`,
            `Student answered: ${g.userAnswer ?? "(no answer)"}`,
            `Correct answer: ${g.correct_answer}`,
            `Source passage: ${chunkMap[g.source_chunk_id]?.content ?? "(missing)"}`,
          ].join("\n")
        )
        .join("\n\n---\n\n"),
    });
    for (const it of object.items) explanations[it.index] = it.explanation;
  } catch {
    /* fall back to a plain message below */
  }

  // 3. Save attempt + responses
  const { data: attempt, error } = await supabase
    .from("attempts").insert({ user_id: userId, quiz_id: quizId }).select("id").single();
  if (error) throw new Error(error.message);

  const results = graded.map((g: any, i: number) => {
    const c = chunkMap[g.source_chunk_id];
    return {
      questionId: g.id as string,
      topic: g.topicName as string,
      question: g.question as string,
      userAnswer: g.userAnswer as string | null,
      correctAnswer: g.correct_answer as string,
      isCorrect: g.isCorrect as boolean,
      explanation: explanations[i] ?? `The correct answer is "${g.correct_answer}". See the cited source.`,
      citation: c
        ? {
            document: one(c.documents)?.title ?? "Your material",
            page: c.page as number | null,
            section: c.section_title as string | null,
            excerpt: String(c.content).slice(0, 300),
          }
        : null,
    };
  });

  await supabase.from("responses").insert(
    results.map((r: any) => ({
      user_id: userId,
      attempt_id: attempt.id,
      question_id: r.questionId,
      user_answer: r.userAnswer,
      is_correct: r.isCorrect,
      explanation: r.explanation,
    }))
  );

  // 4. Gap analysis: topic scores computed in code
  const byTopic = new Map<string, any[]>();
  for (const g of graded) {
    byTopic.set(g.topic_id, [...(byTopic.get(g.topic_id) ?? []), g]);
  }
  const topicRows = [...byTopic.entries()].map(([topicId, items]) => {
    const score = weightedScore(items.map((g: any) => ({ isCorrect: g.isCorrect, difficulty: g.difficulty })));
    const wrong = items.filter((g: any) => !g.isCorrect);
    return {
      topicId,
      name: items[0].topicName as string,
      score,
      rating: rate(score),
      total: items.length,
      wrong,
      reason: wrong.length === 0
        ? `All ${items.length} questions answered correctly.`
        : `You missed ${wrong.length} of ${items.length} questions on this topic.`,
    };
  });

  // 5. LLM writes the one-line "reason" from the actual wrong answers
  const needReason = topicRows.filter((t) => t.wrong.length > 0);
  if (needReason.length) {
    try {
      const { object } = await generateObject({
        model: llm,
        schema: ReasonsSchema,
        system: REASON_SYSTEM,
        prompt: needReason
          .map((t, i) =>
            [
              `Topic ${i}: ${t.name} (score ${t.score}%, ${t.wrong.length} of ${t.total} wrong)`,
              ...t.wrong.map(
                (w: any) => `- Q: ${w.question} | student: ${w.userAnswer ?? "(none)"} | correct: ${w.correct_answer}`
              ),
            ].join("\n")
          )
          .join("\n\n"),
      });
      for (const it of object.items) if (needReason[it.index]) needReason[it.index].reason = it.reason;
    } catch {
      /* keep the code-generated reason */
    }
  }

  await supabase.from("topic_scores").insert(
    topicRows.map((t) => ({
      user_id: userId,
      topic_id: t.topicId,
      attempt_id: attempt.id,
      score: t.score,
      rating: t.rating,
      reason: t.reason,
    }))
  );

  const correct = results.filter((r: any) => r.isCorrect).length;
  return {
    attemptId: attempt.id as string,
    correct,
    total: results.length,
    results,
    topicScores: topicRows.map((t) => ({ topic: t.name, score: t.score, rating: t.rating, reason: t.reason })),
  };
}
