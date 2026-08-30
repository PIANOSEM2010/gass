import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { tanpaDemo } from "@/lib/tanpa-demo";
import { BUILD_TAG } from "@/lib/version";
import { redirect } from "next/navigation";
import LogoutButton from "./logout-button";
import { Avatar } from "@/components/umpan-kartu";
import { type Titik } from "@/components/jejak-rute";
import PetakProfil from "./petak-profil";
import EditProfil from "./edit-profil";
import { IkonStreak, IkonTrofi, IkonRute, IkonEdukasi } from "@/components/bug-icons";
import { IkonRuteLingkar } from "@/components/fitur-ikon";

export const dynamic = "force-dynamic";

export default async function ProfilPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/profil");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  const meta = user.user_metadata || {};
  const memberType: string | undefined = meta.member_type;
  const isPekerja = memberType === "pekerja";
  const statusLabel = isPekerja ? "Pekerja" : memberType === "pelajar" ? "Pelajar" : "Goweser";
  const organization = meta.organization || profile?.school || "";
  const namaLengkap = profile?.full_name || meta.full_name || "Goweser";

  const [{ data: aktivitas }, { data: streak }, { data: modul }] = await Promise.all([
    // Perjalanan contoh tidak pernah ikut dihitung: statistik pribadi harus
    // tetap mencerminkan gowes yang benar-benar dilakukan. Bila kolom
    // penandanya belum dipasang, kueri diulang tanpa penyaring itu.
    tanpaDemo((saring) => {
      const q = supabase.from("activities")
        .select("id,distance_m,duration_s,path,started_at")
        .eq("user_id", user.id);
      return (saring ? q.eq("is_demo", false) : q)
        .order("started_at", { ascending: false }).limit(60);
    }),
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

  // Lencana bertingkat. Begitu satu ambang tercapai, ambang berikutnya
  // otomatis menjadi target - jadi pencapaian tidak pernah berhenti di satu
  // titik dan selalu ada alasan untuk gowes lagi.
  function tingkat(nilai: number, ambang: number[]) {
    const tercapai = ambang.filter((a) => nilai >= a);
    const berikut = ambang.find((a) => nilai < a) ?? null;
    return { jumlah: tercapai.length, kini: tercapai[tercapai.length - 1] ?? null, berikut };
  }

  const tBeruntun = tingkat(beruntun, [3, 7, 14, 30, 60, 100]);
  const tJarak = tingkat(totalKm, [10, 50, 100, 200, 500, 1000]);
  const tRute = tingkat(jumlahPerjalanan, [5, 10, 25, 50, 100, 250]);
  const tModul = tingkat(modulSelesai, [1, 3, 5, 7, 9]);

  const lencana = [
    { t: tBeruntun, ikon: IkonStreak, satuan: "hari", ket: "beruntun", warna: "#FBBF24", nilai: beruntun },
    { t: tJarak, ikon: IkonTrofi, satuan: "km", ket: "terkumpul", warna: "#B4FF3A", nilai: Math.round(totalKm) },
    { t: tRute, ikon: IkonRute, satuan: "rute", ket: "tercatat", warna: "#38BDF8", nilai: jumlahPerjalanan },
    { t: tModul, ikon: IkonEdukasi, satuan: "modul", ket: "edukasi", warna: "#A78BFA", nilai: modulSelesai },
  ];

  const petak = daftar.slice(0, 9).map((a) => ({
    id: String(a.id),
    km: (Number(a.distance_m) || 0) / 1000,
    path: Array.isArray(a.path) ? (a.path as Titik[]) : null,
  }));

  return (
    <div className="min-h-screen bg-[var(--latar)] pb-10">
      {/* Kepala profil dengan latar roda berjeruji */}
      <div className="relative overflow-hidden border-b border-lime-400/10 butiran">
        <div className="absolute -top-24 -right-20 w-[300px] h-[300px] opacity-40 pointer-events-none"
          style={{ background: "radial-gradient(circle at center, rgba(180,255,58,.18) 0%, transparent 62%)" }} />
        <div className="relative max-w-md mx-auto px-5 pt-8 pb-5">
          <div className="relative flex items-center gap-3.5">
            <EditProfil nama={namaLengkap} asal={organization} fotoUrl={profile?.avatar_url || null}
              jenis={isPekerja ? "pekerja" : "pelajar"} />
            <div className="min-w-0 flex-1">
              <h1 className="display-title text-[19px] text-white truncate">{namaLengkap}</h1>
              <p className="text-[11px] text-slate-500 truncate">
                {organization ? `${organization} · ` : ""}{statusLabel}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 mt-6 jenjang">
            {[
              { n: totalKm.toFixed(1).replace(".", ","), l: "km total" },
              { n: String(jumlahPerjalanan), l: "perjalanan" },
              { n: String(beruntun), l: "hari beruntun" },
              { n: String(modulSelesai), l: "modul" },
            ].map((s) => (
              <div key={s.l}>
                <p className="display-num text-[22px] leading-none text-white">{s.n}</p>
                <p className="eyebrow !text-[8px] text-slate-500 mt-1.5 leading-tight">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-5">
        <h2 className="eyebrow text-slate-500 !text-[10px] mt-6 mb-3">Lencana</h2>
        <div className="grid grid-cols-4 gap-2.5 jenjang">
          {lencana.map((b) => {
            const aktif = b.t.jumlah > 0;
            const dari = b.t.kini ?? 0;
            const maju = b.t.berikut
              ? Math.min(100, Math.max(0, ((b.nilai - dari) / (b.t.berikut - dari)) * 100))
              : 100;
            return (
              <div key={b.ket}
                className={`relative rounded-xl border p-2.5 text-center overflow-hidden ${aktif ? "border-white/10 bg-[var(--kartu)]" : "border-white/5 bg-[var(--kartu-2)] opacity-45"}`}>
                {/* Bintang kecil menandakan sudah tingkat ke berapa */}
                {b.t.jumlah > 1 && (
                  <span className="absolute top-1.5 right-1.5 display-num text-[10px] px-1 rounded"
                    style={{ background: `${b.warna}26`, color: b.warna }}>
                    {b.t.jumlah}
                  </span>
                )}
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg mb-1.5"
                  style={{ background: `${b.warna}1F`, color: b.warna }}>
                  <b.ikon size={18} />
                </span>
                <p className="display-title text-[11px] text-white leading-tight">
                  {aktif ? `${b.t.kini} ${b.satuan}` : `${b.t.berikut} ${b.satuan}`}
                </p>
                <p className="text-[9px] text-slate-500 leading-tight">{aktif ? b.ket : "belum"}</p>

                {b.t.berikut !== null && (
                  <>
                    <div className="h-1 rounded-full bg-white/8 mt-1.5 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${maju}%`, background: b.warna }} />
                    </div>
                    <p className="text-[8.5px] text-slate-500 mt-1 leading-tight">
                      {b.t.berikut - b.nilai} lagi ke {b.t.berikut}
                    </p>
                  </>
                )}
              </div>
            );
          })}
        </div>

        <PetakProfil petak={petak} />

        <div className="mt-8 kartu-bug divide-y divide-white/5">
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

        <Link href="/rute"
          className="mt-4 flex items-center gap-3 rounded-xl border border-violet-400/30 bg-violet-400/8 px-4 py-3.5">
          <span className="w-10 h-10 rounded-xl bg-violet-400/15 text-violet-300 flex items-center justify-center flex-shrink-0">
            <IkonRuteLingkar size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="display-title text-[14px] text-white">RUTE TERSIMPAN</p>
            <p className="text-[11px] text-slate-400">Putar ulang, pakai lagi, atau bagikan rutemu</p>
          </div>
          <span className="text-slate-500">›</span>
        </Link>

        <div className="grid grid-cols-2 gap-2.5 mt-3">
          <Link href="/catat/riwayat" className="rounded-xl border border-lime-400/25 text-lime-300 py-3 text-center display-title text-sm">
            RIWAYAT GOWES
          </Link>
          <Link href="/sos/kontak" className="rounded-xl border border-white/10 text-slate-300 py-3 text-center display-title text-sm">
            KONTAK DARURAT
          </Link>
        </div>
        {profile?.role === "admin" && (
          <Link href="/admin"
            className="block mt-2.5 rounded-xl border border-lime-400/35 text-lime-300 py-3 text-center display-title text-sm">
            PANEL ADMIN
          </Link>
        )}

        <LogoutButton />
        <p className="mt-6 text-center text-[11px] text-slate-600">BUG {BUILD_TAG}</p>
      </div>
    </div>
  );
}
