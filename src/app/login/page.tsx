"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/db/client";
import Logo from "@/components/Logo";

const DEMO = { email: "demo@gapfinder.app", password: "Demo@1234" };

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("mode") === "signup") setMode("signup");
    if (p.get("demo")) { setEmail(DEMO.email); setPassword(DEMO.password); }
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null); setInfo(null);
    const supabase = createClient();
    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) return setError(error.message);
    } else {
      if (password.length < 6) { setBusy(false); return setError("Password must be at least 6 characters."); }
      const { data, error } = await supabase.auth.signUp({ email, password });
      setBusy(false);
      if (error) return setError(error.message);
      if (!data.session) return setInfo("Account created. Check your email to confirm it, then sign in.");
    }
    router.push("/dashboard");
    router.refresh();
  }

  const input = "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200";
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-gradient-to-br from-indigo-600 to-violet-800 p-12 text-white lg:flex">
        <Link href="/"><Logo onDark /></Link>
        <div>
          <h2 className="text-3xl font-bold leading-tight">Find what you don’t know before the exam does.</h2>
          <ul className="mt-6 space-y-3 text-indigo-100">
            {["Quizzes written from your own notes", "Weak topics found, with reasons", "A revision plan that updates as you improve"].map((t) => (
              <li key={t} className="flex items-center gap-2"><CheckCircle2 size={18} /> {t}</li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-indigo-200">Your documents are private to your account.</p>
      </div>

      <div className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <Link href="/" className="mb-8 block lg:hidden"><Logo /></Link>
          <h1 className="text-2xl font-bold">{mode === "signin" ? "Welcome back" : "Create your account"}</h1>
          <p className="mt-1 text-sm text-slate-600">{mode === "signin" ? "Sign in to see your gap report." : "Start finding your gaps in minutes."}</p>

          <div className="mt-6 grid grid-cols-2 rounded-lg bg-slate-100 p-1 text-sm font-semibold">
            {(["signin", "signup"] as const).map((m) => (
              <button key={m} type="button" onClick={() => { setMode(m); setError(null); setInfo(null); }}
                className={`rounded-md py-1.5 ${mode === m ? "bg-white shadow-sm" : "text-slate-500"}`}>
                {m === "signin" ? "Sign in" : "Sign up"}
              </button>
            ))}
          </div>

          <form onSubmit={onSubmit} className="mt-5 space-y-4">
            <label className="block text-sm font-medium">Email
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={input} autoComplete="email" />
            </label>
            <label className="block text-sm font-medium">Password
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className={input} autoComplete={mode === "signin" ? "current-password" : "new-password"} />
            </label>
            {error && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}
            {info && <p className="rounded-lg bg-green-50 p-2 text-sm text-green-700">{info}</p>}
            <button disabled={busy} className="w-full rounded-lg bg-indigo-600 py-2.5 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
              {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          <div className="mt-6 rounded-lg border border-dashed border-indigo-300 bg-indigo-50 p-3 text-sm">
            <p className="font-semibold text-indigo-900">Demo account (for judges)</p>
            <p className="mt-1 text-indigo-800">{DEMO.email} / {DEMO.password}</p>
            <button type="button" onClick={() => { setMode("signin"); setEmail(DEMO.email); setPassword(DEMO.password); }}
              className="mt-2 text-indigo-700 underline">Fill demo credentials</button>
          </div>
        </div>
      </div>
    </div>
  );
}
