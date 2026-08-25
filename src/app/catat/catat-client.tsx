"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useGowes } from "../gowes-provider";
import { isNativeApp } from "@/lib/native-geo";
import { shareImageDataUrl, downloadCanvasPng } from "@/lib/native-share";
import { drawCard, loadImage, fmtDuration, PALETTES, PALETTE_KEYS, TEMPLATES } from "@/lib/gowes-card";
import { placeNameFromPath } from "@/lib/place-name";
import { kirimKartuKeStory } from "@/lib/kirim-story";
import { meter } from "@/lib/angka";
import JejakRute, { type Titik } from "@/components/jejak-rute";
import RodaLatar from "@/components/roda-latar";
import {
  Play, Pause, Square, Loader2, Save, Trash2, CheckCircle2,
  Flame, AlertTriangle, Trophy, Bike, Share2, MessageSquarePlus, History,
  ImagePlus, X, Download, Sparkles,
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
  const [sharingStory, setSharingStory] = useState(false);
  const [storyMsg, setStoryMsg] = useState("");
  const [template, setTemplate] = useState("blok");
  const [palette, setPalette] = useState("hijau");
  // Nama daerah diisi dari GPS (reverse geocoding), bukan nilai tetap,
  // agar kartu & caption mengikuti lokasi gowes yang sebenarnya.
  const [placeName, setPlaceName] = useState("");
  const [placeLoading, setPlaceLoading] = useState(false);
  const placeReqRef = useRef(false);   // pencarian nama daerah sudah dijalankan?
  const mountedRef = useRef(true);
  const [cardPhoto, setCardPhoto] = useState<HTMLImageElement | null>(null);
  const [cardTransparent, setCardTransparent] = useState(false);
  const cardRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Gambar kartu saat layar tersimpan tampil (atau saat template/warna/lokasi diubah).
  // Digambar lagi setelah font display selesai dimuat agar tipografinya benar.
  useEffect(() => {
    // Jangan gambar kartu selama nama lokasi masih dicari, supaya tidak
    // sempat tampil nama daerah yang salah lalu berubah.
    if (placeLoading) return;
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
  }, [status, duration, savedElev, template, palette, placeName, cardPhoto, cardTransparent, placeLoading]);

  // Deteksi nama daerah tempat gowes (dari titik tengah rute) untuk kartu & caption.
  // Dicari SEKALI per perjalanan, dan TIDAK dibatalkan saat status berubah
  // (finished -> saved), supaya penanda "sedang mencari" selalu dimatikan -
  // dulu di sinilah kartu bisa terkunci dan tidak pernah tergambar.
  useEffect(() => {
    // Perjalanan baru dimulai: siapkan pencarian ulang
    if (status === "tracking" && placeReqRef.current) {
      placeReqRef.current = false;
      setPlaceName("");
      return;
    }
    if (status !== "finished" && status !== "saved") return;
    if (placeReqRef.current) return;
    const path = getPath();
    if (!path || path.length === 0) return;

    placeReqRef.current = true;
    setPlaceLoading(true);
    // Pengaman: kartu tidak boleh tertahan lebih dari 3 detik apa pun yang terjadi
    const guard = setTimeout(() => {
      if (mountedRef.current) setPlaceLoading(false);
    }, 3000);

    (async () => {
      const name = await placeNameFromPath(path);
      clearTimeout(guard);
      if (!mountedRef.current) return;
      if (name) setPlaceName(name);
      setPlaceLoading(false);
    })();
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
  async function downloadCard() {
    const canvas = cardRef.current;
    if (!canvas) return;
    const name = cardTransparent ? "gowes-bug-transparan.png" : "gowes-bug.png";
    const r = await downloadCanvasPng(canvas, name);
    if (r.status === "failed") alert(`Gagal mengunduh: ${r.error || "tidak diketahui"}`);
    else if (r.savedTo) alert(`Kartu tersimpan di ${r.savedTo}`);
  }

  // Kartu gowes dikirim sebagai Story yang tayang 24 jam.
  async function kartuKeStory() {
    const canvas = cardRef.current;
    if (!canvas || sharingStory) return;
    setSharingStory(true); setStoryMsg("");
    try {
      await kirimKartuKeStory(canvas, `Gowes ${km} km di Bulungan`);
      setStoryMsg("Story tayang 24 jam - cek di halaman Umpan.");
    } catch (err) {
      setStoryMsg(err instanceof Error ? err.message : "Gagal membuat story.");
    } finally { setSharingStory(false); }
  }

  function shareCard() {
    const canvas = cardRef.current;
    if (!canvas) return;
    const km = (getStats().distanceM / 1000).toFixed(2);
    const text = placeName
      ? `Baru saja gowes ${km} km di ${placeName} bersama BUG! 🚴 #GoweserAman${placeName.replace(/\s+/g, "")}`
      : `Baru saja gowes ${km} km bersama BUG! 🚴`;
    // Di aplikasi Android: file ditulis ke cache lalu share sheet native.
    // Di browser: Web Share API; kalau tak ada → unduh otomatis.
    const dataUrl = canvas.toDataURL("image/png");
    void shareImageDataUrl(dataUrl, "gowes-bug.png", text).then((r) => {
      if (r.status === "failed") alert(`Gagal membagikan: ${r.error || "tidak diketahui"}`);
    });
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

      const title = placeName ? `Gowes ${km} km di ${placeName}` : `Gowes ${km} km`;
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
    <div className="min-h-screen bg-[var(--latar)] px-4 pt-5 max-w-md mx-auto pb-8">
      {/* Ringkasan beruntun: ringkas, tidak mencuri perhatian dari angka jarak */}
      <div className="kartu-bug px-4 py-3 mb-3 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Flame size={18} className="text-amber-400" />
          <p className="display-num text-2xl leading-none text-white">{myStreak}<span className="display-title text-[11px] text-slate-500 ml-1">hari</span></p>
        </div>
        <div className="ml-auto flex gap-4 text-right">
          <div><p className="display-num text-base leading-none text-slate-200">{longest}</p><p className="eyebrow !text-[8px] text-slate-500 mt-1">rekor</p></div>
          <div><p className="display-num text-base leading-none text-slate-200">{totalKm.toFixed(1)}</p><p className="eyebrow !text-[8px] text-slate-500 mt-1">km total</p></div>
          <div><p className="display-num text-base leading-none text-slate-200">{totalRides}</p><p className="eyebrow !text-[8px] text-slate-500 mt-1">perjalanan</p></div>
        </div>
      </div>

      <Link href="/catat/riwayat" className="flex items-center justify-center gap-2 w-full mb-3 border border-white/10 text-slate-300 py-2.5 rounded-xl font-semibold text-sm active:scale-[0.98] transition-transform">
        <History size={16} /> Riwayat Perjalanan
      </Link>

      {/* Toggle */}
      <div className="flex bg-[var(--kartu)] border border-white/8 rounded-xl p-1 mb-4">
        <button onClick={() => setTab("catat")} className={`flex-1 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors ${tab === "catat" ? "bg-lime-400/15 text-lime-300" : "text-slate-500"}`}><Bike size={16} /> Catat</button>
        <button onClick={() => setTab("papan")} className={`flex-1 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors ${tab === "papan" ? "bg-lime-400/15 text-lime-300" : "text-slate-500"}`}><Trophy size={16} /> Peringkat</button>
      </div>

      {tab === "catat" ? (
        <>
          {/* Kartu jarak: angka besar di atas geometri jeruji roda */}
          <div className="relative overflow-hidden rounded-3xl border border-lime-400/18 p-6 mb-4 butiran" style={{ background: "radial-gradient(130% 90% at 50% 0%, rgba(180,255,58,.10) 0%, var(--kartu) 58%)" }}>
            <RodaLatar className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] opacity-60 pointer-events-none" putar={status === "tracking"} />

            <div className="relative flex items-center justify-between mb-4">
              <div>
                <p className="eyebrow !text-[9px] text-slate-500">
                  {status === "tracking" ? "Sedang merekam" : status === "paused" ? "Perekaman dijeda" : "Siap merekam"}
                </p>
                <p className="display-title text-[15px] text-white mt-0.5">GOWES DI BULUNGAN</p>
              </div>
              {status === "tracking" && (
                <span className="flex items-center gap-1.5 rounded-full border border-red-500/40 bg-red-500/10 px-2.5 py-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  <span className="eyebrow !text-[9px] text-red-400">Live</span>
                </span>
              )}
            </div>

            <div className="relative text-center py-3">
              <p className="eyebrow !text-[9px] text-slate-500 mb-1">Jarak tempuh</p>
              <p className="display-num text-[68px] tabular-nums leading-none text-white">
                {km.split(".")[0]}<span className="text-lime-400">.{km.split(".")[1] ?? "00"}</span>
              </p>
              <p className="eyebrow !text-[9px] text-slate-500 mt-2">kilometer</p>
            </div>

            <div className="relative grid grid-cols-3 gap-2 mt-5 jenjang">
              {[
                { l: "Waktu", v: fmtDuration(duration) },
                { l: status === "tracking" ? "Kec." : "Kec. rata", v: displaySpeed },
                { l: "Elevasi", v: `${meter(Number(elev))} m` },
              ].map((b) => (
                <div key={b.l} className="rounded-2xl border border-white/8 bg-[var(--relung)] py-3 text-center">
                  <p className="eyebrow !text-[8px] text-slate-500">{b.l}</p>
                  <p className="display-num text-xl tabular-nums leading-tight text-white mt-0.5">{b.v}</p>
                </div>
              ))}
            </div>

            {/* Jejak hari ini, dari titik GPS yang sudah terekam */}
            <div className="relative mt-3 rounded-2xl border border-white/8 bg-[var(--relung)] py-2 flex flex-col items-center">
              <JejakRute path={(getPath() as Titik[] | null)} width={250} height={64} tebal={2.2} />
              <p className="eyebrow !text-[8px] text-slate-600 pb-1">jalur hari ini</p>
            </div>
          </div>

          {error && <div className="bg-red-500/10 border border-red-400/25 text-red-300 text-sm rounded-lg px-3 py-2 mb-4 flex items-center gap-2"><AlertTriangle size={16} /> {error}</div>}

          {status === "idle" && (
            <button onClick={start} className="w-full bg-gradient-to-r from-lime-400 to-emerald-500 text-slate-950 py-4 rounded-2xl display-title text-xl flex items-center justify-center gap-2 shadow-[0_0_24px_rgba(180,255,58,.25)] active:scale-95 transition-transform"><Play size={22} /> Mulai Bersepeda</button>
          )}
          {status === "tracking" && (
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2 text-lime-300 text-sm font-medium">
                <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-green-600"></span></span>
                Merekam perjalanan...
              </div>
              {wasHidden && !nativeApp && (
                <div className="bg-amber-400/10 border border-amber-400/25 text-amber-300 text-xs rounded-xl px-3 py-2 flex items-start gap-2">
                  <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                  Layar sempat mati / aplikasi di latar belakang, sistem HP menjeda GPS selama itu, jadi sebagian jarak mungkin tidak terekam. Biarkan aplikasi tetap terbuka di layar selama gowes.
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={pause} className="flex-1 border border-white/15 text-slate-200 py-4 rounded-2xl display-title text-lg flex items-center justify-center gap-2 active:scale-95 transition-transform"><Pause size={20} /> Jeda</button>
                <button onClick={finish} className="flex-1 bg-red-600 text-white py-4 rounded-2xl display-title text-lg flex items-center justify-center gap-2 shadow active:scale-95 transition-transform"><Square size={20} /> Selesai</button>
              </div>
              <p className="text-xs text-slate-500 text-center">{nativeApp ? "Perekaman tetap berjalan walau layar mati, notifikasi BUG tampil selama merekam." : "Gowes tetap berjalan walau kamu membuka menu lain di BUG. Layar dijaga tetap menyala otomatis, jangan kunci layar selama merekam."}</p>
            </div>
          )}
          {status === "paused" && (
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2 text-slate-400 text-sm font-medium">
                <Pause size={14} /> Perekaman dijeda. Waktu & jarak berhenti dihitung.
              </div>
              <div className="flex gap-2">
                <button onClick={resume} className="flex-1 bg-gradient-to-r from-lime-400 to-emerald-500 text-slate-950 py-4 rounded-2xl display-title text-lg flex items-center justify-center gap-2 shadow active:scale-95 transition-transform"><Play size={20} /> Lanjut</button>
                <button onClick={finish} className="flex-1 bg-red-600 text-white py-4 rounded-2xl display-title text-lg flex items-center justify-center gap-2 shadow active:scale-95 transition-transform"><Square size={20} /> Selesai</button>
              </div>
              <p className="text-xs text-slate-500 text-center">Perpindahan selama jeda tidak dihitung sebagai jarak gowes.</p>
            </div>
          )}
          {status === "finished" && (
            <div className="space-y-4">
              <div className="rounded-2xl px-4 py-3 text-sm flex items-center gap-2 bg-amber-400/10 text-amber-300 border border-amber-400/25">
                <Flame size={18} /> Streak dihitung dari total jarakmu hari ini (minimal 1 km). Simpan untuk memperbaruinya.
              </div>
              <div className="flex gap-2">
                <button onClick={handleDiscard} className="flex-1 border border-white/15 text-slate-200 py-3 rounded-xl font-medium flex items-center justify-center gap-2"><Trash2 size={18} /> Buang</button>
                <button onClick={save} className="flex-1 bg-gradient-to-r from-lime-400 to-emerald-500 text-slate-950 py-3 rounded-xl font-semibold flex items-center justify-center gap-2"><Save size={18} /> Simpan</button>
              </div>
            </div>
          )}
          {status === "saving" && <button disabled className="w-full bg-white/10 text-slate-300 py-4 rounded-2xl font-bold flex items-center justify-center gap-2"><Loader2 size={20} className="animate-spin" /> Menyimpan...</button>}
          {status === "saved" && (
            <div className="space-y-4">
              <div className="bg-lime-400/10 border border-lime-400/25 rounded-2xl p-5 text-center">
                <CheckCircle2 size={40} className="text-lime-400 mx-auto mb-2" />
                <h2 className="display-title text-xl text-lime-300">Perjalanan Tersimpan!</h2>
                {savedQualifies && savedStreak !== null ? (
                  <>
                    <p className="text-amber-400 display-num text-3xl flex items-center justify-center gap-1 my-1"><Flame size={24} /> {savedStreak} hari beruntun</p>
                    <p className="text-sm text-lime-300">Total hari ini {savedTodayKm} km. Streak aman!</p>
                  </>
                ) : (
                  <p className="text-sm text-slate-400 my-1">Total hari ini {savedTodayKm} km. Kurang {Math.max(0, Math.round((1 - savedTodayKm) * 100) / 100)} km lagi untuk streak hari ini.</p>
                )}
              </div>

              {/* Kartu untuk dibagikan: pilih template + warna */}
              <div>
                <p className="text-xs text-slate-400 mb-2 font-medium">Pilih tampilan kartu</p>
                <div className="flex gap-2 mb-3">
                  {TEMPLATES.map((t) => (
                    <button key={t.key} onClick={() => setTemplate(t.key)}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold border-2 transition-colors ${template === t.key ? "border-lime-400/60 bg-lime-400/10 text-lime-300" : "border-white/10 text-slate-400"}`}>
                      {t.name}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2.5 mb-3">
                  {PALETTE_KEYS.map((k) => (
                    <button key={k} onClick={() => setPalette(k)} title={PALETTES[k].name} aria-label={PALETTES[k].name}
                      className={`w-9 h-9 rounded-full transition-transform active:scale-90 ${palette === k ? "ring-2 ring-offset-2 ring-offset-[var(--latar)] ring-lime-400" : "ring-1 ring-white/15"}`}
                      style={{ background: `linear-gradient(135deg, ${PALETTES[k].grad[0]} 55%, ${PALETTES[k].accent})` }} />
                  ))}
                </div>
                <div className="flex gap-2 mb-3">
                  <label className="flex-1 py-2 rounded-xl text-xs font-semibold border-2 border-dashed border-white/15 text-slate-400 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-transform">
                    <ImagePlus size={15} /> {cardPhoto ? "Ganti Foto" : "Tambah Foto"}
                    <input type="file" accept="image/*" className="hidden" onChange={pickPhoto} />
                  </label>
                  {cardPhoto && (
                    <button onClick={() => setCardPhoto(null)} className="px-3 rounded-xl border-2 border-white/10 text-slate-400 active:scale-95 transition-transform" aria-label="Hapus foto">
                      <X size={16} />
                    </button>
                  )}
                  <button onClick={() => setCardTransparent((v) => !v)}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold border-2 transition-colors ${cardTransparent ? "border-lime-400/60 bg-lime-400/10 text-lime-300" : "border-white/10 text-slate-400"}`}>
                    Latar transparan
                  </button>
                </div>
                <canvas ref={cardRef} className={`w-full h-auto rounded-2xl shadow border border-white/10 ${cardTransparent ? "bg-[repeating-conic-gradient(#e5e7eb_0%_25%,#ffffff_0%_50%)] bg-[length:22px_22px]" : ""}`} />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button onClick={shareCard} className="bg-gradient-to-r from-lime-400 to-emerald-500 text-slate-950 py-3 rounded-xl font-semibold flex items-center justify-center gap-1.5 text-sm active:scale-95 transition-transform">
                  <Share2 size={16} /> Bagikan
                </button>
                <button onClick={downloadCard} className="border border-white/15 text-slate-200 py-3 rounded-xl font-semibold flex items-center justify-center gap-1.5 text-sm active:scale-95 transition-transform">
                  <Download size={16} /> Unduh
                </button>
                <button onClick={shareToForum} disabled={sharingForum} className="border border-violet-400/40 text-violet-300 py-3 rounded-xl font-semibold flex items-center justify-center gap-1.5 text-sm disabled:opacity-50 active:scale-95 transition-transform">
                  {sharingForum ? <Loader2 size={16} className="animate-spin" /> : <MessageSquarePlus size={16} />} Ke Forum
                </button>
              </div>
              <button onClick={kartuKeStory} disabled={sharingStory}
                className="w-full border border-lime-400/35 text-lime-300 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 text-sm disabled:opacity-50 active:scale-95 transition-transform">
                {sharingStory ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} Bagikan ke Story (24 jam)
              </button>
              {storyMsg && <p className="text-[11px] text-slate-400 -mt-2">{storyMsg}</p>}

              <div className="flex gap-2">
                <button onClick={handleDiscard} className="flex-1 border border-white/15 text-slate-200 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2"><Bike size={18} /> Catat Lagi</button>
                <button onClick={() => setTab("papan")} className="flex-1 border border-white/10 text-slate-200 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-1.5"><Trophy size={16} /> Peringkat</button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-2">
          {board.length === 0 ? (
            <p className="text-center text-slate-500 py-12 text-sm">Belum ada peserta. Catat perjalanan pertamamu!</p>
          ) : board.map((r, i) => {
            const me = r.user_id === userId;
            return (
              <div key={r.user_id} className={`flex items-center gap-3 rounded-xl px-3 py-3 shadow-sm ${me ? "bg-lime-400/10 border border-lime-400/40" : "bg-[var(--kartu)] border border-white/5"}`}>
                <div className="w-7 text-center display-num text-lg text-slate-400">{i < 3 ? medal[i] : i + 1}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white truncate">{r.name}{me ? " (kamu)" : ""}</p>
                  <p className="text-xs text-slate-400 truncate">{r.org} · {r.km.toFixed(1)} km · {r.rides}x</p>
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
