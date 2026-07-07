"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowLeft, Camera, MapPin, Loader2, X, CheckCircle2, AlertTriangle,
  Construction, ListChecks, Send, RefreshCw,
} from "lucide-react";

const InfraMap = dynamic(() => import("./infra-map"), {
  ssr: false,
  loading: () => <div className="h-full flex items-center justify-center bg-gray-100 text-gray-400 text-sm">Memuat peta...</div>,
});

type Report = {
  id: string; category: string; description: string;
  lat: number; lng: number; photo_url: string | null; status: string;
  admin_note: string | null; created_at: string | null; mine: boolean;
};

const CATEGORIES = [
  { key: "lubang", label: "Berlubang", emoji: "🕳️" },
  { key: "lampu", label: "Lampu Mati", emoji: "💡" },
  { key: "marka", label: "Marka Pudar", emoji: "🛣️" },
  { key: "rambu", label: "Rambu Rusak", emoji: "🚸" },
  { key: "genangan", label: "Genangan", emoji: "💧" },
  { key: "lainnya", label: "Lainnya", emoji: "⚠️" },
];
const CAT_LABEL: Record<string, string> = Object.fromEntries(CATEGORIES.map((c) => [c.key, c.label]));
const CAT_EMOJI: Record<string, string> = Object.fromEntries(CATEGORIES.map((c) => [c.key, c.emoji]));
const STATUS_META: Record<string, { label: string; cls: string }> = {
  dilaporkan: { label: "Dilaporkan", cls: "bg-amber-100 text-amber-700" },
  diverifikasi: { label: "Diverifikasi", cls: "bg-blue-100 text-blue-700" },
  diteruskan: { label: "Diteruskan ke Dinas", cls: "bg-violet-100 text-violet-700" },
  ditangani: { label: "Ditangani", cls: "bg-green-100 text-green-700" },
};

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Makassar" }).format(new Date(iso));
  } catch { return ""; }
}

async function compressImage(file: File, maxDim = 1280, quality = 0.7): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    let w = bitmap.width, h = bitmap.height;
    if (w > maxDim || h > maxDim) {
      const scale = maxDim / Math.max(w, h);
      w = Math.round(w * scale); h = Math.round(h * scale);
    }
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    return await new Promise<Blob>((resolve) => canvas.toBlob((bl) => resolve(bl || file), "image/jpeg", quality));
  } catch {
    return file;
  }
}

