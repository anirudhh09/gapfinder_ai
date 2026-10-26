import { NextResponse } from "next/server";
import { requireUser, unauthorized, fail } from "@/lib/api";
import { submitQuiz } from "@/lib/attempt";
import { regeneratePlanIfExists } from "@/lib/plan";

export const maxDuration = 60;

export async function POST(req: Request) {
  const { supabase, user } = await requireUser();
  if (!user) return unauthorized();
  try {
    const { quizId, answers } = await req.json();
    if (!quizId || typeof answers !== "object") return fail(new Error("quizId and answers are required"), 400);
    const result = await submitQuiz(supabase, user.id, quizId, answers);
    const planUpdated = await regeneratePlanIfExists(supabase, user.id);
    return NextResponse.json({ ...result, planUpdated });
  } catch (e) {
    return fail(e);
  }
}
