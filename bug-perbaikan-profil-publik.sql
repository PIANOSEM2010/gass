-- ============================================================
-- BUG - perbaikan: nama & foto profil terlihat oleh pengguna lain
--
-- Penyebab bug "nama saya hanya Goweser di akun lain": kebijakan RLS pada
-- tabel profiles hanya mengizinkan pemilik membaca barisnya sendiri. Jadi
-- ketika akun lain membuka umpan atau story, kueri profil mengembalikan
-- kosong dan aplikasi memakai nama cadangan "Goweser".
--
-- Jalankan di Supabase: SQL Editor -> New query -> Run. Aman diulang.
-- ============================================================

alter table public.profiles add column if not exists avatar_url text;

-- Kolom yang dibaca publik hanyalah nama, asal, peran, dan foto. Email dan
-- data lain tetap hanya bisa dibaca pemiliknya lewat auth.users.
drop policy if exists "profil dibaca semua" on public.profiles;
create policy "profil dibaca semua" on public.profiles
  for select using (true);

-- Pemilik tetap satu-satunya yang boleh mengubah profilnya.
drop policy if exists "profil diubah pemilik" on public.profiles;
create policy "profil diubah pemilik" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Isi nama yang masih kosong dari data pendaftaran, supaya pengguna lama
-- tidak muncul sebagai "Goweser".
update public.profiles p
set full_name = coalesce(
      nullif(p.full_name, ''),
      u.raw_user_meta_data->>'full_name',
      u.raw_user_meta_data->>'name',
      split_part(u.email, '@', 1)
    )
from auth.users u
where u.id = p.id
  and (p.full_name is null or p.full_name = '');

-- Samakan juga asal sekolah/instansi bila masih kosong.
update public.profiles p
set organization = coalesce(nullif(p.organization, ''), u.raw_user_meta_data->>'organization')
from auth.users u
where u.id = p.id
  and (p.organization is null or p.organization = '')
  and u.raw_user_meta_data->>'organization' is not null;
