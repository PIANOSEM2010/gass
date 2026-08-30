import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/umpan-kartu";
import JejakRute, { type Titik } from "@/components/jejak-rute";
import { IkonStreak, IkonTrofi, IkonRute, IkonEdukasi } from "@/components/bug-icons";
import TombolIkuti from "./tombol-ikuti";

export const dynamic = "force-dynamic";

// Ambang lencana disamakan dengan halaman Profil supaya pencapaian yang
// terlihat orang lain persis sama dengan yang dilihat pemiliknya.
function tingkat(nilai: number, ambang: number[]) {
  const tercapai = ambang.filter((a) => nilai >= a);
  return { jumlah: tercapai.length, kini: tercapai[tercapai.length - 1] ?? null };
}

export default async function ProfilPublik({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profil } = await supabase
    .from("profiles").select("id,full_name,organization,avatar_url").eq("id", id).maybeSingle();
  if (!profil) notFound();

  const [{ data: aktivitas }, { data: streak }, { data: modul }, { data: pengikut }, { data: sudah }] =
    await Promise.all([
      supabase.from("activities").select("id,distance_m,path,started_at")
        .eq("user_id", id).eq("is_demo", false)
        .order("started_at", { ascending: false }).limit(60),
      supabase.from("user_streaks").select("current_streak,last_activity_date").eq("user_id", id).maybeSingle(),
      supabase.from("module_progress").select("module_id").eq("user_id", id),
      supabase.from("follows").select("follower_id").eq("followee_id", id),
      user
        ? supabase.from("follows").select("follower_id").eq("followee_id", id).eq("follower_id", user.id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

  const daftar = aktivitas || [];
  const totalKm = daftar.reduce((s, a) => s + (Number(a.distance_m) || 0), 0) / 1000;
  const jumlahPerjalanan = daftar.length;
  const modulSelesai = new Set((modul || []).map((m) => String(m.module_id))).size;

  const wita = (o = 0) => new Date(Date.now() + 8 * 3600e3 + o * 864e5).toISOString().slice(0, 10);
  const terakhir = streak?.last_activity_date as string | undefined;
  const beruntun = terakhir && [wita(0), wita(-1), wita(-2)].includes(terakhir)
    ? Number(streak?.current_streak) || 0 : 0;

  const lencana = [
    { t: tingkat(beruntun, [3, 7, 14, 30, 60, 100]), ikon: IkonStreak, satuan: "hari", warna: "#FBBF24" },
    { t: tingkat(totalKm, [10, 50, 100, 200, 500, 1000]), ikon: IkonTrofi, satuan: "km", warna: "#B4FF3A" },
    { t: tingkat(jumlahPerjalanan, [5, 10, 25, 50, 100, 250]), ikon: IkonRute, satuan: "rute", warna: "#38BDF8" },
    { t: tingkat(modulSelesai, [1, 3, 5, 7, 9]), ikon: IkonEdukasi, satuan: "modul", warna: "#A78BFA" },
  ].filter((b) => b.t.jumlah > 0);

  const nama = String(profil.full_name || "Goweser");
  const sayaSendiri = user?.id === id;

  return (
    <div className="min-h-screen bg-[var(--latar)] pb-10">
      <div className="relative overflow-hidden border-b border-lime-400/10 butiran">
        <div className="absolute -top-24 -right-20 w-[300px] h-[300px] opacity-40 pointer-events-none"
          style={{ background: "radial-gradient(circle at center, rgba(180,255,58,.18) 0%, transparent 62%)" }} />
        <div className="relative max-w-md mx-auto px-5 pt-6 pb-5">
          <Link href="/cari" className="text-xs text-slate-400">← Cari goweser lain</Link>
          <div className="flex items-center gap-3.5 mt-4">
            <Avatar nama={nama} foto={(profil.avatar_url as string) || null} ukuran={62} />
            <div className="min-w-0 flex-1">
              <h1 className="display-title text-[19px] text-white truncate">{nama}</h1>
              <p className="text-[11px] text-slate-500 truncate">{String(profil.organization || "-")}</p>
            </div>
            {!sayaSendiri && user && (
              <TombolIkuti targetId={id} awalnyaIkut={Boolean(sudah)} />
            )}
          </div>

          <div className="grid grid-cols-4 gap-2 mt-6">
            {[
              { n: totalKm.toFixed(1).replace(".", ","), l: "km total" },
              { n: String(jumlahPerjalanan), l: "perjalanan" },
              { n: String(beruntun), l: "hari beruntun" },
              { n: String((pengikut || []).length), l: "pengikut" },
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
        <h2 className="eyebrow text-slate-500 !text-[10px] mt-6 mb-3">Pencapaian</h2>
        {lencana.length === 0 ? (
          <p className="text-xs text-slate-600">Belum ada lencana yang tercapai.</p>
        ) : (
          <div className="grid grid-cols-4 gap-2.5">
            {lencana.map((b) => (
              <div key={b.satuan} className="relative rounded-xl border border-white/10 bg-[var(--kartu)] p-2.5 text-center">
                {b.t.jumlah > 1 && (
                  <span className="absolute top-1.5 right-1.5 display-num text-[10px] px-1 rounded"
                    style={{ background: `${b.warna}26`, color: b.warna }}>{b.t.jumlah}</span>
                )}
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg mb-1.5"
                  style={{ background: `${b.warna}1F`, color: b.warna }}>
                  <b.ikon size={18} />
                </span>
                <p className="display-title text-[11px] text-white leading-tight">{b.t.kini} {b.satuan}</p>
              </div>
            ))}
          </div>
        )}

        <h2 className="eyebrow text-slate-500 !text-[10px] mt-7 mb-2.5">Riwayat gowes</h2>
        {daftar.length === 0 ? (
          <p className="text-xs text-slate-600">Belum ada perjalanan tercatat.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {daftar.slice(0, 9).map((a) => (
              <Link key={String(a.id)} href={`/umpan/${a.id}`}
                className="rounded-xl border border-white/8 bg-[var(--kartu)] p-1.5">
                <JejakRute path={Array.isArray(a.path) ? (a.path as Titik[]) : null}
                  width={92} height={58} tebal={2} titikUjung={false} />
                <p className="display-num text-[12px] text-white pl-1 pb-0.5">
                  {((Number(a.distance_m) || 0) / 1000).toFixed(1).replace(".", ",")}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
