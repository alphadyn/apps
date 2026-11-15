-- Data-preserving community addition. Run after supabase-schema.sql.
create table if not exists public.kinship_communities (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.kinship_profiles(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 100),
  description text not null default '' check (char_length(description) <= 1000),
  created_at timestamptz not null default now()
);

create table if not exists public.kinship_community_members (
  community_id uuid not null references public.kinship_communities(id) on delete cascade,
  user_id uuid not null references public.kinship_profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (community_id, user_id)
);

create table if not exists public.kinship_community_posts (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.kinship_communities(id) on delete cascade,
  author_id uuid not null references public.kinship_profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index if not exists kinship_community_posts_feed_idx
  on public.kinship_community_posts (community_id, created_at desc, id);

alter table public.kinship_communities enable row level security;
alter table public.kinship_community_members enable row level security;
alter table public.kinship_community_posts enable row level security;
grant select on public.kinship_communities, public.kinship_community_members, public.kinship_community_posts to anon, authenticated;
grant insert on public.kinship_communities to authenticated;
grant insert, delete on public.kinship_community_members, public.kinship_community_posts to authenticated;

drop policy if exists "kinship communities public read" on public.kinship_communities;
create policy "kinship communities public read" on public.kinship_communities for select to anon, authenticated using (true);
drop policy if exists "kinship communities create" on public.kinship_communities;
create policy "kinship communities create" on public.kinship_communities for insert to authenticated with check (auth.uid() = creator_id);

drop policy if exists "kinship community members public read" on public.kinship_community_members;
create policy "kinship community members public read" on public.kinship_community_members for select to anon, authenticated using (true);
drop policy if exists "kinship community members join" on public.kinship_community_members;
create policy "kinship community members join" on public.kinship_community_members for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "kinship community members leave" on public.kinship_community_members;
create policy "kinship community members leave" on public.kinship_community_members for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "kinship community posts public read" on public.kinship_community_posts;
create policy "kinship community posts public read" on public.kinship_community_posts for select to anon, authenticated using (true);
drop policy if exists "kinship community posts create" on public.kinship_community_posts;
create policy "kinship community posts create" on public.kinship_community_posts for insert to authenticated
  with check (auth.uid() = author_id and exists (
    select 1 from public.kinship_community_members
    where community_id = kinship_community_posts.community_id and user_id = auth.uid()
  ));
drop policy if exists "kinship community posts delete" on public.kinship_community_posts;
create policy "kinship community posts delete" on public.kinship_community_posts for delete to authenticated using (auth.uid() = author_id);

create or replace function public.kinship_join_created_community()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.kinship_community_members (community_id, user_id)
  values (new.id, new.creator_id);
  return new;
end;
$$;
revoke all on function public.kinship_join_created_community() from public;
drop trigger if exists kinship_community_creator_join on public.kinship_communities;
create trigger kinship_community_creator_join after insert on public.kinship_communities
  for each row execute function public.kinship_join_created_community();
