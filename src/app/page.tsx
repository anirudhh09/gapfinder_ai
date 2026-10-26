import Link from "next/link";
import {
  ArrowRight, BarChart3, CalendarCheck, ListChecks, MessageSquareText,
  Network, ShieldCheck, TrendingUp, UploadCloud,
} from "lucide-react";
import { createClient } from "@/lib/db/server";
import Logo from "@/components/Logo";

const FEATURES = [
  [UploadCloud, "Material upload", "Add your syllabus, notes and past papers as PDF or text."],
  [Network, "Topic map", "Your syllabus becomes a clear topic structure, linked to your notes."],
  [ListChecks, "Diagnostic quiz", "Questions come from your own material, each with a source citation."],
  [BarChart3, "Gap report", "Weak, medium and strong topics, with the reason for every rating."],
  [CalendarCheck, "Revision plan", "A prioritized plan built from your gaps and the time you have."],
  [MessageSquareText, "Explain assistant", "Ask anything. Answers use only your material, with citations."],
  [TrendingUp, "Progress dashboard", "See improvement across attempts. Your plan updates as you improve."],
  [ShieldCheck, "Private by design", "Secure login. Your documents are visible only to you."],
] as const;

const STEPS = [
  ["Upload", "Add your syllabus, notes and past papers."],
  ["Get tested", "Take a quiz written from your own material."],
  ["See your gaps", "Find out exactly which topics are weak, and why."],
  ["Revise smart", "Follow a plan that focuses on what you don’t know."],
];

const MOCK = [
  ["Normalization", 32, "weak"],
  ["SQL Queries", 58, "medium"],
  ["Transactions and ACID", 64, "medium"],
  ["ER Model", 86, "strong"],
] as const;
const COLOR = { weak: "bg-red-500", medium: "bg-amber-500", strong: "bg-green-500" };
const BADGE = { weak: "bg-red-100 text-red-700", medium: "bg-amber-100 text-amber-700", strong: "bg-green-100 text-green-700" };

export default async function Landing() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="bg-white">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Logo />
          <nav className="hidden gap-6 text-sm text-slate-600 sm:flex">
            <a href="#how" className="hover:text-slate-900">How it works</a>
            <a href="#features" className="hover:text-slate-900">Features</a>
          </nav>
          <div className="flex items-center gap-2">
            {user ? (
              <Link href="/dashboard" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">Open dashboard</Link>
            ) : (
              <>
                <Link href="/login" className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">Sign in</Link>
                <Link href="/login?mode=signup" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">Get started</Link>
              </>
            )}
          </div>
        </div>
      </header>

      <section className="bg-gradient-to-b from-indigo-50 to-white">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 lg:grid-cols-2 lg:py-24">
          <div>
            <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">AI-powered revision diagnosis</span>
            <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
              Find what you don’t know <span className="text-indigo-600">before the exam does.</span>
            </h1>
            <p className="mt-4 max-w-xl text-lg text-slate-600">
              Most study tools wait for your question. But you can’t ask about a gap you don’t know you have.
              GapFinder AI tests you on your own notes, shows your weak topics, and builds a plan around them.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={user ? "/dashboard" : "/login?mode=signup"} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white shadow-sm hover:bg-indigo-700">
                {user ? "Go to dashboard" : "Get started free"} <ArrowRight size={18} />
              </Link>
              {!user && (
                <Link href="/login?demo=1" className="rounded-lg border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50">Try the demo</Link>
              )}
            </div>
            <p className="mt-4 text-sm text-slate-500">Not another “chat with your PDF”. The diagnosis comes first.</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <p className="font-semibold">Gap report</p>
              <span className="text-xs text-slate-500">DBMS · Attempt 2</span>
            </div>
            <div className="space-y-4">
              {MOCK.map(([name, score, rating]) => (
                <div key={name}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{name}</span>
                    <span className="flex items-center gap-2">
                      <span className="font-bold">{score}%</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${BADGE[rating]}`}>{rating}</span>
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 rounded-full bg-slate-100"><div className={`h-2 rounded-full ${COLOR[rating]}`} style={{ width: `${score}%` }} /></div>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-lg bg-indigo-50 p-3 text-sm text-indigo-900">
              <strong>Focus next:</strong> Normalization. You confused 3NF with BCNF in 2 of 3 questions.
            </div>
          </div>
        </div>
      </section>

      <section id="how" className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-center text-3xl font-bold">How it works</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(([title, text], i) => (
            <div key={title} className="rounded-xl border border-slate-200 p-5">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-indigo-600 font-bold text-white">{i + 1}</span>
              <h3 className="mt-3 font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-slate-600">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-center text-3xl font-bold">Everything you need to revise smarter</h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(([Icon, title, text]) => (
              <div key={title} className="rounded-xl border border-slate-200 bg-white p-5">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-indigo-50 text-indigo-600"><Icon size={20} /></span>
                <h3 className="mt-3 font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-slate-600">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 p-10 text-center text-white">
          <h2 className="text-3xl font-bold">Stop revising what you already know.</h2>
          <p className="mx-auto mt-2 max-w-xl text-indigo-100">Upload your material and get your first gap report in minutes.</p>
          <Link href={user ? "/dashboard" : "/login?mode=signup"} className="mt-6 inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 font-semibold text-indigo-700 hover:bg-indigo-50">
            {user ? "Go to dashboard" : "Create your free account"} <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-200 py-8 text-center text-sm text-slate-500">
        <Logo className="!text-base" />
        <p className="mt-2">Built with Next.js, TypeScript, Tailwind, Supabase pgvector and Gemini.</p>
      </footer>
    </div>
  );
}
