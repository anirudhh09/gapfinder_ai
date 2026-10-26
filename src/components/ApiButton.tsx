"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { btn, btnGhost } from "./ui";

/** POSTs to an API route, then refreshes the page or redirects. redirectTo can use {key} from the JSON reply. */
export default function ApiButton({
  url, label, body, redirectTo, ghost = false, confirmText,
}: {
  url: string; label: string; body?: unknown; redirectTo?: string; ghost?: boolean; confirmText?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body ?? {}),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Something went wrong");
      if (redirectTo) router.push(redirectTo.replace(/\{(\w+)\}/g, (_, k) => String(json[k])));
      else router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button onClick={run} disabled={busy} className={ghost ? btnGhost : btn}>
        {busy ? "Working… this can take up to a minute" : label}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
