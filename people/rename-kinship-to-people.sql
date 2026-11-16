-- Run once on an existing People database before deploying the updated app.
-- Table renames preserve rows, foreign keys, privileges, and RLS policies.
begin;

do $$
declare
  item record;
  old_name text;
  new_name text;
begin
  foreach old_name in array array[
    'kinship_profiles', 'kinship_gallery', 'kinship_messages',
    'kinship_communities', 'kinship_community_members', 'kinship_community_posts'
  ] loop
    new_name := replace(old_name, 'kinship_', 'people_');
    if to_regclass('public.' || old_name) is not null then
      if to_regclass('public.' || new_name) is not null then
        raise exception 'Both public.% and public.% exist; resolve the conflict before migrating', old_name, new_name;
      end if;
      execute format('alter table public.%I rename to %I', old_name, new_name);
    end if;
  end loop;

  for item in
    select c.conname, t.relname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public' and t.relname like 'people\_%' escape '\'
      and c.conname like 'kinship\_%' escape '\'
  loop
    execute format('alter table public.%I rename constraint %I to %I',
      item.relname, item.conname, replace(item.conname, 'kinship_', 'people_'));
  end loop;

  for item in
    select i.relname
    from pg_index x
    join pg_class i on i.oid = x.indexrelid
    join pg_class t on t.oid = x.indrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public' and t.relname like 'people\_%' escape '\'
      and i.relname like 'kinship\_%' escape '\'
  loop
    execute format('alter index public.%I rename to %I',
      item.relname, replace(item.relname, 'kinship_', 'people_'));
  end loop;

  for item in
    select s.relname
    from pg_class s
    join pg_namespace n on n.oid = s.relnamespace
    join pg_depend d on d.objid = s.oid and d.classid = 'pg_class'::regclass
      and d.refclassid = 'pg_class'::regclass and d.deptype in ('a', 'i')
    join pg_class t on t.oid = d.refobjid
    where n.nspname = 'public' and s.relkind = 'S'
      and s.relname like 'kinship\_%' escape '\'
      and t.relname like 'people\_%' escape '\'
  loop
    execute format('alter sequence public.%I rename to %I',
      item.relname, replace(item.relname, 'kinship_', 'people_'));
  end loop;

  for item in
    select tablename, policyname from pg_policies
    where schemaname = 'public' and tablename like 'people\_%' escape '\'
      and policyname like 'kinship %'
  loop
    execute format('alter policy %I on public.%I rename to %I',
      item.policyname, item.tablename, replace(item.policyname, 'kinship ', 'people '));
  end loop;

  if to_regprocedure('public.kinship_join_created_community()') is not null then
    if to_regprocedure('public.people_join_created_community()') is not null then
      raise exception 'Both old and new community trigger functions exist; resolve the conflict before migrating';
    end if;
    alter function public.kinship_join_created_community() rename to people_join_created_community;
  end if;
  if exists (
    select 1 from pg_trigger where tgrelid = to_regclass('public.people_communities')
      and tgname = 'kinship_community_creator_join' and not tgisinternal
  ) then
    alter trigger kinship_community_creator_join on public.people_communities
      rename to people_community_creator_join;
  end if;
end;
$$;

create or replace function public.people_join_created_community()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.people_community_members (community_id, user_id)
  values (new.id, new.creator_id);
  return new;
end;
$$;
revoke all on function public.people_join_created_community() from public;

notify pgrst, 'reload schema';
commit;
