"use client";
// Tombol + dialog "Bagikan Kartu" untuk SETIAP perjalanan di riwayat.
// Memakai mesin kartu yang sama dengan halaman Catat (lib/gowes-card),
// lengkap: 4 template (termasuk Momen), 5 warna, foto latar, dan
// mode latar transparan. Tanggal di kartu memakai tanggal perjalanan asli.
import { useEffect, useRef, useState } from "react";
import { Share2, Download, ImagePlus, X, Loader2 } from "lucide-react";
import { drawCard, loadImage, PALETTES, PALETTE_KEYS, TEMPLATES } from "@/lib/gowes-card";
import { shareImageDataUrl, downloadCanvasPng } from "@/lib/native-share";

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
  const [template, setTemplate] = useState("rute");
  const [palette, setPalette] = useState("hijau");
  const [photo, setPhoto] = useState<HTMLImageElement | null>(null);
  const [transparent, setTransparent] = useState(false);
  const [busy, setBusy] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const rideDate = ride.started_at || ride.activity_date;

  // Gambar ulang kartu setiap ada perubahan pilihan (dan setelah font siap)
  useEffect(() => {
    if (!open || !canvasRef.current) return;
    const doDraw = () => {
      if (!canvasRef.current) return;
      drawCard(canvasRef.current, {
        template, palette, place: "Bulungan",
        path: ride.path || [],
        distanceM: ride.distance_m,
        durationS: ride.duration_s,
        elevM: ride.elevation_gain_m,
        photo, transparent,
        date: rideDate ? new Date(rideDate) : new Date(),
      });
    };
    doDraw();
    if (typeof document !== "undefined" && document.fonts?.ready) {
      document.fonts.ready.then(doDraw).catch(() => { /* abaikan */ });
    }
  }, [open, template, palette, photo, transparent, ride, rideDate]);

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

  async function share() {
    const canvas = canvasRef.current;
    if (!canvas || busy) return;
    setBusy(true);
    try {
      const km = (ride.distance_m / 1000).toFixed(2);
      const text = `Gowes ${km} km bersama BUG! 🚴 #GoweserAmanBulungan`;
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
        className="w-full bg-green-600 text-white py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
      >
        <Share2 size={16} /> Bagikan Kartu
      </button>

      {open && (
        <div className="fixed inset-0 z-[2000] bg-black/60 flex items-end sm:items-center justify-center p-3" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[92vh] overflow-y-auto p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <p className="font-bold text-gray-900">Kartu Perjalanan</p>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg text-gray-400 active:bg-gray-100" aria-label="Tutup">
                <X size={18} />
              </button>
            </div>

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
                <ImagePlus size={15} /> {photo ? "Ganti Foto" : "Tambah Foto"}
                <input type="file" accept="image/*" className="hidden" onChange={pickPhoto} />
              </label>
              {photo && (
                <button onClick={() => setPhoto(null)} className="px-3 rounded-xl border-2 border-gray-200 text-gray-500 active:scale-95 transition-transform" aria-label="Hapus foto">
                  <X size={16} />
                </button>
              )}
              <button onClick={() => setTransparent((v) => !v)}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold border-2 transition-colors ${transparent ? "border-green-600 bg-green-50 text-green-700" : "border-gray-200 text-gray-600"}`}>
                Latar transparan
              </button>
            </div>

            <canvas ref={canvasRef} className={`w-full h-auto rounded-2xl shadow border border-gray-200 ${transparent ? "bg-[repeating-conic-gradient(#e5e7eb_0%_25%,#ffffff_0%_50%)] bg-[length:22px_22px]" : ""}`} />

            <div className="grid grid-cols-2 gap-2 mt-3">
              <button onClick={share} disabled={busy} className="bg-green-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:bg-gray-400 active:scale-95 transition-transform">
                {busy ? <Loader2 size={18} className="animate-spin" /> : <Share2 size={18} />} Bagikan
              </button>
              <button onClick={download} className="bg-gray-800 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 active:scale-95 transition-transform">
                <Download size={18} /> Unduh
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