export default function LaporClient({ userId, reports }: { userId: string; reports: Report[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<"lapor" | "lihat">("lapor");
  const [category, setCategory] = useState("lubang");
  const [description, setDescription] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [gpsError, setGpsError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const captureLocation = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) { setGpsError("Browser tidak mendukung GPS"); return; }
    setLocating(true); setGpsError("");
    navigator.geolocation.getCurrentPosition(
      (p) => { setCoords({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }); setLocating(false); },
      (err) => { setGpsError(err.message || "Gagal mengambil lokasi. Aktifkan izin GPS."); setLocating(false); },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    );
  }, []);

  useEffect(() => { captureLocation(); }, [captureLocation]);

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setPhotoFile(f);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(URL.createObjectURL(f));
  }
  function removePhoto() {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoFile(null); setPhotoPreview(null);
  }

  async function submit() {
    if (!coords) { setError("Lokasi belum terdeteksi. Aktifkan GPS lalu coba lagi."); return; }
    setSubmitting(true); setError("");
    try {
      const supabase = createClient();
      let photoUrl: string | null = null;
      if (photoFile) {
        const blob = await compressImage(photoFile);
        const path = `${userId}/${Date.now()}.jpg`;
        const { error: upErr } = await supabase.storage.from("infra-photos").upload(path, blob, { contentType: "image/jpeg", upsert: false });
        if (upErr) throw new Error("Gagal mengunggah foto: " + upErr.message);
        photoUrl = supabase.storage.from("infra-photos").getPublicUrl(path).data.publicUrl;
      }
      const { error: insErr } = await supabase.from("infra_reports").insert({
        user_id: userId, category, description: description.trim() || null,
        lat: coords.lat, lng: coords.lng, photo_url: photoUrl,
      });
      if (insErr) throw new Error(insErr.message);
      setSuccess("Laporan terkirim. Terima kasih sudah menjaga keselamatan jalan!");
      setDescription(""); removePhoto(); setCategory("lubang");
      setTab("lihat");
      router.refresh();
      setTimeout(() => setSuccess(""), 5000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengirim laporan");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      <div className="px-4 pt-6 pb-8 max-w-md mx-auto">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-amber-700 mb-4"><ArrowLeft size={16} /> Beranda</Link>

        <div className="rounded-3xl p-5 bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg mb-4">
          <div className="flex items-center gap-3">
            <Construction size={28} />
            <div>
              <h1 className="text-xl font-extrabold leading-tight">Lapor Jalan Rusak</h1>
              <p className="text-xs opacity-90">Untuk semua pengguna jalan</p>
            </div>
          </div>
          <p className="text-sm opacity-90 mt-3">Laporkan lubang, lampu mati, marka pudar, atau bahaya lain. Laporanmu diteruskan ke Dishub.</p>
        </div>

        {success && <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-3 py-2 mb-4 flex items-center gap-2"><CheckCircle2 size={16} /> {success}</div>}

        <div className="flex bg-gray-100 rounded-xl p-1 mb-4">
          <button onClick={() => setTab("lapor")} className={`flex-1 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 ${tab === "lapor" ? "bg-white shadow text-amber-700" : "text-gray-500"}`}><Camera size={16} /> Buat Laporan</button>
          <button onClick={() => setTab("lihat")} className={`flex-1 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 ${tab === "lihat" ? "bg-white shadow text-amber-700" : "text-gray-500"}`}><ListChecks size={16} /> Laporan ({reports.length})</button>
        </div>

        {tab === "lapor" ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Jenis masalah</label>
              <div className="grid grid-cols-3 gap-2">
                {CATEGORIES.map((c) => (
                  <button key={c.key} type="button" onClick={() => setCategory(c.key)}
                    className={`py-3 rounded-xl border-2 text-center ${category === c.key ? "border-amber-500 bg-amber-50" : "border-gray-200 bg-white"}`}>
                    <div className="text-2xl leading-none">{c.emoji}</div>
                    <div className="text-[11px] font-medium text-gray-700 mt-1">{c.label}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Foto (disarankan)</label>
              {photoPreview ? (
                <div className="relative">
                  <img src={photoPreview} alt="Pratinjau" className="w-full rounded-2xl border border-gray-200" />
                  <button onClick={removePhoto} className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1.5"><X size={16} /></button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-amber-300 rounded-2xl py-8 cursor-pointer bg-white text-amber-600">
                  <Camera size={28} />
                  <span className="text-sm font-medium">Ambil atau pilih foto</span>
                  <input type="file" accept="image/*" capture="environment" onChange={handlePhoto} className="hidden" />
                </label>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Lokasi</label>
              <div className="rounded-2xl border border-gray-200 bg-white p-3 flex items-center gap-3">
                <MapPin size={20} className={coords ? "text-green-600" : "text-gray-400"} />
                <div className="flex-1 min-w-0 text-sm">
                  {locating ? (
                    <span className="text-gray-500 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Mendeteksi lokasi...</span>
                  ) : coords ? (
                    <>
                      <p className="text-gray-800 font-medium">{coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</p>
                      <p className="text-xs text-gray-500">Akurasi sekitar {Math.round(coords.accuracy)} m</p>
                    </>
                  ) : (
                    <span className="text-red-600 text-xs">{gpsError || "Lokasi belum tersedia"}</span>
                  )}
                </div>
                <button onClick={captureLocation} className="text-amber-600 p-1.5" title="Perbarui lokasi"><RefreshCw size={18} /></button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Keterangan (opsional)</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={300}
                placeholder="Contoh: Lubang besar di tengah jalan dekat simpang, berbahaya untuk pesepeda."
                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 resize-y" />
            </div>

            {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-3 py-2 flex items-center gap-2"><AlertTriangle size={16} /> {error}</div>}

            <button onClick={submit} disabled={submitting || !coords}
              className="w-full bg-amber-500 text-white py-3.5 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 shadow disabled:bg-gray-400 active:scale-95 transition-transform">
              {submitting ? <><Loader2 size={20} className="animate-spin" /> Mengirim...</> : <><Send size={20} /> Kirim Laporan</>}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="h-64 rounded-2xl overflow-hidden border border-gray-200">
              {reports.length > 0 ? <InfraMap reports={reports} /> : <div className="h-full flex items-center justify-center text-gray-400 text-sm">Belum ada laporan</div>}
            </div>
            <div className="space-y-2">
              {reports.length === 0 ? (
                <p className="text-center text-gray-400 py-6 text-sm">Belum ada laporan. Jadilah yang pertama melapor!</p>
              ) : reports.map((r) => {
                const sm = STATUS_META[r.status] || { label: r.status, cls: "bg-gray-100 text-gray-600" };
                return (
                  <div key={r.id} className="flex gap-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-3">
                    {r.photo_url ? (
                      <img src={r.photo_url} alt={r.category} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-amber-50 flex items-center justify-center text-2xl flex-shrink-0">{CAT_EMOJI[r.category] || "⚠️"}</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-gray-900 text-sm truncate">{CAT_LABEL[r.category] || "Laporan"}{r.mine ? " (kamu)" : ""}</p>
                        <span className="text-[10px] text-gray-400 flex-shrink-0">{fmtDate(r.created_at)}</span>
                      </div>
                      {r.description ? <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{r.description}</p> : null}
                      <span className={`inline-block mt-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${sm.cls}`}>{sm.label}</span>
                      {r.admin_note && (
                        <div className="mt-1.5 bg-blue-50 border border-blue-100 rounded-lg px-2 py-1.5">
                          <p className="text-[10px] font-semibold text-blue-700 uppercase tracking-wide">Catatan petugas</p>
                          <p className="text-xs text-blue-900 whitespace-pre-wrap">{r.admin_note}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}