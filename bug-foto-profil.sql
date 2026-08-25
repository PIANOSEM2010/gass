-- ============================================================
-- BUG - foto profil & informasi akun
-- Jalankan di Supabase: SQL Editor -> New query -> Run.
-- Aman diulang.
-- ============================================================

-- Kolom yang dibutuhkan halaman Profil
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists organization text;
alter table public.profiles add column if not exists member_type text;

-- Pemilik boleh memperbarui profilnya sendiri
drop policy if exists "profil diubah pemilik" on public.profiles;
create policy "profil diubah pemilik" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Wadah berkas untuk foto profil
insert into storage.buckets (id, name, public)
values ('avatar', 'avatar', true)
on conflict (id) do nothing;

drop policy if exists "avatar diunggah pemilik" on storage.objects;
create policy "avatar diunggah pemilik" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatar' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatar ditimpa pemilik" on storage.objects;
create policy "avatar ditimpa pemilik" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatar' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatar dibaca semua" on storage.objects;
create policy "avatar dibaca semua" on storage.objects
  for select using (bucket_id = 'avatar');
