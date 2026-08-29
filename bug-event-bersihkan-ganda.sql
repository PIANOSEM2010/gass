-- ============================================================
-- BUG - membersihkan pengajuan event ganda
--
-- Jalankan berkas ini SEBELUM indeks unik events_unik_pengaju_nama dibuat.
-- Indeks itu gagal dipasang selama masih ada dua event dengan pengaju dan
-- nama yang sama, karena aturan uniknya dilanggar oleh data yang sudah ada.
--
-- Jalankan LANGKAH 1 dulu, lihat hasilnya, baru jalankan LANGKAH 2.
-- ============================================================


-- ------------------------------------------------------------
-- LANGKAH 1 - Lihat dulu mana yang ganda
--
-- Blok ini tidak mengubah apa pun. Kolom "tindakan" menunjukkan baris mana
-- yang akan dipertahankan dan mana yang akan dihapus pada LANGKAH 2.
-- Periksa dulu: kalau ada baris "akan dihapus" yang ternyata sudah punya
-- peserta, hentikan dan hapus manual yang benar saja.
-- ------------------------------------------------------------
with urut as (
  select
    e.id,
    e.name,
    e.status,
    e.created_at,
    (select count(*) from public.event_participants p where p.event_id = e.id) as jumlah_peserta,
    row_number() over (
      partition by e.creator_id, lower(e.name)
      order by
        case when e.status = 'disetujui' then 0 else 1 end,  -- yang sudah disetujui menang
        e.created_at asc                                      -- lalu yang paling awal diajukan
    ) as nomor
  from public.events e
  where e.status <> 'ditolak'
)
select
  id, name, status, created_at, jumlah_peserta,
  case when nomor = 1 then 'DIPERTAHANKAN' else 'akan dihapus' end as tindakan
from urut
order by lower(name), nomor;


-- ------------------------------------------------------------
-- LANGKAH 2 - Hapus yang ganda, lalu pasang indeks uniknya
--
-- Yang dipertahankan: event yang sudah disetujui; bila keduanya berstatus
-- sama, yang paling awal diajukan. Sisanya dihapus.
-- ------------------------------------------------------------
with urut as (
  select
    e.id,
    row_number() over (
      partition by e.creator_id, lower(e.name)
      order by
        case when e.status = 'disetujui' then 0 else 1 end,
        e.created_at asc
    ) as nomor
  from public.events e
  where e.status <> 'ditolak'
)
delete from public.events
where id in (select id from urut where nomor > 1);

-- Sekarang indeksnya bisa dipasang.
create unique index if not exists events_unik_pengaju_nama
  on public.events (creator_id, lower(name))
  where status <> 'ditolak';
