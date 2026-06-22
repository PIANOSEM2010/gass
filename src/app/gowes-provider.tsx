"use client";
import { type ReactNode, createContext, useContext, useState, useRef, useCallback, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Square, ChevronUp, Bike } from "lucide-react";

export type Pt = { lat: number; lng: number };
export type GowesStatus = "idle" | "tracking" | "finished" | "saving" | "saved";
export type GowesStats = { distanceM: number; durationS: number; elevM: number; startedAt: number; endedAt: number };
type WakeLockLike = { release: () => Promise<void> };

function haversine(a: Pt, b: Pt): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
function fmtDuration(s: number): string {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

interface GowesContextValue {
  status: GowesStatus;
  distance: number; // meter
  duration: number; // detik
  speed: number;    // km/jam
  elev: number;     // meter
  error: string;
  start: () => void;
  finish: () => void;
  discard: () => void;
  setStatus: (s: GowesStatus) => void;
  setError: (e: string) => void;
  getStats: () => GowesStats;
  getPath: () => Pt[];
}

const GowesContext = createContext<GowesContextValue | null>(null);

export function useGowes(): GowesContextValue {
  const ctx = useContext(GowesContext);
  if (!ctx) throw new Error("useGowes harus dipakai di dalam GowesProvider");
  return ctx;
}

export default function GowesProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<GowesStatus>("idle");
  const [distance, setDistance] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [elev, setElev] = useState(0);
  const [error, setError] = useState("");

  const watchIdRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef(0);
  const endRef = useRef(0);
  const lastPtRef = useRef<Pt | null>(null);
  const lastTimeRef = useRef(0);
  const lastAltRef = useRef<number | null>(null);
  const distRef = useRef(0);
  const elevRef = useRef(0);
  const pathRef = useRef<Pt[]>([]);
  const wakeRef = useRef<WakeLockLike | null>(null);

  const acquireWake = useCallback(async () => {
    try {
      const nav = navigator as unknown as { wakeLock?: { request: (t: "screen") => Promise<WakeLockLike> } };
      if (nav.wakeLock) wakeRef.current = await nav.wakeLock.request("screen");
    } catch { /* tidak didukung */ }
  }, []);
  const releaseWake = useCallback(() => {
    try { wakeRef.current?.release(); } catch { /* abaikan */ }
    wakeRef.current = null;
  }, []);

  // Saat layar aktif lagi, ambil ulang wake lock (browser melepasnya saat tab disembunyikan)
  useEffect(() => {
    function onVis() {
      if (document.visibilityState === "visible" && watchIdRef.current !== null) acquireWake();
    }
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [acquireWake]);

  // Bersihkan saat provider benar-benar dilepas (praktis: aplikasi ditutup)
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null; }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    releaseWake();
  }, [releaseWake]);

  const start = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) { setError("Browser tidak mendukung GPS"); return; }
    setError("");
    distRef.current = 0; pathRef.current = []; lastPtRef.current = null; lastTimeRef.current = 0;
    elevRef.current = 0; lastAltRef.current = null;
    setDistance(0); setDuration(0); setSpeed(0); setElev(0);
    startRef.current = Date.now(); endRef.current = 0; setStatus("tracking");
    acquireWake();
    timerRef.current = setInterval(() => setDuration(Math.floor((Date.now() - startRef.current) / 1000)), 1000);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (p) => {
        const acc = p.coords.accuracy;
        const pt = { lat: p.coords.latitude, lng: p.coords.longitude };
        const now = Date.now();
        if (acc && acc > 35) return;

        let inst = -1;
        const devSpeed = p.coords.speed;
        if (typeof devSpeed === "number" && devSpeed >= 0 && !Number.isNaN(devSpeed)) inst = devSpeed * 3.6;

        const last = lastPtRef.current;
        if (last) {
          const d = haversine(last, pt);
          if (d >= 4 && d < 100) {
            const segT = lastTimeRef.current ? (now - lastTimeRef.current) / 1000 : 0;
            if (inst < 0 && segT > 0) inst = (d / segT) * 3.6;
            distRef.current += d;
            setDistance(distRef.current);
            pathRef.current.push(pt);
            lastPtRef.current = pt;
            lastTimeRef.current = now;
          } else if (d >= 100) {
            lastPtRef.current = pt; lastTimeRef.current = now;
          }
        } else {
          lastPtRef.current = pt; lastTimeRef.current = now; pathRef.current.push(pt);
        }

        // Elevasi: jumlahkan kenaikan altitude (ambang 2 m untuk kurangi noise GPS)
        const alt = p.coords.altitude;
        if (typeof alt === "number" && !Number.isNaN(alt)) {
          if (lastAltRef.current !== null) {
            const dAlt = alt - lastAltRef.current;
            if (dAlt > 2) { elevRef.current += dAlt; setElev(Math.round(elevRef.current)); }
          }
          lastAltRef.current = alt;
        }

        if (inst >= 0) setSpeed(inst > 120 ? 0 : inst);
      },
      (err) => setError(err.message || "Gagal mengambil lokasi GPS"),
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 20000 }
    );
  }, [acquireWake]);

  const finish = useCallback(() => { endRef.current = Date.now(); stopTracking(); setStatus("finished"); }, [stopTracking]);

  const discard = useCallback(() => {
    stopTracking();
    setStatus("idle"); setDistance(0); setDuration(0); setSpeed(0); setElev(0); setError("");
    distRef.current = 0; elevRef.current = 0; pathRef.current = []; lastPtRef.current = null; lastAltRef.current = null;
    startRef.current = 0; endRef.current = 0;
  }, [stopTracking]);

  const getStats = useCallback((): GowesStats => ({
    distanceM: distRef.current, durationS: duration, elevM: elevRef.current,
    startedAt: startRef.current, endedAt: endRef.current || Date.now(),
  }), [duration]);
  const getPath = useCallback((): Pt[] => pathRef.current, []);

  const value: GowesContextValue = {
    status, distance, duration, speed, elev, error,
    start, finish, discard, setStatus, setError, getStats, getPath,
  };

  return (
    <GowesContext.Provider value={value}>
      {children}
      <GowesMiniWidget />
    </GowesContext.Provider>
  );
}

