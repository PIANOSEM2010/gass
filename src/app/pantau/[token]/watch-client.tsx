"use client";
import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Loader2, AlertTriangle, CheckCircle2, Wifi, WifiOff, Bike } from "lucide-react";

const LiveMap = dynamic(() => import("./live-map"), {
  ssr: false,
  loading: () => <div className="h-full flex items-center justify-center bg-gray-100 text-gray-400 text-sm">Memuat peta...</div>,
});

type Live = {
  found: boolean; active?: boolean; sharer_name?: string;
  lat?: number | null; lng?: number | null; accuracy?: number | null; speed?: number | null;
  started_at?: string | null; updated_at?: string | null; ended_at?: string | null;
};

function agoText(sec: number): string {
  if (sec < 5) return "baru saja";
  if (sec < 60) return `${sec} detik lalu`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m} menit lalu`;
  return `${Math.floor(m / 60)} jam lalu`;
}

export default function WatchClient({ token }: { token: string }) {
  const [data, setData] = useState<Live | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/live/${token}`, { cache: "no-store" });
      const j = await res.json();
      setData(j);
    } catch { /* pertahankan data lama */ } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    poll();
    const t = setInterval(poll, 5000);
    return () => clearInterval(t);
  }, [poll]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const ageSec = data?.updated_at ? Math.max(0, Math.round((now - Date.parse(data.updated_at)) / 1000)) : null;
  const stale = ageSec !== null && ageSec > 45;
  const ended = data?.found === true && data?.active === false;
  const hasPos = data?.found === true && data.lat != null && data.lng != null;
  const speedKmh = typeof data?.speed === "number" && data.speed >= 0 ? (data.speed * 3.6) : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-white">
      <div className="px-4 pt-6 pb-10 max-w-md mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center font-extrabold">B</div>
          <div>
            <p className="font-extrabold text-gray-900 leading-none">BUG</p>
            <p className="text-[11px] text-gray-500">Teman Pantau</p>
          </div>
        </div>

        {loading && !data ? (
          <div className="text-center py-20 text-gray-400"><Loader2 size={28} className="animate-spin mx-auto mb-2" /> Memuat...</div>
        ) : !data?.found ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
            <AlertTriangle size={36} className="text-amber-500 mx-auto mb-3" />
            <p className="font-bold text-gray-800 mb-1">Sesi tidak ditemukan</p>
            <p className="text-sm text-gray-500">Link mungkin salah atau sudah tidak berlaku.</p>
          </div>
        ) : (
          <>
            <div className="rounded-2xl p-4 mb-4 shadow-sm border bg-white border-gray-100">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="font-bold text-gray-900 truncate">{data.sharer_name || "Goweser"}</p>
                  <p className="text-xs text-gray-500">
                    {ended ? "Perjalanan telah selesai" : ageSec !== null ? `Diperbarui ${agoText(ageSec)}` : "Menunggu posisi"}
                  </p>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 flex-shrink-0 ${
                  ended ? "bg-gray-100 text-gray-600" : stale ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"
                }`}>
                  {ended ? <CheckCircle2 size={14} /> : stale ? <WifiOff size={14} /> : <Wifi size={14} />}
                  {ended ? "Selesai" : stale ? "Terputus" : "Live"}
                </span>
              </div>
            </div>

            <div className="h-80 rounded-2xl overflow-hidden border border-gray-200 mb-4">
              {hasPos ? (
                <LiveMap lat={data.lat as number} lng={data.lng as number} accuracy={data.accuracy} />
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm gap-2">
                  <Loader2 size={24} className="animate-spin" /> Menunggu posisi pertama...
                </div>
              )}
            </div>

            {hasPos && (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
                  <Bike size={20} className="text-teal-600 mx-auto mb-1" />
                  <p className="text-xl font-extrabold text-gray-900">{speedKmh !== null ? speedKmh.toFixed(1) : "-"}</p>
                  <p className="text-xs text-gray-500">km/jam</p>
                </div>
                <a href={`https://www.google.com/maps?q=${data.lat},${data.lng}`} target="_blank" rel="noopener noreferrer"
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center flex flex-col items-center justify-center active:scale-[0.98] transition-transform">
                  <p className="text-sm font-bold text-blue-600">Buka di Google Maps</p>
                  <p className="text-xs text-gray-500 mt-0.5">Lihat lokasi persis</p>
                </a>
              </div>
            )}

            {ended && (
              <Link href="/" className="block text-center mt-4 text-sm text-teal-700 font-semibold">Tentang BUG</Link>
            )}
          </>
        )}

        <p className="text-center text-[11px] text-gray-400 mt-6">Halaman ini memperbarui lokasi otomatis tiap beberapa detik.</p>
      </div>
    </div>
  );
}