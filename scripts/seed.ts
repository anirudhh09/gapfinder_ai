/**
 * Creates the demo user and preloads the sample DBMS material.
 * Run once:  npm run seed
 * Needs SUPABASE_SERVICE_ROLE_KEY in .env.local (server-side only).
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { ingestPages } from "../src/lib/ingest";
import { textToPages } from "../src/lib/rag/extract";
import { buildTopicMap } from "../src/lib/topics";
import { generateQuiz } from "../src/lib/quiz";

const EMAIL = process.env.DEMO_EMAIL ?? "demo@gapfinder.app";
const PASSWORD = process.env.DEMO_PASSWORD ?? "Demo@1234";

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

async function getOrCreateUser(): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({ email: EMAIL, password: PASSWORD, email_confirm: true });
  if (!error && data.user) return data.user.id;
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const existing = list?.users.find((u) => u.email === EMAIL);
  if (!existing) throw new Error(`Could not create or find ${EMAIL}: ${error?.message}`);
  await admin.auth.admin.updateUserById(existing.id, { password: PASSWORD });
  return existing.id;
}

async function main() {
  const userId = await getOrCreateUser();
  console.log("Demo user:", EMAIL, userId);

  // start clean (cascades to chunks, topic links, questions, attempts, scores)
  for (const t of ["documents", "topics", "quizzes", "attempts", "plans"]) {
    await admin.from(t).delete().eq("user_id", userId);
  }

  const files: [string, string, string][] = [
    ["sample-data/dbms-syllabus.txt", "DBMS Syllabus", "syllabus"],
    ["sample-data/dbms-notes.txt", "DBMS Lecture Notes", "notes"],
    ["sample-data/dbms-past-paper.txt", "DBMS Past Paper 2024", "past_paper"],
  ];
  for (const [path, title, type] of files) {
    const r = await ingestPages(admin, userId, { title, type, pages: textToPages(readFileSync(path, "utf8")) });
    console.log(`Ingested ${title}: ${r.chunks} chunks`);
  }

  console.log("Building topic map…");
  console.log(await buildTopicMap(admin, userId));
  console.log("Generating diagnostic quiz…");
  console.log(await generateQuiz(admin, userId));
  console.log("\nDone. Log in with", EMAIL, "/", PASSWORD);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