// Mini player melayang: tampil di semua halaman SELAIN /catat saat sesi gowes aktif
function GowesMiniWidget() {
  const { status, distance, duration, speed, finish } = useGowes();
  const pathname = usePathname();
  const router = useRouter();

  if (status !== "tracking" && status !== "finished") return null;
  if (pathname === "/catat") return null;

  const tracking = status === "tracking";
  const km = (distance / 1000).toFixed(2);

  return (
    <div className="fixed left-3 right-3 z-[2000]" style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 84px)" }}>
      <div
        onClick={() => router.push("/catat")}
        className={`mx-auto max-w-md flex items-center gap-3 rounded-2xl shadow-lg px-4 py-3 text-white cursor-pointer active:scale-[0.99] transition-transform ${tracking ? "bg-gradient-to-r from-green-600 to-emerald-700" : "bg-gradient-to-r from-orange-500 to-amber-600"}`}
      >
        {tracking ? (
          <span className="relative flex h-3 w-3 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
          </span>
        ) : (
          <Bike size={18} className="shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-[11px] opacity-90 leading-tight">{tracking ? "Merekam gowes" : "Gowes belum disimpan"}</p>
          <p className="font-bold tabular-nums leading-tight truncate">
            {km} km · {fmtDuration(duration)}{tracking ? ` · ${speed.toFixed(0)} km/j` : ""}
          </p>
        </div>
        {tracking ? (
          <button
            onClick={(e) => { e.stopPropagation(); finish(); }}
            aria-label="Selesai"
            className="shrink-0 bg-white/20 hover:bg-white/30 rounded-full p-2 active:scale-90 transition-transform"
          >
            <Square size={18} />
          </button>
        ) : (
          <ChevronUp size={20} className="shrink-0" />
        )}
      </div>
    </div>
  );
}