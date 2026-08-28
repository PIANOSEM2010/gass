"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { IkonCatatGowes } from "@/components/fitur-ikon";

// Tombol Catat Gowes yang mengikuti di semua halaman.
//
// Diletakkan di layout, bukan di halaman Umpan, supaya selalu ada ke mana pun
// pengguna berpindah dan tetap di tempat saat halaman digulir. Bisa dikecilkan
// menjadi bulatan kecil bila menghalangi isi halaman, dan pilihan itu diingat
// di peranti.
const SEMBUNYI = ["/auth", "/catat", "/peta", "/sos/panggil", "/pantau/"];

export default function TombolCatat() {
  const pathname = usePathname();
  const [kecil, setKecil] = useState(false);
  const [siap, setSiap] = useState(false);

  useEffect(() => {
    try {
      setKecil(window.localStorage.getItem("bug-catat-kecil") === "1");
    } catch { /* mode privat */ }
    setSiap(true);
  }, []);

  function ubah() {
    const b = !kecil;
    setKecil(b);
    try { window.localStorage.setItem("bug-catat-kecil", b ? "1" : "0"); } catch { /* abaikan */ }
  }

  // Disembunyikan di halaman yang tombolnya justru mengganggu, termasuk
  // halaman Catat Gowes itu sendiri.
  if (!siap || SEMBUNYI.some((h) => pathname.startsWith(h))) return null;

  return (
    <div className="lg:hidden fixed right-3 z-[1250] flex items-center gap-1.5"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 92px)" }}>
      {/* Tombol pengecil, selalu di sisi kiri tombol utama */}
      <button onClick={ubah}
        aria-label={kecil ? "Perbesar tombol Catat Gowes" : "Perkecil tombol Catat Gowes"}
        className="w-7 h-7 rounded-full bg-[var(--kartu)]/95 border border-white/12 backdrop-blur flex items-center justify-center text-slate-400 shadow-md active:scale-95 transition-transform">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
          style={{ transform: kecil ? "rotate(180deg)" : "none", transition: "transform .3s" }}>
          <path d="M9 6l6 6-6 6" />
        </svg>
      </button>

      <Link href="/catat" prefetch={false}
        aria-label="Catat Gowes"
        className="flex items-center gap-2 rounded-full bg-gradient-to-r from-lime-400 to-emerald-500 shadow-lg shadow-emerald-600/30 active:scale-95 overflow-hidden"
        style={{
          paddingLeft: kecil ? 14 : 16,
          paddingRight: kecil ? 14 : 20,
          paddingTop: 14, paddingBottom: 14,
          transition: "padding .28s cubic-bezier(.22,1,.36,1), transform .15s",
        }}>
        <IkonCatatGowes size={kecil ? 22 : 20} aksen="#062014" />
        <span className="display-title text-sm tracking-wide text-slate-950 whitespace-nowrap"
          style={{
            maxWidth: kecil ? 0 : 130,
            opacity: kecil ? 0 : 1,
            transition: "max-width .28s cubic-bezier(.22,1,.36,1), opacity .2s",
          }}>
          CATAT GOWES
        </span>
      </Link>
    </div>
  );
}
