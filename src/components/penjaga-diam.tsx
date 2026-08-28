"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";

// Penjaga diam: bila jarak tidak bertambah selama lebih dari lima menit saat
// perekaman berjalan, aplikasi bertanya lebih dulu, baru mengirim SOS.
//
// Kenapa harus bertanya dulu, bukan langsung mengirim: pesepeda berhenti
// karena banyak hal biasa - istirahat, mengisi angin, mampir warung, atau
// menunggu teman. SOS yang menyala sendiri tanpa konfirmasi akan berulang kali
// mengganggu keluarga dan operator 110, dan yang terjadi kemudian orang
// mematikan fiturnya. Karena itu ada hitungan mundur 60 detik yang bisa
// dibatalkan; SOS hanya berangkat bila benar-benar tidak ada jawaban.
const DIAM_MS = 5 * 60 * 1000;   // lima menit tanpa perpindahan berarti
const HITUNG_MUNDUR = 60;        // detik untuk membatalkan
const GESER_MIN_M = 25;          // toleransi lompatan GPS saat diam

export default function PenjagaDiam({ aktif, distanceM }: { aktif: boolean; distanceM: number }) {
  const router = useRouter();
  const [tanya, setTanya] = useState(false);
  const [sisa, setSisa] = useState(HITUNG_MUNDUR);
  const [nonaktif, setNonaktif] = useState(false);
  const jarakTerakhir = useRef(distanceM);
  const waktuGerak = useRef(Date.now());

  // Catat kapan terakhir kali pengguna benar-benar berpindah.
  useEffect(() => {
    if (!aktif) { jarakTerakhir.current = distanceM; waktuGerak.current = Date.now(); return; }
    if (Math.abs(distanceM - jarakTerakhir.current) >= GESER_MIN_M) {
      jarakTerakhir.current = distanceM;
      waktuGerak.current = Date.now();
    }
  }, [distanceM, aktif]);

  // Periksa tiap 15 detik, bukan tiap perubahan posisi, agar hemat baterai.
  useEffect(() => {
    if (!aktif || nonaktif) return;
    const t = setInterval(() => {
      if (!tanya && Date.now() - waktuGerak.current > DIAM_MS) {
        setSisa(HITUNG_MUNDUR);
        setTanya(true);
        if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate([300, 150, 300]);
      }
    }, 15000);
    return () => clearInterval(t);
  }, [aktif, tanya, nonaktif]);

  // Hitungan mundur.
  useEffect(() => {
    if (!tanya) return;
    const t = setInterval(() => {
      setSisa((v) => {
        if (v <= 1) {
          clearInterval(t);
          // SOS dikirim lewat halaman SOS yang sudah teruji, dengan penanda
          // otomatis, supaya tidak ada dua jalur pengiriman yang berbeda.
          router.push("/sos?otomatis=1");
          return 0;
        }
        if (typeof navigator !== "undefined" && navigator.vibrate && v <= 10) navigator.vibrate(120);
        return v - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [tanya, router]);

  function akuAman() {
    setTanya(false);
    waktuGerak.current = Date.now();
    jarakTerakhir.current = distanceM;
  }

  if (!tanya) return null;

  return (
    <div className="fixed inset-0 z-[5000] bg-black/85 backdrop-blur-sm flex items-center justify-center p-5">
      <div className="w-full max-w-sm rounded-3xl border border-red-500/40 bg-[var(--kartu)] p-6 text-center">
        <span className="inline-flex w-16 h-16 rounded-full bg-red-500/15 text-red-400 items-center justify-center mb-4 animate-pulse">
          <AlertTriangle size={30} />
        </span>
        <p className="display-title text-xl text-white">KAMU BAIK-BAIK SAJA?</p>
        <p className="text-[13px] text-slate-400 mt-2 leading-relaxed">
          Kamu tidak berpindah selama lebih dari 5 menit. Kalau tidak ada jawaban,
          BUG akan mengirim lokasimu ke kontak darurat.
        </p>

        <p className="display-num text-[64px] leading-none text-red-400 my-5">{sisa}</p>

        <button onClick={akuAman}
          className="w-full bg-gradient-to-r from-lime-400 to-emerald-500 text-slate-950 py-4 rounded-2xl display-title text-lg active:scale-[.98] transition-transform">
          SAYA AMAN
        </button>
        <button onClick={() => router.push("/sos?otomatis=1")}
          className="w-full mt-2.5 border border-red-500/40 text-red-300 py-3 rounded-2xl display-title text-sm">
          KIRIM SOS SEKARANG
        </button>
        <button onClick={() => { setNonaktif(true); setTanya(false); }}
          className="mt-3 text-[11px] text-slate-500 underline underline-offset-2">
          Matikan penjaga ini untuk perjalanan ini
        </button>
      </div>
    </div>
  );
}
