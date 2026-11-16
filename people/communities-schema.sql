-- Data-preserving community addition. Run after supabase-schema.sql.
create table if not exists public.people_communities (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.people_profiles(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 100),
  description text not null default '' check (char_length(description) <= 1000),
  image_url text not null default '' check (char_length(image_url) <= 2000),
  created_at timestamptz not null default now()
);

alter table public.people_communities
  add column if not exists image_url text not null default '' check (char_length(image_url) <= 2000);

create table if not exists public.people_community_members (
  community_id uuid not null references public.people_communities(id) on delete cascade,
  user_id uuid not null references public.people_profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (community_id, user_id)
);

create table if not exists public.people_community_posts (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.people_communities(id) on delete cascade,
  author_id uuid not null references public.people_profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index if not exists people_community_posts_feed_idx
  on public.people_community_posts (community_id, created_at desc, id);

alter table public.people_communities enable row level security;
alter table public.people_community_members enable row level security;
alter table public.people_community_posts enable row level security;
grant select on public.people_communities, public.people_community_members, public.people_community_posts to anon, authenticated;
grant insert on public.people_communities to authenticated;
grant insert, delete on public.people_community_members, public.people_community_posts to authenticated;

drop policy if exists "people communities public read" on public.people_communities;
create policy "people communities public read" on public.people_communities for select to anon, authenticated using (true);
drop policy if exists "people communities create" on public.people_communities;
create policy "people communities create" on public.people_communities for insert to authenticated with check (auth.uid() = creator_id);

drop policy if exists "people community members public read" on public.people_community_members;
create policy "people community members public read" on public.people_community_members for select to anon, authenticated using (true);
drop policy if exists "people community members join" on public.people_community_members;
create policy "people community members join" on public.people_community_members for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "people community members leave" on public.people_community_members;
create policy "people community members leave" on public.people_community_members for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "people community posts public read" on public.people_community_posts;
create policy "people community posts public read" on public.people_community_posts for select to anon, authenticated using (true);
drop policy if exists "people community posts create" on public.people_community_posts;
create policy "people community posts create" on public.people_community_posts for insert to authenticated
  with check (auth.uid() = author_id and exists (
    select 1 from public.people_community_members
    where community_id = people_community_posts.community_id and user_id = auth.uid()
  ));
drop policy if exists "people community posts delete" on public.people_community_posts;
create policy "people community posts delete" on public.people_community_posts for delete to authenticated using (auth.uid() = author_id);

create or replace function public.people_join_created_community()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.people_community_members (community_id, user_id)
  values (new.id, new.creator_id);
  return new;
end;
$$;
revoke all on function public.people_join_created_community() from public;
drop trigger if exists people_community_creator_join on public.people_communities;
create trigger people_community_creator_join after insert on public.people_communities
  for each row execute function public.people_join_created_community();
