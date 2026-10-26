import { NextResponse } from "next/server";
import { createClient } from "./db/server";

export async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

export const unauthorized = () => NextResponse.json({ error: "Unauthorized" }, { status: 401 });

export function fail(e: unknown, status = 500) {
  const message = e instanceof Error ? e.message : "Unexpected error";
  return NextResponse.json({ error: message }, { status });
}
