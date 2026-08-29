import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import KepalaHalaman from "@/components/kepala-halaman";
import { IkonKampanyeJalan } from "@/components/fitur-ikon";
import JejakRute, { type Titik } from "@/components/jejak-rute";
import TombolTinjau from "./tombol-tinjau";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminEvent() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profil } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profil?.role !== "admin") redirect("/event");

  const { data: daftar } = await supabase
    .from("events")
    .select("id,name,logo_url,waypoints,distance_m,start_at,status,share_token,catatan_rawan,creator_id,created_at")
    .order("created_at", { ascending: false });

  const menunggu = (daftar || []).filter((e) => e.status === "menunggu");
  const lain = (daftar || []).filter((e) => e.status !== "menunggu");

  return (
    <div className="min-h-screen bg-[var(--latar)] pb-10">
      <KepalaHalaman ikon={<IkonKampanyeJalan size={22} />} judul="TINJAU EVENT"
        keterangan="Setujui atau tolak pengajuan event dari pengguna."
        warna="#FB923C" />

      <div className="max-w-md mx-auto px-4 pt-5">
        <h2 className="eyebrow text-slate-500 !text-[10px] mb-2.5">
          Menunggu tinjauan ({menunggu.length})
        </h2>
        {menunggu.length === 0 ? (
          <p className="text-xs text-slate-600 mb-6">Tidak ada pengajuan baru.</p>
        ) : (
          <div className="space-y-3 mb-6">
            {menunggu.map((e) => (
              <div key={String(e.id)} className="kartu-bug p-4">
                <div className="flex items-center gap-3">
                  {e.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={String(e.logo_url)} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                  ) : (
                    <span className="w-12 h-12 rounded-xl bg-orange-400/15 text-orange-300 flex items-center justify-center flex-shrink-0">
                      <IkonKampanyeJalan size={20} />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="display-title text-[14px] text-white truncate">{String(e.name)}</p>
                    <p className="text-[11px] text-slate-500">
                      {(Number(e.distance_m) / 1000).toFixed(1).replace(".", ",")} km ·{" "}
                      {e.start_at ? new Date(String(e.start_at)).toLocaleDateString("id-ID", { dateStyle: "medium" }) : "tanpa waktu"}
                    </p>
                  </div>
                  <div className="rounded-lg bg-[var(--relung)] border border-white/8 p-1 flex-shrink-0">
                    <JejakRute path={Array.isArray(e.waypoints) ? (e.waypoints as Titik[]) : null}
                      width={54} height={40} tebal={2} titikUjung={false} />
                  </div>
                </div>

                {e.catatan_rawan && !/tidak melewati zona rawan/i.test(String(e.catatan_rawan)) && (
                  <p className="mt-2.5 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-[11px] text-amber-200 leading-relaxed">
                    Jalur ini melewati zona rawan. Periksa dulu sebelum menyetujui.
                  </p>
                )}

                <Link href={`/event/${e.share_token}`}
                  className="mt-2.5 block text-center rounded-lg border border-white/12 text-slate-300 py-2 text-[12px]">
                  Lihat rincian lengkap
                </Link>
                <TombolTinjau id={String(e.id)} />
              </div>
            ))}
          </div>
        )}

        <h2 className="eyebrow text-slate-500 !text-[10px] mb-2.5">Sudah ditinjau</h2>
        <div className="rounded-2xl border border-white/8 bg-[var(--kartu)] divide-y divide-white/5">
          {lain.length === 0 && <p className="px-4 py-4 text-xs text-slate-600">Belum ada.</p>}
          {lain.map((e) => (
            <div key={String(e.id)} className="flex items-center gap-3 px-4 py-3">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${e.status === "disetujui" ? "bg-lime-400" : "bg-red-500"}`} />
              <span className="text-[12.5px] text-slate-300 flex-1 truncate">{String(e.name)}</span>
              <span className="text-[10.5px] text-slate-500">{String(e.status)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
