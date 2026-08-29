"use client";
// Tombol + dialog "Bagikan Kartu" untuk SETIAP perjalanan di riwayat.
// Memakai mesin kartu yang sama dengan halaman Catat (lib/gowes-card),
// lengkap: 4 template (termasuk Momen), 5 warna, foto latar, dan
// mode latar transparan. Tanggal di kartu memakai tanggal perjalanan asli.
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Share2, Download, ImagePlus, X, Loader2, Sparkles } from "lucide-react";
import { drawCard, loadImage, PALETTES, PALETTE_KEYS, TEMPLATES } from "@/lib/gowes-card";
import { gambarKartuTanah, TEMPLATE_TANAH, WARNA_TANAH, WARNA_TANAH_KEYS, type Rasio } from "@/lib/kartu-tanah";
import { kirimKartuKeStory } from "@/lib/kirim-story";
import { shareImageDataUrl, downloadCanvasPng } from "@/lib/native-share";
import { placeNameFromPath } from "@/lib/place-name";

type Pt = { lat: number; lng: number };
type Ride = {
  id: string;
  distance_m: number;
  duration_s: number;
  elevation_gain_m: number;
  path: Pt[] | null;
  started_at: string | null;
  activity_date: string | null;
};

export default function ShareRide({ ride }: { ride: Ride }) {
  const [open, setOpen] = useState(false);
  const [pesanStory, setPesanStory] = useState("");
  // Keluarga "Tanah" memakai palet dan penggambar sendiri, plus pilihan rasio.
  const [rasio, setRasio] = useState<Rasio>("1:1");
  const [warnaTanah, setWarnaTanah] = useState("terakota");
  const [template, setTemplate] = useState("blok");
  const [palette, setPalette] = useState("hijau");
  const [photo, setPhoto] = useState<HTMLImageElement | null>(null);
  const [transparent, setTransparent] = useState(false);
  const [busy, setBusy] = useState(false);
  // Nama daerah ditentukan dari GPS jalur perjalanan itu sendiri
  const [place, setPlace] = useState("");
  const [placeLoading, setPlaceLoading] = useState(false);
  // Ditentukan SETELAH seluruh state dideklarasikan. Sebelumnya baris ini
  // berada di atas deklarasi `template`, dan karena pemakaiannya tersembunyi
  // di dalam panggilan-balik .some(), TypeScript tidak menangkapnya sementara
  // saat dijalankan ia melempar ReferenceError dan meruntuhkan halaman.
  const keluargaTanah = TEMPLATE_TANAH.some((t) => t.key === template);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Dialog dipasang lewat portal ke <body>. Pembungkus animasi halaman
  // membentuk konteks penumpukan sekaligus acuan posisi bagi keturunan
  // position:fixed, sehingga dialog di dalamnya bisa muncul di luar layar dan
  // tetap tertimpa navbar meski z-index-nya lebih tinggi.
  const [terpasang, setTerpasang] = useState(false);
  useEffect(() => { setTerpasang(true); }, []);

  const rideDate = ride.started_at || ride.activity_date;

  // Tentukan nama daerah dari jalur perjalanan saat dialog dibuka
  useEffect(() => {
    if (!open || place || placeLoading) return;
    let cancelled = false;
    setPlaceLoading(true);
    (async () => {
      const name = await Promise.race([
        placeNameFromPath(ride.path),
        new Promise<string>((res) => setTimeout(() => res(""), 6000)),
      ]);
      if (!cancelled) {
        if (name) setPlace(name);
        setPlaceLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Gambar ulang kartu setiap ada perubahan pilihan (dan setelah font siap)
  useEffect(() => {
    // Kartu digambar segera, tanpa menunggu pencarian nama tempat selesai.
    // Sebelumnya penggambaran ditahan oleh placeLoading, sehingga bila
    // Nominatim lambat atau tak terjangkau - hal biasa di data seluler -
    // pengguna hanya melihat kotak kosong. Nama tempat menyusul lewat state
    // `place` yang ada di daftar pemicu, jadi kartunya digambar ulang sendiri.
    if (!open || !canvasRef.current) return;
    const doDraw = () => {
      if (!canvasRef.current) return;
      const umum = {
        place,
        path: ride.path || [],
        distanceM: ride.distance_m,
        durationS: ride.duration_s,
        elevM: ride.elevation_gain_m,
        photo, transparent,
        date: rideDate ? new Date(rideDate) : new Date(),
      };
      if (TEMPLATE_TANAH.some((t) => t.key === template)) {
        gambarKartuTanah(canvasRef.current, {
          ...umum, template, warna: warnaTanah, rasio,
          kalori: Math.round((ride.distance_m / 1000) * 35),
        });
      } else {
        drawCard(canvasRef.current, { ...umum, template, palette });
      }
    };
    doDraw();
    if (typeof document !== "undefined" && document.fonts?.ready) {
      document.fonts.ready.then(doDraw).catch(() => { /* abaikan */ });
    }
  }, [open, template, palette, photo, transparent, ride, rideDate, place, placeLoading, rasio, warnaTanah]);

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
      setPhoto(await loadImage(dataUrl));
    } catch { /* abaikan */ }
  }

  async function keStory() {
    const canvas = canvasRef.current;
    if (!canvas || busy) return;
    setBusy(true); setPesanStory("");
    try {
      const km = (ride.distance_m / 1000).toFixed(2).replace(".", ",");
      await kirimKartuKeStory(canvas, place ? `Gowes ${km} km di ${place}` : `Gowes ${km} km`, ride.id);
      setPesanStory("Story tayang 24 jam, cek di halaman Umpan.");
    } catch (err) {
      setPesanStory(err instanceof Error ? err.message : "Gagal membuat story.");
    } finally { setBusy(false); }
  }

  async function share() {
    const canvas = canvasRef.current;
    if (!canvas || busy) return;
    setBusy(true);
    try {
      const km = (ride.distance_m / 1000).toFixed(2);
      const text = place
        ? `Gowes ${km} km di ${place} bersama BUG! #GoweserAman${place.replace(/\s+/g, "")}`
        : `Gowes ${km} km bersama BUG!`;
      const r = await shareImageDataUrl(canvas.toDataURL("image/png"), "gowes-bug.png", text);
      if (r.status === "failed") alert(`Gagal membagikan: ${r.error || "tidak diketahui"}`);
    } finally {
      setBusy(false);
    }
  }

  async function download() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const name = transparent ? "gowes-bug-transparan.png" : "gowes-bug.png";
    const r = await downloadCanvasPng(canvas, name);
    if (r.status === "failed") alert(`Gagal mengunduh: ${r.error || "tidak diketahui"}`);
    else if (r.savedTo) alert(`Kartu tersimpan di ${r.savedTo}`);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full border border-lime-400/30 text-lime-300 py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
      >
        <Share2 size={16} /> Bagikan Kartu
      </button>

      {/* Lapisan luar hanya menggulir; pemusatan dikerjakan wadah di dalamnya.
          Menggabungkan flex-center dengan overflow-y-auto pada satu unsur
          membuat kotak yang lebih tinggi dari layar terdorong ke atas batas
          gulir sehingga tidak bisa dijangkau - itu sebabnya yang tampil hanya
          latar buram tanpa kartu. */}
      {open && terpasang && createPortal(

        <div className="fixed inset-0 z-[4000] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={() => setOpen(false)}>
          <div className="bg-[var(--kartu)] border border-lime-400/15 rounded-t-3xl sm:rounded-2xl w-full max-w-md max-h-[92vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 pt-4 pb-3 flex-shrink-0">
              <p className="display-title text-base text-white">KARTU PERJALANAN</p>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg text-slate-500 active:bg-[var(--kartu-2)]" aria-label="Tutup">
                <X size={18} />
              </button>
            </div>

            {/* Hanya bagian ini yang menggulir; tombol aksi ada di kaki tetap */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-3 min-h-0">
            <canvas ref={canvasRef} className={`w-full h-auto rounded-2xl shadow border border-white/10 ${transparent ? "bg-[repeating-conic-gradient(#e5e7eb_0%_25%,#ffffff_0%_50%)] bg-[length:22px_22px]" : ""}`} />


            <div className="mt-4 pt-3 border-t border-white/8">
              <p className="eyebrow !text-[9px] text-slate-500 mb-2.5">Ubah tampilan kartu</p>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {[...TEMPLATE_TANAH.map((t) => ({ key: t.key, name: t.nama })), ...TEMPLATES].map((t) => (
                <button key={t.key} onClick={() => setTemplate(t.key)}
                  className={`px-1.5 py-2 rounded-xl text-[11px] font-semibold border-2 leading-tight transition-colors ${template === t.key ? "border-lime-400/60 bg-lime-400/10 text-lime-300" : "border-white/10 text-slate-400"}`}>
                  {t.name}
                </button>
              ))}
            </div>
            {keluargaTanah ? (
              <>
                {/* Rasio kartu: 1:1 untuk unggahan biasa, 4:5 untuk Story */}
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
                {/* Empat warna tanah khusus keluarga template ini */}
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
                  className={`w-9 h-9 rounded-full transition-transform active:scale-90 ${palette === k ? "ring-2 ring-offset-2 ring-offset-[var(--kartu)] ring-lime-400" : "ring-1 ring-white/15"}`}
                  style={{ background: `linear-gradient(135deg, ${PALETTES[k].grad[0]} 55%, ${PALETTES[k].accent})` }} />
              ))}
            </div>
            )}
            <div className="flex gap-2 mb-3">
              <label className="flex-1 py-2 rounded-xl text-xs font-semibold border-2 border-dashed border-white/15 text-slate-400 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-transform">
                <ImagePlus size={15} /> {photo ? "Ganti Foto" : "Tambah Foto"}
                <input type="file" accept="image/*" className="hidden" onChange={pickPhoto} />
              </label>
              {photo && (
                <button onClick={() => setPhoto(null)} className="px-3 rounded-xl border-2 border-white/10 text-slate-400 active:scale-95 transition-transform" aria-label="Hapus foto">
                  <X size={16} />
                </button>
              )}
              <button onClick={() => setTransparent((v) => !v)}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold border-2 transition-colors ${transparent ? "border-lime-400/60 bg-lime-400/10 text-lime-300" : "border-white/10 text-slate-400"}`}>
                Latar transparan
              </button>
            </div>

            </div>
            </div>

            {/* Kaki tetap: Bagikan, Unduh, dan Ke Story selalu terlihat
                tanpa perlu menggulir sedikit pun. */}
            <div className="flex-shrink-0 border-t border-white/8 px-4 pt-3 pb-4 bg-[var(--kartu)]">
            <div className="grid grid-cols-3 gap-2">
              <button onClick={share} disabled={busy} className="bg-gradient-to-r from-lime-400 to-emerald-500 text-slate-950 py-3 rounded-xl font-semibold flex items-center justify-center gap-1.5 text-sm disabled:opacity-50 active:scale-95 transition-transform">
                {busy ? <Loader2 size={16} className="animate-spin" /> : <Share2 size={16} />} Bagikan
              </button>
              <button onClick={download} className="border border-white/15 text-slate-200 py-3 rounded-xl font-semibold flex items-center justify-center gap-1.5 text-sm active:scale-95 transition-transform">
                <Download size={16} /> Unduh
              </button>
              <button onClick={keStory} disabled={busy} className="border border-lime-400/35 text-lime-300 py-3 rounded-xl font-semibold flex items-center justify-center gap-1.5 text-sm disabled:opacity-50 active:scale-95 transition-transform">
                <Sparkles size={16} /> Ke Story
              </button>
            </div>
              {pesanStory && <p className="text-[11px] text-slate-400 mt-2">{pesanStory}</p>}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
