import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import KepalaHalaman from "@/components/kepala-halaman";
import { IkonKampanyeJalan } from "@/components/fitur-ikon";
import JejakRute, { type Titik } from "@/components/jejak-rute";
import { Plus, Clock, CheckCircle2 } from "lucide-react";
import { eventSelesai, eventHariIni } from "@/lib/status-event";

export const dynamic = "force-dynamic";

export default async function HalamanEvent({
  searchParams,
}: { searchParams: Promise<{ diajukan?: string }> }) {
  const { diajukan } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: semua, error } = await supabase
    .from("events")
    .select("id,name,logo_url,waypoints,distance_m,start_at,status,share_token,creator_id,meeting_point")
    .order("start_at", { ascending: true });

  const daftar = semua || [];
  const semuaDisetujui = daftar.filter((e) => e.status === "disetujui");
  // Event yang tanggalnya sudah lewat dipindahkan ke daftar terpisah.
  const disetujui = semuaDisetujui.filter((e) => !eventSelesai(e.start_at as string));
  const selesai = semuaDisetujui
    .filter((e) => eventSelesai(e.start_at as string))
    .sort((a, b) => new Date(String(b.start_at)).getTime() - new Date(String(a.start_at)).getTime());
  const punyaku = user ? daftar.filter((e) => String(e.creator_id) === user.id && e.status !== "disetujui") : [];

  return (
    <div className="min-h-screen bg-[var(--latar)] pb-10">
      <KepalaHalaman ikon={<IkonKampanyeJalan size={22} />} judul="EVENT GOWES"
        keterangan="Gowes bareng di Bulungan. Ajukan eventmu, dan tampil di sini setelah disetujui admin."
        warna="#FB923C" />

      <div className="max-w-md mx-auto px-4 pt-5">
        <Link href="/event/baru"
          className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-lime-400 to-emerald-500 text-slate-950 py-3.5 display-title text-base">
          <Plus size={18} /> TAMBAHKAN EVENT
        </Link>

        {diajukan === "1" && (
          <p className="mt-3 rounded-xl border border-lime-400/30 bg-lime-400/10 px-4 py-3 text-[12.5px] text-lime-200 leading-relaxed">
            Event kamu sudah diajukan. Admin akan memeriksanya lebih dulu, dan kamu bisa memantau statusnya di bawah.
          </p>
        )}

        {error && (
          <p className="mt-3 rounded-xl border border-amber-400/25 bg-amber-400/10 p-4 text-xs text-amber-200 leading-relaxed">
            Tabel event belum dipasang. Jalankan <strong>bug-event.sql</strong> di Supabase, lalu muat ulang halaman ini.
          </p>
        )}

        {punyaku.length > 0 && (
          <>
            <h2 className="eyebrow text-slate-500 !text-[10px] mt-6 mb-2.5">Pengajuanmu</h2>
            <div className="space-y-2">
              {punyaku.map((e) => (
                <div key={String(e.id)} className="kartu-bug px-4 py-3 flex items-center gap-3">
                  <span className="w-9 h-9 rounded-xl bg-amber-400/15 text-amber-300 flex items-center justify-center flex-shrink-0">
                    <Clock size={17} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-white truncate">{String(e.name)}</p>
                    <p className="text-[11px] text-slate-500">
                      {e.status === "menunggu" ? "Menunggu persetujuan admin" : "Ditolak admin"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <h2 className="eyebrow text-slate-500 !text-[10px] mt-6 mb-2.5">Event berjalan</h2>
        {disetujui.length === 0 ? (
          <div className="rounded-2xl border border-white/8 bg-[var(--kartu)] p-8 text-center">
            <p className="display-title text-lime-300">BELUM ADA EVENT</p>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Jadilah yang pertama mengajak goweser Bulungan bersepeda bersama.
            </p>
          </div>
        ) : (
          <div className="space-y-3 jenjang">
            {disetujui.map((e) => (
              <div key={String(e.id)} className="kartu-bug p-4">
                <div className="flex items-center gap-3">
                  {e.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={String(e.logo_url)} alt="" className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                  ) : (
                    <span className="w-14 h-14 rounded-xl bg-orange-400/15 text-orange-300 flex items-center justify-center flex-shrink-0">
                      <IkonKampanyeJalan size={24} />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="display-title text-[15px] text-white leading-tight">{String(e.name)}</p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {e.start_at
                        ? new Date(String(e.start_at)).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })
                        : "Waktu belum ditentukan"}
                    </p>
                    {eventHariIni(e.start_at as string) && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-lime-400/20 px-2 py-0.5 mt-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-pulse" />
                        <span className="eyebrow !text-[8px] text-lime-300">Hari ini</span>
                      </span>
                    )}
                    <p className="text-[11px] text-lime-300 display-num mt-0.5">
                      {(Number(e.distance_m) / 1000).toFixed(1).replace(".", ",")} km
                    </p>
                  </div>
                  <div className="rounded-xl bg-[var(--relung)] border border-white/8 p-1.5 flex-shrink-0">
                    <JejakRute path={Array.isArray(e.waypoints) ? (e.waypoints as Titik[]) : null}
                      width={62} height={46} tebal={2} titikUjung={false} />
                  </div>
                </div>
                <Link href={`/event/${e.share_token}`}
                  className="mt-3 w-full block text-center rounded-xl border border-lime-400/35 text-lime-300 py-2.5 display-title text-sm">
                  LIHAT EVENT
                </Link>
              </div>
            ))}
          </div>
        )}

        {selesai.length > 0 && (
          <>
            <h2 className="eyebrow text-slate-500 !text-[10px] mt-7 mb-2.5">
              Event sudah selesai ({selesai.length})
            </h2>
            <div className="rounded-2xl border border-white/8 bg-[var(--kartu)] divide-y divide-white/5 overflow-hidden">
              {selesai.slice(0, 12).map((e) => (
                <Link key={String(e.id)} href={`/event/${e.share_token}`}
                  className="flex items-center gap-3 px-3.5 py-3 opacity-70">
                  {e.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={String(e.logo_url)} alt="" className="w-10 h-10 rounded-lg object-cover grayscale flex-shrink-0" />
                  ) : (
                    <span className="w-10 h-10 rounded-lg bg-white/6 text-slate-500 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 size={18} />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-slate-300 truncate">{String(e.name)}</p>
                    <p className="text-[10.5px] text-slate-600">
                      {e.start_at
                        ? new Date(String(e.start_at)).toLocaleDateString("id-ID", { dateStyle: "medium" })
                        : "-"}
                      {" · "}{(Number(e.distance_m) / 1000).toFixed(1).replace(".", ",")} km
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-600 flex-shrink-0">Selesai</span>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
