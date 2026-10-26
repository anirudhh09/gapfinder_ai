"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { btn } from "./ui";

export default function PlanForm({ defaultHours, defaultDate }: { defaultHours?: number; defaultDate?: string }) {
  const router = useRouter();
  const [hours, setHours] = useState(String(defaultHours ?? 2));
  const [date, setDate] = useState(defaultDate ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hoursPerDay: Number(hours), examDate: date || null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not build plan");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not build plan");
    } finally {
      setBusy(false);
    }
  }

  const input = "rounded-lg border border-slate-300 px-3 py-2 text-sm";
  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
      <label className="text-sm">Hours per day
        <input type="number" step="0.5" min="0.5" max="16" value={hours} onChange={(e) => setHours(e.target.value)} className={`${input} mt-1 block w-28`} />
      </label>
      <label className="text-sm">Exam date (optional)
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`${input} mt-1 block`} />
      </label>
      <button disabled={busy} className={btn}>{busy ? "Building…" : "Build / rebuild plan"}</button>
      {error && <p className="w-full text-sm text-red-600">{error}</p>}
    </form>
  );
}
