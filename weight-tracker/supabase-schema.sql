-- Run in the Supabase SQL editor. This does not replace existing journals.
create table if not exists public.weight_tracker_journals (
  user_id uuid primary key references auth.users(id) on delete cascade,
  envelope jsonb not null,
  revision bigint not null default 1 check (revision > 0),
  updated_at timestamptz not null default now()
);

alter table public.weight_tracker_journals enable row level security;
revoke all on public.weight_tracker_journals from public, anon, authenticated;
grant select on public.weight_tracker_journals to authenticated;

drop policy if exists "Users read their own weight journal" on public.weight_tracker_journals;
create policy "Users read their own weight journal"
  on public.weight_tracker_journals for select to authenticated
  using (auth.uid() = user_id);

-- A single conditional write prevents stale tabs from overwriting newer data.
create or replace function public.save_weight_tracker_journal(journal jsonb, expected_revision bigint)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_revision bigint;
begin
  if auth.uid() is null then
    raise exception 'Sign in to save your journal.';
  end if;
  if journal is null or jsonb_typeof(journal) <> 'object'
     or journal->>'format' is distinct from 'weight-tracker-encrypted'
     or octet_length(journal::text) > 20000000 then
    raise exception 'Invalid encrypted journal.';
  end if;
  if expected_revision is null then
    insert into public.weight_tracker_journals (user_id, envelope)
    values (auth.uid(), journal)
    on conflict (user_id) do nothing
    returning revision into next_revision;
  else
    update public.weight_tracker_journals
    set envelope = journal, revision = revision + 1, updated_at = now()
    where user_id = auth.uid() and revision = expected_revision
    returning revision into next_revision;
  end if;
  if next_revision is null then
    raise exception 'The journal changed elsewhere. Sign out and sign in to load the latest version.';
  end if;
  return next_revision;
end;
$$;
revoke all on function public.save_weight_tracker_journal(jsonb, bigint) from public, anon;
grant execute on function public.save_weight_tracker_journal(jsonb, bigint) to authenticated;
notify pgrst, 'reload schema';
