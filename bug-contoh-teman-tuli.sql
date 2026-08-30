-- ============================================================================
-- BUG - perjalanan CONTOH untuk event "Teman Tuli Gowes"
--
-- Seluruhnya dikerjakan di basis data. Tidak ada berkas project yang perlu
-- diubah, dan tidak perlu deploy ulang.
--
-- Label "contoh" ditaruh pada kolom `note`, yang MEMANG SUDAH DITAMPILKAN
-- aplikasi di kartu Beranda. Jadi setiap perjalanan ini akan terbaca sebagai
-- [CONTOH] oleh siapa pun yang melihatnya, termasuk juri, tanpa perlu
-- mengandalkan ingatan siapa pun.
--
-- Cara pakai: Supabase -> SQL Editor -> tempel -> Run.
-- Jalankan LANGKAH 1 dulu untuk memastikan eventnya ketemu.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- LANGKAH 0 - Kolom penanda (dijalankan sekali, aman diulang)
--
-- Kolom ini membuat data contoh bisa dihitung dan dihapus sekaligus kapan pun,
-- tanpa harus menebak dari isi catatannya.
-- ----------------------------------------------------------------------------
alter table public.activities add column if not exists is_demo boolean not null default false;
alter table public.activities add column if not exists demo_name text;


-- ----------------------------------------------------------------------------
-- LANGKAH 1 - Pastikan eventnya ketemu dan punya jalur
--
-- Jalankan blok ini sendiri dulu. Kalau hasilnya kosong, ganti kata kunci di
-- baris `name ilike` dengan potongan nama event yang benar.
-- ----------------------------------------------------------------------------
select
  id,
  name,
  status,
  start_at,
  jsonb_array_length(waypoints) as jumlah_titik,
  creator_id
from public.events
where name ilike '%teman tuli%'
order by created_at desc;


-- ----------------------------------------------------------------------------
-- LANGKAH 2 - Membuat perjalanan contoh
--
-- Menghasilkan 10 perjalanan yang mengikuti jalur event, masing-masing dengan:
--   - simpangan acak sekitar 13 meter, supaya jejaknya tidak identik
--     (jejak yang persis sama justru menandakan data buatan mesin);
--   - kecepatan rata-rata berbeda antara 13 dan 21 km/jam;
--   - waktu berangkat tersebar dalam 20 menit pertama, seperti rombongan
--     sungguhan yang tidak berangkat serentak.
--
-- Semua perjalanan dimiliki akun pengaju event, karena baris aktivitas wajib
-- menunjuk pengguna yang benar-benar ada. Nama peserta yang diwakili ditulis
-- pada catatan dan kolom demo_name.
-- ----------------------------------------------------------------------------
with ev as (
  select id, name, creator_id,
         coalesce(start_at, now()) as mulai,
         waypoints
  from public.events
  where name ilike '%teman tuli%'
  order by created_at desc
  limit 1
),

-- Titik-titik jalur event, berurutan
wp as (
  select ev.id as event_id, ev.name, ev.creator_id, ev.mulai,
         (t.idx - 1)::int             as i,
         (t.elem->>'lat')::float8     as lat,
         (t.elem->>'lng')::float8     as lng
  from ev, jsonb_array_elements(ev.waypoints) with ordinality as t(elem, idx)
),

-- Pasangan titik berurutan, untuk dipecah jadi jejak yang rapat
ruas as (
  select a.event_id, a.name, a.creator_id, a.mulai, a.i,
         a.lat as lat1, a.lng as lng1,
         b.lat as lat2, b.lng as lng2
  from wp a
  join wp b on b.event_id = a.event_id and b.i = a.i + 1
),

-- Daftar peserta yang diwakili. Ubah sesuai kebutuhan.
peserta(no, nama) as (
  values
    (1,  'Peserta Contoh 1'),
    (2,  'Peserta Contoh 2'),
    (3,  'Peserta Contoh 3'),
    (4,  'Peserta Contoh 4'),
    (5,  'Peserta Contoh 5'),
    (6,  'Peserta Contoh 6'),
    (7,  'Peserta Contoh 7'),
    (8,  'Peserta Contoh 8'),
    (9,  'Peserta Contoh 9'),
    (10, 'Peserta Contoh 10')
),

