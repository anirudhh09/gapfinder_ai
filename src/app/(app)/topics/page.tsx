import { createClient } from "@/lib/db/server";
import ApiButton from "@/components/ApiButton";
import { Card, PageTitle } from "@/components/ui";

export default async function TopicsPage() {
  const supabase = await createClient();
  const { data: topics } = await supabase.from("topics").select("id, name, parent_id");
  const { data: links } = await supabase.from("topic_chunks").select("topic_id");

  const parents = (topics ?? []).filter((t: any) => !t.parent_id);
  const chunkCount: Record<string, number> = {};
  for (const l of links ?? []) chunkCount[(l as any).topic_id] = (chunkCount[(l as any).topic_id] ?? 0) + 1;

  return (
    <>
      <PageTitle title="Topic map" subtitle="Built from your syllabus. Each topic is linked to the sections of your notes that cover it." />
      <Card className="mb-6">
        <ApiButton
          url="/api/topics"
          label={parents.length ? "Rebuild topic map" : "Build topic map from syllabus"}
          confirmText={parents.length ? "This replaces the current topic map and its quizzes and scores. Continue?" : undefined}
        />
      </Card>

      {parents.length === 0 ? (
        <p className="text-sm text-slate-500">No topics yet. Upload a syllabus, then build the map.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {parents.map((p: any) => (
            <Card key={p.id}>
              <h3 className="font-semibold">{p.name}</h3>
              <p className="text-xs text-slate-500">{chunkCount[p.id] ?? 0} linked sections of your material</p>
              <ul className="mt-2 list-disc pl-5 text-sm text-slate-700">
                {(topics ?? []).filter((t: any) => t.parent_id === p.id).map((c: any) => <li key={c.id}>{c.name}</li>)}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
