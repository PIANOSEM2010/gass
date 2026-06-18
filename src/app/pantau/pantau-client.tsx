"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowLeft, Radio, Share2, Square, Loader2, Copy, Check, MapPin, AlertTriangle, ShieldCheck, EyeOff,
} from "lucide-react";

type WakeLockLike = { release: () => Promise<void> };

export default function PantauClient({ userId, fullName }: { userId: string; fullName: string }) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [starting, setStarting] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [lastSentAgo, setLastSentAgo] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [hidden, setHidden] = useState(false);

  const watchRef = useRef<number | null>(null);
  const lastSentRef = useRef(0);
  const wakeRef = useRef<WakeLockLike | null>(null);
  const sessionRef = useRef<string | null>(null);
  const sharingRef = useRef(false);
  sessionRef.current = sessionId;
  sharingRef.current = sharing;

  const acquireWake = useCallback(async () => {
    try {
      const nav = navigator as unknown as { wakeLock?: { request: (t: "screen") => Promise<WakeLockLike> } };
      if (nav.wakeLock) wakeRef.current = await nav.wakeLock.request("screen");
    } catch { /* tidak didukung */ }
  }, []);
  const releaseWake = useCallback(() => { try { wakeRef.current?.release(); } catch { /* abaikan */ } wakeRef.current = null; }, []);

  // Kirim satu posisi ke server (dengan throttle, kecuali force)
  const sendPosition = useCallback((p: GeolocationPosition, force: boolean) => {
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

  // Saat halaman kembali aktif: ambil & kirim posisi terbaru, pasang lagi wake lock
  useEffect(() => {
    const onVis = () => {
      const isHidden = document.visibilityState === "hidden";
      setHidden(isHidden);
      if (!isHidden && sharingRef.current && sessionRef.current && navigator.geolocation) {
        acquireWake();
        navigator.geolocation.getCurrentPosition(
          (p) => sendPosition(p, true),
          () => { /* abaikan */ },
          { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
        );
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [acquireWake, sendPosition]);

  // Saat keluar halaman: hentikan watch + akhiri sesi (best-effort)
  useEffect(() => {
    return () => {
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
      try { wakeRef.current?.release(); } catch { /* abaikan */ }
      const id = sessionRef.current;
      if (id) {
        const supabase = createClient();
        void supabase.from("live_sessions").update({ active: false, ended_at: new Date().toISOString() }).eq("id", id);
      }
    };
  }, []);

  async function start() {
    if (typeof navigator === "undefined" || !navigator.geolocation) { setError("Browser tidak mendukung GPS"); return; }
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

      // Ambil posisi pertama secepatnya (jangan menunggu watchPosition)
      navigator.geolocation.getCurrentPosition(
        (p) => sendPosition(p, true),
        (err) => setError(err.message || "Gagal mengambil lokasi GPS. Pastikan izin lokasi aktif."),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
      );

      // Pantau terus selama halaman terbuka
      watchRef.current = navigator.geolocation.watchPosition(
        (p) => sendPosition(p, false),
        (err) => setError(err.message || "Gagal mengambil lokasi GPS. Pastikan izin lokasi aktif."),
        { enableHighAccuracy: true, maximumAge: 1000, timeout: 20000 }
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memulai");
    } finally {
      setStarting(false);
    }
  }

  async function stop() {
    if (watchRef.current !== null) { navigator.geolocation.clearWatch(watchRef.current); watchRef.current = null; }
    releaseWake();
    const id = sessionRef.current;
    setSharing(false); sharingRef.current = false;
    if (id) {
      const supabase = createClient();
      await supabase.from("live_sessions").update({ active: false, ended_at: new Date().toISOString() }).eq("id", id);
    }
    setSessionId(null); sessionRef.current = null; setCoords(null); setLastSentAgo(null);
  }

  const shareUrl = sessionId && typeof window !== "undefined" ? `${window.location.origin}/pantau/${sessionId}` : "";

  async function share() {
    if (!shareUrl) return;
    const text = `Pantau perjalanan ${fullName} secara langsung lewat BUG:`;
    try {
      if (navigator.share) { await navigator.share({ title: "Teman Pantau BUG", text, url: shareUrl }); return; }
    } catch { return; }
    copy();
  }
  async function copy() {
    if (!shareUrl) return;
    try { await navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* abaikan */ }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-white">
      <div className="px-4 pt-6 pb-8 max-w-md mx-auto">
        <Link href="/sos" className="inline-flex items-center gap-1 text-sm text-teal-700 mb-4"><ArrowLeft size={16} /> Kembali</Link>

        <div className="rounded-3xl p-5 bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-lg mb-4">
          <div className="flex items-center gap-3">
            <Radio size={28} />
            <div>
              <h1 className="text-xl font-extrabold leading-tight">Teman Pantau</h1>
              <p className="text-xs opacity-90">Biarkan keluarga melihat lokasimu saat berkendara</p>
            </div>
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-3 py-2 mb-4 flex items-center gap-2"><AlertTriangle size={16} /> {error}</div>}

        {!sharing ? (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-sm text-gray-600 space-y-3">
              <p className="flex items-start gap-2"><ShieldCheck size={18} className="text-teal-600 flex-shrink-0 mt-0.5" /> Lokasimu hanya bisa dilihat oleh orang yang kamu beri link. Link berisi kode acak yang sulit ditebak.</p>
              <p className="flex items-start gap-2"><MapPin size={18} className="text-teal-600 flex-shrink-0 mt-0.5" /> Posisi diperbarui otomatis selama halaman ini terbuka di depan layar. Berbagi berhenti saat kamu menekan Hentikan atau menutup halaman.</p>
              <p className="flex items-start gap-2"><EyeOff size={18} className="text-amber-600 flex-shrink-0 mt-0.5" /> Jangan pindah ke aplikasi/tab lain saat berbagi. Browser menghentikan GPS saat halaman di latar belakang. Paling baik: pakai HP terpisah untuk memantau.</p>
            </div>
            <button onClick={start} disabled={starting}
              className="w-full bg-teal-600 text-white py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 shadow disabled:bg-gray-400 active:scale-95 transition-transform">
              {starting ? <><Loader2 size={20} className="animate-spin" /> Memulai...</> : <><Radio size={20} /> Mulai Berbagi Lokasi</>}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {hidden && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl px-3 py-2 flex items-center gap-2">
                <EyeOff size={16} className="flex-shrink-0" /> Halaman di latar belakang, lokasi berhenti terkirim. Buka lagi halaman ini.
              </div>
            )}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-2 text-teal-700 text-sm font-semibold mb-3">
                <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-500 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-teal-600"></span></span>
                Sedang berbagi lokasi
              </div>
              <p className="text-xs text-gray-500 mb-1">Bagikan link ini ke keluarga:</p>
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                <span className="flex-1 min-w-0 text-xs text-gray-700 truncate">{shareUrl}</span>
                <button onClick={copy} className="text-teal-600 flex-shrink-0" title="Salin">{copied ? <Check size={18} /> : <Copy size={18} />}</button>
              </div>
              <button onClick={share} className="w-full mt-3 bg-teal-600 text-white py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 active:scale-95 transition-transform">
                <Share2 size={18} /> Bagikan Link
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-sm">
              <div className="flex items-center gap-2 text-gray-700">
                <MapPin size={18} className={coords ? "text-green-600" : "text-gray-400"} />
                {coords ? (
                  <span className="font-medium">{coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</span>
                ) : (
                  <span className="text-gray-500 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Menunggu sinyal GPS...</span>
                )}
              </div>
              {coords && (
                <p className="text-xs text-gray-400 mt-1">
                  Akurasi sekitar {Math.round(coords.accuracy)} m
                  {lastSentAgo !== null ? ` - terkirim ${lastSentAgo} detik lalu` : ""}
                </p>
              )}
            </div>

            <button onClick={stop} className="w-full bg-red-600 text-white py-3.5 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 shadow active:scale-95 transition-transform">
              <Square size={20} /> Hentikan Berbagi
            </button>
            <p className="text-xs text-gray-400 text-center">Layar dijaga tetap menyala. Biarkan halaman ini di depan selama berbagi.</p>
          </div>
        )}
      </div>
    </div>
  );
}