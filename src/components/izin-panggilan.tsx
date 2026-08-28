"use client";
import { useEffect, useState } from "react";
import { Phone, ShieldCheck, X } from "lucide-react";
import Lapisan from "@/components/lapisan";
import { statusPanggilan, mintaIzinPanggilan, diAplikasi } from "@/lib/panggilan-darurat";

// Persetujuan panggilan darurat otomatis, ditanyakan sekali saat aplikasi
// pertama kali dibuka.
//
// Hanya muncul di dalam APK Android. Di peramban tidak ditampilkan sama sekali,
// karena di sana izin apa pun tidak akan membuat panggilan berangkat sendiri -
// menampilkannya hanya akan membuat pengguna mengira fitur ini menyala padahal
// tidak, dan pada aplikasi keselamatan salah paham semacam itu berbahaya.
const KUNCI = "bug-izin-panggilan-ditanya";

export default function IzinPanggilan() {
  const [tampil, setTampil] = useState(false);
  const [sibuk, setSibuk] = useState(false);
  const [hasil, setHasil] = useState<"" | "ya" | "tidak">("");

  useEffect(() => {
    if (!diAplikasi()) return;
    let hidup = true;
    (async () => {
      try {
        if (window.localStorage.getItem(KUNCI) === "1") return;
      } catch { /* mode privat */ }
      const s = await statusPanggilan();
      if (!hidup) return;
      if (s.didukung && !s.diizinkan) setTampil(true);
    })();
    return () => { hidup = false; };
  }, []);

  function tandaiSudah() {
    try { window.localStorage.setItem(KUNCI, "1"); } catch { /* abaikan */ }
  }

  async function setuju() {
    setSibuk(true);
    const ok = await mintaIzinPanggilan();
    setHasil(ok ? "ya" : "tidak");
    setSibuk(false);
    tandaiSudah();
    setTimeout(() => setTampil(false), ok ? 1400 : 2600);
  }

  function nanti() {
    tandaiSudah();
    setTampil(false);
  }

  if (!tampil) return null;

  return (
    <Lapisan>
      <div className="fixed inset-0 z-[5500] bg-black/85 backdrop-blur-sm flex items-center justify-center p-5">
        <div className="w-full max-w-sm rounded-3xl border border-red-500/35 bg-[var(--kartu)] p-6">
          <span className="inline-flex w-14 h-14 rounded-2xl bg-red-500/15 text-red-400 items-center justify-center mb-4">
            <Phone size={26} />
          </span>
          <p className="display-title text-xl text-white leading-tight">
            IZINKAN BUG MENELEPON 110 SENDIRI?
          </p>
          <p className="text-[13px] text-slate-400 mt-2.5 leading-relaxed">
            Saat tombol SOS ditekan, BUG akan langsung menyambungkan panggilan ke 110
            tanpa kamu perlu menekan tombol panggil lagi. Ini berguna bila tanganmu
            terluka atau ponsel sulit dioperasikan setelah kecelakaan.
          </p>

          <ul className="mt-4 space-y-2 text-[12px] text-slate-400">
            <li className="flex gap-2">
              <ShieldCheck size={15} className="text-lime-400 flex-shrink-0 mt-0.5" />
              Nomor yang bisa ditelepon hanya nomor darurat, tidak pernah nomor lain.
            </li>
            <li className="flex gap-2">
              <ShieldCheck size={15} className="text-lime-400 flex-shrink-0 mt-0.5" />
              Panggilan hanya terjadi setelah kamu menekan SOS, atau setelah hitungan
              mundur penjaga diam berakhir tanpa kamu batalkan.
            </li>
          </ul>

          {hasil === "ya" && (
            <p className="mt-4 text-[12.5px] text-lime-300">
              Izin diberikan. SOS kini akan menelepon 110 sendiri.
            </p>
          )}
          {hasil === "tidak" && (
            <p className="mt-4 text-[12.5px] text-amber-300 leading-relaxed">
              Izin belum diberikan. SOS tetap bekerja, tapi layar penelepon akan terbuka
              dan kamu masih perlu menekan tombol panggil. Bisa diaktifkan nanti di
              Pengaturan aplikasi.
            </p>
          )}

          {!hasil && (
            <>
              <button onClick={setuju} disabled={sibuk}
                className="w-full mt-5 bg-gradient-to-r from-lime-400 to-emerald-500 text-slate-950 py-3.5 rounded-2xl display-title text-base disabled:opacity-60">
                {sibuk ? "MEMINTA IZIN…" : "IZINKAN"}
              </button>
              <button onClick={nanti}
                className="w-full mt-2 text-[12px] text-slate-500 py-2 flex items-center justify-center gap-1.5">
                <X size={13} /> Nanti saja
              </button>
            </>
          )}
        </div>
      </div>
    </Lapisan>
  );
}
