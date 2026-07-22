"use client";
import { type ReactNode, createContext, useContext, useState, useRef, useCallback, useEffect } from "react";
import { type GeoPos, type WatchHandle, startWatch, isNativeApp } from "@/lib/native-geo";

export type Pt = { lat: number; lng: number };
export type GowesStatus = "idle" | "tracking" | "paused" | "finished" | "saving" | "saved";
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

interface GowesContextValue {
  status: GowesStatus;
  distance: number; // meter
  duration: number; // detik
  speed: number;    // km/jam
  elev: number;     // meter
  error: string;
  start: () => void;
  pause: () => void;
  resume: () => void;
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

  const watchRef = useRef<WatchHandle | null>(null);
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
  // Dukungan jeda: total durasi jeda + kapan jeda terakhir dimulai
  const pausedMsRef = useRef(0);
  const pauseStartRef = useRef(0);
  const statusRef = useRef<GowesStatus>("idle");
  statusRef.current = status;

  // Tandai saat pencatatan gowes sedang berlangsung, agar SessionKeeper tidak
  // memuat ulang halaman (reload akan mematikan pencatatan yang sedang jalan).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const active = status === "tracking" || status === "paused";
    try {
      if (active) window.sessionStorage.setItem("bug-activity-active", "1");
      else window.sessionStorage.removeItem("bug-activity-active");
    } catch { /* abaikan */ }
  }, [status]);

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
      if (document.visibilityState === "visible" && watchRef.current !== null && !isNativeApp()) acquireWake();
    }
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [acquireWake]);

  // Bersihkan saat provider benar-benar dilepas (praktis: aplikasi ditutup)
  useEffect(() => {
    return () => {
      watchRef.current?.stop();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const stopTracking = useCallback(() => {
    watchRef.current?.stop(); watchRef.current = null;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    releaseWake();
  }, [releaseWake]);

  // Durasi aktif = waktu berjalan dikurangi total waktu jeda
  const beginTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(
      () => setDuration(Math.floor((Date.now() - startRef.current - pausedMsRef.current) / 1000)),
      1000
    );
  }, []);

  const beginWatch = useCallback(() => {
    // Di aplikasi Android: GPS native + notifikasi permanen (jalan walau layar mati).
    // Di browser: navigator.geolocation biasa.
    watchRef.current = startWatch(
      (p: GeoPos) => {
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
      (msg) => setError(msg),
      { title: "BUG — Catat Gowes", message: "Merekam perjalanan gowesmu…", distanceFilter: 4 }
    );
  }, []);

  const start = useCallback(() => {
    setError("");
    distRef.current = 0; pathRef.current = []; lastPtRef.current = null; lastTimeRef.current = 0;
    elevRef.current = 0; lastAltRef.current = null;
    pausedMsRef.current = 0; pauseStartRef.current = 0;
    setDistance(0); setDuration(0); setSpeed(0); setElev(0);
    startRef.current = Date.now(); endRef.current = 0; setStatus("tracking");
    acquireWake();
    beginTimer();
    beginWatch();
  }, [acquireWake, beginTimer, beginWatch]);

  // Jeda: hentikan GPS + timer, tapi pertahankan seluruh data perjalanan
  const pause = useCallback(() => {
    if (statusRef.current !== "tracking") return;
    watchRef.current?.stop(); watchRef.current = null;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    releaseWake();
    pauseStartRef.current = Date.now();
    setSpeed(0);
    setStatus("paused");
  }, [releaseWake]);

  // Lanjut: hitung total waktu jeda, mulai lagi GPS + timer.
  // lastPt/lastTime di-reset agar perpindahan selama jeda tidak dihitung sebagai jarak.
  const resume = useCallback(() => {
    if (statusRef.current !== "paused") return;
    if (pauseStartRef.current) { pausedMsRef.current += Date.now() - pauseStartRef.current; pauseStartRef.current = 0; }
    lastPtRef.current = null;
    lastTimeRef.current = 0;
    lastAltRef.current = null;
    setStatus("tracking");
    acquireWake();
    beginTimer();
    beginWatch();
  }, [acquireWake, beginTimer, beginWatch]);

  const finish = useCallback(() => {
    // Bila selesai saat masih jeda, akumulasi jeda dulu agar durasi akurat
    if (statusRef.current === "paused" && pauseStartRef.current) {
      pausedMsRef.current += Date.now() - pauseStartRef.current;
      pauseStartRef.current = 0;
    }
    endRef.current = Date.now();
    stopTracking();
    setStatus("finished");
  }, [stopTracking]);

  const discard = useCallback(() => {
    stopTracking();
    setStatus("idle"); setDistance(0); setDuration(0); setSpeed(0); setElev(0); setError("");
    distRef.current = 0; elevRef.current = 0; pathRef.current = []; lastPtRef.current = null; lastAltRef.current = null;
    startRef.current = 0; endRef.current = 0; pausedMsRef.current = 0; pauseStartRef.current = 0;
  }, [stopTracking]);

  const getStats = useCallback((): GowesStats => ({
    distanceM: distRef.current, durationS: duration, elevM: elevRef.current,
    startedAt: startRef.current, endedAt: endRef.current || Date.now(),
  }), [duration]);
  const getPath = useCallback((): Pt[] => pathRef.current, []);

  const value: GowesContextValue = {
    status, distance, duration, speed, elev, error,
    start, pause, resume, finish, discard, setStatus, setError, getStats, getPath,
  };

  return (
    <GowesContext.Provider value={value}>
      {children}
    </GowesContext.Provider>
  );
}
