import Link from "next/link";
import { createClient } from "@/lib/db/server";
import { fetchScoreHistory, latestPerTopic } from "@/lib/scores";
import { btn, Card, PageTitle, RatingBadge } from "@/components/ui";

export default async function ReportPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const rows = latestPerTopic(await fetchScoreHistory(supabase, user!.id)).sort((a, b) => a.score - b.score);

  return (
    <>
      <PageTitle title="Gap report" subtitle="Weakest topics first. Scores come from your quiz answers (harder questions count more); the reason is based on the answers you got wrong." />
      {rows.length === 0 ? (
        <p className="text-sm text-slate-500">
          No results yet. <Link href="/quiz" className="text-indigo-600 underline">Take a diagnostic quiz</Link> first.
        </p>
      ) : (
        <>
          <div className="space-y-3">
            {rows.map((r) => (
              <Card key={r.topic_id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold">{r.topic}</h3>
                  <div className="flex items-center gap-3">
                    <span className="text-xl font-bold">{r.score}%</span>
                    <RatingBadge rating={r.rating} />
                  </div>
                </div>
                <div className="mt-2 h-2 rounded-full bg-slate-100">
                  <div
                    className={`h-2 rounded-full ${r.rating === "weak" ? "bg-red-500" : r.rating === "medium" ? "bg-amber-500" : "bg-green-500"}`}
                    style={{ width: `${r.score}%` }}
                  />
                </div>
                {r.reason && <p className="mt-2 text-sm text-slate-700">{r.reason}</p>}
              </Card>
            ))}
          </div>
          <div className="mt-6"><Link href="/plan" className={btn}>Build my revision plan</Link></div>
        </>
      )}
    </>
  );
}
