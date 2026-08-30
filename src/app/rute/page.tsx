import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import KepalaHalaman from "@/components/kepala-halaman";
import { IkonRuteLingkar } from "@/components/fitur-ikon";
import JejakRute, { type Titik } from "@/components/jejak-rute";

export const dynamic = "force-dynamic";

export default async function DaftarRute() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/rute");

  const { data: rute, error } = await supabase
    .from("saved_routes")
    .select("id,name,path,distance_m,elevation_m,duration_s,source,share_token,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen bg-[var(--latar)] pb-10">
      <KepalaHalaman ikon={<IkonRuteLingkar size={22} />} judul="RUTE TERSIMPAN"
        keterangan="Rute yang kamu simpan bisa diputar ulang, dipakai lagi, dan dibagikan."
        warna="#A78BFA" />

      <div className="max-w-md mx-auto px-4 pt-5 space-y-3 jenjang">
        {error && (
          <p className="rounded-xl border border-amber-400/25 bg-amber-400/10 p-4 text-xs text-amber-200 leading-relaxed">
            Tabel rute belum dipasang. Jalankan <strong>bug-rute-teman-story.sql</strong> di Supabase, lalu muat ulang.
          </p>
        )}
        {!error && (rute || []).length === 0 && (
          <div className="rounded-2xl border border-white/8 bg-[var(--kartu)] p-8 text-center">
            <p className="display-title text-lime-300">BELUM ADA RUTE</p>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Buka Riwayat Perjalanan atau Rekomendasi Rute, lalu tekan Simpan Rute.
            </p>
          </div>
        )}
        {(rute || []).map((r) => (
          <Link key={String(r.id)} href={`/rute/${r.share_token}`} className="block kartu-bug p-3.5">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-[var(--relung)] border border-white/8 p-1.5 flex-shrink-0">
                <JejakRute path={Array.isArray(r.path) ? (r.path as Titik[]) : null} width={78} height={54} tebal={2} titikUjung={false} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="display-title text-[14px] text-white truncate">{String(r.name)}</p>
                <p className="text-[11px] text-slate-500">
                  {(Number(r.distance_m) / 1000).toFixed(2).replace(".", ",")} km
                  {r.duration_s ? ` · ${Math.round(Number(r.duration_s) / 60)} menit` : ""}
                </p>
                <p className="text-[10px] text-slate-600 mt-0.5">
                  {new Date(String(r.created_at)).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
