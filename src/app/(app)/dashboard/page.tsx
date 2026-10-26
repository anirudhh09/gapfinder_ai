import Link from "next/link";
import { CheckCircle2, Circle, FileText, Layers, Target, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/db/server";
import { buildChartData, fetchScoreHistory, latestPerTopic } from "@/lib/scores";
import ProgressChart from "@/components/ProgressChart";
import { btn, Card, RatingBadge } from "@/components/ui";

const BAR = { weak: "bg-red-500", medium: "bg-amber-500", strong: "bg-green-500" };

export default async function Dashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const name = (user?.email ?? "there").split("@")[0];

  const [docs, topics, quizzes, attempts, history] = await Promise.all([
    supabase.from("documents").select("id", { count: "exact", head: true }),
    supabase.from("topics").select("id", { count: "exact", head: true }).is("parent_id", null),
    supabase.from("quizzes").select("id", { count: "exact", head: true }),
    supabase.from("attempts").select("id", { count: "exact", head: true }),
    fetchScoreHistory(supabase, user!.id),
  ]);

  const latest = latestPerTopic(history);
  const counts = { weak: 0, medium: 0, strong: 0 };
  for (const t of latest) counts[t.rating]++;
  const avg = latest.length ? Math.round(latest.reduce((s, r) => s + r.score, 0) / latest.length) : null;
  const focus = [...latest].sort((a, b) => a.score - b.score).slice(0, 3);
  const chart = buildChartData(history);

  const steps = [
    { done: (docs.count ?? 0) > 0, label: "Upload your syllabus, notes and past papers", href: "/upload" },
    { done: (topics.count ?? 0) > 0, label: "Build the topic map from your syllabus", href: "/topics" },
    { done: (quizzes.count ?? 0) > 0, label: "Generate a diagnostic quiz", href: "/quiz" },
    { done: (attempts.count ?? 0) > 0, label: "Take the quiz to get your gap report", href: "/quiz" },
  ];
  const doneCount = steps.filter((s) => s.done).length;

  const stats = [
    { icon: FileText, label: "Documents", value: docs.count ?? 0 },
    { icon: Layers, label: "Topics", value: topics.count ?? 0 },
    { icon: Target, label: "Quiz attempts", value: attempts.count ?? 0 },
    { icon: TrendingUp, label: "Average score", value: avg === null ? "–" : `${avg}%` },
  ];

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold capitalize">Welcome back, {name}</h1>
        <p className="mt-1 text-slate-600">Here is where you stand and what to study next.</p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map(({ icon: Icon, label, value }) => (
          <Card key={label}>
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-indigo-50 text-indigo-600"><Icon size={18} /></span>
            <p className="mt-3 text-2xl font-bold">{value}</p>
            <p className="text-sm text-slate-500">{label}</p>
          </Card>
        ))}
      </div>

      {doneCount < steps.length && (
        <Card className="mb-6 border-indigo-200 bg-indigo-50/60">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-semibold">Get started</p>
            <span className="text-sm text-slate-600">{doneCount} of {steps.length} done</span>
          </div>
          <div className="mb-4 h-2 rounded-full bg-white"><div className="h-2 rounded-full bg-indigo-600" style={{ width: `${(doneCount / steps.length) * 100}%` }} /></div>
          <ul className="space-y-2">
            {steps.map((s) => (
              <li key={s.label} className="flex items-center gap-2 text-sm">
                {s.done ? <CheckCircle2 size={18} className="text-green-600" /> : <Circle size={18} className="text-slate-400" />}
                <span className={s.done ? "text-slate-400 line-through" : ""}>{s.label}</span>
                {!s.done && <Link href={s.href} className="ml-auto text-indigo-700 hover:underline">Start</Link>}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="mb-1 font-semibold">Focus on these first</h2>
          <p className="mb-4 text-sm text-slate-500">Your three weakest topics from the latest results.</p>
          {focus.length ? (
            <div className="space-y-4">
              {focus.map((f) => (
                <div key={f.topic_id}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{f.topic}</span>
                    <span className="flex items-center gap-2"><b>{f.score}%</b><RatingBadge rating={f.rating} /></span>
                  </div>
                  <div className="mt-1.5 h-2 rounded-full bg-slate-100"><div className={`h-2 rounded-full ${BAR[f.rating]}`} style={{ width: `${f.score}%` }} /></div>
                </div>
              ))}
              <Link href="/plan" className={`${btn} mt-2`}>Open my revision plan</Link>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Take a quiz to find your weak topics.</p>
          )}
        </Card>

        <Card>
          <h2 className="mb-3 font-semibold">Topic strength</h2>
          <div className="space-y-3">
            {(["weak", "medium", "strong"] as const).map((r) => (
              <div key={r} className="flex items-center justify-between">
                <RatingBadge rating={r} />
                <span className="text-2xl font-bold">{counts[r]}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <h2 className="mb-1 font-semibold">Progress across attempts</h2>
        <p className="mb-4 text-sm text-slate-500">Each line is a topic. The thick line is your overall average.</p>
        {chart.data.length ? <ProgressChart data={chart.data} topics={chart.topics} /> : <p className="text-sm text-slate-500">Take a quiz to see your progress here.</p>}
      </Card>
    </>
  );
}
