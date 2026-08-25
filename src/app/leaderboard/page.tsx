import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Flame } from "lucide-react";
import KepalaHalaman from "@/components/kepala-halaman";
import { IkonPapanPeringkat } from "@/components/fitur-ikon";
import { Avatar } from "@/components/umpan-kartu";
import { Podium, type Peserta } from "./podium";

export const dynamic = "force-dynamic";

function witaDate(off = 0): string {
  return new Date(Date.now() + 8 * 3600 * 1000 + off * 86400000).toISOString().slice(0, 10);
}

export default async function LeaderboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: rows } = await supabase
    .from("user_streaks")
    .select("user_id,current_streak,last_activity_date,total_distance_m,total_rides,full_name,organization")
    .order("current_streak", { ascending: false })
    .limit(200);

  const today = witaDate(0), yest = witaDate(-1), dayBefore = witaDate(-2);
  const mentah = (rows || []).map((r) => ({
    ...r,
    streak: [today, yest, dayBefore].includes(String(r.last_activity_date)) ? Number(r.current_streak) || 0 : 0,
  })).sort((a, b) => b.streak - a.streak || Number(b.total_distance_m) - Number(a.total_distance_m));

  // Foto profil diambil terpisah karena tabel streak tidak menyimpannya.
  const { data: profil } = mentah.length
    ? await supabase.from("profiles").select("id,avatar_url,full_name").in("id", mentah.map((r) => String(r.user_id)))
    : { data: [] };
  const fotoDari = (id: string) =>
    ((profil || []).find((p) => String(p.id) === id)?.avatar_url as string) || null;
  const namaDari = (id: string, cadangan: string | null) =>
    ((profil || []).find((p) => String(p.id) === id)?.full_name as string) || cadangan || "Pesepeda";

  const board: Peserta[] = mentah.map((r) => ({
    user_id: String(r.user_id),
    nama: namaDari(String(r.user_id), r.full_name as string),
    asal: (r.organization as string) || "",
    foto: fotoDari(String(r.user_id)),
    streak: r.streak,
    km: Number(r.total_distance_m) / 1000,
    rides: Number(r.total_rides) || 0,
    saya: String(r.user_id) === user.id,
  }));

  const tiga = board.slice(0, 3);
  const sisa = board.slice(3);
  const peringkatSaya = board.findIndex((r) => r.saya);

  return (
    <div className="min-h-screen bg-[var(--latar)] pb-10">
      <KepalaHalaman
        ikon={<IkonPapanPeringkat size={22} />}
        judul="PAPAN PERINGKAT"
        keterangan="Gowes minimal 1 km per hari untuk menjaga rentetan harimu. Ada tenggang: rentetan baru putus bila absen 2 hari berturut-turut."
        warna="#FBBF24"
      />

      <div className="max-w-md mx-auto px-4">
        {board.length === 0 ? (
          <div className="rounded-2xl border border-white/8 bg-[var(--kartu)] p-8 text-center mt-6">
            <p className="display-title text-lime-300">BELUM ADA PESERTA</p>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Jadilah yang pertama. Catat perjalananmu, lalu namamu muncul di mimbar juara ini.
            </p>
          </div>
        ) : (
          <>
            <div className="pt-6"><Podium tiga={tiga} /></div>

            {peringkatSaya >= 3 && (
              <div className="mt-5 rounded-2xl border border-lime-400/35 bg-lime-400/8 px-4 py-3 flex items-center gap-3">
                <span className="display-num text-xl text-lime-300 w-8 text-center">{peringkatSaya + 1}</span>
                <Avatar nama={board[peringkatSaya].nama} foto={board[peringkatSaya].foto} ukuran={34} />
                <div className="min-w-0 flex-1">
                  <p className="display-title text-[13px] text-white">POSISIMU SEKARANG</p>
                  <p className="text-[11px] text-slate-400">
                    {board[peringkatSaya].streak} hari beruntun · {board[peringkatSaya].km.toFixed(1).replace(".", ",")} km
                  </p>
                </div>
                <span className="text-[10.5px] text-lime-300 text-right leading-tight">
                  {board[2] && board[peringkatSaya].streak < board[2].streak
                    ? `${board[2].streak - board[peringkatSaya].streak} hari lagi\nmasuk podium`
                    : "Rebut podium!"}
                </span>
              </div>
            )}

            {sisa.length > 0 && (
              <>
                <h2 className="eyebrow text-slate-500 !text-[10px] mt-7 mb-2.5">Peringkat 4 ke bawah</h2>
                <div className="rounded-2xl border border-white/8 bg-[var(--kartu)] divide-y divide-white/5 overflow-hidden">
                  {sisa.map((r, i) => (
                    <div key={r.user_id}
                      className={`flex items-center gap-3 px-3.5 py-3 ${r.saya ? "bg-lime-400/8" : ""}`}>
                      <span className="display-num text-base text-slate-500 w-7 text-center">{i + 4}</span>
                      <Avatar nama={r.nama} foto={r.foto} ukuran={32} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-white truncate">
                          {r.nama}{r.saya ? " (kamu)" : ""}
                        </p>
                        <p className="text-[10.5px] text-slate-500 truncate">
                          {r.asal || "-"} · {r.km.toFixed(1).replace(".", ",")} km · {r.rides}x
                        </p>
                      </div>
                      <span className="flex items-center gap-1 text-amber-400 flex-shrink-0">
                        <Flame size={15} />
                        <span className="display-num text-base">{r.streak}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
