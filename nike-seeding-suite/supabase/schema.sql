-- Nike Seeding Suite — run once in Supabase: SQL Editor → New query → paste → Run.
-- Each table stores one JSON document per row (id + data), which the app reads and writes.

create table if not exists public.products (id text primary key, data jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now());
create table if not exists public.guests   (id text primary key, data jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now());
create table if not exists public.picks    (id text primary key, data jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now());
create table if not exists public.config   (id text primary key, data jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now());

-- Only signed-in staff accounts can read or write. Guests never log in; they use an iPad that staff signed in.
do $$
declare t text;
begin
  foreach t in array array['products','guests','picks','config'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "staff full access" on public.%I', t);
    execute format('create policy "staff full access" on public.%I for all to authenticated using (true) with check (true)', t);
    execute format('alter table public.%I replica identity full', t);
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- Product image storage (public read so images load fast on the iPads).
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

drop policy if exists "product images public read" on storage.objects;
drop policy if exists "product images staff insert" on storage.objects;
drop policy if exists "product images staff update" on storage.objects;
drop policy if exists "product images staff delete" on storage.objects;
create policy "product images public read"  on storage.objects for select using (bucket_id = 'product-images');
create policy "product images staff insert" on storage.objects for insert to authenticated with check (bucket_id = 'product-images');
create policy "product images staff update" on storage.objects for update to authenticated using (bucket_id = 'product-images');
create policy "product images staff delete" on storage.objects for delete to authenticated using (bucket_id = 'product-images');
