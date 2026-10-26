"use client";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/db/client";

type Doc = { id: string; title: string; type: string; created_at: string };

export default function DocList({ docs }: { docs: Doc[] }) {
  const router = useRouter();

  async function remove(id: string) {
    if (!window.confirm("Delete this document and its chunks?")) return;
    await createClient().from("documents").delete().eq("id", id);
    router.refresh();
  }

  if (!docs.length) return <p className="text-sm text-slate-500">No documents yet.</p>;
  return (
    <ul className="divide-y divide-slate-100">
      {docs.map((d) => (
        <li key={d.id} className="flex items-center justify-between py-2 text-sm">
          <span>
            <span className="font-medium">{d.title}</span>
            <span className="ml-2 rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{d.type.replace("_", " ")}</span>
          </span>
          <button onClick={() => remove(d.id)} className="text-red-600 hover:underline">Delete</button>
        </li>
      ))}
    </ul>
  );
}
