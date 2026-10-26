import type { SupabaseClient } from "@supabase/supabase-js";
import { PlanSchema } from "./ai/schemas";
import { allocateMinutes } from "./analysis/allocate";
import { fetchScoreHistory, latestPerTopic } from "./scores";

const one = (x: any) => (Array.isArray(x) ? x[0] : x);

type ScheduleTask = {
  topic: string;
  minutes: number;
  activity: string;
};

type ScheduleDay = {
  day: number;
  focus: string;
  tasks: ScheduleTask[];
};

function getActivity(
  rating: string,
  occurrence: number
): string {
  const normalized = rating.toLowerCase();

  if (
    normalized.includes("weak") ||
    normalized.includes("low")
  ) {
    if (occurrence === 0) {
      return "Study the core concepts and examples from the uploaded material.";
    }

    if (occurrence === 1) {
      return "Revise the topic and practice questions from the uploaded material.";
    }

    return "Quick revision and self-test on the topic.";
  }

  if (
    normalized.includes("medium") ||
    normalized.includes("average")
  ) {
    if (occurrence === 0) {
      return "Review the important concepts and examples from the uploaded material.";
    }

    return "Practice questions and revise mistakes from this topic.";
  }

  if (occurrence === 0) {
    return "Review the topic and important points from the uploaded material.";
  }

  return "Quick revision and practice.";
}

function buildSchedule(
  allocations: Array<{
    id: string;
    name: string;
    score: number;
    rating: string;
    minutes: number;
  }>,
  numDays: number,
  minutesPerDay: number
): ScheduleDay[] {
  const remaining = allocations.map((a) => ({
    ...a,
    remainingMinutes: a.minutes,
    occurrences: 0,
  }));

  const days: ScheduleDay[] = Array.from(
    { length: numDays },
    (_, index) => ({
      day: index + 1,
      focus: "",
      tasks: [],
    })
  );

  for (const day of days) {
    let remainingDayMinutes = minutesPerDay;

    while (remainingDayMinutes > 0) {
      const available = remaining.filter(
        (topic) => topic.remainingMinutes > 0
      );

      if (!available.length) {
        break;
      }

      available.sort((a, b) => {
        if (a.score !== b.score) {
          return a.score - b.score;
        }

        return b.remainingMinutes - a.remainingMinutes;
      });

      const topic = available[0];

      const minutes = Math.min(
        topic.remainingMinutes,
        remainingDayMinutes
      );

      topic.remainingMinutes -= minutes;
      remainingDayMinutes -= minutes;

      const activity = getActivity(
        topic.rating,
        topic.occurrences
      );

      topic.occurrences += 1;

      day.tasks.push({
        topic: topic.name,
        minutes,
        activity,
      });
    }

    if (day.tasks.length > 0) {
      day.focus = day.tasks[0].topic;
    } else {
      day.focus = "Revision";
    }
  }

  return days;
}

export async function generatePlan(
  supabase: SupabaseClient,
  userId: string,
  input: {
    hoursPerDay: number;
    examDate?: string | null;
  }
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

  const minutesPerDay = Math.max(
    1,
    Math.round(input.hoursPerDay * 60)
  );

  const totalMinutes =
    minutesPerDay * numDays;

  const allocations = allocateMinutes(
    latest.map((l) => ({
      id: l.topic_id,
      name: l.topic,
      score: l.score,
      rating: l.rating,
    })),
    totalMinutes
  ).sort((a, b) => a.score - b.score);

  if (!allocations.length) {
    throw new Error(
      "No topic allocations were created for the revision plan."
    );
  }

  const { data: links, error: linksError } =
    await supabase
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

  const days = buildSchedule(
    allocations,
    numDays,
    minutesPerDay
  );

  const tips = [
    "Start each study session with your weakest topic.",
    "Use the uploaded material as the primary source for revision.",
    "After studying a topic, test yourself without looking at the notes.",
    "Revisit topics where your diagnostic score was low."
  ];

  const parsed = {
    days,
    tips,
  };

  const validation =
    PlanSchema.safeParse(parsed);

  if (!validation.success) {
    console.error(
      "PLAN SCHEMA ERROR:",
      validation.error.flatten()
    );

    console.error(
      "GENERATED PLAN:",
      JSON.stringify(
        parsed,
        null,
        2
      )
    );

    throw new Error(
      "The generated revision plan has an invalid structure."
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
      references: refs[a.id] ?? [],
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
    .select(
      "hours_available, exam_date"
    )
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
        examDate:
          data[0].exam_date,
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