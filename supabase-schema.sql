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
-- Access model: read is open; mutations require the caller to prove they know
-- the list's share_id by including it in the HTTP header `x-share-id`.
-- PostgREST exposes request headers via current_setting('request.headers')
-- which is set with SET LOCAL per transaction, so it works with PgBouncer
-- in transaction-pooling mode.
alter table lists      enable row level security;
alter table categories enable row level security;
alter table items      enable row level security;

-- Helper: safely parse x-share-id from PostgREST request headers.
-- Returns NULL (no match) on any error or missing header.
create or replace function get_share_id_header()
returns uuid
language plpgsql stable security definer
as $$
declare
  v_headers text;
  v_value   text;
begin
  v_headers := current_setting('request.headers', true);
  if v_headers is null or v_headers = '' then return null; end if;
  v_value := v_headers::json->>'x-share-id';
  if v_value is null or v_value = '' then return null; end if;
  return v_value::uuid;
exception when others then
  return null;
end;
$$;

grant execute on function get_share_id_header() to anon;

-- LISTS
-- SELECT: open — home page needs all lists without a share_id
-- INSERT: open — anyone can create a list (receives a random share_id)
-- UPDATE/DELETE: caller must prove knowledge of share_id via header
drop policy if exists "Public lists" on lists;
create policy "lists_select" on lists for select using (true);
create policy "lists_insert" on lists for insert with check (true);
create policy "lists_update" on lists for update
  using  (share_id = get_share_id_header())
  with check (share_id = get_share_id_header());
create policy "lists_delete" on lists for delete
  using (share_id = get_share_id_header());

-- CATEGORIES
-- SELECT: open — required for Realtime subscriptions (internal list_id is not
--   publicly guessable; real access control is on writes)
-- INSERT/DELETE: require matching share_id for the parent list
drop policy if exists "Public categories" on categories;
create policy "categories_select" on categories for select using (true);
create policy "categories_insert" on categories for insert
  with check (
    exists (select 1 from lists where id = list_id and share_id = get_share_id_header())
  );
create policy "categories_delete" on categories for delete
  using (
    exists (select 1 from lists where id = list_id and share_id = get_share_id_header())
  );

-- ITEMS
-- SELECT: open — same rationale as categories (Realtime + internal UUID)
-- INSERT/UPDATE/DELETE: require matching share_id for the parent list
drop policy if exists "Public items" on items;
create policy "items_select" on items for select using (true);
create policy "items_insert" on items for insert
  with check (
    exists (select 1 from lists where id = list_id and share_id = get_share_id_header())
  );
create policy "items_update" on items for update
  using (
    exists (select 1 from lists where id = list_id and share_id = get_share_id_header())
  );
create policy "items_delete" on items for delete
  using (
    exists (select 1 from lists where id = list_id and share_id = get_share_id_header())
  );

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

-- Storage policies — split SELECT/INSERT from DELETE.
-- Anon users can read (public bucket) and upload, but cannot delete images.
-- This prevents mass image deletion by anonymous clients.
drop policy if exists "Public item images" on storage.objects;
create policy "images_select" on storage.objects
  for select using (bucket_id = 'item-images');
create policy "images_insert" on storage.objects
  for insert with check (bucket_id = 'item-images');
