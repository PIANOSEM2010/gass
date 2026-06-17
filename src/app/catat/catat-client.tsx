"use client";
import { useState, useRef, useCallback } from "react";
import {
  Bike, Play, Square, Loader2, Save, Trash2, CheckCircle2,
  Flame, AlertTriangle,
} from "lucide-react";

type Pt = { lat: number; lng: number };
type Status = "idle" | "tracking" | "finished" | "saving" | "saved";

function haversine(a: Pt, b: Pt): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

function fmtDuration(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

export default function CatatClient({
  userId,
  fullName,
  organization,
}: {
  userId: string;
  fullName: string;
  organization: string;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [distance, setDistance] = useState(0); // meter
  const [duration, setDuration] = useState(0); // detik
  const [error, setError] = useState("");
  const [savedStreak, setSavedStreak] = useState<number | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef<number>(0);
  const endRef = useRef<number>(0);
  const lastPtRef = useRef<Pt | null>(null);
  const distRef = useRef(0);
  const pathRef = useRef<Pt[]>([]);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  function start() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("Browser tidak mendukung GPS");
      return;
    }
    setError("");
    distRef.current = 0;
    pathRef.current = [];
    lastPtRef.current = null;
    setDistance(0);
    setDuration(0);
    setSavedStreak(null);
    startRef.current = Date.now();
    setStatus("tracking");

    timerRef.current = setInterval(() => {
      setDuration(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (p) => {
        const acc = p.coords.accuracy;
        const pt = { lat: p.coords.latitude, lng: p.coords.longitude };
        // abaikan titik berakurasi buruk (mengurangi lonjakan jarak palsu)
        if (acc && acc > 35) return;
        const last = lastPtRef.current;
        if (last) {
          const d = haversine(last, pt);
          // abaikan getaran GPS kecil (<4 m); lompatan besar (>100 m) jadi acuan baru tanpa nambah jarak
          if (d >= 4 && d < 100) {
            distRef.current += d;
            setDistance(distRef.current);
            pathRef.current.push(pt);
            lastPtRef.current = pt;
          } else if (d >= 100) {
            lastPtRef.current = pt;
          }
        } else {
          lastPtRef.current = pt;
          pathRef.current.push(pt);
        }
      },
      (err) => {
        setError(err.message || "Gagal mengambil lokasi GPS");
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 20000 }
    );
  }

  function finish() {
    endRef.current = Date.now();
    stopTracking();
    setStatus("finished");
  }

  function discard() {
    setStatus("idle");
    setDistance(0);
    setDuration(0);
    setSavedStreak(null);
    distRef.current = 0;
    pathRef.current = [];
    lastPtRef.current = null;
    setError("");
  }

  async function save() {
    setStatus("saving");
    setError("");
    try {
      const res = await fetch("/api/activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          fullName,
          organization,
          distance_m: Math.round(distRef.current),
          duration_s: duration,
          path: pathRef.current,
          started_at: new Date(startRef.current).toISOString(),
          ended_at: new Date(endRef.current || Date.now()).toISOString(),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Gagal menyimpan");
      setSavedStreak(typeof data.current_streak === "number" ? data.current_streak : null);
      setStatus("saved");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan perjalanan");
      setStatus("finished");
    }
  }

  const km = (distance / 1000).toFixed(2);
  const speed = duration > 0 ? ((distance / 1000) / (duration / 3600)).toFixed(1) : "0.0";
  const qualifies = distance >= 1000;

  return (
    <div className="px-4 pt-8 max-w-md mx-auto pb-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Catat Perjalanan</h1>
      <p className="text-sm text-gray-500 mb-6">Rekam rute bersepedamu & jaga streak harianmu 🔥</p>

      {/* Statistik besar */}
      <div className="bg-gradient-to-br from-green-600 to-emerald-700 rounded-3xl p-6 text-white shadow-lg mb-5">
        <div className="text-center">
          <p className="text-sm opacity-80 mb-1">Jarak</p>
          <p className="text-6xl font-extrabold tabular-nums leading-none">{km}</p>
          <p className="text-sm opacity-80 mt-1">kilometer</p>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-6">
          <div className="bg-white/15 rounded-2xl py-3 text-center">
            <p className="text-xs opacity-80">Waktu</p>
            <p className="text-2xl font-bold tabular-nums">{fmtDuration(duration)}</p>
          </div>
          <div className="bg-white/15 rounded-2xl py-3 text-center">
            <p className="text-xs opacity-80">Kecepatan</p>
            <p className="text-2xl font-bold tabular-nums">{speed} <span className="text-sm font-medium">km/j</span></p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2 mb-4 flex items-center gap-2">
          <AlertTriangle size={16} className="flex-shrink-0" /> {error}
        </div>
      )}

      {/* Kontrol sesuai status */}
      {status === "idle" && (
        <button
          onClick={start}
          className="w-full bg-green-600 text-white py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 shadow active:scale-95 transition-transform"
        >
          <Play size={22} /> Mulai Bersepeda
        </button>
      )}

      {status === "tracking" && (
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-2 text-green-700 text-sm font-medium">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-600"></span>
            </span>
            Merekam perjalanan...
          </div>
          <button
            onClick={finish}
            className="w-full bg-red-600 text-white py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 shadow active:scale-95 transition-transform"
          >
            <Square size={20} /> Selesai
          </button>
          <p className="text-xs text-gray-400 text-center">Biarkan layar tetap menyala selama merekam agar GPS akurat.</p>
        </div>
      )}

      {status === "finished" && (
        <div className="space-y-4">
          <div className={`rounded-2xl px-4 py-3 text-sm flex items-center gap-2 ${qualifies ? "bg-orange-50 text-orange-700 border border-orange-200" : "bg-gray-50 text-gray-600 border border-gray-200"}`}>
            {qualifies ? (
              <><Flame size={18} className="flex-shrink-0" /> Mantap! Perjalanan ini <strong>menghitung streak hari ini</strong>.</>
            ) : (
              <><AlertTriangle size={18} className="flex-shrink-0" /> Jarak masih di bawah 1 km - perjalanan ini <strong>belum menghitung streak</strong>. Tetap bisa disimpan.</>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={discard}
              className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-xl font-medium flex items-center justify-center gap-2"
            >
              <Trash2 size={18} /> Buang
            </button>
            <button
              onClick={save}
              className="flex-1 bg-green-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
            >
              <Save size={18} /> Simpan
            </button>
          </div>
        </div>
      )}

      {status === "saving" && (
        <button disabled className="w-full bg-gray-400 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2">
          <Loader2 size={20} className="animate-spin" /> Menyimpan...
        </button>
      )}

      {status === "saved" && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
          <CheckCircle2 size={44} className="text-green-600 mx-auto mb-2" />
          <h2 className="font-bold text-green-800 text-lg mb-1">Perjalanan Tersimpan!</h2>
          {savedStreak !== null && savedStreak > 0 && (
            <p className="text-orange-600 font-bold text-2xl flex items-center justify-center gap-1 my-2">
              <Flame size={24} /> {savedStreak} hari beruntun
            </p>
          )}
          <div className="flex gap-2 mt-4">
            <button onClick={discard} className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2">
              <Bike size={18} /> Catat Lagi
            </button>
            <a href="/leaderboard" className="flex-1 bg-green-600 text-white py-2.5 rounded-xl font-semibold flex items-center justify-center">
              Lihat Peringkat
            </a>
          </div>
        </div>
      )}
    </div>
  );
}