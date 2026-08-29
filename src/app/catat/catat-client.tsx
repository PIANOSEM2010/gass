"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useGowes } from "../gowes-provider";
import { isNativeApp } from "@/lib/native-geo";
import { shareImageDataUrl, downloadCanvasPng } from "@/lib/native-share";
import { drawCard, loadImage, fmtDuration, PALETTES, PALETTE_KEYS, TEMPLATES } from "@/lib/gowes-card";
import { gambarKartuTanah, TEMPLATE_TANAH, WARNA_TANAH, WARNA_TANAH_KEYS, type Rasio } from "@/lib/kartu-tanah";
import { placeNameFromPath } from "@/lib/place-name";
import { kirimKartuKeStory } from "@/lib/kirim-story";
import { type TitikEvent } from "@/lib/titik-event";
import { useNav } from "../nav-provider";
import { fetchRoute } from "@/lib/routing";
import PanduanBelok from "@/components/panduan-belok";
import { IkonCatatGowes } from "@/components/fitur-ikon";
import { periksaRekorPribadi, type Rekor } from "@/lib/rekor-pribadi";
import { Podium, type Peserta } from "@/app/leaderboard/podium";
import PenjagaDiam from "@/components/penjaga-diam";
import { useSearchParams } from "next/navigation";
import { Avatar } from "@/components/umpan-kartu";
import { meter } from "@/lib/angka";
import JejakRute, { type Titik } from "@/components/jejak-rute";
import RodaLatar from "@/components/roda-latar";
import dynamic from "next/dynamic";

// Peta hanya dimuat di peramban; Leaflet tidak bisa dirender di server.
const PetaLangsung = dynamic(() => import("./peta-langsung"), {
  ssr: false,
  loading: () => <div className="rounded-3xl bg-[var(--relung)] animate-pulse" style={{ height: 260 }} />,
});
import {
  Play, Pause, Square, Loader2, Save, Trash2, CheckCircle2,
  Flame, AlertTriangle, Trophy, Bike, Share2, MessageSquarePlus, History,
  ImagePlus, X, Download, Sparkles,
} from "lucide-react";

type BoardItem = { user_id: string; name: string; org: string; km: number; rides: number; streak: number };

// Pemberitahuan jujur tentang perekaman saat layar terkunci.
//
// Di peramban, JavaScript dibekukan begitu layar dimatikan, dan tidak ada cara
// mengubah itu dari sisi web: pembatasan ini dibuat sistem operasi demi baterai
// dan privasi. Yang bisa dilakukan aplikasi hanyalah menahan layar tetap menyala
// selama merekam, dan menambal jarak yang hilang bila layar sempat terkunci.
// Perekaman penuh dengan layar mati hanya tersedia lewat aplikasi Android, yang
// memakai layanan lokasi latar belakang.
function CatatanLayarTerkunci({ perkiraanM, merekam, penjagaLatar }: { perkiraanM: number; merekam: boolean; penjagaLatar: boolean }) {
  const [diAplikasi, setDiAplikasi] = useState(true);
  const [layarTertahan, setLayarTertahan] = useState(true);

  useEffect(() => {
    try {
      const w = window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } };
      setDiAplikasi(Boolean(w.Capacitor?.isNativePlatform?.()));
      setLayarTertahan("wakeLock" in navigator);
    } catch { setDiAplikasi(false); }
  }, []);

  if (diAplikasi) return null;

  return (
    <>
      {merekam && penjagaLatar && (
        <div className="mb-3 rounded-2xl border border-lime-400/35 bg-lime-400/10 px-4 py-3">
          <p className="display-title text-[13px] text-lime-300">PENJAGA LATAR AKTIF</p>
          <p className="text-[11.5px] text-lime-100/85 mt-1 leading-relaxed">
            Kamu boleh mengunci layar; pencatatan tetap berjalan. Akan muncul pemberitahuan
            pemutar media dari BUG di bilah notifikasi &mdash; <strong>jangan ditutup</strong>,
            karena itulah yang menjaga pencatatan tetap hidup. Baterai akan lebih boros
            daripada biasanya.
          </p>
        </div>
      )}

      {merekam && !penjagaLatar && (
        <div className="mb-3 rounded-2xl border border-amber-400/35 bg-amber-400/10 px-4 py-3">
          <p className="display-title text-[13px] text-amber-300">JANGAN KUNCI LAYAR</p>
          <p className="text-[11.5px] text-amber-100/85 mt-1 leading-relaxed">
            Peramban ini tidak bisa menjaga pencatatan saat layar mati
            {layarTertahan ? ", jadi layar ditahan tetap menyala" : ""}. Kalau layar dikunci,
            jaraknya ditambal sebagai perkiraan. Pasang aplikasi BUG untuk perekaman penuh
            dengan layar mati.
          </p>
        </div>
      )}

      {perkiraanM > 0 && (
        <div className="mb-3 rounded-2xl border border-sky-400/30 bg-sky-400/10 px-4 py-3">
          <p className="display-title text-[13px] text-sky-300">
            {Math.round(perkiraanM)} M DIHITUNG SEBAGAI PERKIRAAN
          </p>
          <p className="text-[11.5px] text-sky-100/85 mt-1 leading-relaxed">
            Layar sempat terkunci, jadi bagian itu diukur sebagai garis lurus antara dua
            titik GPS. Jaraknya ikut terhitung, tetapi bentuk jalannya tidak terekam.
          </p>
        </div>
      )}
    </>
  );
}

