"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Play, Square, Loader2, Save, Trash2, CheckCircle2,
  Flame, AlertTriangle, Trophy, Bike,
} from "lucide-react";

type Pt = { lat: number; lng: number };
type Status = "idle" | "tracking" | "finished" | "saving" | "saved";
type BoardItem = { user_id: string; name: string; org: string; km: number; rides: number; streak: number };
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

export default function CatatClient({
  userId, fullName, organization, myStreak, longest, totalKm, totalRides, board,
}: {
  userId: string; fullName: string; organization: string;
  myStreak: number; longest: number; totalKm: number; totalRides: number; board: BoardItem[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"catat" | "papan">("catat");
  const [status, setStatus] = useState<Status>("idle");
  const [distance, setDistance] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(0); // km/jam, sesaat
  const [error, setError] = useState("");
  const [savedStreak, setSavedStreak] = useState<number | null>(null);
  const [savedQualifies, setSavedQualifies] = useState(false);
  const [savedTodayKm, setSavedTodayKm] = useState(0);

  const watchIdRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef(0);
  const endRef = useRef(0);
  const lastPtRef = useRef<Pt | null>(null);
  const lastTimeRef = useRef(0);
  const distRef = useRef(0);
  const pathRef = useRef<Pt[]>([]);
  const wakeRef = useRef<WakeLockLike | null>(null);

  const acquireWake = useCallback(async () => {
    try {
      const nav = navigator as unknown as { wakeLock?: { request: (t: "screen") => Promise<WakeLockLike> } };
      if (nav.wakeLock) wakeRef.current = await nav.wakeLock.request("screen");
    } catch { /* tidak didukung, abaikan */ }
  }, []);
  const releaseWake = useCallback(() => {
    try { wakeRef.current?.release(); } catch { /* abaikan */ }
    wakeRef.current = null;
  }, []);

  // Ambil ulang wake lock saat kembali ke aplikasi (wake lock lepas otomatis saat tab disembunyikan)
  useEffect(() => {
    function onVis() {
      if (document.visibilityState === "visible" && watchIdRef.current !== null) acquireWake();
    }
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [acquireWake]);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null; }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    releaseWake();
  }, [releaseWake]);

  function start() {
    if (typeof navigator === "undefined" || !navigator.geolocation) { setError("Browser tidak mendukung GPS"); return; }
    setError(""); distRef.current = 0; pathRef.current = []; lastPtRef.current = null; lastTimeRef.current = 0;
    setDistance(0); setDuration(0); setSpeed(0); setSavedStreak(null);
    startRef.current = Date.now(); setStatus("tracking");
    acquireWake();
    timerRef.current = setInterval(() => setDuration(Math.floor((Date.now() - startRef.current) / 1000)), 1000);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (p) => {
        const acc = p.coords.accuracy;
        const pt = { lat: p.coords.latitude, lng: p.coords.longitude };
        const now = Date.now();
        if (acc && acc > 35) return;

        // Kecepatan sesaat: utamakan dari perangkat, jika tidak ada hitung dari segmen
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
        if (inst >= 0) setSpeed(inst > 120 ? 0 : inst);
      },
      (err) => setError(err.message || "Gagal mengambil lokasi GPS"),
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 20000 }
    );
  }

  function finish() { endRef.current = Date.now(); stopTracking(); setStatus("finished"); }
  function discard() {
    setStatus("idle"); setDistance(0); setDuration(0); setSpeed(0); setSavedStreak(null); setError("");
    distRef.current = 0; pathRef.current = []; lastPtRef.current = null;
  }
  async function save() {
    setStatus("saving"); setError("");
    try {
      const res = await fetch("/api/activity", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId, fullName, organization,
          distance_m: Math.round(distRef.current), duration_s: duration, path: pathRef.current,
          started_at: new Date(startRef.current).toISOString(),
          ended_at: new Date(endRef.current || Date.now()).toISOString(),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Gagal menyimpan");
      setSavedStreak(typeof data.current_streak === "number" ? data.current_streak : null);
      setSavedQualifies(Boolean(data.qualifies));
      setSavedTodayKm(typeof data.today_km === "number" ? data.today_km : 0);
      setStatus("saved");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan perjalanan"); setStatus("finished");
    }
  }

  const km = (distance / 1000).toFixed(2);
  const avgSpeed = duration > 0 ? (distance / 1000) / (duration / 3600) : 0;
  const displaySpeed = (status === "tracking" ? speed : avgSpeed).toFixed(1);
  const medal = ["🥇", "🥈", "🥉"];

  return (
    <div className="px-4 pt-6 max-w-md mx-auto pb-8">
      {/* Hero streak */}
      <div className="rounded-3xl p-5 bg-gradient-to-br from-orange-500 to-red-600 text-white shadow-lg mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm opacity-90 flex items-center gap-1"><Flame size={16} /> Streak kamu</p>
            <p className="text-5xl font-extrabold leading-none mt-1">{myStreak}<span className="text-lg font-bold ml-1">hari</span></p>
          </div>
          <Flame size={60} className="opacity-25" />
        </div>
        <div className="grid grid-cols-3 gap-2 mt-4 text-center">
          <div className="bg-white/15 rounded-xl py-2"><p className="text-[10px] opacity-80">Rekor</p><p className="font-bold">{longest} hari</p></div>
          <div className="bg-white/15 rounded-xl py-2"><p className="text-[10px] opacity-80">Total</p><p className="font-bold">{totalKm.toFixed(1)} km</p></div>
          <div className="bg-white/15 rounded-xl py-2"><p className="text-[10px] opacity-80">Ride</p><p className="font-bold">{totalRides}x</p></div>
        </div>
      </div>

      {/* Toggle */}
      <div className="flex bg-gray-100 rounded-xl p-1 mb-4">
        <button onClick={() => setTab("catat")} className={`flex-1 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors ${tab === "catat" ? "bg-white shadow text-green-700" : "text-gray-500"}`}><Bike size={16} /> Catat</button>
        <button onClick={() => setTab("papan")} className={`flex-1 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors ${tab === "papan" ? "bg-white shadow text-green-700" : "text-gray-500"}`}><Trophy size={16} /> Peringkat</button>
      </div>

      {tab === "catat" ? (
        <>
          <div className="bg-gradient-to-br from-green-600 to-emerald-700 rounded-3xl p-6 text-white shadow-lg mb-4">
            <div className="text-center">
              <p className="text-sm opacity-80 mb-1">Jarak</p>
              <p className="text-6xl font-extrabold tabular-nums leading-none">{km}</p>
              <p className="text-sm opacity-80 mt-1">kilometer</p>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-6">
              <div className="bg-white/15 rounded-2xl py-3 text-center"><p className="text-xs opacity-80">Waktu</p><p className="text-2xl font-bold tabular-nums">{fmtDuration(duration)}</p></div>
              <div className="bg-white/15 rounded-2xl py-3 text-center"><p className="text-xs opacity-80">{status === "tracking" ? "Kecepatan" : "Rata-rata"}</p><p className="text-2xl font-bold tabular-nums">{displaySpeed}<span className="text-sm font-medium"> km/j</span></p></div>
            </div>
          </div>

          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2 mb-4 flex items-center gap-2"><AlertTriangle size={16} /> {error}</div>}

          {status === "idle" && (
            <button onClick={start} className="w-full bg-green-600 text-white py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 shadow active:scale-95 transition-transform"><Play size={22} /> Mulai Bersepeda</button>
          )}
          {status === "tracking" && (
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2 text-green-700 text-sm font-medium">
                <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-green-600"></span></span>
                Merekam perjalanan...
              </div>
              <button onClick={finish} className="w-full bg-red-600 text-white py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 shadow active:scale-95 transition-transform"><Square size={20} /> Selesai</button>
              <p className="text-xs text-gray-400 text-center">Layar dijaga tetap menyala selama merekam.</p>
            </div>
          )}
          {status === "finished" && (
            <div className="space-y-4">
              <div className="rounded-2xl px-4 py-3 text-sm flex items-center gap-2 bg-orange-50 text-orange-700 border border-orange-200">
                <Flame size={18} /> Streak dihitung dari total jarakmu hari ini (minimal 1 km). Simpan untuk memperbaruinya.
              </div>
              <div className="flex gap-2">
                <button onClick={discard} className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-xl font-medium flex items-center justify-center gap-2"><Trash2 size={18} /> Buang</button>
                <button onClick={save} className="flex-1 bg-green-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"><Save size={18} /> Simpan</button>
              </div>
            </div>
          )}
          {status === "saving" && <button disabled className="w-full bg-gray-400 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2"><Loader2 size={20} className="animate-spin" /> Menyimpan...</button>}
          {status === "saved" && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
              <CheckCircle2 size={44} className="text-green-600 mx-auto mb-2" />
              <h2 className="font-bold text-green-800 text-lg mb-1">Perjalanan Tersimpan!</h2>
              {savedQualifies && savedStreak !== null ? (
                <>
                  <p className="text-orange-600 font-bold text-2xl flex items-center justify-center gap-1 my-2"><Flame size={24} /> {savedStreak} hari beruntun</p>
                  <p className="text-sm text-green-700">Total hari ini {savedTodayKm} km. Streak aman!</p>
                </>
              ) : (
                <p className="text-sm text-gray-600 my-2">Total hari ini {savedTodayKm} km. Kurang {Math.max(0, Math.round((1 - savedTodayKm) * 100) / 100)} km lagi untuk streak hari ini.</p>
              )}
              <div className="flex gap-2 mt-4">
                <button onClick={discard} className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2"><Bike size={18} /> Catat Lagi</button>
                <button onClick={() => setTab("papan")} className="flex-1 bg-green-600 text-white py-2.5 rounded-xl font-semibold flex items-center justify-center gap-1.5"><Trophy size={16} /> Peringkat</button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-2">
          {board.length === 0 ? (
            <p className="text-center text-gray-400 py-12 text-sm">Belum ada peserta. Catat perjalanan pertamamu!</p>
          ) : board.map((r, i) => {
            const me = r.user_id === userId;
            return (
              <div key={r.user_id} className={`flex items-center gap-3 rounded-xl px-3 py-3 shadow-sm ${me ? "bg-green-50 border border-green-300" : "bg-white border border-gray-100"}`}>
                <div className="w-7 text-center font-bold text-gray-500">{i < 3 ? medal[i] : i + 1}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{r.name}{me ? " (kamu)" : ""}</p>
                  <p className="text-xs text-gray-500 truncate">{r.org} · {r.km.toFixed(1)} km · {r.rides}x</p>
                </div>
                <div className="flex items-center gap-1 text-orange-600 font-bold"><Flame size={18} /> {r.streak}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}