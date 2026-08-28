"use client";
import { useState } from "react";
import { meter } from "@/lib/angka";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft, Clock, Mountain, ChevronDown, Bike } from "lucide-react";
import ShareRide from "./share-ride";
import TombolSimpanRute from "@/components/tombol-simpan-rute";

const RouteMap = dynamic(() => import("../route-map"), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center bg-[var(--kartu-2)] text-slate-500 text-sm">Memuat peta...</div>
  ),
});

type Pt = { lat: number; lng: number };
type Ride = {
  id: string;
  distance_m: number;
  duration_s: number;
  elevation_gain_m: number;
  path: Pt[] | null;
  started_at: string | null;
  activity_date: string | null;
};

function fmtDur(s: number): string {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}
function fmtDate(iso: string | null): string {
  if (!iso) return "Tanggal tidak diketahui";
  try {
    return new Intl.DateTimeFormat("id-ID", {
      weekday: "short", day: "numeric", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit", timeZone: "Asia/Makassar",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

export default function RiwayatClient({ rides }: { rides: Ride[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-[var(--latar)]">
      <div className="px-4 pt-6 pb-8 max-w-md mx-auto">
        <Link href="/catat" className="inline-flex items-center gap-1 text-sm text-orange-300 mb-4">
          <ArrowLeft size={16} /> Kembali
        </Link>

        <h1 className="display-title text-2xl text-white mb-1">Riwayat Perjalanan</h1>
        <p className="text-sm text-slate-400 mb-5">{rides.length} perjalanan tercatat</p>

        {rides.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <Bike size={40} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">Belum ada perjalanan. Mulai gowes pertamamu!</p>
            <Link href="/catat" className="inline-block mt-4 bg-green-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm teks-terang">
              Catat Perjalanan
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {rides.map((r) => {
              const open = openId === r.id;
              return (
                <div key={r.id} className="bg-[var(--kartu)] rounded-2xl border border-white/5 shadow-sm overflow-hidden">
                  <button
                    onClick={() => setOpenId(open ? null : r.id)}
                    className="w-full text-left p-4 active:bg-[var(--kartu-2)] transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-slate-400">{fmtDate(r.started_at)}</p>
                      <ChevronDown size={18} className={`text-slate-500 transition-transform ${open ? "rotate-180" : ""}`} />
                    </div>
                    <div className="flex items-end gap-4 flex-wrap">
                      <p className="text-3xl font-extrabold text-white leading-none">
                        {(r.distance_m / 1000).toFixed(2)}
                        <span className="text-sm font-semibold text-slate-500 ml-1">km</span>
                      </p>
                      <span className="flex items-center gap-1 text-sm text-slate-400 pb-0.5"><Clock size={14} /> {fmtDur(r.duration_s)}</span>
                      <span className="flex items-center gap-1 text-sm text-slate-400 pb-0.5"><Mountain size={14} /> {meter(r.elevation_gain_m)} m</span>
                    </div>
                  </button>
                  {open && (
                    <>
                      <div className="h-56 border-t border-white/5">
                        {r.path && r.path.length > 1 ? (
                          <RouteMap path={r.path} />
                        ) : (
                          <div className="h-full flex items-center justify-center text-slate-500 text-sm">Rute tidak tersedia</div>
                        )}
                      </div>
                      <div className="p-3 border-t border-white/5 flex gap-2">
                        <div className="flex-1"><ShareRide ride={r} /></div>
                        <TombolSimpanRute
                          path={r.path} distanceM={r.distance_m}
                          elevM={r.elevation_gain_m} durationS={r.duration_s}
                          namaAwal={`Gowes ${new Date(r.started_at || Date.now()).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}`}
                          ringkas />
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}