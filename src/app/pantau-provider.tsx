"use client";
// Mesin Teman Pantau yang berjalan global. Sebelumnya berbagi lokasi berhenti
// begitu pengguna pindah halaman (komponen unmount). Kini watch GPS, heartbeat,
// dan pengiriman ke Supabase hidup di provider root, sehingga tetap berjalan
// saat pengguna membuka Catat Gowes, Peta, atau fitur lain.
import { type ReactNode, createContext, useContext, useState, useRef, useCallback, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { type GeoPos, type WatchHandle, startWatch, toGeoPos, isNativeApp } from "@/lib/native-geo";const PANTAU_SESSION_KEY = "bug-pantau-session";



type WakeLockLike = { release: () => Promise<void> };

interface PantauContextValue {
  sharing: boolean;
  starting: boolean;
  sessionId: string | null;
  coords: { lat: number; lng: number; accuracy: number } | null;
  lastSentAgo: number | null;
  error: string;
  hidden: boolean;
  start: (userId: string, fullName: string) => Promise<void>;
  stop: () => Promise<void>;
  setError: (e: string) => void;
}

const PantauContext = createContext<PantauContextValue | null>(null);

export function usePantau(): PantauContextValue {
  const ctx = useContext(PantauContext);
  if (!ctx) throw new Error("usePantau harus dipakai di dalam PantauProvider");
  return ctx;
}

export default function PantauProvider({ children }: { children: ReactNode }) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [starting, setStarting] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [lastSentAgo, setLastSentAgo] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [hidden, setHidden] = useState(false);

  const watchRef = useRef<WatchHandle | null>(null);
  const lastSentRef = useRef(0);
  const wakeRef = useRef<WakeLockLike | null>(null);
  const sessionRef = useRef<string | null>(null);
  const sharingRef = useRef(false);
  sessionRef.current = sessionId;
  sharingRef.current = sharing;

  // Tandai saat Teman Pantau aktif, agar SessionKeeper tidak reload (yang akan
  // memutus berbagi lokasi yang sedang berjalan).
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      // Kunci khusus pantau (dulu satu kunci dengan gowes → saling menghapus)
      if (sharing) window.sessionStorage.setItem("bug-pantau-active", "1");
      else window.sessionStorage.removeItem("bug-pantau-active");
      // Simpan sesi agar TAHAN PUTUS: bila halaman ter-restart, berbagi lokasi
      // dilanjutkan otomatis tanpa perlu menekan tombol lagi.
      if (sharing && sessionId) {
        window.localStorage.setItem(
          PANTAU_SESSION_KEY,
          JSON.stringify({ v: 1, sessionId, at: Date.now() })
        );
      } else {
        window.localStorage.removeItem(PANTAU_SESSION_KEY);
      }
    } catch { /* abaikan */ }
  }, [sharing, sessionId]);

  const acquireWake = useCallback(async () => {
    try {
      const nav = navigator as unknown as { wakeLock?: { request: (t: "screen") => Promise<WakeLockLike> } };
      if (nav.wakeLock) wakeRef.current = await nav.wakeLock.request("screen");
    } catch { /* tidak didukung */ }
  }, []);
  const releaseWake = useCallback(() => { try { wakeRef.current?.release(); } catch { /* abaikan */ } wakeRef.current = null; }, []);

  // Kirim satu posisi ke server (dengan throttle, kecuali force)
  const sendPosition = useCallback((p: GeoPos, force: boolean) => {
    const id = sessionRef.current;
    if (!id) return;
    const c = { lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy };
    setCoords(c);
    const now = Date.now();
    if (!force && now - lastSentRef.current < 4000) return;
    lastSentRef.current = now;
    setLastSentAgo(0);
    const sp = typeof p.coords.speed === "number" && p.coords.speed >= 0 ? p.coords.speed : null;
    const supabase = createClient();
    supabase.from("live_sessions").update({
      lat: c.lat, lng: c.lng, accuracy: c.accuracy, speed: sp, updated_at: new Date().toISOString(),
    }).eq("id", id).then(({ error: e }) => {
      if (e) setError("Gagal mengirim lokasi: " + e.message);
    });
  }, []);

  // Timer "terkirim X detik lalu"
  useEffect(() => {
    if (!sharing) return;
    const t = setInterval(() => {
      if (lastSentRef.current) setLastSentAgo(Math.round((Date.now() - lastSentRef.current) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, [sharing]);

  // Heartbeat: jaga status tetap "Live" walau posisi tidak berubah (sepeda diam)
  useEffect(() => {
    if (!sharing) return;
    const t = setInterval(() => {
      const id = sessionRef.current;
      if (!id || (typeof document !== "undefined" && document.visibilityState === "hidden")) return;
      const supabase = createClient();
      supabase.from("live_sessions").update({ updated_at: new Date().toISOString() }).eq("id", id).then(({ error: e }) => {
        if (e) setError("Gagal mengirim lokasi: " + e.message);
      });
    }, 15000);
    return () => clearInterval(t);
  }, [sharing]);

  // Saat aplikasi kembali aktif: ambil & kirim posisi terbaru, pasang lagi wake lock
  useEffect(() => {
    const onVis = () => {
      const isHidden = document.visibilityState === "hidden";
      setHidden(isHidden);
      if (!isHidden && sharingRef.current && sessionRef.current && !isNativeApp() && navigator.geolocation) {
        acquireWake();
        navigator.geolocation.getCurrentPosition(
          (p) => sendPosition(toGeoPos(p), true),
          () => { /* abaikan */ },
          { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
        );
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [acquireWake, sendPosition]);

  // Hanya saat PROVIDER dilepas (aplikasi benar-benar ditutup): akhiri sesi best-effort.
  // Pindah halaman di dalam aplikasi TIDAK melepas provider ini, jadi berbagi terus jalan.
  useEffect(() => {
    return () => {
      watchRef.current?.stop();
      try { wakeRef.current?.release(); } catch { /* abaikan */ }
      const id = sessionRef.current;
      if (id) {
        const supabase = createClient();
        void supabase.from("live_sessions").update({ active: false, ended_at: new Date().toISOString() }).eq("id", id);
      }
    };
  }, []);

  const start = useCallback(async (userId: string, fullName: string) => {
    setStarting(true); setError("");
    try {
      const supabase = createClient();
      const { data, error: insErr } = await supabase
        .from("live_sessions")
        .insert({ user_id: userId, sharer_name: fullName, active: true })
        .select("id")
        .single();
      if (insErr || !data) throw new Error(insErr?.message || "Gagal memulai sesi");
      const id = data.id as string;
      setSessionId(id); sessionRef.current = id;
      setSharing(true); sharingRef.current = true;
      acquireWake();
      lastSentRef.current = 0;

      // Ambil posisi pertama secepatnya (hanya perlu di browser; di aplikasi
      // watcher native langsung memberi posisi)
      if (!isNativeApp() && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (p) => sendPosition(toGeoPos(p), true),
          (err) => setError(err.message || "Gagal mengambil lokasi GPS. Pastikan izin lokasi aktif."),
          { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
        );
      }

      // Pantau terus. Di aplikasi Android: tetap berjalan walau layar mati.
      watchRef.current = startWatch(
        (p) => sendPosition(p, false),
        (msg) => setError(msg),
        {
          title: "BUG — Teman Pantau",
          message: "Membagikan lokasimu ke keluarga…",
          // 0 = laporkan SETIAP fix GPS (~1 detik) walau diam, supaya keluarga
          // melihat pembaruan rutin saat layar mati; pengiriman tetap dihemat
          // oleh throttle 4 detik di sendPosition.
          distanceFilter: 0,
        }
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memulai");
    } finally {
      setStarting(false);
    }
  }, [acquireWake, sendPosition]);

  // ---------- TAHAN PUTUS: lanjutkan sesi berbagi yang tertinggal ----------
  const restoredRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current || typeof window === "undefined") return;
    restoredRef.current = true;
    (async () => {
      try {
        const raw = window.localStorage.getItem(PANTAU_SESSION_KEY);
        if (!raw) return;
        const saved = JSON.parse(raw) as { v?: number; sessionId?: string; at?: number };
        if (!saved?.sessionId || !saved.at || Date.now() - saved.at > 12 * 3600 * 1000) {
          window.localStorage.removeItem(PANTAU_SESSION_KEY);
          return;
        }
        // Pastikan sesinya memang masih aktif di server
        const supabase = createClient();
        const { data } = await supabase
          .from("live_sessions")
          .select("id, active")
          .eq("id", saved.sessionId)
          .single();
        if (!data || data.active !== true) {
          window.localStorage.removeItem(PANTAU_SESSION_KEY);
          return;
        }
        setSessionId(saved.sessionId);
        sessionRef.current = saved.sessionId;
        setSharing(true);
        sharingRef.current = true;
        acquireWake();
        lastSentRef.current = 0;
        watchRef.current = startWatch(
          (p) => sendPosition(p, false),
          (msg) => setError(msg),
          {
            title: "BUG — Teman Pantau",
            message: "Membagikan lokasimu ke keluarga…",
            distanceFilter: 0,
          }
        );
      } catch {
        /* abaikan */
      }
    })();
  }, [acquireWake, sendPosition]);

  const stop = useCallback(async () => {
    watchRef.current?.stop(); watchRef.current = null;
    releaseWake();
    const id = sessionRef.current;
    setSharing(false); sharingRef.current = false;
    if (id) {
      const supabase = createClient();
      await supabase.from("live_sessions").update({ active: false, ended_at: new Date().toISOString() }).eq("id", id);
    }
    setSessionId(null); sessionRef.current = null; setCoords(null); setLastSentAgo(null);
  }, [releaseWake]);

  const value: PantauContextValue = { sharing, starting, sessionId, coords, lastSentAgo, error, hidden, start, stop, setError };

  return (
    <PantauContext.Provider value={value}>
      {children}
    </PantauContext.Provider>
  );
}
