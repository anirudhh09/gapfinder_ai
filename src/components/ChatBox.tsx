"use client";
import { useState } from "react";
import { btn, Card } from "./ui";

type Source = { n: number; document: string; section: string | null; page: number | null; similarity: number };
type Msg = { role: "user" | "assistant"; text: string; sources?: Source[] };

export default function ChatBox() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    const question = q.trim();
    if (!question) return;
    setMsgs((m) => [...m, { role: "user", text: question }]);
    setQ("");
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Request failed");
      setMsgs((m) => [...m, { role: "assistant", text: json.answer, sources: json.sources }]);
    } catch (err) {
      setMsgs((m) => [...m, { role: "assistant", text: err instanceof Error ? err.message : "Request failed" }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {msgs.length === 0 && (
        <p className="text-sm text-slate-500">Ask about anything in your uploaded material, e.g. “What is the difference between 3NF and BCNF?”</p>
      )}
      {msgs.map((m, i) => (
        <Card key={i} className={m.role === "user" ? "bg-indigo-50" : ""}>
          <p className="whitespace-pre-wrap text-sm">{m.text}</p>
          {m.sources && m.sources.length > 0 && (
            <ul className="mt-3 space-y-1 border-t border-slate-100 pt-2 text-xs text-slate-500">
              {m.sources.map((s) => (
                <li key={s.n}>[{s.n}] {s.document}{s.section ? ` › ${s.section}` : ""}{s.page ? ` (p.${s.page})` : ""} · match {s.similarity}</li>
              ))}
            </ul>
          )}
        </Card>
      ))}
      <form onSubmit={ask} className="flex gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask about your material…" className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <button disabled={busy} className={btn}>{busy ? "Thinking…" : "Ask"}</button>
      </form>
    </div>
  );
}
