import { NextResponse } from "next/server";
import { generateText } from "ai";
import { requireUser, unauthorized, fail } from "@/lib/api";
import { llm } from "@/lib/ai/llm";
import { CHAT_SYSTEM } from "@/lib/ai/prompts";
import { retrieve } from "@/lib/rag/retrieve";

export const maxDuration = 60;

const NOT_FOUND =
  "I couldn't find this in your uploaded material. Try rephrasing, or upload notes that cover it.";

export async function POST(req: Request) {
  const { supabase, user } = await requireUser();

  if (!user) return unauthorized();

  try {
    const { question } = await req.json();

    if (!question || typeof question !== "string") {
      return fail(new Error("question is required"), 400);
    }

    const minSimilarity = Number(
      process.env.RAG_MIN_SIMILARITY ?? 0.5
    );

    const hits = await retrieve(
      supabase,
      user.id,
      question,
      {
        topK: 5,
        minSimilarity,
        excludeSyllabus: false,
      }
    );

    if (!hits.length) {
      return NextResponse.json({
        answer: NOT_FOUND,
        sources: [],
      });
    }

    const { data: docs } = await supabase
      .from("documents")
      .select("id, title")
      .in(
        "id",
        [...new Set(hits.map((h) => h.document_id))]
      );

    const titles: Record<string, string> = {};

    for (const d of docs ?? []) {
      titles[d.id] = d.title;
    }

    const context = hits
      .map(
        (h, i) =>
          `[${i + 1}] (${titles[h.document_id] ?? "material"}, ${
            h.section_title ?? "section"
          }, p.${h.page})\n${h.content}`
      )
      .join("\n\n");

    const { text } = await generateText({
      model: llm,
      system: CHAT_SYSTEM,
      prompt: `Context:\n${context}\n\nQuestion: ${question}`,
    });

    if (text.includes("NOT_FOUND")) {
      return NextResponse.json({
        answer: NOT_FOUND,
        sources: [],
      });
    }

    return NextResponse.json({
      answer: text.trim(),
      sources: hits.map((h, i) => ({
        n: i + 1,
        document: titles[h.document_id] ?? "material",
        section: h.section_title,
        page: h.page,
        similarity: Math.round(h.similarity * 100) / 100,
      })),
    });
  } catch (e) {
    console.error("CHAT API ERROR:", e);

    if (e instanceof Error) {
      console.error("MESSAGE:", e.message);
      console.error("STACK:", e.stack);
    }

    return fail(e);
  }
}