export default function CatatClient({
  userId, fullName, organization, myStreak, longest, totalKm, totalRides, board,
}: {
  userId: string; fullName: string; organization: string;
  myStreak: number; longest: number; totalKm: number; totalRides: number; board: BoardItem[];
}) {
  const router = useRouter();
  // Mesin gowes global (provider di root layout) agar tetap jalan saat buka menu lain
  const { perkiraanM, penjagaLatar, status, setStatus, distance, duration, speed, elev, error, setError, start, pause, resume, finish, discard, getStats, getPath } = useGowes();

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
  const [rekor, setRekor] = useState<Rekor[]>([]);
  const [sharingForum, setSharingForum] = useState(false);
  const [sharingStory, setSharingStory] = useState(false);
  const [storyMsg, setStoryMsg] = useState("");
  const [rasio, setRasio] = useState<Rasio>("1:1");
  // Datang dari tombol "Mulai Event": perekaman dijalankan sendiri, dan
  // perjalanan yang tersimpan diberi penanda event supaya bisa dihitung
  // sebagai keikutsertaan.
  const params = useSearchParams();
  const eventId = params?.get("event") || null;
  const [namaEvent, setNamaEvent] = useState("");
  const [jalurEvent, setJalurEvent] = useState<TitikEvent[] | null>(null);
  const nav = useNav();
  const [siapkanPanduan, setSiapkanPanduan] = useState(false);
  const sudahMulaiOtomatis = useRef(false);
  const [warnaTanah, setWarnaTanah] = useState("terakota");
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
        const umum = {
          place: placeName,
          path: getPath(), distanceM: st.distanceM, durationS: duration,
          elevM: savedElev ?? st.elevM,
          photo: cardPhoto, transparent: cardTransparent,
        };
        // Keluarga "Tanah" punya penggambar sendiri beserta pilihan rasio.
        if (TEMPLATE_TANAH.some((t) => t.key === template)) {
          gambarKartuTanah(cardRef.current, {
            ...umum, template, warna: warnaTanah, rasio,
            kalori: Math.round((st.distanceM / 1000) * 35),
          });
        } else {
          drawCard(cardRef.current, { ...umum, template, palette });
        }
      };
      doDraw();
      if (typeof document !== "undefined" && document.fonts?.ready) {
        document.fonts.ready.then(doDraw).catch(() => { /* abaikan */ });
      }
    }
    // getStats/getPath sengaja tidak dimasukkan dep (stabil, dibaca saat efek jalan)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, duration, savedElev, template, palette, placeName, cardPhoto, cardTransparent, placeLoading, rasio, warnaTanah]);

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
          event_id: eventId,
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
      // Panduan belok dimatikan begitu perjalanan tersimpan.
      if (nav.navigating) nav.stop();
      router.refresh();
      // Rekor diperiksa setelah tersimpan, supaya perjalanan ini sudah ada di
      // basis data dan bisa dikeluarkan dari daftar pembanding.
      // Catat bahwa peserta menyelesaikan event ini.
      if (eventId && data?.id) {
        void createClient().from("event_participants").update({
          finished_at: new Date().toISOString(),
          activity_id: data.id,
        }).eq("event_id", eventId).eq("user_id", userId);
      }

      periksaRekorPribadi(userId, {
        distanceM: st.distanceM,
        durationS: st.durationS,
        elevM: typeof data.elevation_gain_m === "number" ? data.elevation_gain_m : st.elevM,
      }).then(setRekor).catch(() => setRekor([]));
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

  useEffect(() => {
    if (!eventId || sudahMulaiOtomatis.current) return;
    sudahMulaiOtomatis.current = true;
    (async () => {
      try {
        const sb = createClient();
        const { data } = await sb.from("events").select("name,waypoints").eq("id", eventId).maybeSingle();
        if (data?.name) setNamaEvent(String(data.name));
        // Jalur event ikut diambil agar tergambar sebagai acuan di peta.
        if (Array.isArray(data?.waypoints)) {
          const titikEvent = data.waypoints as TitikEvent[];
          setJalurEvent(titikEvent);
          // Panduan belok disusun dari cek point event: tiap ruas dihitung
          // lewat mesin rute, lalu petunjuk beloknya disambung jadi satu.
          void susunPanduan(titikEvent, String(data.name || "Jalur event"));
        }
      } catch { /* nama event hanya hiasan, jangan menghalangi perekaman */ }
    })();
    if (params?.get("mulai") === "1" && status === "idle") {
      // Ditunda satu putaran agar izin lokasi sempat siap lebih dulu.
      setTimeout(() => { void start(); }, 600);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  // Menyusun panduan belok dari titik-titik jalur event.
  //
  // Yang dipakai sebagai titik singgah hanyalah CEK POINT, bukan seluruh titik
  // pembentuk jalur: mesin rute hanya menerima dua titik sekali jalan, dan
  // memintanya untuk ratusan titik akan lambat sekaligus menghabiskan kuota.
  async function susunPanduan(titikEvent: TitikEvent[], label: string) {
    const singgah = titikEvent.filter((t) => t.cek);
    const daftar = singgah.length >= 2
      ? singgah
      : [titikEvent[0], titikEvent[titikEvent.length - 1]].filter(Boolean);
    if (daftar.length < 2) return;

    setSiapkanPanduan(true);
    try {
      const koordinat: [number, number][] = [];
      const langkah: Awaited<ReturnType<typeof fetchRoute>>["steps"] = [];
      let jarak = 0, durasi = 0;

      for (let i = 0; i < daftar.length - 1; i++) {
        const ruas = await fetchRoute(
          { lat: daftar[i].lat, lng: daftar[i].lng },
          { lat: daftar[i + 1].lat, lng: daftar[i + 1].lng },
          null,
        );
        // Titik sambungan antar ruas jangan digandakan.
        koordinat.push(...(i === 0 ? ruas.coords : ruas.coords.slice(1)));
        langkah.push(...ruas.steps);
        jarak += ruas.info.distance;
        durasi += ruas.info.duration;
      }

      const akhir = daftar[daftar.length - 1];
      nav.begin({
        coords: koordinat,
        steps: langkah,
        info: { distance: jarak, duration: durasi },
        dest: { lat: akhir.lat, lng: akhir.lng },
        label,
      }, null);
    } catch {
      // Panduan gagal disusun bukan alasan menghentikan pencatatan gowes.
      setError("Panduan belok tidak bisa disusun. Pencatatan gowes tetap berjalan.");
    } finally {
      setSiapkanPanduan(false);
    }
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
  const displaySpeed = (status === "tracking" ? speed : avgSpeed).toFixed(1).replace(".", ",");
  // Kecepatan tertinggi selama sesi, dipakai di blok angka pendukung.
  const maxSpeedRef = useRef(0);
  if (status === "tracking" && speed > maxSpeedRef.current) maxSpeedRef.current = speed;
  if (status === "idle") maxSpeedRef.current = 0;
  const maxSpeed = maxSpeedRef.current;
  const medal = ["🥇", "🥈", "🥉"];

  return (
    <div className="min-h-screen bg-[var(--latar)] px-4 pt-5 max-w-md mx-auto pb-8">
      <PenjagaDiam aktif={status === "tracking"} distanceM={distance} />

      <CatatanLayarTerkunci perkiraanM={perkiraanM} merekam={status === "tracking"} penjagaLatar={penjagaLatar} />

      {eventId && <PanduanBelok />}

      {eventId && siapkanPanduan && (
        <p className="mb-3 rounded-xl border border-sky-400/25 bg-sky-400/10 px-4 py-2.5 text-[11.5px] text-sky-200">
          Menyusun panduan belok dari jalur event…
        </p>
      )}

      {eventId && (
        <div className="mb-3 rounded-2xl border border-orange-400/30 bg-orange-400/10 px-4 py-3">
          <p className="eyebrow !text-[9px] text-orange-300">Sedang mengikuti event</p>
          <p className="display-title text-[14px] text-white mt-0.5">
            {namaEvent || "Memuat nama event…"}
          </p>
          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
            {jalurEvent && jalurEvent.length > 1
              ? "Jalur event tergambar oranye putus-putus di peta. Jejakmu sendiri hijau pekat. "
              : ""}
            Perjalanan ini otomatis tersimpan sebagai bagian dari event begitu kamu menekan Selesai lalu Simpan.
          </p>
        </div>
      )}
      {/* Ringkasan beruntun: ringkas, tidak mencuri perhatian dari angka jarak */}
      <div className="kartu-bug px-4 py-3 mb-3 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Flame size={18} className="text-amber-400" />
          <p className="display-num text-2xl leading-none text-white">{myStreak}<span className="display-title text-[11px] text-slate-500 ml-1">hari</span></p>
        </div>
        <div className="ml-auto flex gap-4 text-right">
          <div><p className="display-num text-base leading-none text-slate-200">{longest}</p><p className="eyebrow !text-[8px] text-slate-500 mt-1">rekor</p></div>
          <div><p className="display-num text-base leading-none text-slate-200">{totalKm.toFixed(1).replace(".", ",")}</p><p className="eyebrow !text-[8px] text-slate-500 mt-1">km total</p></div>
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
          {/* ---- Susunan "Blok Tegas": tiap angka punya bloknya sendiri ----
              Angka jarak dibiarkan sebesar mungkin di blok kertas, sisanya
              turun ke blok-blok kecil. Saat merekam, waktu bergerak ikut
              tampil karena itu angka yang paling sering dilihat di jalan. */}
          <div className="mb-3 flex items-center justify-between">
            <span className="inline-flex items-center gap-2 rounded-full bg-lime-400 text-slate-950 px-3 py-1">
              <IkonCatatGowes size={15} aksen="#062014" />
              <span className="display-title !text-[11px] tracking-wide">BUG</span>
            </span>
            <span className="eyebrow !text-[9px] text-slate-500">
              {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }).toUpperCase()} · BULUNGAN
            </span>
          </div>

          {/* Blok utama: angka jarak setinggi blok */}
          <div className="relative overflow-hidden rounded-3xl p-5 pb-6 butiran border border-lime-400/20"
            style={{ background: "radial-gradient(120% 100% at 12% 0%, rgba(180,255,58,.14) 0%, var(--kartu) 62%)" }}>
            <RodaLatar className="absolute -right-16 -top-14 w-[240px] h-[240px] opacity-45 pointer-events-none" putar={status === "tracking"} />

            <div className="relative flex items-start justify-between">
              <p className="eyebrow !text-[9px] text-lime-400/80">Gowes di Bulungan</p>
              {status === "tracking" ? (
                <span className="flex items-center gap-1.5 rounded-full border border-red-500/45 bg-red-500/12 px-2.5 py-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  <span className="eyebrow !text-[9px] text-red-400">Merekam</span>
                </span>
              ) : status === "paused" ? (
                <span className="rounded-full border border-amber-400/40 bg-amber-400/12 px-2.5 py-1 eyebrow !text-[9px] text-amber-300">Dijeda</span>
              ) : status === "saved" ? (
                <span className="rounded-full border border-lime-400/45 bg-lime-400/12 px-2.5 py-1 eyebrow !text-[9px] text-lime-300">Tersimpan</span>
              ) : (
                <span className="rounded-full border border-white/12 px-2.5 py-1 eyebrow !text-[9px] text-slate-400">Siap</span>
              )}
            </div>

            <div className="relative flex items-end gap-1.5 mt-1">
              <span className="display-num text-[86px] leading-[0.82] tabular-nums text-white">{km.split(".")[0]}</span>
              <span className="display-num text-[52px] leading-[1] tabular-nums text-lime-400">,{km.split(".")[1] ?? "00"}</span>
            </div>
            <p className="relative eyebrow !text-[10px] text-slate-500 mt-2">kilometer</p>

            {/* Waktu bergerak: angka kedua yang paling dilihat saat di jalan */}
            <div className="relative mt-4 flex items-end justify-between border-t border-white/8 pt-3">
              <div>
                <p className="eyebrow !text-[8.5px] text-slate-500">{status === "tracking" ? "Waktu bergerak" : "Waktu"}</p>
                <p className="display-num text-[34px] leading-none tabular-nums text-white mt-1">{fmtDuration(duration)}</p>
              </div>
              <div className="text-right">
                <p className="eyebrow !text-[8.5px] text-slate-500">{status === "tracking" ? "Kecepatan" : "Kec. rata"}</p>
                <p className="display-num text-[34px] leading-none tabular-nums text-white mt-1">
                  {displaySpeed}<span className="display-title text-[13px] text-lime-400 ml-1">km/j</span>
                </p>
              </div>
            </div>
          </div>

          {/* Peta langsung selama merekam; jejak ringkas saat belum mulai.
              Menekan Mulai Gowes kini menjalankan pencatatan DAN peta
              sekaligus, jadi pesepeda tidak perlu berpindah halaman. */}
          <div className="mt-3">
            {status === "tracking" || status === "paused" ? (
              <PetaLangsung jejak={(getPath() as Titik[] | null)} aktif={status === "tracking"} rute={jalurEvent} />
            ) : (
              <div className="relative rounded-3xl overflow-hidden border border-white/8 bg-[var(--relung)]">
                <div className="flex flex-col items-center pt-7 pb-4">
                  <JejakRute path={(getPath() as Titik[] | null)}
                    width={276} height={(getPath() as Titik[] | null)?.length ? 124 : 64} tebal={3} />
                </div>
                <div className="absolute top-3 left-4 eyebrow !text-[8.5px] text-slate-600">
                  {status === "saved" ? "Jalur perjalanan ini" : "Peta akan terbuka saat kamu mulai"}
                </div>
              </div>
            )}
          </div>

          {/* Blok angka pendukung */}
          <div className="grid grid-cols-3 gap-2 mt-3 jenjang">
            {[
              { l: "Elevasi", v: `${meter(Number(elev))}`, u: "m" },
              { l: "Kec. maks", v: maxSpeed.toFixed(1).replace(".", ","), u: "km/j" },
              { l: "Kalori", v: String(Math.round((distance / 1000) * 35)), u: "kkal" },
            ].map((b) => (
              <div key={b.l} className="rounded-2xl border border-white/8 bg-[var(--kartu)] px-3 py-3">
                <p className="eyebrow !text-[8px] text-slate-500">{b.l}</p>
                <p className="display-num text-[26px] leading-none tabular-nums text-white mt-1">
                  {b.v}<span className="display-title text-[11px] text-slate-500 ml-0.5">{b.u}</span>
                </p>
              </div>
            ))}
          </div>

          <div className="h-4" />

          {status === "saved" && rekor.length > 0 && (
            <div className="relative overflow-hidden rounded-2xl border border-amber-400/35 p-4 mb-3 muncul"
              style={{ background: "linear-gradient(135deg, rgba(251,191,36,.14) 0%, var(--kartu) 62%)" }}>
              <span className="absolute -top-10 -right-8 w-32 h-32 pointer-events-none"
                style={{ background: "radial-gradient(circle at center, rgba(251,191,36,.22) 0%, transparent 70%)" }} />
              <div className="relative flex items-center gap-2.5">
                <span className="w-10 h-10 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center flex-shrink-0">
                  <Trophy size={20} />
                </span>
                <div>
                  <p className="display-title text-[15px] text-amber-200 leading-none">REKOR PRIBADI BARU</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {rekor.length === 1 ? "Satu rekor terlampaui" : `${rekor.length} rekor terlampaui`} di perjalanan ini.
                  </p>
                </div>
              </div>
              <div className="relative mt-3 space-y-1.5">
                {rekor.map((r) => (
                  <div key={r.jenis} className="flex items-baseline justify-between gap-3 border-t border-white/8 pt-2">
                    <span className="text-[12px] text-slate-300">{r.jenis}</span>
                    <span className="text-right flex-shrink-0">
                      <span className="display-num text-[19px] text-white">{r.nilai}</span>
                      <span className="block text-[10px] text-amber-300/85">{r.selisih}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && <div className="bg-red-500/10 border border-red-400/25 text-red-300 text-sm rounded-lg px-3 py-2 mb-4 flex items-center gap-2"><AlertTriangle size={16} /> {error}</div>}

          {status === "idle" && (
            <button onClick={start} className="w-full bg-gradient-to-r from-lime-400 to-emerald-500 text-slate-950 py-4 rounded-2xl display-title text-xl flex items-center justify-center gap-2.5 shadow-[0_0_26px_rgba(180,255,58,.28)] active:scale-[.98] transition-transform"><Play size={22} /> MULAI GOWES</button>
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
                <button onClick={pause} className="flex-1 border border-white/15 text-slate-200 py-4 rounded-2xl display-title text-lg flex items-center justify-center gap-2 active:scale-95 transition-transform"><Pause size={20} /> JEDA</button>
                <button onClick={finish} className="flex-1 bg-red-600 text-white py-4 rounded-2xl display-title text-lg flex items-center justify-center gap-2 shadow active:scale-95 transition-transform teks-terang"><Square size={20} /> SELESAI</button>
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
                <button onClick={finish} className="flex-1 bg-red-600 text-white py-4 rounded-2xl display-title text-lg flex items-center justify-center gap-2 shadow active:scale-95 transition-transform teks-terang"><Square size={20} /> SELESAI</button>
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
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {[...TEMPLATE_TANAH.map((t) => ({ key: t.key, name: t.nama })), ...TEMPLATES].map((t) => (
                    <button key={t.key} onClick={() => setTemplate(t.key)}
                      className={`px-1.5 py-2 rounded-xl text-[11px] font-semibold border-2 leading-tight transition-colors ${template === t.key ? "border-lime-400/60 bg-lime-400/10 text-lime-300" : "border-white/10 text-slate-400"}`}>
                      {t.name}
                    </button>
                  ))}
                </div>
                {TEMPLATE_TANAH.some((t) => t.key === template) ? (
                  <>
                    <div className="flex gap-2 mb-3">
                      {(["1:1", "4:5"] as Rasio[]).map((r) => (
                        <button key={r} onClick={() => setRasio(r)}
                          className={`flex-1 py-2 rounded-xl text-xs font-semibold border-2 transition-colors ${rasio === r
                            ? "border-lime-400/60 bg-lime-400/10 text-lime-300"
                            : "border-white/10 text-slate-400"}`}>
                          {r}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2.5 mb-3">
                      {WARNA_TANAH_KEYS.map((k) => (
                        <button key={k} onClick={() => setWarnaTanah(k)} title={WARNA_TANAH[k].nama} aria-label={WARNA_TANAH[k].nama}
                          className={`w-9 h-9 rounded-full transition-transform active:scale-90 ${warnaTanah === k ? "ring-2 ring-offset-2 ring-offset-[var(--kartu)] ring-lime-400" : "ring-1 ring-white/15"}`}
                          style={{ background: `linear-gradient(135deg, ${WARNA_TANAH[k].tanah} 55%, ${WARNA_TANAH[k].kertas})` }} />
                      ))}
                    </div>
                  </>
                ) : (
                <div className="flex gap-2.5 mb-3">
                  {PALETTE_KEYS.map((k) => (
                    <button key={k} onClick={() => setPalette(k)} title={PALETTES[k].name} aria-label={PALETTES[k].name}
                      className={`w-9 h-9 rounded-full transition-transform active:scale-90 ${palette === k ? "ring-2 ring-offset-2 ring-offset-[var(--latar)] ring-lime-400" : "ring-1 ring-white/15"}`}
                      style={{ background: `linear-gradient(135deg, ${PALETTES[k].grad[0]} 55%, ${PALETTES[k].accent})` }} />
                  ))}
                </div>
                )}
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
        /* Tab Peringkat memakai mimbar juara yang sama dengan halaman
           /leaderboard, supaya tidak ada dua tampilan peringkat berbeda. */
        <div>
          {board.length === 0 ? (
            <p className="text-center text-slate-500 py-12 text-sm">Belum ada peserta. Catat perjalanan pertamamu!</p>
          ) : (() => {
            const peserta: Peserta[] = board.map((r) => ({
              user_id: r.user_id, nama: r.name, asal: r.org, foto: null,
              streak: r.streak, km: r.km, rides: r.rides, saya: r.user_id === userId,
            }));
            const sisa = peserta.slice(3);
            return (
              <>
                <Podium tiga={peserta.slice(0, 3)} />
                {sisa.length > 0 && (
                  <>
                    <h2 className="eyebrow text-slate-500 !text-[10px] mt-6 mb-2.5">Peringkat 4 ke bawah</h2>
                    <div className="rounded-2xl border border-white/8 bg-[var(--kartu)] divide-y divide-white/5 overflow-hidden">
                      {sisa.map((r, i) => (
                        <div key={r.user_id} className={`flex items-center gap-3 px-3.5 py-3 ${r.saya ? "bg-lime-400/8" : ""}`}>
                          <span className="display-num text-base text-slate-500 w-7 text-center">{i + 4}</span>
                          <Avatar nama={r.nama} ukuran={32} />
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-semibold text-white truncate">{r.nama}{r.saya ? " (kamu)" : ""}</p>
                            <p className="text-[10.5px] text-slate-500 truncate">{r.asal || "-"} · {r.km.toFixed(1).replace(".", ",")} km · {r.rides}x</p>
                          </div>
                          <span className="flex items-center gap-1 text-amber-400 flex-shrink-0">
                            <Flame size={15} /><span className="display-num text-base">{r.streak}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}
