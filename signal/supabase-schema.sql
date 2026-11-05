create table if not exists public.signal_removed_trends (
  term text primary key
    check (term = lower(term) and term = btrim(term) and char_length(term) between 1 and 120),
  created_at timestamptz not null default now()
);

alter table public.signal_removed_trends enable row level security;

drop policy if exists "Anyone can read Signal removed trends"
  on public.signal_removed_trends;
create policy "Anyone can read Signal removed trends"
  on public.signal_removed_trends for select
  to anon, authenticated
  using (true);

drop policy if exists "Anyone can add Signal removed trends"
  on public.signal_removed_trends;
create policy "Anyone can add Signal removed trends"
  on public.signal_removed_trends for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Anyone can restore Signal trends"
  on public.signal_removed_trends;
create policy "Anyone can restore Signal trends"
  on public.signal_removed_trends for delete
  to anon, authenticated
  using (true);

insert into public.signal_removed_trends (term) values
  ('amazon'), ('amazon prime'), ('back'), ('best'), ('big'), ('brain'),
  ('case'), ('day'), ('days'), ('deal'), ('deals'), ('down'), ('early'),
  ('finds'), ('first'), ('former'), ('found'), ('free'), ('here'), ('high'),
  ('hits'), ('know'), ('live'), ('major'), ('massive'), ('news'), ('no'),
  ('october'), ('people'), ('prime'), ('prime day'), ('return'), ('reveals'),
  ('review'), ('some'), ('star'), ('study'), ('study finds'), ('takes'),
  ('three'), ('time'), ('trump'), ('used'), ('way'), ('week'), ('years')
on conflict (term) do nothing;

grant select, insert, delete
  on public.signal_removed_trends
  to anon, authenticated;
grant usage on schema public to anon, authenticated;

notify pgrst, 'reload schema';
