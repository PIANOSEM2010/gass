"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Play, Square, Loader2, Save, Trash2, CheckCircle2,
  Flame, AlertTriangle, Trophy, Bike, Share2, MessageSquarePlus, History,
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

// Pilihan warna dan template kartu gowes untuk dibagikan
const PALETTES: Record<string, { name: string; grad: [string, string]; route: string; endDot: string }> = {
  hijau:   { name: "Hijau",   grad: ["#15803d", "#064e3b"], route: "#fb923c", endDot: "#fde047" },
  senja:   { name: "Senja",   grad: ["#c2410c", "#7f1d1d"], route: "#fde68a", endDot: "#ffffff" },
  samudra: { name: "Samudra", grad: ["#0e7490", "#164e63"], route: "#fde047", endDot: "#ffffff" },
  ungu:    { name: "Ungu",    grad: ["#6d28d9", "#581c87"], route: "#f5d0fe", endDot: "#ffffff" },
  malam:   { name: "Malam",   grad: ["#1e293b", "#020617"], route: "#fb923c", endDot: "#fde047" },
};
const PALETTE_KEYS = ["hijau", "senja", "samudra", "ungu", "malam"];
const TEMPLATES: { key: string; name: string }[] = [
  { key: "rute", name: "Rute" },
  { key: "statistik", name: "Statistik" },
  { key: "ringkas", name: "Ringkas" },
];

