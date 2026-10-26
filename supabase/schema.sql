-- Run this in Supabase: SQL Editor -> New query -> Run
create extension if not exists vector;

create table documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  title text not null,
  type text not null check (type in ('syllabus','notes','past_paper')),
  created_at timestamptz default now()
);

create table chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  content text not null,
  page int,
  section_title text,
  chunk_index int,
  embedding vector(768),
  created_at timestamptz default now()
);
create index chunks_embedding_idx on chunks using hnsw (embedding vector_cosine_ops);

create table topics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null,
  parent_id uuid references topics(id) on delete cascade,
  syllabus_text text
);

-- Links each topic to its most relevant chunks (filled in Step B)
create table topic_chunks (
  topic_id uuid references topics(id) on delete cascade,
  chunk_id uuid references chunks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  primary key (topic_id, chunk_id)
);

create table quizzes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  created_at timestamptz default now()
);

create table questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  quiz_id uuid references quizzes(id) on delete cascade,
  topic_id uuid references topics(id) on delete cascade,
  question text not null,
  options jsonb not null,
  correct_answer text not null,
  difficulty text default 'medium',
  source_chunk_id uuid references chunks(id) on delete set null
);

create table attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  quiz_id uuid references quizzes(id) on delete cascade,
  created_at timestamptz default now()
);

create table responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  attempt_id uuid references attempts(id) on delete cascade,
  question_id uuid references questions(id) on delete cascade,
  user_answer text,
  is_correct boolean,
  explanation text
);

create table topic_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  topic_id uuid references topics(id) on delete cascade,
  attempt_id uuid references attempts(id) on delete cascade,
  score numeric not null,
  rating text not null check (rating in ('weak','medium','strong')),
  reason text
);

create table plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  hours_available numeric,
  exam_date date,
  plan_json jsonb,
  created_at timestamptz default now()
);

-- Row Level Security: users only see their own rows
do $$
declare t text;
begin
  foreach t in array array['documents','chunks','topics','topic_chunks','quizzes',
    'questions','attempts','responses','topic_scores','plans']
  loop
    execute format('alter table %I enable row level security', t);
    execute format(
      'create policy "own rows" on %I for all using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;

-- Similarity search. SECURITY INVOKER (default), so RLS still applies for logged-in users.
-- p_user_id lets the seed script (service role) search on behalf of a user.
create or replace function match_chunks(
  query_embedding vector(768),
  p_user_id uuid,
  match_count int default 5,
  p_topic_id uuid default null,
  p_exclude_syllabus boolean default false
)
returns table (
  id uuid, document_id uuid, content text, page int,
  section_title text, similarity float
)
language sql stable as $$
  select c.id, c.document_id, c.content, c.page, c.section_title,
         1 - (c.embedding <=> query_embedding) as similarity
  from chunks c
  join documents d on d.id = c.document_id
  where c.user_id = p_user_id
    and (p_topic_id is null or c.id in (
          select chunk_id from topic_chunks where topic_id = p_topic_id))
    and (not p_exclude_syllabus or d.type <> 'syllabus')
  order by c.embedding <=> query_embedding
  limit match_count;
$$;
