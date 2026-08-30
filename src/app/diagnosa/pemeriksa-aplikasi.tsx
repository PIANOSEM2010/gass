"use client";
import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Check, X, Loader2, Globe, Smartphone } from "lucide-react";

type Baris = { nama: string; ada: boolean | null; ket: string };

// Memeriksa plugin satu per satu dengan benar-benar memanggilnya.
//
// Memeriksa keberadaan modul JavaScript saja tidak cukup: sisi JavaScript
// selalu ikut lewat situs, sedangkan sisi Java hanya ada bila APK dibangun
// ulang. Yang membedakan keduanya hanyalah pemanggilan sungguhan.
export default function PemeriksaAplikasi({ versiWeb }: { versiWeb: string }) {
  const [aplikasi, setAplikasi] = useState<boolean | null>(null);
  const [baris, setBaris] = useState<Baris[]>([]);
  const [selesai, setSelesai] = useState(false);

  useEffect(() => {
    (async () => {
      let native = false;
      try { native = Capacitor.isNativePlatform(); } catch { /* peramban biasa */ }
      setAplikasi(native);

      if (!native) { setSelesai(true); return; }

      const hasil: Baris[] = [];

      async function periksa(nama: string, ket: string, uji: () => Promise<unknown>) {
        try { await uji(); hasil.push({ nama, ada: true, ket }); }
        catch { hasil.push({ nama, ada: false, ket }); }
      }

      await periksa("Tautan dalam (App)", "Dibutuhkan masuk dengan Google", async () => {
        const { App } = await import("@capacitor/app");
        await App.getLaunchUrl();
      });
      await periksa("Peramban sistem (Browser)", "Membuka halaman Google", async () => {
        const { Browser } = await import("@capacitor/browser");
        await Browser.close().catch(() => null);
      });
      await periksa("Berbagi berkas (Share)", "Mengirim kartu gowes ke WhatsApp", async () => {
        const { Share } = await import("@capacitor/share");
        await Share.canShare();
      });
      await periksa("Penyimpanan (Filesystem)", "Menyiapkan gambar sebelum dibagikan", async () => {
        const { Filesystem, Directory } = await import("@capacitor/filesystem");
        await Filesystem.readdir({ path: "", directory: Directory.Cache });
      });
      await periksa("Panggilan darurat", "Menelepon 110 sendiri saat SOS", async () => {
        const { registerPlugin } = await import("@capacitor/core");
        const P = registerPlugin<{ status(): Promise<unknown> }>("PanggilanDarurat");
        await P.status();
      });

      setBaris(hasil);
      setSelesai(true);
    })();
  }, []);

  const kurang = baris.filter((b) => b.ada === false);

  return (
    <div className="space-y-4">
      <div className="kartu-bug p-4">
        <p className="eyebrow !text-[9px] text-slate-500">Versi web yang sedang dimuat</p>
        <p className="display-num text-[20px] text-lime-300 mt-1 break-all">{versiWeb}</p>
        <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
          Angka ini datang dari situs, bukan dari aplikasi. Bila sudah sesuai dengan
          versi terakhir yang kamu deploy, berarti sisi web sudah terbarui.
        </p>
      </div>

      <div className="kartu-bug p-4">
        <div className="flex items-center gap-2.5">
          {aplikasi === null ? <Loader2 size={18} className="animate-spin text-slate-500" />
            : aplikasi ? <Smartphone size={18} className="text-lime-400" />
              : <Globe size={18} className="text-sky-400" />}
          <p className="display-title text-[14px] text-white">
            {aplikasi === null ? "MEMERIKSA…" : aplikasi ? "APLIKASI ANDROID" : "PERAMBAN"}
          </p>
        </div>
        {aplikasi === false && (
          <p className="text-[11.5px] text-slate-400 mt-2 leading-relaxed">
            Kamu membuka lewat peramban, jadi tidak ada bagian Android yang perlu diperiksa.
            Buka halaman ini dari aplikasi BUG untuk memeriksa kelengkapannya.
          </p>
        )}
      </div>

      {aplikasi && (
        <div className="kartu-bug p-4">
          <p className="display-title text-[14px] text-white mb-3">KELENGKAPAN APLIKASI</p>
          {!selesai && <p className="text-[12px] text-slate-500">Memeriksa…</p>}
          <div className="space-y-2.5">
            {baris.map((b) => (
              <div key={b.nama} className="flex items-start gap-2.5">
                <span className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 ${b.ada ? "bg-lime-400/20 text-lime-300" : "bg-red-500/20 text-red-300"}`}>
                  {b.ada ? <Check size={12} strokeWidth={3} /> : <X size={12} strokeWidth={3} />}
                </span>
                <span className="min-w-0">
                  <span className="block text-[12.5px] text-white">{b.nama}</span>
                  <span className="block text-[10.5px] text-slate-500">{b.ket}</span>
                </span>
              </div>
            ))}
          </div>

          {selesai && kurang.length === 0 && (
            <p className="mt-3 rounded-xl border border-lime-400/30 bg-lime-400/10 px-3 py-2.5 text-[11.5px] text-lime-200 leading-relaxed">
              Aplikasi ini sudah lengkap. Android Studio dan kodemu sudah sinkron.
            </p>
          )}

          {selesai && kurang.length > 0 && (
            <div className="mt-3 rounded-xl border border-amber-400/35 bg-amber-400/10 px-3 py-2.5">
              <p className="text-[11.5px] font-semibold text-amber-300">
                {kurang.length} bagian belum ada di aplikasi ini
              </p>
              <p className="text-[11px] text-amber-100/85 mt-1 leading-relaxed">
                APK yang terpasang dibangun sebelum bagian itu ditambahkan. Jalankan{" "}
                <span className="font-mono">npx cap sync android</span>, naikkan versionCode,
                bangun APK baru, hapus BUG yang lama, lalu pasang yang baru.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