// Menggambar kartu gowes ke canvas (1080x1080) sesuai template + warna pilihan
function drawCard(
  canvas: HTMLCanvasElement,
  opts: { template: string; palette: string; path: Pt[]; distanceM: number; durationS: number; elevM: number }
) {
  const { template, path, distanceM, durationS, elevM } = opts;
  const pal = PALETTES[opts.palette] || PALETTES.hijau;
  const W = 1080, H = 1080;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, pal.grad[0]);
  g.addColorStop(1, pal.grad[1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  const brand = (x: number, y: number) => {
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.font = "bold 56px sans-serif";
    ctx.fillText("BUG", x, y);
    ctx.font = "400 28px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fillText("Bulungan untuk Goweser", x, y + 38);
  };

  const drawRoute = (bx: number, by: number, bw: number, bh: number, lw: number) => {
    if (path.length < 2) {
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.font = "400 34px sans-serif";
      ctx.fillText("Rute terlalu pendek", bx + bw / 2, by + bh / 2);
      return;
    }
    const lats = path.map((p) => p.lat);
    const lngs = path.map((p) => p.lng);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    const spanLat = maxLat - minLat || 1e-6;
    const spanLng = maxLng - minLng || 1e-6;
    const scale = Math.min(bw / spanLng, bh / spanLat);
    const offX = bx + (bw - spanLng * scale) / 2;
    const offY = by + (bh - spanLat * scale) / 2;
    ctx.strokeStyle = pal.route;
    ctx.lineWidth = lw;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    path.forEach((p, i) => {
      const x = offX + (p.lng - minLng) * scale;
      const y = offY + (maxLat - p.lat) * scale;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    const sx = offX + (path[0].lng - minLng) * scale;
    const sy = offY + (maxLat - path[0].lat) * scale;
    const ex = offX + (path[path.length - 1].lng - minLng) * scale;
    const ey = offY + (maxLat - path[path.length - 1].lat) * scale;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.arc(sx, sy, lw * 1.15, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = pal.endDot;
    ctx.beginPath(); ctx.arc(ex, ey, lw * 1.15, 0, Math.PI * 2); ctx.fill();
  };

  const km = (distanceM / 1000).toFixed(2);
  const dur = fmtDuration(durationS);
  const elev = `${Math.round(elevM)} m`;

  if (template === "statistik") {
    brand(80, 110);
    ctx.textAlign = "center";
    const cx = W / 2;
    const stat = (label: string, value: string, y: number) => {
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.font = "500 34px sans-serif";
      ctx.fillText(label, cx, y);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 92px sans-serif";
      ctx.fillText(value, cx, y + 92);
    };
    stat("Jarak", `${km} km`, 250);
    stat("Waktu", dur, 450);
    stat("Elevasi", elev, 650);
    drawRoute(130, 800, W - 260, 180, 8);
  } else if (template === "ringkas") {
    brand(80, 110);
    drawRoute(70, 170, W - 140, 660, 14);
    ctx.textAlign = "left";
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 120px sans-serif";
    ctx.fillText(km, 80, 960);
    const kmW = ctx.measureText(km).width;
    ctx.font = "500 40px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.fillText("km", 80 + kmW + 16, 960);
    ctx.textAlign = "right";
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = "500 34px sans-serif";
    ctx.fillText(`${dur} · ${elev}`, W - 80, 958);
  } else {
    brand(90, 130);
    drawRoute(110, 240, W - 220, 470, 12);
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 130px sans-serif";
    ctx.fillText(km, W / 2, 870);
    ctx.font = "500 40px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.fillText("kilometer", W / 2, 920);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 60px sans-serif";
    ctx.fillText(dur, W * 0.3, 1015);
    ctx.fillText(elev, W * 0.7, 1015);
    ctx.font = "400 30px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fillText("Waktu", W * 0.3, 1058);
    ctx.fillText("Elevasi", W * 0.7, 1058);
  }
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
  const [speed, setSpeed] = useState(0);
  const [elev, setElev] = useState(0);
  const [error, setError] = useState("");
  const [savedStreak, setSavedStreak] = useState<number | null>(null);
  const [savedQualifies, setSavedQualifies] = useState(false);
  const [savedTodayKm, setSavedTodayKm] = useState(0);
  const [savedElev, setSavedElev] = useState<number | null>(null);
  const [sharingForum, setSharingForum] = useState(false);
  const [template, setTemplate] = useState("rute");
  const [palette, setPalette] = useState("hijau");

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
  const cardRef = useRef<HTMLCanvasElement>(null);

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

  useEffect(() => {
    function onVis() {
      if (document.visibilityState === "visible" && watchIdRef.current !== null) acquireWake();
    }
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [acquireWake]);

  // Gambar kartu saat layar tersimpan tampil (atau saat template/warna diubah)
  useEffect(() => {
    if (status === "saved" && cardRef.current) {
      drawCard(cardRef.current, {
        template, palette,
        path: pathRef.current, distanceM: distRef.current, durationS: duration,
        elevM: savedElev ?? elevRef.current,
      });
    }
  }, [status, duration, savedElev, template, palette]);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null; }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    releaseWake();
  }, [releaseWake]);

  function start() {
    if (typeof navigator === "undefined" || !navigator.geolocation) { setError("Browser tidak mendukung GPS"); return; }
    setError("");
    distRef.current = 0; pathRef.current = []; lastPtRef.current = null; lastTimeRef.current = 0;
    elevRef.current = 0; lastAltRef.current = null;
    setDistance(0); setDuration(0); setSpeed(0); setElev(0); setSavedStreak(null);
    startRef.current = Date.now(); setStatus("tracking");
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
            if (dAlt > 2) {
              elevRef.current += dAlt;
              setElev(Math.round(elevRef.current));
            }
          }
          lastAltRef.current = alt;
        }

        if (inst >= 0) setSpeed(inst > 120 ? 0 : inst);
      },
      (err) => setError(err.message || "Gagal mengambil lokasi GPS"),
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 20000 }
    );
  }

  function finish() { endRef.current = Date.now(); stopTracking(); setStatus("finished"); }
  function discard() {
    setStatus("idle"); setDistance(0); setDuration(0); setSpeed(0); setElev(0); setSavedStreak(null); setSavedElev(null); setError("");
    distRef.current = 0; elevRef.current = 0; pathRef.current = []; lastPtRef.current = null; lastAltRef.current = null;
  }

  async function save() {
    setStatus("saving"); setError("");
    try {
      const res = await fetch("/api/activity", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId, fullName, organization,
          distance_m: Math.round(distRef.current), duration_s: duration,
          elevation_gain_m: Math.round(elevRef.current), path: pathRef.current,
          started_at: new Date(startRef.current).toISOString(),
          ended_at: new Date(endRef.current || Date.now()).toISOString(),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Gagal menyimpan");
      setSavedStreak(typeof data.current_streak === "number" ? data.current_streak : null);
      setSavedQualifies(Boolean(data.qualifies));
      setSavedTodayKm(typeof data.today_km === "number" ? data.today_km : 0);
      setSavedElev(typeof data.elevation_gain_m === "number" ? data.elevation_gain_m : null);
      setStatus("saved");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan perjalanan"); setStatus("finished");
    }
  }

  function shareCard() {
    const canvas = cardRef.current;
    if (!canvas) return;
    const km = (distRef.current / 1000).toFixed(2);
    const text = `Baru saja gowes ${km} km di Bulungan bersama BUG! 🚴 #GoweserAmanBulungan`;
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], "gowes-bug.png", { type: "image/png" });
      try {
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: "Aktivitas Gowes BUG", text });
          return;
        }
      } catch { /* batal share, lanjut unduh */ }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "gowes-bug.png";
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  }

  async function shareToForum() {
    setSharingForum(true);
    setError("");
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }
      const km = (distRef.current / 1000).toFixed(2);
      const title = `Gowes ${km} km hari ini`;
      const body =
        `Baru saja menyelesaikan perjalanan bersepeda di Bulungan:\n\n` +
        `Jarak: ${km} km\n` +
        `Waktu: ${fmtDuration(duration)}\n` +
        `Elevasi: ${Math.round(savedElev ?? elevRef.current)} m\n\n` +
        `Dicatat lewat fitur Gowes di BUG.`;
      const { data, error: insErr } = await supabase
        .from("forum_posts")
        .insert({ user_id: user.id, title, body })
        .select()
        .single();
      if (insErr) throw new Error(insErr.message);
      if (data) router.push(`/forum/${data.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal berbagi ke forum");
      setSharingForum(false);
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

      <Link href="/catat/riwayat" className="flex items-center justify-center gap-2 w-full mb-4 bg-white border border-gray-200 text-gray-700 py-2.5 rounded-xl font-semibold text-sm active:scale-[0.98] transition-transform">
        <History size={16} /> Riwayat Perjalanan
      </Link>

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
            <div className="grid grid-cols-3 gap-2 mt-6">
              <div className="bg-white/15 rounded-2xl py-3 text-center"><p className="text-xs opacity-80">Waktu</p><p className="text-xl font-bold tabular-nums">{fmtDuration(duration)}</p></div>
              <div className="bg-white/15 rounded-2xl py-3 text-center"><p className="text-xs opacity-80">{status === "tracking" ? "Kec." : "Rata2"}</p><p className="text-xl font-bold tabular-nums">{displaySpeed}</p></div>
              <div className="bg-white/15 rounded-2xl py-3 text-center"><p className="text-xs opacity-80">Elevasi</p><p className="text-xl font-bold tabular-nums">{elev}m</p></div>
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
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-2xl p-5 text-center">
                <CheckCircle2 size={40} className="text-green-600 mx-auto mb-2" />
                <h2 className="font-bold text-green-800 text-lg">Perjalanan Tersimpan!</h2>
                {savedQualifies && savedStreak !== null ? (
                  <>
                    <p className="text-orange-600 font-bold text-2xl flex items-center justify-center gap-1 my-1"><Flame size={24} /> {savedStreak} hari beruntun</p>
                    <p className="text-sm text-green-700">Total hari ini {savedTodayKm} km. Streak aman!</p>
                  </>
                ) : (
                  <p className="text-sm text-gray-600 my-1">Total hari ini {savedTodayKm} km. Kurang {Math.max(0, Math.round((1 - savedTodayKm) * 100) / 100)} km lagi untuk streak hari ini.</p>
                )}
              </div>

              {/* Kartu untuk dibagikan: pilih template + warna */}
              <div>
                <p className="text-xs text-gray-500 mb-2 font-medium">Pilih tampilan kartu</p>
                <div className="flex gap-2 mb-3">
                  {TEMPLATES.map((t) => (
                    <button key={t.key} onClick={() => setTemplate(t.key)}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold border-2 transition-colors ${template === t.key ? "border-green-600 bg-green-50 text-green-700" : "border-gray-200 text-gray-600"}`}>
                      {t.name}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2.5 mb-3">
                  {PALETTE_KEYS.map((k) => (
                    <button key={k} onClick={() => setPalette(k)} title={PALETTES[k].name} aria-label={PALETTES[k].name}
                      className={`w-9 h-9 rounded-full transition-transform active:scale-90 ${palette === k ? "ring-2 ring-offset-2 ring-gray-800" : "ring-1 ring-gray-200"}`}
                      style={{ background: `linear-gradient(135deg, ${PALETTES[k].grad[0]}, ${PALETTES[k].grad[1]})` }} />
                  ))}
                </div>
                <canvas ref={cardRef} className="w-full h-auto rounded-2xl shadow border border-gray-200" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button onClick={shareCard} className="bg-green-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 active:scale-95 transition-transform">
                  <Share2 size={18} /> Bagikan
                </button>
                <button onClick={shareToForum} disabled={sharingForum} className="bg-violet-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:bg-gray-400 active:scale-95 transition-transform">
                  {sharingForum ? <Loader2 size={18} className="animate-spin" /> : <MessageSquarePlus size={18} />} Ke Forum
                </button>
              </div>

              <div className="flex gap-2">
                <button onClick={discard} className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2"><Bike size={18} /> Catat Lagi</button>
                <button onClick={() => setTab("papan")} className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-1.5"><Trophy size={16} /> Peringkat</button>
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