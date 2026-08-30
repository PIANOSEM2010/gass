-- ============================================================
-- BUG - penanda data contoh
--
-- Kolom ini membuat perjalanan contoh bisa dibedakan dari perjalanan sungguhan
-- SELAMANYA, bukan hanya saat ditampilkan. Dengan begitu:
--   - angka statistik pribadi dan papan peringkat tetap memakai data asli;
--   - seluruh data contoh bisa dihapus sekaligus kapan pun;
--   - kalau ada yang bertanya mana yang contoh, jawabannya ada di basis data,
--     bukan pada ingatan.
--
-- Jalankan di Supabase: SQL Editor -> New query -> Run. Aman diulang.
-- ============================================================

alter table public.activities add column if not exists is_demo boolean not null default false;
alter table public.activities add column if not exists demo_name text;

create index if not exists activities_demo_idx on public.activities (is_demo, event_id);

comment on column public.activities.is_demo is
  'true untuk perjalanan contoh yang dibuat untuk peragaan, bukan hasil gowes sungguhan.';
comment on column public.activities.demo_name is
  'Nama peserta yang diwakili perjalanan contoh ini. Hanya untuk peragaan.';

-- Menghitung berapa data contoh yang ada sekarang:
-- select count(*) from public.activities where is_demo;

-- Menghapus SELURUH data contoh:
-- delete from public.activities where is_demo;
