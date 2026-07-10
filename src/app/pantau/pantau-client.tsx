"use client";
import { useState } from "react";
import Link from "next/link";
import { usePantau } from "../pantau-provider";
import { shareText } from "@/lib/native-share";
import {
  ArrowLeft, Radio, Share2, Square, Loader2, Copy, Check, MapPin, AlertTriangle, ShieldCheck, EyeOff, Bike,
} from "lucide-react";

export default function PantauClient({ userId, fullName }: { userId: string; fullName: string }) {
  // Mesin berbagi lokasi kini global (provider di root layout):
  // tetap berjalan walau pengguna membuka Catat Gowes, Peta, atau fitur lain.
  const { sharing, starting, sessionId, coords, lastSentAgo, error, hidden, start, stop } = usePantau();
  const [copied, setCopied] = useState(false);

  const shareUrl = sessionId && typeof window !== "undefined" ? `${window.location.origin}/pantau/${sessionId}` : "";

  async function share() {
    if (!shareUrl) return;
    const text = `Pantau perjalanan ${fullName} secara langsung lewat BUG:`;
    // Di aplikasi Android: share sheet native; di browser: navigator.share;
    // kalau keduanya gagal: otomatis tersalin ke clipboard.
    const result = await shareText({ title: "Teman Pantau BUG", text, url: shareUrl });
    if (result === "copied") { setCopied(true); setTimeout(() => setCopied(false), 2000); }
    else if (result === "failed") copy();
  }
  async function copy() {
    if (!shareUrl) return;
    try { await navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* abaikan */ }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-white">
      <div className="px-4 pt-6 pb-8 max-w-md mx-auto">
        <Link href="/sos" className="inline-flex items-center gap-1 text-sm text-teal-700 mb-4"><ArrowLeft size={16} /> Kembali</Link>

        <div className="relative overflow-hidden rounded-3xl p-5 bg-gradient-to-br from-slate-950 via-teal-950 to-cyan-900 text-white shadow-lg mb-4 speed-lines">
          <div className="absolute right-4 top-0 h-full w-5 bg-gradient-to-b from-cyan-300 to-teal-400 opacity-70" style={{ transform: "skewX(-16deg)" }} />
          <div className="flex items-center gap-3 relative">
            <div className="w-12 h-12 rounded-2xl bg-cyan-300 text-slate-950 flex items-center justify-center shadow-lg shadow-cyan-500/20"><Radio size={26} strokeWidth={2.4} /></div>
            <div>
              <h1 className="display-title text-2xl leading-tight">Teman Pantau</h1>
              <p className="text-xs text-white/70">Biarkan keluarga melihat lokasimu saat berkendara</p>
            </div>
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-3 py-2 mb-4 flex items-center gap-2"><AlertTriangle size={16} /> {error}</div>}

        {!sharing ? (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-sm text-gray-600 space-y-3">
              <p className="flex items-start gap-2"><ShieldCheck size={18} className="text-teal-600 flex-shrink-0 mt-0.5" /> Lokasimu hanya bisa dilihat oleh orang yang kamu beri link. Link berisi kode acak yang sulit ditebak.</p>
              <p className="flex items-start gap-2"><Bike size={18} className="text-teal-600 flex-shrink-0 mt-0.5" /> Berbagi tetap berjalan walau kamu membuka fitur lain di BUG (Catat Gowes, Peta, Forum). Pop-up kecil akan menunjukkan statusnya.</p>
              <p className="flex items-start gap-2"><EyeOff size={18} className="text-amber-600 flex-shrink-0 mt-0.5" /> Yang menghentikan GPS hanya jika kamu keluar dari aplikasi/browser sepenuhnya. Selama BUG terbuka, lokasi terus terkirim.</p>
            </div>
            <button onClick={() => start(userId, fullName)} disabled={starting}
              className="w-full bg-gradient-to-r from-teal-600 to-cyan-600 text-white py-4 rounded-2xl display-title text-xl flex items-center justify-center gap-2 shadow disabled:from-gray-400 disabled:to-gray-400 active:scale-95 transition-transform">
              {starting ? <><Loader2 size={20} className="animate-spin" /> Memulai...</> : <><Radio size={20} /> Mulai Berbagi Lokasi</>}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {hidden && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl px-3 py-2 flex items-center gap-2">
                <EyeOff size={16} className="flex-shrink-0" /> Aplikasi di latar belakang, lokasi berhenti terkirim. Buka lagi BUG.
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

            <div className="bg-teal-50 border border-teal-200 text-teal-800 text-xs rounded-xl px-3 py-2 flex items-start gap-2">
              <Bike size={14} className="flex-shrink-0 mt-0.5" />
              Kamu bebas membuka fitur lain, misalnya Catat Gowes atau Peta. Berbagi lokasi tetap berjalan, dan pop-up kecil akan tampil sebagai pengingat.
            </div>

            <button onClick={stop} className="w-full bg-red-600 text-white py-3.5 rounded-2xl display-title text-xl flex items-center justify-center gap-2 shadow active:scale-95 transition-transform">
              <Square size={20} /> Hentikan Berbagi
            </button>
            <p className="text-xs text-gray-400 text-center">Layar dijaga tetap menyala selama berbagi aktif.</p>
          </div>
        )}
      </div>
    </div>
  );
}
