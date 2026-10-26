import { NextResponse } from "next/server";
import { requireUser, unauthorized, fail } from "@/lib/api";
import { buildTopicMap } from "@/lib/topics";

export const maxDuration = 60;

export async function POST() {
  const { supabase, user } = await requireUser();
  if (!user) return unauthorized();
  try {
    return NextResponse.json(await buildTopicMap(supabase, user.id));
  } catch (e) {
    return fail(e);
  }
}
