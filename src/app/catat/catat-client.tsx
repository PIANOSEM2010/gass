"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useGowes, type Pt } from "../gowes-provider";
import { isNativeApp } from "@/lib/native-geo";
import { shareImageDataUrl } from "@/lib/native-share";
import { drawCard, loadImage, fmtDuration, PALETTES, PALETTE_KEYS, TEMPLATES } from "@/lib/gowes-card";
import {
  Play, Pause, Square, Loader2, Save, Trash2, CheckCircle2,
  Flame, AlertTriangle, Trophy, Bike, Share2, MessageSquarePlus, History,
  ImagePlus, X, Download,
} from "lucide-react";

type BoardItem = { user_id: string; name: string; org: string; km: number; rides: number; streak: number };

export default function CatatClient({
  userId, fullName, organization, myStreak, longest, totalKm, totalRides, board,
}: {
  userId: string; fullName: string; organization: string;
  myStreak: number; longest: number; totalKm: number; totalRides: number; board: BoardItem[];
}) {
  const router = useRouter();
  // Mesin gowes global (provider di root layout) agar tetap jalan saat buka menu lain
  const { status, setStatus, distance, duration, speed, elev, error, setError, start, pause, resume, finish, discard, getStats, getPath } = useGowes();

  const [tab, setTab] = useState<"catat" | "papan">("catat");
  // Deteksi bila aplikasi/layar sempat tidak aktif saat merekam (GPS terjeda oleh sistem).
  // Tidak berlaku di aplikasi Android: GPS native tetap jalan saat layar mati.
  const [nativeApp, setNativeApp] = useState(false);
  useEffect(() => { setNativeApp(isNativeApp()); }, []);
  const [wasHidden, setWasHidden] = useState(false);
  useEffect(() => {
    if (status !== "tracking") { setWasHidden(false); return; }
    const onVis = () => { if (document.visibilityState === "hidden") setWasHidden(true); };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [status]);
  const [savedStreak, setSavedStreak] = useState<number | null>(null);
  const [savedQualifies, setSavedQualifies] = useState(false);
  const [savedTodayKm, setSavedTodayKm] = useState(0);
  const [savedElev, setSavedElev] = useState<number | null>(null);
  const [sharingForum, setSharingForum] = useState(false);
  const [template, setTemplate] = useState("rute");
  const [palette, setPalette] = useState("hijau");
  const [placeName, setPlaceName] = useState("Bulungan");
  const [cardPhoto, setCardPhoto] = useState<HTMLImageElement | null>(null);
  const [cardTransparent, setCardTransparent] = useState(false);
  const cardRef = useRef<HTMLCanvasElement>(null);

  // Gambar kartu saat layar tersimpan tampil (atau saat template/warna/lokasi diubah).
  // Digambar lagi setelah font display selesai dimuat agar tipografinya benar.
  useEffect(() => {
    if (status === "saved" && cardRef.current) {
      const st = getStats();
      const doDraw = () => {
        if (!cardRef.current) return;
        drawCard(cardRef.current, {
          template, palette, place: placeName,
          path: getPath(), distanceM: st.distanceM, durationS: duration,
          elevM: savedElev ?? st.elevM,
          photo: cardPhoto, transparent: cardTransparent,
        });
      };
      doDraw();
      if (typeof document !== "undefined" && document.fonts?.ready) {
        document.fonts.ready.then(doDraw).catch(() => { /* abaikan */ });
      }
    }
    // getStats/getPath sengaja tidak dimasukkan dep (stabil, dibaca saat efek jalan)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, duration, savedElev, template, palette, placeName, cardPhoto, cardTransparent]);

  // Deteksi nama daerah tempat gowes (dari titik tengah rute) untuk caption
  useEffect(() => {
    if (status !== "saved") return;
    const path = getPath();
    if (!path || path.length === 0) return;
    const mid = path[Math.floor(path.length / 2)];
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${mid.lat}&lon=${mid.lng}&zoom=10&addressdetails=1&accept-language=id`,
          { cache: "no-store" }
        );
        const j = await res.json();
        const a = j.address || {};
        // Prioritas: kabupaten (county) / kota (city) dulu, agar hashtag cocok
        // dengan kampanye (mis. #GoweserAmanBulungan), baru turun ke tingkat bawah
        let name: string = a.county || a.city || a.municipality || a.state || a.town || a.city_district || a.village || "";
        name = name.replace(/^(Kabupaten|Kota|Kecamatan|Daerah Khusus Ibukota)\s+/i, "").trim();
        if (!cancelled && name) setPlaceName(name);
      } catch { /* pertahankan default */ }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  function handleDiscard() {
    discard();
    setSavedStreak(null); setSavedElev(null); setSavedQualifies(false); setSavedTodayKm(0);
  }

  async function save() {
    setStatus("saving"); setError("");
    try {
      const st = getStats();
      const res = await fetch("/api/activity", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId, fullName, organization,
          distance_m: Math.round(st.distanceM), duration_s: st.durationS,
          elevation_gain_m: Math.round(st.elevM), path: getPath(),
          started_at: new Date(st.startedAt).toISOString(),
          ended_at: new Date(st.endedAt).toISOString(),
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

  // Foto perjalanan sebagai latar kartu
  async function pickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = () => reject(new Error("gagal baca file"));
        r.readAsDataURL(file);
      });
      setCardPhoto(await loadImage(dataUrl));
    } catch { /* abaikan */ }
  }

  // Unduh kartu sebagai PNG (mode transparan menghasilkan PNG ber-alpha)
  function downloadCard() {
    const canvas = cardRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    const name = cardTransparent ? "gowes-bug-transparan.png" : "gowes-bug.png";
    if (nativeApp) {
      // Di aplikasi: share sheet native (bisa pilih "Simpan ke Galeri")
      void shareImageDataUrl(dataUrl, name);
      return;
    }
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function shareCard() {
    const canvas = cardRef.current;
    if (!canvas) return;
    const km = (getStats().distanceM / 1000).toFixed(2);
    const text = `Baru saja gowes ${km} km di ${placeName} bersama BUG! 🚴 #GoweserAman${placeName.replace(/\s+/g, "")}`;
    // Di aplikasi Android: file ditulis ke cache lalu share sheet native.
    // Di browser: Web Share API; kalau tak ada → unduh otomatis.
    const dataUrl = canvas.toDataURL("image/png");
    void shareImageDataUrl(dataUrl, "gowes-bug.png", text);
  }

  async function shareToForum() {
    setSharingForum(true);
    setError("");
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }
      const km = (getStats().distanceM / 1000).toFixed(2);

      // Unggah gambar kartu (sesuai template + warna terpilih) ke Storage
      let imageUrl: string | null = null;
      const canvas = cardRef.current;
      if (canvas) {
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
        if (blob) {
          const path = `${user.id}/${Date.now()}.png`;
          const { error: upErr } = await supabase.storage.from("gowes-cards").upload(path, blob, { contentType: "image/png", upsert: false });
          if (upErr) throw new Error("Gagal mengunggah kartu: " + upErr.message);
          imageUrl = supabase.storage.from("gowes-cards").getPublicUrl(path).data.publicUrl;
        }
      }

      const title = `Gowes ${km} km di ${placeName}`;
      const body =
        `Jarak ${km} km, waktu ${fmtDuration(duration)}, elevasi ${Math.round(savedElev ?? getStats().elevM)} m. ` +
        `Dicatat lewat fitur Gowes di BUG.`;
      const { data, error: insErr } = await supabase
        .from("forum_posts")
        .insert({ user_id: user.id, title, body, image_url: imageUrl })
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
      <div className="relative overflow-hidden rounded-3xl p-5 bg-gradient-to-br from-orange-500 via-red-500 to-red-700 text-white shadow-lg mb-4 speed-lines">
        <div className="flex items-center justify-between relative">
          <div>
            <p className="eyebrow !text-[10px] text-white/85 flex items-center gap-1"><Flame size={14} /> Streak kamu</p>
            <p className="display-num text-6xl leading-none mt-1">{myStreak}<span className="display-title text-xl ml-1.5">hari</span></p>
          </div>
          <Flame size={64} className="opacity-25" />
        </div>
        <div className="grid grid-cols-3 gap-2 mt-4 text-center relative">
          <div className="bg-white/15 rounded-xl py-2"><p className="eyebrow !text-[9px] text-white/75">Rekor</p><p className="display-num text-lg leading-tight">{longest} hari</p></div>
          <div className="bg-white/15 rounded-xl py-2"><p className="eyebrow !text-[9px] text-white/75">Total</p><p className="display-num text-lg leading-tight">{totalKm.toFixed(1)} km</p></div>
          <div className="bg-white/15 rounded-xl py-2"><p className="eyebrow !text-[9px] text-white/75">Ride</p><p className="display-num text-lg leading-tight">{totalRides}x</p></div>
        </div>
      </div>

      <Link href="/catat/riwayat" className="flex items-center justify-center gap-2 w-full mb-4 bg-white border border-gray-200 text-gray-700 py-2.5 rounded-xl font-semibold text-sm active:scale-[0.98] transition-transform">
        <History size={16} /> Riwayat Perjalanan
      </Link>

      {/* Toggle */}
      <div className="flex bg-slate-200/70 rounded-xl p-1 mb-4">
        <button onClick={() => setTab("catat")} className={`flex-1 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors ${tab === "catat" ? "bg-white shadow text-green-700" : "text-gray-500"}`}><Bike size={16} /> Catat</button>
        <button onClick={() => setTab("papan")} className={`flex-1 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors ${tab === "papan" ? "bg-white shadow text-green-700" : "text-gray-500"}`}><Trophy size={16} /> Peringkat</button>
      </div>

      {tab === "catat" ? (
        <>
          <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-emerald-950 to-green-900 rounded-3xl p-6 text-white shadow-lg mb-4 speed-lines">
            <div className="absolute right-4 top-0 h-full w-5 bg-gradient-to-b from-lime-400 to-green-500 opacity-70" style={{ transform: "skewX(-16deg)" }} />
            <div className="text-center relative">
              <p className="eyebrow !text-[10px] text-lime-300/90 mb-1">Jarak</p>
              <p className="display-num text-7xl tabular-nums leading-none">{km}</p>
              <p className="eyebrow !text-[10px] text-white/60 mt-2">kilometer</p>
              {status === "paused" && (
                <span className="inline-flex items-center gap-1.5 mt-3 bg-white/10 border border-white/20 rounded-full px-3 py-1 text-xs font-semibold text-amber-300">
                  <Pause size={12} /> Dijeda
                </span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2 mt-6 relative">
              <div className="bg-white/10 border border-white/10 rounded-2xl py-3 text-center"><p className="eyebrow !text-[9px] text-white/60">Waktu</p><p className="display-num text-2xl tabular-nums leading-tight">{fmtDuration(duration)}</p></div>
              <div className="bg-white/10 border border-white/10 rounded-2xl py-3 text-center"><p className="eyebrow !text-[9px] text-white/60">{status === "tracking" ? "Kec." : "Rata2"}</p><p className="display-num text-2xl tabular-nums leading-tight">{displaySpeed}</p></div>
              <div className="bg-white/10 border border-white/10 rounded-2xl py-3 text-center"><p className="eyebrow !text-[9px] text-white/60">Elevasi</p><p className="display-num text-2xl tabular-nums leading-tight">{elev}m</p></div>
            </div>
          </div>

          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2 mb-4 flex items-center gap-2"><AlertTriangle size={16} /> {error}</div>}

          {status === "idle" && (
            <button onClick={start} className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-4 rounded-2xl display-title text-xl flex items-center justify-center gap-2 shadow active:scale-95 transition-transform"><Play size={22} /> Mulai Bersepeda</button>
          )}
          {status === "tracking" && (
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2 text-green-700 text-sm font-medium">
                <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-green-600"></span></span>
                Merekam perjalanan...
              </div>
              {wasHidden && !nativeApp && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl px-3 py-2 flex items-start gap-2">
                  <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                  Layar sempat mati / aplikasi di latar belakang — sistem HP menjeda GPS selama itu, jadi sebagian jarak mungkin tidak terekam. Biarkan aplikasi tetap terbuka di layar selama gowes.
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={pause} className="flex-1 bg-slate-700 text-white py-4 rounded-2xl display-title text-lg flex items-center justify-center gap-2 shadow active:scale-95 transition-transform"><Pause size={20} /> Jeda</button>
                <button onClick={finish} className="flex-1 bg-red-600 text-white py-4 rounded-2xl display-title text-lg flex items-center justify-center gap-2 shadow active:scale-95 transition-transform"><Square size={20} /> Selesai</button>
              </div>
              <p className="text-xs text-gray-400 text-center">{nativeApp ? "Perekaman tetap berjalan walau layar mati — notifikasi BUG tampil selama merekam." : "Gowes tetap berjalan walau kamu membuka menu lain di BUG. Layar dijaga tetap menyala otomatis — jangan kunci layar selama merekam."}</p>
            </div>
          )}
          {status === "paused" && (
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2 text-slate-600 text-sm font-medium">
                <Pause size={14} /> Perekaman dijeda. Waktu & jarak berhenti dihitung.
              </div>
              <div className="flex gap-2">
                <button onClick={resume} className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white py-4 rounded-2xl display-title text-lg flex items-center justify-center gap-2 shadow active:scale-95 transition-transform"><Play size={20} /> Lanjut</button>
                <button onClick={finish} className="flex-1 bg-red-600 text-white py-4 rounded-2xl display-title text-lg flex items-center justify-center gap-2 shadow active:scale-95 transition-transform"><Square size={20} /> Selesai</button>
              </div>
              <p className="text-xs text-gray-400 text-center">Perpindahan selama jeda tidak dihitung sebagai jarak gowes.</p>
            </div>
          )}
          {status === "finished" && (
            <div className="space-y-4">
              <div className="rounded-2xl px-4 py-3 text-sm flex items-center gap-2 bg-orange-50 text-orange-700 border border-orange-200">
                <Flame size={18} /> Streak dihitung dari total jarakmu hari ini (minimal 1 km). Simpan untuk memperbaruinya.
              </div>
              <div className="flex gap-2">
                <button onClick={handleDiscard} className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-xl font-medium flex items-center justify-center gap-2"><Trash2 size={18} /> Buang</button>
                <button onClick={save} className="flex-1 bg-green-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"><Save size={18} /> Simpan</button>
              </div>
            </div>
          )}
          {status === "saving" && <button disabled className="w-full bg-gray-400 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2"><Loader2 size={20} className="animate-spin" /> Menyimpan...</button>}
          {status === "saved" && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-2xl p-5 text-center">
                <CheckCircle2 size={40} className="text-green-600 mx-auto mb-2" />
                <h2 className="display-title text-xl text-green-800">Perjalanan Tersimpan!</h2>
                {savedQualifies && savedStreak !== null ? (
                  <>
                    <p className="text-orange-600 display-num text-3xl flex items-center justify-center gap-1 my-1"><Flame size={24} /> {savedStreak} hari beruntun</p>
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
                      style={{ background: `linear-gradient(135deg, ${PALETTES[k].grad[0]} 55%, ${PALETTES[k].accent})` }} />
                  ))}
                </div>
                <div className="flex gap-2 mb-3">
                  <label className="flex-1 py-2 rounded-xl text-xs font-semibold border-2 border-dashed border-gray-300 text-gray-600 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-transform">
                    <ImagePlus size={15} /> {cardPhoto ? "Ganti Foto" : "Tambah Foto"}
                    <input type="file" accept="image/*" className="hidden" onChange={pickPhoto} />
                  </label>
                  {cardPhoto && (
                    <button onClick={() => setCardPhoto(null)} className="px-3 rounded-xl border-2 border-gray-200 text-gray-500 active:scale-95 transition-transform" aria-label="Hapus foto">
                      <X size={16} />
                    </button>
                  )}
                  <button onClick={() => setCardTransparent((v) => !v)}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold border-2 transition-colors ${cardTransparent ? "border-green-600 bg-green-50 text-green-700" : "border-gray-200 text-gray-600"}`}>
                    Latar transparan
                  </button>
                </div>
                <canvas ref={cardRef} className={`w-full h-auto rounded-2xl shadow border border-gray-200 ${cardTransparent ? "bg-[repeating-conic-gradient(#e5e7eb_0%_25%,#ffffff_0%_50%)] bg-[length:22px_22px]" : ""}`} />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button onClick={shareCard} className="bg-green-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-1.5 text-sm active:scale-95 transition-transform">
                  <Share2 size={16} /> Bagikan
                </button>
                <button onClick={downloadCard} className="bg-gray-800 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-1.5 text-sm active:scale-95 transition-transform">
                  <Download size={16} /> Unduh
                </button>
                <button onClick={shareToForum} disabled={sharingForum} className="bg-violet-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-1.5 text-sm disabled:bg-gray-400 active:scale-95 transition-transform">
                  {sharingForum ? <Loader2 size={16} className="animate-spin" /> : <MessageSquarePlus size={16} />} Ke Forum
                </button>
              </div>

              <div className="flex gap-2">
                <button onClick={handleDiscard} className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2"><Bike size={18} /> Catat Lagi</button>
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
                <div className="w-7 text-center display-num text-lg text-gray-500">{i < 3 ? medal[i] : i + 1}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{r.name}{me ? " (kamu)" : ""}</p>
                  <p className="text-xs text-gray-500 truncate">{r.org} · {r.km.toFixed(1)} km · {r.rides}x</p>
                </div>
                <div className="flex items-center gap-1 text-orange-600 display-num text-xl"><Flame size={18} /> {r.streak}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
