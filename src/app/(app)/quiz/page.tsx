import Link from "next/link";
import { createClient } from "@/lib/db/server";
import ApiButton from "@/components/ApiButton";
import { btnGhost, Card, PageTitle } from "@/components/ui";

export default async function QuizList() {
  const supabase = await createClient();
  const { data: quizzes } = await supabase
    .from("quizzes").select("id, created_at, attempts(count)").order("created_at", { ascending: false });

  return (
    <>
      <PageTitle title="Diagnostic quiz" subtitle="Questions are written from your own material. After you answer, each one shows the section it came from." />
      <Card className="mb-6">
        <ApiButton url="/api/quiz/generate" label="Generate a new diagnostic quiz" redirectTo="/quiz/{quizId}" />
      </Card>
      <div className="space-y-3">
        {(quizzes ?? []).map((q: any, i: number) => {
          const n = Array.isArray(q.attempts) ? q.attempts[0]?.count ?? 0 : 0;
          return (
            <Card key={q.id} className="flex items-center justify-between">
              <span className="text-sm">
                Quiz from {new Date(q.created_at).toLocaleString()} · {n} attempt{n === 1 ? "" : "s"}
              </span>
              <Link href={`/quiz/${q.id}`} className={btnGhost}>{n ? "Retake" : "Take"}</Link>
            </Card>
          );
        })}
        {!quizzes?.length && <p className="text-sm text-slate-500">No quizzes yet.</p>}
      </div>
    </>
  );
}
