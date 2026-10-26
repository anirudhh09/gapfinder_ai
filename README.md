# GapFinder AI

Upload your syllabus, notes and past papers. GapFinder AI maps them into topics, tests you with cited questions from **your own material**, finds your weak topics, and builds a revision plan that updates as you improve.

> The main output is a **diagnosis**, not just answers.

**Stack:** Next.js (App Router) · TypeScript · Tailwind · Supabase (Postgres + pgvector + Auth) · Gemini via Vercel AI SDK · Recharts · Vercel

## Features
Material upload (PDF/text) · Topic map · Cited diagnostic quiz · Gap report (weak/medium/strong + reason) · Personalized revision plan · Explain-this-topic assistant (cited, refuses when not in your material) · Progress dashboard · Login with per-user data (Row Level Security)

## Setup

**Prerequisites:** Node.js 20+, a free [Supabase](https://supabase.com) project, a free [Gemini API key](https://aistudio.google.com/apikey).

```bash
npm install
cp .env.example .env.local      # then fill in the values
```

1. **Database:** Supabase → SQL Editor → paste `supabase/schema.sql` → Run.
2. **Keys:** put the Supabase URL, anon key, **service-role key** (Settings → API) and the Gemini key in `.env.local`.
3. **Demo data:** `npm run seed` creates the demo user, uploads the sample DBMS material, builds the topic map and a first quiz.
4. **Run:** `npm run dev` → http://localhost:3000

**Demo login:** `demo@gapfinder.app` / `Demo@1234`

Check retrieval quality any time: `npm run test:retrieval -- "What is BCNF?"`

## Pages
`/` landing page · `/login` sign in / sign up (with demo credentials) · `/dashboard` · `/upload` (materials) · `/topics` · `/quiz` · `/report` · `/plan` · `/assistant`

## Supabase auth setting (important for sign-up)
For a hackathon demo, turn off email confirmation so new users can sign up and sign in immediately:
Supabase → Authentication → Providers → Email → switch off **Confirm email**.
(The demo account is created by `npm run seed` and is already confirmed.)

## Deploy (Vercel)
1. Push to GitHub, import the repo in Vercel.
2. Add env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY` (optional: `GEMINI_MODEL`, `RAG_MIN_SIMILARITY`).
   Do **not** add the service-role key to Vercel; it is only for the local seed script.
3. Run `npm run seed` once locally against the same Supabase project.

## Project structure
```
supabase/schema.sql      tables, pgvector, RLS, match_chunks()
sample-data/             demo DBMS syllabus, notes, past paper
scripts/                 seed.ts, test-retrieval.ts
src/lib/rag/             chunk.ts, embed.ts, retrieve.ts, extract.ts
src/lib/ai/              llm.ts, prompts.ts, schemas.ts (Zod)
src/lib/analysis/        gap.ts (scoring), allocate.ts (time split)  <- pure code, no LLM
src/lib/                 ingest, topics, quiz, attempt, plan, scores
src/app/api/             ingest, topics, quiz/generate, quiz/submit, plan, chat
src/app/(app)/           dashboard, upload, topics, quiz, report, plan, assistant
docs/ARCHITECTURE.md     problem, diagram, RAG pipeline, AI workflow, limitations
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the architecture diagram, RAG pipeline, AI workflow and limitations.
