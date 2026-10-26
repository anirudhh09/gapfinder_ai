import { NextResponse } from "next/server";
import { requireUser, unauthorized, fail } from "@/lib/api";
import { extractPages } from "@/lib/rag/extract";
import { ingestPages } from "@/lib/ingest";

export const runtime = "nodejs";
export const maxDuration = 60;

const TYPES = ["syllabus", "notes", "past_paper"];
const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(req: Request) {
  const { supabase, user } = await requireUser();
  if (!user) return unauthorized();

  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const type = String(form.get("type") ?? "notes");
    const title = String(form.get("title") || file?.name || "Untitled");

    if (!file) return fail(new Error("No file uploaded"), 400);
    if (file.size > MAX_BYTES) return fail(new Error("File is larger than 10 MB"), 413);
    if (!TYPES.includes(type)) return fail(new Error("Invalid document type"), 400);

    const pages = await extractPages(file);
    const result = await ingestPages(supabase, user.id, { title, type, pages });
    return NextResponse.json(result);
  } catch (e) {
    return fail(e);
  }
}
