import type { SupabaseClient } from "@supabase/supabase-js";
import { chunkPages, type Page } from "./rag/chunk";
import { embedTexts } from "./rag/embed";

export async function ingestPages(
  supabase: SupabaseClient,
  userId: string,
  input: { title: string; type: string; pages: Page[] }
) {
  const chunks = chunkPages(input.pages);
  if (chunks.length === 0)
    throw new Error("No usable text found (scanned PDFs are not supported yet).");

  const { data: doc, error } = await supabase
    .from("documents")
    .insert({ user_id: userId, title: input.title, type: input.type })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  try {
    const BATCH = 50;
    for (let i = 0; i < chunks.length; i += BATCH) {
      const batch = chunks.slice(i, i + BATCH);
      const embeddings = await embedTexts(batch.map((c) => c.content));
      const rows = batch.map((c, j) => ({
        user_id: userId,
        document_id: doc.id,
        content: c.content,
        page: c.page,
        section_title: c.sectionTitle,
        chunk_index: c.index,
        embedding: embeddings[j],
      }));
      const { error: insErr } = await supabase.from("chunks").insert(rows);
      if (insErr) throw new Error(insErr.message);
    }
  } catch (e) {
    await supabase.from("documents").delete().eq("id", doc.id); // roll back
    throw e;
  }
  return { documentId: doc.id as string, chunks: chunks.length };
}
