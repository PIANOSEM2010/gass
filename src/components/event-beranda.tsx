import Link from "next/link";
import JejakRute, { type Titik } from "@/components/jejak-rute";
import { IkonKampanyeJalan } from "@/components/fitur-ikon";

export type EventRingkas = {
  id: string; nama: string; logo: string | null; token: string;
  mulai: string | null; jarakM: number; titik: Titik[] | null; berlangsung: boolean;
};

// Event yang sedang berlangsung dan yang akan datang, ditampilkan di beranda.
//
// Diletakkan di atas umpan karena event punya batas waktu: kalau baru terlihat
// setelah orang menggulir jauh, sebagian akan melewatkannya.
export default function EventBeranda({ daftar }: { daftar: EventRingkas[] }) {
  if (daftar.length === 0) return null;

  return (
    <section className="px-3 pb-1">
      <div className="flex items-end justify-between px-2 mb-2">
        <div>
          <p className="eyebrow !text-[9px] text-orange-400/80">Gowes bareng</p>
          <p className="display-title text-[16px] text-white leading-none mt-1">EVENT TERKINI</p>
        </div>
        <Link href="/event" className="text-[11px] text-slate-500 pb-0.5">semua →</Link>
      </div>

      <div className="space-y-2">
        {daftar.map((e) => (
          <Link key={e.id} href={`/event/${e.token}`}
            className="flex items-center gap-3 rounded-2xl border p-3 active:scale-[.99] transition-transform"
            style={{
              borderColor: e.berlangsung ? "rgba(180,255,58,.35)" : "rgba(251,146,60,.28)",
              background: e.berlangsung
                ? "linear-gradient(120deg, rgba(180,255,58,.12), var(--kartu) 60%)"
                : "linear-gradient(120deg, rgba(251,146,60,.10), var(--kartu) 60%)",
            }}>
            {e.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={e.logo} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
            ) : (
              <span className="w-12 h-12 rounded-xl bg-orange-400/15 text-orange-300 flex items-center justify-center flex-shrink-0">
                <IkonKampanyeJalan size={21} />
              </span>
            )}

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                {e.berlangsung ? (
                  <span className="flex items-center gap-1 rounded-full bg-lime-400/20 px-2 py-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-pulse" />
                    <span className="eyebrow !text-[8px] text-lime-300">Berlangsung</span>
                  </span>
                ) : (
                  <span className="rounded-full bg-orange-400/15 px-2 py-0.5 eyebrow !text-[8px] text-orange-300">
                    Mendatang
                  </span>
                )}
              </div>
              <p className="display-title text-[14px] text-white leading-tight mt-1 truncate">{e.nama}</p>
              <p className="text-[10.5px] text-slate-500 mt-0.5 truncate">
                {e.mulai
                  ? new Date(e.mulai).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })
                  : "Waktu belum ditentukan"}
                {e.jarakM > 0 ? ` · ${(e.jarakM / 1000).toFixed(1).replace(".", ",")} km` : ""}
              </p>
            </div>

            <div className="rounded-lg bg-[var(--relung)] border border-white/8 p-1 flex-shrink-0">
              <JejakRute path={e.titik} width={48} height={36} tebal={2} titikUjung={false} />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
