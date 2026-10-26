"use client";
import { useState } from "react";
import Link from "next/link";
import { btn, btnGhost, Card, RatingBadge } from "./ui";

type Q = { id: string; question: string; options: string[]; topic: string };
type Result = {
  questionId: string; topic: string; question: string; userAnswer: string | null;
  correctAnswer: string; isCorrect: boolean; explanation: string;
  citation: { document: string; page: number | null; section: string | null; excerpt: string } | null;
};
type Submitted = {
  correct: number; total: number; results: Result[]; planUpdated: boolean;
  topicScores: { topic: string; score: number; rating: string; reason: string }[];
};

export default function QuizRunner({ quizId, questions }: { quizId: string; questions: Q[] }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Submitted | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/quiz/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quizId, answers }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not submit");
      setDone(json);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="space-y-5">
        <Card>
          <p className="text-lg font-bold">You scored {done.correct} / {done.total}</p>
          <ul className="mt-3 space-y-2 text-sm">
            {done.topicScores.map((t) => (
              <li key={t.topic} className="flex flex-wrap items-center gap-2">
                <RatingBadge rating={t.rating} />
                <span className="font-medium">{t.topic}</span>
                <span className="text-slate-500">{t.score}% — {t.reason}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex gap-3">
            <Link href="/report" className={btn}>See full gap report</Link>
            <Link href="/plan" className={btnGhost}>{done.planUpdated ? "Plan updated – view it" : "Build my plan"}</Link>
          </div>
        </Card>

        {done.results.map((r, i) => (
          <Card key={r.questionId} className={r.isCorrect ? "border-green-300" : "border-red-300"}>
            <p className="text-xs uppercase text-slate-500">{r.topic}</p>
            <p className="font-semibold">{i + 1}. {r.question}</p>
            <p className="mt-2 text-sm">
              Your answer: <span className={r.isCorrect ? "text-green-700" : "text-red-600"}>{r.userAnswer ?? "(none)"}</span>
              {!r.isCorrect && <> · Correct: <span className="text-green-700">{r.correctAnswer}</span></>}
            </p>
            <p className="mt-2 text-sm text-slate-700">{r.explanation}</p>
            {r.citation && (
              <p className="mt-2 rounded-md bg-slate-50 p-2 text-xs text-slate-600">
                <strong>Source:</strong> {r.citation.document}
                {r.citation.section ? ` › ${r.citation.section}` : ""}{r.citation.page ? ` (p.${r.citation.page})` : ""}
                <br />“{r.citation.excerpt}…”
              </p>
            )}
          </Card>
        ))}
      </div>
    );
  }

  const answered = Object.keys(answers).length;
  return (
    <div className="space-y-5">
      {questions.map((q, i) => (
        <Card key={q.id}>
          <p className="text-xs uppercase text-slate-500">{q.topic}</p>
          <p className="font-semibold">{i + 1}. {q.question}</p>
          <div className="mt-3 space-y-2">
            {q.options.map((o) => (
              <label key={o} className={`flex cursor-pointer items-start gap-2 rounded-lg border p-2 text-sm ${answers[q.id] === o ? "border-indigo-500 bg-indigo-50" : "border-slate-200 hover:bg-slate-50"}`}>
                <input type="radio" name={q.id} checked={answers[q.id] === o} onChange={() => setAnswers({ ...answers, [q.id]: o })} className="mt-1" />
                {o}
              </label>
            ))}
          </div>
        </Card>
      ))}
      <div className="flex items-center gap-4">
        <button onClick={submit} disabled={busy || answered === 0} className={btn}>
          {busy ? "Grading…" : `Submit (${answered}/${questions.length} answered)`}
        </button>
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </div>
  );
}
