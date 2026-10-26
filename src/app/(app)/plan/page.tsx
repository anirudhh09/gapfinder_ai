import { createClient } from "@/lib/db/server";
import PlanForm from "@/components/PlanForm";
import { Card, PageTitle, RatingBadge } from "@/components/ui";

export default async function PlanPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("plans").select("hours_available, exam_date, plan_json, created_at")
    .order("created_at", { ascending: false }).limit(1);
  const plan = data?.[0];
  const p = plan?.plan_json as any;

  return (
    <>
      <PageTitle title="Revision plan" subtitle="Time is split by how weak each topic is. The plan rebuilds itself after every quiz attempt." />
      <Card className="mb-6">
        <PlanForm defaultHours={plan ? Number(plan.hours_available) : undefined} defaultDate={plan?.exam_date ?? undefined} />
      </Card>

      {!p ? (
        <p className="text-sm text-slate-500">No plan yet. Take a quiz, then set your available time above.</p>
      ) : (
        <div className="space-y-6">
          <Card>
            <h2 className="mb-3 font-semibold">Time allocation ({p.numDays} days, {Math.round(p.totalMinutes / 60)} hours)</h2>
            <ul className="space-y-2 text-sm">
              {p.allocations.map((a: any) => (
                <li key={a.topic} className="flex items-center gap-3">
                  <RatingBadge rating={a.rating} />
                  <span className="flex-1">{a.topic}</span>
                  <span className="text-slate-500">{a.score}%</span>
                  <span className="w-20 text-right font-medium">{a.minutes} min</span>
                </li>
              ))}
            </ul>
          </Card>

          {p.days.map((d: any) => (
            <Card key={d.day}>
              <h3 className="font-semibold">Day {d.day}: {d.focus}</h3>
              <ul className="mt-2 space-y-2 text-sm">
                {d.tasks.map((t: any, i: number) => (
                  <li key={i} className="flex gap-3">
                    <span className="w-16 shrink-0 text-slate-500">{t.minutes} min</span>
                    <span><strong>{t.topic}:</strong> {t.activity}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}

          {p.tips?.length > 0 && (
            <Card>
              <h3 className="font-semibold">Tips</h3>
              <ul className="mt-2 list-disc pl-5 text-sm text-slate-700">{p.tips.map((t: string, i: number) => <li key={i}>{t}</li>)}</ul>
            </Card>
          )}
        </div>
      )}
    </>
  );
}
