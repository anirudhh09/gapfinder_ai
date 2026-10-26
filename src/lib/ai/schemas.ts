import { z } from "zod";

export const TopicMapSchema = z.object({
  topics: z
    .array(z.object({ name: z.string(), subtopics: z.array(z.string()) }))
    .min(3)
    .max(15),
});

export const QuestionsSchema = z.object({
  questions: z.array(
    z.object({
      question: z.string(),
      options: z.array(z.string()).length(4),
      correctIndex: z.number().int().min(0).max(3),
      difficulty: z.enum(["easy", "medium", "hard"]),
      sourceNumber: z.number().int().min(1),
    })
  ),
});

export const ExplanationsSchema = z.object({
  items: z.array(z.object({ index: z.number().int(), explanation: z.string() })),
});

export const ReasonsSchema = z.object({
  items: z.array(z.object({ index: z.number().int(), reason: z.string() })),
});

export const PlanSchema = z.object({
  days: z.array(
    z.object({
      day: z.number().int(),
      focus: z.string(),
      tasks: z.array(
        z.object({ topic: z.string(), minutes: z.number().int(), activity: z.string() })
      ),
    })
  ),
  tips: z.array(z.string()),
});
