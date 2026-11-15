-- Run once in a Supabase SQL editor. Tables are namespaced for this app.
create table if not exists public.kinship_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  headline text not null default '' check (char_length(headline) <= 180),
  location text not null default '' check (char_length(location) <= 120),
  about text not null default '' check (char_length(about) <= 3000),
  skills text not null default '' check (char_length(skills) <= 500),
  experience text not null default '' check (char_length(experience) <= 5000),
  education text not null default '' check (char_length(education) <= 3000),
  avatar_url text not null default '' check (char_length(avatar_url) <= 2000),
  cv_url text not null default '' check (char_length(cv_url) <= 2000),
  contact_email text not null default '' check (char_length(contact_email) <= 254),
  contact_phone text not null default '' check (char_length(contact_phone) <= 40),
  created_at timestamptz not null default now()
);

create table if not exists public.kinship_gallery (
  id bigint generated always as identity primary key,
  owner_id uuid not null references public.kinship_profiles(id) on delete cascade,
  image_url text not null check (char_length(image_url) between 1 and 2000),
  title text not null check (char_length(title) between 1 and 120),
  description text not null default '' check (char_length(description) <= 500),
  created_at timestamptz not null default now()
);

create table if not exists public.kinship_messages (
  id bigint generated always as identity primary key,
  sender_id uuid not null references public.kinship_profiles(id) on delete cascade,
  recipient_id uuid not null references public.kinship_profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 4000),
  created_at timestamptz not null default now(),
  check (sender_id <> recipient_id)
);
create index if not exists kinship_messages_sender_idx on public.kinship_messages(sender_id, created_at desc);
create index if not exists kinship_messages_recipient_idx on public.kinship_messages(recipient_id, created_at desc);
create index if not exists kinship_gallery_owner_idx on public.kinship_gallery(owner_id, created_at desc);

alter table public.kinship_profiles enable row level security;
alter table public.kinship_gallery enable row level security;
alter table public.kinship_messages enable row level security;

drop policy if exists "kinship profiles are public" on public.kinship_profiles;
create policy "kinship profiles are public" on public.kinship_profiles for select to anon, authenticated using (true);
drop policy if exists "kinship profile insert" on public.kinship_profiles;
create policy "kinship profile insert" on public.kinship_profiles for insert to authenticated with check (auth.uid() = id);
drop policy if exists "kinship profile update" on public.kinship_profiles;
create policy "kinship profile update" on public.kinship_profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "kinship gallery is public" on public.kinship_gallery;
create policy "kinship gallery is public" on public.kinship_gallery for select to anon, authenticated using (true);
drop policy if exists "kinship gallery insert" on public.kinship_gallery;
create policy "kinship gallery insert" on public.kinship_gallery for insert to authenticated with check (auth.uid() = owner_id);
drop policy if exists "kinship gallery delete" on public.kinship_gallery;
create policy "kinship gallery delete" on public.kinship_gallery for delete to authenticated using (auth.uid() = owner_id);

drop policy if exists "kinship messages participants" on public.kinship_messages;
create policy "kinship messages participants" on public.kinship_messages for select to authenticated using (auth.uid() = sender_id or auth.uid() = recipient_id);
drop policy if exists "kinship messages send" on public.kinship_messages;
create policy "kinship messages send" on public.kinship_messages for insert to authenticated with check (auth.uid() = sender_id);