-- Jejak per peserta: tiap ruas dipecah enam bagian, diberi simpangan kecil
titik as (
  select
    p.no, p.nama, r.event_id, r.name, r.creator_id, r.mulai,
    r.i, k.k,
    r.lat1 + (r.lat2 - r.lat1) * (k.k / 6.0) + (random() - 0.5) * 0.00012 as lat,
    r.lng1 + (r.lng2 - r.lng1) * (k.k / 6.0) + (random() - 0.5) * 0.00012 as lng
  from peserta p
  cross join ruas r
  cross join generate_series(0, 5) as k(k)
),

-- Jarak antar titik berurutan
langkah as (
  select
    no, nama, event_id, name, creator_id, mulai, i, k, lat, lng,
    lag(lat) over w as lat_sebelum,
    lag(lng) over w as lng_sebelum
  from titik
  window w as (partition by no order by i, k)
),

hitung as (
  select
    no, nama, event_id, name, creator_id, mulai,
    -- Rumus jarak datar; cukup tepat untuk jarak sependek ini
    sum(
      case when lat_sebelum is null then 0
      else 111320 * sqrt(
        power(lat - lat_sebelum, 2) +
        power((lng - lng_sebelum) * cos(radians(lat)), 2)
      ) end
    ) as meter,
    jsonb_agg(jsonb_build_object('lat', lat, 'lng', lng) order by i, k) as jalur
  from langkah
  group by no, nama, event_id, name, creator_id, mulai
),

siap as (
  select
    h.*,
    -- Kecepatan berbeda tiap peserta: 13,0 sampai 20,2 km/jam
    (13 + ((h.no - 1) % 9) * 0.9)::float8 as kmj,
    -- Berangkat tidak serentak: bertahap tiap 2 menit
    (h.mulai + make_interval(mins => ((h.no - 1) * 2))) as waktu_mulai
  from hitung h
)

insert into public.activities (
  user_id, event_id, is_demo, demo_name,
  distance_m, duration_s, elevation_gain_m,
  path, started_at, activity_date, note
)
select
  creator_id,
  event_id,
  true,
  nama,
  round(meter)::int,
  round((meter / 1000.0) / kmj * 3600)::int,
  round((meter / 1000.0) * 3.5)::int,        -- elevasi wajar untuk Bulungan
  jalur,
  waktu_mulai,
  (waktu_mulai + interval '8 hours')::date,  -- tanggal menurut waktu WITA
  '[CONTOH] ' || nama || ' - ' || name
from siap;


-- ----------------------------------------------------------------------------
-- LANGKAH 3 - Periksa hasilnya
-- ----------------------------------------------------------------------------
select
  demo_name,
  round((distance_m / 1000.0)::numeric, 2) as km,
  round((duration_s / 60.0)::numeric, 0)   as menit,
  round(((distance_m / 1000.0) / (duration_s / 3600.0))::numeric, 1) as kmj,
  jsonb_array_length(path) as jumlah_titik,
  started_at,
  note
from public.activities
where is_demo
order by started_at;


-- ----------------------------------------------------------------------------
-- MENGHAPUS SELURUH DATA CONTOH
--
-- Jalankan ini setelah presentasi selesai, atau kapan pun ingin dibersihkan.
-- ----------------------------------------------------------------------------
-- delete from public.activities where is_demo;


-- ============================================================================
-- CATATAN PENTING
--
-- 1. Perjalanan ini muncul di Beranda dengan catatan diawali "[CONTOH]".
--    Namun tanpa perubahan pada kode aplikasi, NAMA yang tampil di kartu
--    adalah nama akun pengaju event, bukan nama peserta contoh. Nama peserta
--    hanya terbaca pada catatannya. Kalau kamu ingin namanya ikut tampil,
--    itu memerlukan perubahan di sisi aplikasi.
--
-- 2. Perjalanan ini IKUT terhitung pada statistik akun pengaju event: km total,
--    jumlah perjalanan, dan riwayatnya. Kalau akun itu milikmu dan angkanya
--    akan kamu tunjukkan ke juri, ini perlu kamu sadari. Pilihan yang lebih
--    bersih adalah membuat satu akun khusus bernama "Demo BUG", lalu ganti
--    `creator_id` pada LANGKAH 2 dengan id akun itu.
--
-- 3. Data contoh tidak menambah daftar peserta event. Menandai orang sebagai
--    peserta memerlukan akun pengguna sungguhan, dan itu tidak bisa - juga
--    tidak pantas - dibuat lewat SQL atas nama orang lain.
-- ============================================================================
