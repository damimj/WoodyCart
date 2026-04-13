-- ============================================================
-- LISTADO APP — Supabase Schema
-- Ejecuta esto en: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. LISTS
create table if not exists lists (
  id          uuid primary key default gen_random_uuid(),
  share_id    uuid unique not null default gen_random_uuid(),
  name        text not null,
  archived    boolean not null default false,
  created_at  timestamptz not null default now()
);

-- 2. CATEGORIES
create table if not exists categories (
  id       uuid primary key default gen_random_uuid(),
  list_id  uuid not null references lists(id) on delete cascade,
  name     text not null,
  color    text not null default '#3a7d5a',
  created_at timestamptz not null default now()
);

-- 3. ITEMS
create table if not exists items (
  id           uuid primary key default gen_random_uuid(),
  list_id      uuid not null references lists(id) on delete cascade,
  category_id  uuid references categories(id) on delete set null,
  name         text not null,
  quantity     text,
  note         text,
  image_url    text,
  checked      boolean not null default false,
  position     int not null default 0,
  created_at   timestamptz not null default now()
);

-- ── Indexes ──────────────────────────────────────────────────
create index if not exists idx_items_list_id     on items(list_id);
create index if not exists idx_categories_list_id on categories(list_id);
create index if not exists idx_lists_share_id     on lists(share_id);

-- ── Row Level Security ────────────────────────────────────────
-- App is public (no auth), so allow all operations via anon key.
alter table lists      enable row level security;
alter table categories enable row level security;
alter table items      enable row level security;

create policy "Public lists"      on lists      for all using (true) with check (true);
create policy "Public categories" on categories for all using (true) with check (true);
create policy "Public items"      on items      for all using (true) with check (true);

-- ── Realtime ─────────────────────────────────────────────────
-- Enable realtime for items and categories (in Supabase Dashboard:
-- Database → Replication → Supabase Realtime → add items & categories tables)
-- Or run:
alter publication supabase_realtime add table items;
alter publication supabase_realtime add table categories;

-- ── Storage bucket ────────────────────────────────────────────
-- Run in Dashboard → Storage → New bucket → name: "item-images", Public: ON
-- Then add this policy:
insert into storage.buckets (id, name, public) values ('item-images', 'item-images', true)
  on conflict do nothing;

create policy "Public item images" on storage.objects
  for all using (bucket_id = 'item-images') with check (bucket_id = 'item-images');
