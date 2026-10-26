/**
 * Quick retrieval check:  npm run test:retrieval -- "What is BCNF?"
 * Prints the top chunks so you can judge retrieval quality by eye.
 */
import { createClient } from "@supabase/supabase-js";
import { retrieve } from "../src/lib/rag/retrieve";

const query = process.argv.slice(2).join(" ") || "What is the difference between 3NF and BCNF?";
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

async function main() {
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const user = data?.users.find((u) => u.email === (process.env.DEMO_EMAIL ?? "demo@gapfinder.app"));
  if (!user) throw new Error("Demo user not found. Run `npm run seed` first.");

  const hits = await retrieve(admin, user.id, query, { topK: 5 });
  console.log(`Query: ${query}\n`);
  hits.forEach((h, i) =>
    console.log(`#${i + 1}  sim=${h.similarity.toFixed(3)}  p.${h.page}  [${h.section_title}]\n    ${h.content.slice(0, 140).replace(/\n/g, " ")}…\n`)
  );
}
main().catch((e) => { console.error(e); process.exit(1); });
