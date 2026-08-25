import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BUILD_TAG } from "@/lib/version";
import { redirect } from "next/navigation";
import LogoutButton from "./logout-button";
import { Avatar } from "@/components/umpan-kartu";
import { type Titik } from "@/components/jejak-rute";
import PetakProfil from "./petak-profil";
import { IkonStreak, IkonTrofi, IkonRute, IkonEdukasi } from "@/components/bug-icons";

export const dynamic = "force-dynamic";

export default async function ProfilPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  const meta = user.user_metadata || {};
  const memberType: string | undefined = meta.member_type;
  const isPekerja = memberType === "pekerja";
  const statusLabel = isPekerja ? "Pekerja" : memberType === "pelajar" ? "Pelajar" : "Goweser";
  const organization = meta.organization || profile?.school || "";
  const namaLengkap = profile?.full_name || meta.full_name || "Goweser";

  const [{ data: aktivitas }, { data: streak }, { data: modul }] = await Promise.all([
    supabase.from("activities")
      .select("id,distance_m,duration_s,path,started_at")
      .eq("user_id", user.id).order("started_at", { ascending: false }).limit(60),
    supabase.from("user_streaks")
      .select("current_streak,total_distance_m,last_activity_date").eq("user_id", user.id).maybeSingle(),
    supabase.from("module_progress").select("module_id").eq("user_id", user.id),
  ]);

  const daftar = aktivitas || [];
  const totalKm = daftar.reduce((s, a) => s + (Number(a.distance_m) || 0), 0) / 1000;
  const jumlahPerjalanan = daftar.length;

  // Hari beruntun ikut masa tenggang 2 hari (sama dengan halaman lain).
  const wita = (o = 0) => new Date(Date.now() + 8 * 3600e3 + o * 864e5).toISOString().slice(0, 10);
  const terakhir = streak?.last_activity_date as string | undefined;
  const beruntun = terakhir && [wita(0), wita(-1), wita(-2)].includes(terakhir)
    ? Number(streak?.current_streak) || 0 : 0;

  const modulSelesai = new Set((modul || []).map((m) => String(m.module_id))).size;

  const lencana = [
    { aktif: beruntun >= 7, ikon: IkonStreak, judul: `${beruntun} hari`, ket: "beruntun", warna: "#FBBF24" },
    { aktif: totalKm >= 100, ikon: IkonTrofi, judul: "100 km", ket: "terkumpul", warna: "#B4FF3A" },
    { aktif: jumlahPerjalanan >= 10, ikon: IkonRute, judul: `${jumlahPerjalanan} rute`, ket: "tercatat", warna: "#38BDF8" },
    { aktif: modulSelesai >= 1, ikon: IkonEdukasi, judul: `${modulSelesai} modul`, ket: "edukasi", warna: "#A78BFA" },
  ];

  const petak = daftar.slice(0, 9).map((a) => ({
    id: String(a.id),
    km: (Number(a.distance_m) || 0) / 1000,
    path: Array.isArray(a.path) ? (a.path as Titik[]) : null,
  }));

  return (
    <div className="min-h-screen bg-[#071310] pb-10">
      {/* Kepala profil dengan latar roda berjeruji */}
      <div className="relative overflow-hidden border-b border-lime-400/10">
        <div className="absolute -top-24 -right-20 w-[300px] h-[300px] opacity-40 pointer-events-none"
          style={{ background: "radial-gradient(circle at center, rgba(180,255,58,.18) 0%, transparent 62%)" }} />
        <div className="relative max-w-md mx-auto px-5 pt-8 pb-5">
          <div className="flex items-center gap-3.5">
            <Avatar nama={namaLengkap} ukuran={62} />
            <div className="min-w-0 flex-1">
              <h1 className="display-title text-[19px] text-white truncate">{namaLengkap}</h1>
              <p className="text-[11px] text-slate-500 truncate">
                {organization ? `${organization} · ` : ""}{statusLabel}
              </p>
            </div>
            {profile?.role === "admin" && (
              <Link href="/admin"
                className="rounded-full border border-lime-400/40 text-lime-300 text-[11px] px-3.5 py-1.5 display-title">
                ADMIN
              </Link>
            )}
          </div>

          <div className="grid grid-cols-4 gap-2 mt-6">
            {[
              { n: totalKm.toFixed(1).replace(".", ","), l: "km total" },
              { n: String(jumlahPerjalanan), l: "perjalanan" },
              { n: String(beruntun), l: "hari beruntun" },
              { n: String(modulSelesai), l: "modul" },
            ].map((s) => (
              <div key={s.l}>
                <p className="display-num text-[21px] leading-none text-white">{s.n}</p>
                <p className="eyebrow !text-[8px] text-slate-500 mt-1.5 leading-tight">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-5">
        <h2 className="eyebrow text-slate-500 !text-[10px] mt-6 mb-3">Lencana</h2>
        <div className="grid grid-cols-4 gap-2.5">
          {lencana.map((b) => (
            <div key={b.ket}
              className={`rounded-xl border p-2.5 text-center ${b.aktif ? "border-white/10 bg-[#0C1A15]" : "border-white/5 bg-[#0A1512] opacity-45"}`}>
              <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg mb-1.5"
                style={{ background: `${b.warna}1F`, color: b.warna }}>
                <b.ikon size={18} />
              </span>
              <p className="display-title text-[11px] text-white leading-tight">{b.judul}</p>
              <p className="text-[9px] text-slate-500 leading-tight">{b.ket}</p>
            </div>
          ))}
        </div>

        <PetakProfil petak={petak} />

        <div className="mt-8 rounded-2xl border border-white/8 bg-[#0C1A15] divide-y divide-white/5">
          {[
            { l: "Email", v: user.email || "-" },
            { l: isPekerja ? "Asal instansi" : "Asal sekolah", v: organization || "-" },
            { l: "Bergabung sejak", v: new Date(profile?.created_at || user.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) },
          ].map((r) => (
            <div key={r.l} className="flex items-center justify-between px-4 py-3">
              <span className="text-[11px] text-slate-500">{r.l}</span>
              <span className="text-[12px] text-slate-200 text-right">{r.v}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2.5 mt-4">
          <Link href="/catat/riwayat" className="rounded-xl border border-lime-400/25 text-lime-300 py-3 text-center display-title text-sm">
            RIWAYAT GOWES
          </Link>
          <Link href="/sos/kontak" className="rounded-xl border border-white/10 text-slate-300 py-3 text-center display-title text-sm">
            KONTAK DARURAT
          </Link>
        </div>

        <LogoutButton />
        <p className="mt-6 text-center text-[11px] text-slate-600">BUG {BUILD_TAG}</p>
      </div>
    </div>
  );
}
