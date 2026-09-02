create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

create table public.sermon_notes (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  sermon_date date not null,
  title text,
  pastor text,
  church text,
  service text,
  content text not null default '',
  personal_reflection text,
  key_takeaways text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.scripture_references (
  id uuid primary key,
  sermon_note_id uuid not null references public.sermon_notes(id) on delete cascade,
  book text not null,
  chapter integer not null check (chapter > 0),
  verse_start integer,
  verse_end integer,
  display_reference text not null
);
create table public.topics (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, name text not null, unique(user_id, name));
create table public.sermon_note_topics (sermon_note_id uuid not null references public.sermon_notes(id) on delete cascade, topic_id uuid not null references public.topics(id) on delete cascade, primary key (sermon_note_id, topic_id));
create table public.sermon_hymns (sermon_note_id uuid not null references public.sermon_notes(id) on delete cascade, hymn_number integer not null, primary key (sermon_note_id, hymn_number));

create index sermon_notes_user_date_idx on public.sermon_notes(user_id, sermon_date desc);
create index sermon_notes_user_pastor_idx on public.sermon_notes(user_id, pastor);
create index sermon_notes_user_church_idx on public.sermon_notes(user_id, church);
create index sermon_notes_updated_idx on public.sermon_notes(updated_at desc);
create index scripture_references_chapter_idx on public.scripture_references(book, chapter);
create index scripture_references_note_idx on public.scripture_references(sermon_note_id);
create index sermon_hymns_hymn_idx on public.sermon_hymns(hymn_number);
create index topics_user_name_idx on public.topics(user_id, name);

alter table public.profiles enable row level security;
alter table public.sermon_notes enable row level security;
alter table public.scripture_references enable row level security;
alter table public.topics enable row level security;
alter table public.sermon_note_topics enable row level security;
alter table public.sermon_hymns enable row level security;

create policy "own profile" on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());
create policy "own notes" on public.sermon_notes for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own scripture" on public.scripture_references for all using (exists (select 1 from public.sermon_notes n where n.id = sermon_note_id and n.user_id = auth.uid())) with check (exists (select 1 from public.sermon_notes n where n.id = sermon_note_id and n.user_id = auth.uid()));
create policy "own topics" on public.topics for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own note topics" on public.sermon_note_topics for all using (exists (select 1 from public.sermon_notes n where n.id = sermon_note_id and n.user_id = auth.uid())) with check (exists (select 1 from public.sermon_notes n where n.id = sermon_note_id and n.user_id = auth.uid()));
create policy "own sermon hymns" on public.sermon_hymns for all using (exists (select 1 from public.sermon_notes n where n.id = sermon_note_id and n.user_id = auth.uid())) with check (exists (select 1 from public.sermon_notes n where n.id = sermon_note_id and n.user_id = auth.uid()));
