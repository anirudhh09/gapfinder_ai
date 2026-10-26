"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { btn } from "./ui";

export default function UploadForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/ingest", { method: "POST", body: new FormData(form) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload failed");
      setMsg({ ok: true, text: `Uploaded and indexed ${json.chunks} chunks.` });
      form.reset();
      router.refresh();
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Upload failed" });
    } finally {
      setBusy(false);
    }
  }

  const input = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm";
  return (
    <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
      <label className="text-sm">Type
        <select name="type" className={input} defaultValue="notes">
          <option value="syllabus">Syllabus</option>
          <option value="notes">Notes / textbook chapter</option>
          <option value="past_paper">Past paper</option>
        </select>
      </label>
      <label className="text-sm">Title (optional)
        <input name="title" className={input} placeholder="e.g. DBMS Unit 3 notes" />
      </label>
      <label className="text-sm sm:col-span-2">File (PDF or .txt)
        <input name="file" type="file" required accept=".pdf,.txt,.md" className={input} />
      </label>
      <div className="sm:col-span-2">
        <button disabled={busy} className={btn}>{busy ? "Indexing… (can take a minute)" : "Upload"}</button>
        {msg && <p className={`mt-2 text-sm ${msg.ok ? "text-green-700" : "text-red-600"}`}>{msg.text}</p>}
      </div>
    </form>
  );
}
