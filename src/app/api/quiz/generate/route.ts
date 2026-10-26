import { NextResponse } from "next/server";
import { requireUser, unauthorized, fail } from "@/lib/api";
import { generateQuiz } from "@/lib/quiz";

export const maxDuration = 60;

export async function POST() {
  const { supabase, user } = await requireUser();
  if (!user) return unauthorized();
  try {
    return NextResponse.json(await generateQuiz(supabase, user.id));
  } catch (e) {
    return fail(e);
  }
}
