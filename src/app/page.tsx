import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import LogoBug from "@/components/logo-bug";
import TombolTema from "@/components/tema";
import KartuAktivitas, { type Aktivitas } from "@/components/umpan-kartu";
import BarisStory, { type Story } from "@/components/story-baris";
import GeserFitur from "@/components/geser-fitur";
import EventBeranda, { type EventRingkas } from "@/components/event-beranda";
import { eventSelesai, eventHariIni } from "@/lib/status-event";
import { type Titik } from "@/components/jejak-rute";

export const dynamic = "force-dynamic";

type BarisProfil = { id: string; full_name: string | null; organization: string | null; avatar_url: string | null };

export default async function Umpan() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Aktivitas terbaru dari semua orang. Bila kolom/tabel sosial belum
  // dipasang (SQL belum dijalankan), kueri gagal dan umpan tampil kosong
  // dengan pesan yang jelas - bukan halaman error.
  const { data: rows, error: galat } = await supabase
    .from("activities")
    .select("id,user_id,distance_m,duration_s,elevation_gain_m,path,started_at,note,is_demo,demo_name")
    .order("started_at", { ascending: false })
    .limit(25);

  const daftar = rows || [];
  const idPengguna = [...new Set(daftar.map((r) => String(r.user_id)))];
  const idAktivitas = daftar.map((r) => String(r.id));

  const [{ data: profil }, { data: kudos }, { data: komentar }, { data: story }, { data: eventDb }] = await Promise.all([
    idPengguna.length
      ? supabase.from("profiles").select("id,full_name,organization,avatar_url").in("id", idPengguna)
      : Promise.resolve({ data: [] as BarisProfil[] }),
    idAktivitas.length
      ? supabase.from("activity_kudos").select("activity_id,user_id").in("activity_id", idAktivitas)
      : Promise.resolve({ data: [] as { activity_id: string; user_id: string }[] }),
    idAktivitas.length
      ? supabase.from("activity_comments").select("activity_id,user_id,body,created_at").in("activity_id", idAktivitas).order("created_at", { ascending: true })
      : Promise.resolve({ data: [] as { activity_id: string; user_id: string; body: string }[] }),
    supabase.from("stories").select("id,user_id,image_url,caption,created_at").order("created_at", { ascending: false }).limit(40),
    supabase.from("events")
      .select("id,name,logo_url,share_token,start_at,distance_m,waypoints")
      .eq("status", "disetujui")
      .order("start_at", { ascending: true })
      .limit(20),
  ]);

  const namaProfil = new Map<string, BarisProfil>();
  for (const p of (profil || []) as BarisProfil[]) namaProfil.set(String(p.id), p);

  // Nama untuk pemberi komentar & pemilik story bisa saja belum ada di
  // daftar profil di atas, jadi diambil sekali lagi bila perlu.
  const idTambahan = [
    ...(komentar || []).map((k) => String(k.user_id)),
    ...(story || []).map((s) => String(s.user_id)),
  ].filter((id) => !namaProfil.has(id));
  if (idTambahan.length) {
    const { data: p2 } = await supabase.from("profiles").select("id,full_name,organization,avatar_url").in("id", [...new Set(idTambahan)]);
    for (const p of (p2 || []) as BarisProfil[]) namaProfil.set(String(p.id), p);
  }
  const nama = (id: string) => namaProfil.get(id)?.full_name || "Goweser";
  const fotoDari = (id: string) => namaProfil.get(id)?.avatar_url || null;

  const aktivitas: Aktivitas[] = daftar.map((r) => {
    const id = String(r.id);
    const k = (kudos || []).filter((x) => String(x.activity_id) === id);
    const c = (komentar || []).filter((x) => String(x.activity_id) === id);
    const p = namaProfil.get(String(r.user_id));
    return {
      id,
      // Perjalanan contoh memakai nama peserta yang diwakilinya, bukan nama
      // akun admin yang secara teknis memilikinya.
      nama: r.is_demo ? String(r.demo_name || "Peserta contoh") : (p?.full_name || "Goweser"),
      asal: p?.organization || "",
      catatan: (r.note as string) || null,
      distance_m: Number(r.distance_m) || 0,
      duration_s: Number(r.duration_s) || 0,
      elevation_gain_m: Number(r.elevation_gain_m) || 0,
      path: Array.isArray(r.path) ? (r.path as Titik[]) : null,
      waktu: (r.started_at as string) || null,
      kudos: k.length,
      sudahKudos: !!user && k.some((x) => String(x.user_id) === user.id),
      komentar: c.length,
      komentarTeratas: c.length ? { nama: nama(String(c[0].user_id)), body: c[0].body } : null,
      foto: r.is_demo ? null : (p?.avatar_url || null),
      contoh: Boolean(r.is_demo),
    };
  });

  // Event yang tanggalnya sudah lewat tidak ditampilkan di beranda sama sekali;
  // yang berlangsung hari ini ditandai dan diletakkan paling atas.
  const eventBeranda: EventRingkas[] = (eventDb || [])
    .filter((e) => !eventSelesai(e.start_at as string))
    .map((e) => {
      const mulai = e.start_at ? new Date(String(e.start_at)).getTime() : null;
      return {
        id: String(e.id),
        nama: String(e.name),
        logo: (e.logo_url as string) || null,
        token: String(e.share_token),
        mulai: (e.start_at as string) || null,
        jarakM: Number(e.distance_m) || 0,
        titik: Array.isArray(e.waypoints) ? (e.waypoints as Titik[]) : null,
        berlangsung: eventHariIni(e.start_at as string),
        _mulai: mulai,
      };
    })
    .sort((a, b) => Number(b.berlangsung) - Number(a.berlangsung) || (a._mulai ?? Infinity) - (b._mulai ?? Infinity))
    .slice(0, 3)
    .map(({ _mulai, ...sisa }) => { void _mulai; return sisa; });

  const daftarStory: Story[] = (story || []).map((s) => ({
    id: String(s.id), user_id: String(s.user_id), nama: nama(String(s.user_id)),
    image_url: String(s.image_url), caption: (s.caption as string) || null,
    created_at: String(s.created_at), foto: fotoDari(String(s.user_id)),
  }));

  return (
    <div className="min-h-screen bg-[var(--latar)] pb-8">
      {/* Kepala aplikasi */}
      <div className="sticky top-0 z-[900] bg-[var(--latar)]/85 backdrop-blur-xl border-b border-lime-400/10 cahaya-sudut">
        <div className="max-w-md mx-auto flex items-center gap-2.5 px-5 pt-4 pb-2.5 relative lg:pt-2 lg:pb-1">
          <span className="lg:hidden"><LogoBug size={38} /></span>
          <span className="display-title text-[22px] text-white leading-none lg:hidden">
            BUG
            <span className="block eyebrow !text-[7.5px] text-lime-400/70 mt-1">Bulungan untuk Goweser</span>
          </span>
          {/* Trofi dan SOS dipindahkan: trofi kini ada di geser fitur, SOS
              sudah menjadi tombol tengah navbar. Ruang ini dipakai pengalih
              tema supaya tidak ada tombol yang menganggur. */}
          <Link href="/cari" prefetch={false} aria-label="Cari goweser"
            className="ml-auto lg:ml-0 w-9 h-9 rounded-xl bg-sky-400/15 text-sky-300 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.6-3.6" /></svg>
          </Link>
          <div className="lg:hidden"><TombolTema /></div>
        </div>
        <div className="max-w-md mx-auto flex gap-5 px-5">
          {[
            { href: "/", label: "Beranda", aktif: true },
            { href: "/forum", label: "Forum", aktif: false },
            { href: "/kampanye", label: "Kampanye", aktif: false },
          ].map((t) => (
            <Link key={t.href} href={t.href}
              className={`py-2.5 display-title text-sm tracking-wide border-b-2 transition-colors ${t.aktif ? "text-lime-300 border-lime-400 drop-shadow-[0_0_8px_rgba(180,255,58,.35)]" : "text-slate-500 border-transparent"}`}>
              {t.label.toUpperCase()}
            </Link>
          ))}
        </div>
      </div>

      <div className="max-w-md mx-auto">
        <GeserFitur />

        <EventBeranda daftar={eventBeranda} />

        <BarisStory stories={daftarStory} masuk={!!user} idSaya={user?.id || null}
          namaSaya={String(user?.user_metadata?.full_name || "")} />

        <div className="pita-marka mx-5 my-3 rounded-sm" />

        <div className="px-3 space-y-3 jenjang">
          {galat && (
            <p className="rounded-xl border border-amber-400/25 bg-amber-400/10 p-4 text-xs text-amber-200 leading-relaxed">
              Tabel umpan sosial belum dipasang. Jalankan berkas <strong>bug-tabel-sosial.sql</strong> di Supabase → SQL Editor, lalu muat ulang halaman ini.
            </p>
          )}
          {!galat && aktivitas.length === 0 && (
            <div className="rounded-2xl border border-lime-400/12 bg-[var(--kartu)] p-8 text-center">
              <p className="display-title text-lime-300">BELUM ADA GOWES</p>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Jadilah yang pertama. Tekan tombol Catat Gowes di kanan bawah, lalu perjalananmu muncul di sini.
              </p>
            </div>
          )}
          {aktivitas.map((a) => <KartuAktivitas key={a.id} a={a} masuk={!!user} />)}
        </div>
      </div>


    </div>
  );
}
