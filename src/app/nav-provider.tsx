"use client";
// Navigasi rute yang berjalan global (di luar halaman peta).
// GPS, panduan langkah, suara, dan reroute tetap hidup walau pengguna
// membuka fitur lain. Mini widget pop-up tampil di semua halaman selain /peta.
import { type ReactNode, createContext, useContext, useState, useRef, useCallback, useEffect } from "react";
import {
  Navigation, ArrowLeft, ArrowRight, ArrowUp, ArrowUpLeft, ArrowUpRight,
  RotateCw, RotateCcw, Flag,
} from "lucide-react";
import {
  type NavStep, type AvoidGeometry, type Pt,
  fetchRoute, haversineM, speak,
} from "@/lib/routing";
import { type GeoPos, type WatchHandle, startWatch, isNativeApp } from "@/lib/native-geo";

export type NavInfo = { instruction: string; distanceToNext: number; type: number };

export type NavRoute = {
  coords: [number, number][];
  steps: NavStep[];
  info: { distance: number; duration: number };
  dest: Pt;
  label: string;
};

type WakeLockLike = { release: () => Promise<void> };

interface NavContextValue {
  navigating: boolean;
  route: NavRoute | null;
  navInfo: NavInfo | null;
  userPos: { lat: number; lng: number; accuracy: number } | null;
  begin: (route: NavRoute, avoid: AvoidGeometry | null) => void;
  stop: () => void;
  arrivedAt: number; // timestamp kedatangan terakhir (untuk toast di peta)
}

const NavContext = createContext<NavContextValue | null>(null);

export function useNav(): NavContextValue {
  const ctx = useContext(NavContext);
  if (!ctx) throw new Error("useNav harus dipakai di dalam NavProvider");
  return ctx;
}

export function maneuverIcon(type: number, size = 24) {
  const p = { size };
  switch (type) {
    case 0: case 2: return <ArrowLeft {...p} />;
    case 4: case 12: return <ArrowUpLeft {...p} />;
    case 1: case 3: return <ArrowRight {...p} />;
    case 5: case 13: return <ArrowUpRight {...p} />;
    case 6: return <ArrowUp {...p} />;
    case 7: case 8: return <RotateCw {...p} />;
    case 9: return <RotateCcw {...p} />;
    case 10: return <Flag {...p} />;
    default: return <Navigation {...p} />;
  }
}

