
import type { SupabaseClient } from "@supabase/supabase-js";
import { generateText } from "ai";
import { llm } from "./ai/llm";
import { PlanSchema } from "./ai/schemas";
import { allocateMinutes } from "./analysis/allocate";
import { fetchScoreHistory, latestPerTopic } from "./scores";

const one = (x: any) => (Array.isArray(x) ? x[0] : x);

export async function generatePlan(
  supabase: SupabaseClient,
  userId: string,
  input: { hoursPerDay: number; examDate?: string | null }
) {
  const latest = latestPerTopic(
    await fetchScoreHistory(supabase, userId)
  );

  if (!latest.length) {
    throw new Error(
      "Take a diagnostic quiz first, so the plan knows your weak areas."
    );
  }

  let numDays = 7;

  if (input.examDate) {
    const ms =
      new Date(input.examDate).getTime() - Date.now();

    numDays = Math.min(
      14,
      Math.max(1, Math.ceil(ms / 86400000))
    );
  }

  const minutesPerDay = Math.round(input.hoursPerDay * 60);
  const totalMinutes = minutesPerDay * numDays;

  const allocations = allocateMinutes(
    latest.map((l) => ({
      id: l.topic_id,
      name: l.topic,
      score: l.score,
      rating: l.rating,
    })),
    totalMinutes
  ).sort((a, b) => a.score - b.score);

  const { data: links, error: linksError } = await supabase
    .from("topic_chunks")
    .select(
      "topic_id, chunks(section_title, page, documents(title))"
    )
    .in(
      "topic_id",
      allocations.map((a) => a.id)
    );

  if (linksError) {
    throw new Error(linksError.message);
  }

  const refs: Record<string, string[]> = {};

  for (const link of links ?? []) {
    const chunk = one((link as any).chunks);

    if (!chunk) {
      continue;
    }

    const document = one(chunk.documents);

    const reference = `${document?.title ?? "notes"} - "${
      chunk.section_title ?? "section"
    }" (p.${chunk.page ?? "N/A"})`;

    const topicId = (link as any).topic_id;

    refs[topicId] = [
      ...new Set([
        ...(refs[topicId] ?? []),
        reference,
      ]),
    ].slice(0, 3);
  }

  const allocationText = allocations
    .map(
      (a) =>
        `Topic: ${a.name}
Score: ${a.score}%
Rating: ${a.rating}
Total minutes: ${a.minutes}
References: ${
          refs[a.id]?.join("; ") || "No reference available"
        }`
    )
    .join("\n\n");

  let result;

  try {
    console.log("TESTING GROQ MODEL:", process.env.GROQ_MODEL);
    result = await generateText({
  model: llm,
  maxOutputTokens: 4000,
  providerOptions: {
    groq: {
      reasoning_effort: "low",
      include_reasoning: false,
      response_format: {
        type: "json_object",
      },
    },
  },

      system: `You are a study planning assistant.

Return ONLY valid JSON.
Do not use Markdown.
Do not use code fences.
Do not write anything outside the JSON.

The JSON must follow this exact structure:

{
  "days": [
    {
      "day": 1,
      "focus": "topic name",
      "tasks": [
        {
          "topic": "topic name",
          "minutes": 30,
          "activity": "study activity"
        }
      ]
    }
  ],
  "tips": [
    "study tip"
  ]
}

Rules:
1. Return exactly ${numDays} days.
2. Day numbers must be 1 through ${numDays}.
3. Use only topics supplied in the user prompt.
4. Every task must have a positive integer number of minutes.
5. Weak topics should appear earlier.
6. Weak topics should be revised again later.
7. Return 2 to 4 study tips.
8. Do not invent topics.
9. Do not invent references.
10. Keep the response valid JSON only.`,

      prompt: `Create a personalized revision plan.

Number of days:
${numDays}

Minutes available per day:
${minutesPerDay}

Total available minutes:
${totalMinutes}

Topic allocations:

${allocationText}`
    });
  } catch (error) {
    console.error("PLAN AI GENERATION ERROR:", error);
    throw error;
  }

  console.log("PLAN AI RESULT KEYS:", Object.keys(result));

console.log("PLAN AI TEXT:", JSON.stringify(result.text));
console.log("PLAN AI REASONING:", JSON.stringify(result.reasoning));
console.log("PLAN AI PROVIDER METADATA:", result.providerMetadata);

console.log("PLAN AI RESULT KEYS:", Object.keys(result));
console.log("PLAN AI TEXT:", JSON.stringify(result.text));
console.log("PLAN AI REASONING:", JSON.stringify(result.reasoning));

const rawText = result.text;

console.log("RAW TEXT TYPE:", typeof rawText);
console.log("RAW TEXT:", JSON.stringify(rawText));

const text =
  typeof rawText === "string"
    ? rawText
    : JSON.stringify(rawText);

  if (!text || !text.trim()) {
    throw new Error(
      "The AI returned an empty revision plan."
    );
  }

  let cleaned = text.trim();

  if (cleaned.startsWith("```")) {
    cleaned = cleaned
      .replace(/^```(?:json)?/i, "")
      .replace(/```$/i, "")
      .trim();
  }

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1) {
    console.error(
      "INVALID PLAN RESPONSE:",
      text
    );

    throw new Error(
      "The AI did not return a valid revision plan."
    );
  }

  cleaned = cleaned.slice(
    firstBrace,
    lastBrace + 1
  );

  let parsed: unknown;

  try {
    parsed = JSON.parse(cleaned);
  } catch (error) {
    console.error(
      "PLAN JSON ERROR:",
      error
    );

    console.error(
      "AI RESPONSE:",
      text
    );

    throw new Error(
      "The AI returned invalid JSON for the revision plan."
    );
  }

  const validation = PlanSchema.safeParse(parsed);

  if (!validation.success) {
    console.error(
      "PLAN SCHEMA ERROR:",
      validation.error.flatten()
    );

    console.error(
      "PLAN RESPONSE:",
      JSON.stringify(
        parsed,
        null,
        2
      )
    );

    throw new Error(
      "The AI returned a revision plan with an invalid structure."
    );
  }

  const object = validation.data;

  const plan_json = {
    numDays,
    totalMinutes,

    allocations: allocations.map((a) => ({
      topic: a.name,
      score: a.score,
      rating: a.rating,
      minutes: a.minutes,
    })),

    days: object.days,
    tips: object.tips,
  };

  const { error } = await supabase
    .from("plans")
    .insert({
      user_id: userId,
      hours_available: input.hoursPerDay,
      exam_date: input.examDate || null,
      plan_json,
    });

  if (error) {
    throw new Error(error.message);
  }

  return plan_json;
}

export async function regeneratePlanIfExists(
  supabase: SupabaseClient,
  userId: string
) {
  const { data, error } = await supabase
    .from("plans")
    .select("hours_available, exam_date")
    .eq("user_id", userId)
    .order("created_at", {
      ascending: false,
    })
    .limit(1);

  if (error) {
    return false;
  }

  if (!data?.length) {
    return false;
  }

  try {
    await generatePlan(
      supabase,
      userId,
      {
        hoursPerDay: Number(
          data[0].hours_available
        ),
        examDate: data[0].exam_date,
      }
    );

    return true;
  } catch (error) {
    console.error(
      "PLAN REGENERATION ERROR:",
      error
    );

    return false;
  }
}