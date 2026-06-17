"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft, Clock, Mountain, ChevronDown, Bike } from "lucide-react";

const RouteMap = dynamic(() => import("../route-map"), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center bg-gray-100 text-gray-400 text-sm">Memuat peta...</div>
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
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white">
      <div className="px-4 pt-6 pb-8 max-w-md mx-auto">
        <Link href="/catat" className="inline-flex items-center gap-1 text-sm text-orange-700 mb-4">
          <ArrowLeft size={16} /> Kembali
        </Link>

        <h1 className="text-2xl font-bold text-gray-900 mb-1">Riwayat Perjalanan</h1>
        <p className="text-sm text-gray-500 mb-5">{rides.length} perjalanan tercatat</p>

        {rides.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Bike size={40} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">Belum ada perjalanan. Mulai gowes pertamamu!</p>
            <Link href="/catat" className="inline-block mt-4 bg-green-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm">
              Catat Perjalanan
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {rides.map((r) => {
              const open = openId === r.id;
              return (
                <div key={r.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <button
                    onClick={() => setOpenId(open ? null : r.id)}
                    className="w-full text-left p-4 active:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-gray-500">{fmtDate(r.started_at)}</p>
                      <ChevronDown size={18} className={`text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
                    </div>
                    <div className="flex items-end gap-4 flex-wrap">
                      <p className="text-3xl font-extrabold text-gray-900 leading-none">
                        {(r.distance_m / 1000).toFixed(2)}
                        <span className="text-sm font-semibold text-gray-400 ml-1">km</span>
                      </p>
                      <span className="flex items-center gap-1 text-sm text-gray-600 pb-0.5"><Clock size={14} /> {fmtDur(r.duration_s)}</span>
                      <span className="flex items-center gap-1 text-sm text-gray-600 pb-0.5"><Mountain size={14} /> {Math.round(r.elevation_gain_m)} m</span>
                    </div>
                  </button>
                  {open && (
                    <div className="h-56 border-t border-gray-100">
                      {r.path && r.path.length > 1 ? (
                        <RouteMap path={r.path} />
                      ) : (
                        <div className="h-full flex items-center justify-center text-gray-400 text-sm">Rute tidak tersedia</div>
                      )}
                    </div>
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