export default function NavProvider({ children }: { children: ReactNode }) {
  const [navigating, setNavigating] = useState(false);
  const [route, setRoute] = useState<NavRoute | null>(null);
  const [navInfo, setNavInfo] = useState<NavInfo | null>(null);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [arrivedAt, setArrivedAt] = useState(0);

  const watchRef = useRef<WatchHandle | null>(null);
  const wakeRef = useRef<WakeLockLike | null>(null);
  const nextIdxRef = useRef(1);
  const announcedFarRef = useRef(false);
  const announcedNearRef = useRef(false);
  const offRouteRef = useRef(0);
  const reroutingRef = useRef(false);
  const routeRef = useRef<NavRoute | null>(null);
  const avoidRef = useRef<AvoidGeometry | null>(null);
  routeRef.current = route;

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

  const clearWatch = useCallback(() => {
    watchRef.current?.stop(); watchRef.current = null;
  }, []);

  const stop = useCallback(() => {
    clearWatch();
    releaseWake();
    setNavigating(false);
    setNavInfo(null);
    setRoute(null);
    routeRef.current = null;
    try { window.speechSynthesis.cancel(); } catch { /* abaikan */ }
  }, [clearWatch, releaseWake]);

  const handlePosition = useCallback((p: GeoPos) => {
    const lat = p.coords.latitude, lng = p.coords.longitude, accuracy = p.coords.accuracy;
    setUserPos({ lat, lng, accuracy });
    const here = { lat, lng };
    const r = routeRef.current;
    if (!r) return;

    // Tiba di tujuan?
    if (haversineM(here, r.dest) < 25) {
      speak("Anda telah tiba di tujuan.");
      setArrivedAt(Date.now());
      stop();
      return;
    }

    // Keluar jalur -> hitung ulang rute
    if (r.coords.length) {
      let minD = Infinity;
      for (let i = 0; i < r.coords.length; i++) {
        const d = haversineM(here, { lat: r.coords[i][0], lng: r.coords[i][1] });
        if (d < minD) minD = d;
      }
      if (minD > 50) {
        offRouteRef.current++;
        if (offRouteRef.current >= 3 && !reroutingRef.current) {
          reroutingRef.current = true;
          speak("Anda keluar jalur. Menghitung ulang rute.");
          (async () => {
            try {
              const res = await fetchRoute(here, r.dest, avoidRef.current);
              setRoute((prev) => prev ? { ...prev, coords: res.coords, steps: res.steps, info: res.info } : prev);
              nextIdxRef.current = 1;
              announcedFarRef.current = false;
              announcedNearRef.current = false;
            } catch {
              if (avoidRef.current) {
                try {
                  const res = await fetchRoute(here, r.dest, null);
                  setRoute((prev) => prev ? { ...prev, coords: res.coords, steps: res.steps, info: res.info } : prev);
                  nextIdxRef.current = 1;
                  announcedFarRef.current = false;
                  announcedNearRef.current = false;
                } catch { /* tetap pakai rute lama */ }
              }
            } finally {
              offRouteRef.current = 0;
              reroutingRef.current = false;
            }
          })();
        }
        setNavInfo({ instruction: "Kembali ke rute…", distanceToNext: -1, type: 9 });
        return;
      }
      offRouteRef.current = 0;
    }

    const st = r.steps;
    if (!st || st.length === 0) return;
    let idx = nextIdxRef.current;
    if (idx > st.length - 1) idx = st.length - 1;
    const step = st[idx];
    const dMan = haversineM(here, { lat: step.lat, lng: step.lng });
    setNavInfo({ instruction: step.instruction, distanceToNext: dMan, type: step.type });

    if (!announcedFarRef.current && dMan <= 180 && dMan > 45) {
      speak(`Dalam ${Math.round(dMan / 10) * 10} meter, ${step.instruction}`);
      announcedFarRef.current = true;
    }
    if (!announcedNearRef.current && dMan <= 45) {
      speak(step.instruction);
      announcedNearRef.current = true;
    }
    if (dMan < 18 && idx < st.length - 1) {
      nextIdxRef.current = idx + 1;
      announcedFarRef.current = false;
      announcedNearRef.current = false;
    }
  }, [stop]);

  const begin = useCallback((r: NavRoute, avoid: AvoidGeometry | null) => {
    clearWatch();
    avoidRef.current = avoid;
    nextIdxRef.current = Math.min(1, r.steps.length - 1);
    announcedFarRef.current = false;
    announcedNearRef.current = false;
    offRouteRef.current = 0;
    reroutingRef.current = false;
    setRoute(r);
    routeRef.current = r;
    const first = r.steps[Math.min(1, r.steps.length - 1)];
    setNavInfo(first ? { instruction: first.instruction, distanceToNext: -1, type: first.type } : null);
    setNavigating(true);
    acquireWake();
    speak("Navigasi dimulai. Ikuti rute dengan aman.");
    // Di aplikasi Android: navigasi + suara tetap berjalan walau layar mati
    watchRef.current = startWatch(
      handlePosition,
      () => setNavInfo({ instruction: "Menunggu sinyal GPS…", distanceToNext: -1, type: 11 }),
      { title: "BUG — Navigasi", message: "Panduan rute sedang berjalan…", distanceFilter: 3 }
    );
  }, [acquireWake, clearWatch, handlePosition]);

  // Ambil ulang wake lock saat layar aktif lagi
  useEffect(() => {
    function onVis() {
      if (document.visibilityState === "visible" && watchRef.current !== null && !isNativeApp()) acquireWake();
    }
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [acquireWake]);

  // Bersih-bersih saat provider dilepas (aplikasi ditutup)
  useEffect(() => () => { clearWatch(); releaseWake(); }, [clearWatch, releaseWake]);

  const value: NavContextValue = { navigating, route, navInfo, userPos, begin, stop, arrivedAt };

  return (
    <NavContext.Provider value={value}>
      {children}
    </NavContext.Provider>
  );
}
