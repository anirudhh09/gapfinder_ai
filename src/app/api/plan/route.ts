import { NextResponse } from "next/server";
import { requireUser, unauthorized, fail } from "@/lib/api";
import { generatePlan } from "@/lib/plan";

export const maxDuration = 60;

export async function POST(req: Request) {
  const { supabase, user } = await requireUser();
  if (!user) return unauthorized();
  try {
    const { hoursPerDay, examDate } = await req.json();
    const hours = Number(hoursPerDay);
    if (!hours || hours <= 0 || hours > 16) return fail(new Error("Enter hours per day between 0.5 and 16"), 400);
    return NextResponse.json(await generatePlan(supabase, user.id, { hoursPerDay: hours, examDate }));
  } catch (e) {
    return fail(e);
  }
}
