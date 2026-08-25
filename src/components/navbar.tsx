"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useCallback } from "react";
import { useNavLoading } from "@/app/nav-loading";
// Ikon khusus BUG (digambar sendiri) menggantikan ikon pustaka umum
import {
  IkonBeranda, IkonPeta, IkonSos, IkonEdukasi, IkonProfil,
} from "@/components/bug-icons";

// Empat tab + tombol SOS di tengah (sesuai rancangan yang disetujui).
// Catat Gowes dipindah ke tombol mengambang di halaman Umpan agar selalu
// terlihat; Forum & Kampanye masuk ke tab atas halaman Umpan.
const leftTabs = [
  { href: "/", label: "Umpan", icon: IkonBeranda },
  { href: "/peta", label: "Peta", icon: IkonPeta },
];
const rightTabs = [
  { href: "/edukasi", label: "Edukasi", icon: IkonEdukasi },
  { href: "/profil", label: "Profil", icon: IkonProfil },
];

// Soket meniskus: permukaan navbar naik menyentuh lingkaran SOS secara
// bersinggungan (tangensial), bukan dipotong lurus. Koordinat lokal dipilih
// agar y=36 tepat berada di garis atas navbar dan pusat lingkaran ada di
// (80,44) dengan jari-jari 40 - yaitu 8px lebih besar dari tombol SOS (r=32),
// sehingga tersisa cincin tipis yang menyatu dengan permukaan bar.
// Soket meniskus: permukaan navbar naik landai lalu menyentuh lingkaran SOS
// secara bersinggungan (tangensial), bukan dipotong lurus. Sistem koordinat
// lokal dipilih agar y=40 tepat berada di garis atas navbar, dan pusat
// lingkaran ada di (110,48) dengan jari-jari 40 - yaitu 8px lebih besar dari
// tombol SOS (r=32), sehingga tersisa cincin tipis yang menyatu dengan bar.
// Titik singgung diambil pada 30 derajat agar tanjakannya hanya ~12px dan
// tidak terlihat seperti gundukan.
const JALUR_MENISKUS =
  "M 0,40 L 14,40 C 34,40 41,29.5 62,26.1 " +
  "A 34,34 0 0 1 114,26.1 " +
  "C 135,29.5 142,40 162,40 L 176,40";

function SoketMeniskus() {
  return (
    <svg
      width="176" height="46" viewBox="0 0 176 46" aria-hidden="true"
      className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
      style={{ top: -40 }}
    >
      <path d={`${JALUR_MENISKUS} L 176,46 L 0,46 Z`} fill="var(--navbar)" fillOpacity="0.92" />
      <path d={JALUR_MENISKUS} fill="none" stroke="var(--garis-nav)" strokeWidth="1" />
    </svg>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const { startNavigation } = useNavLoading();
  const wadahRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  // Posisi "cahaya" yang berjalan di balik tab aktif.
  const [cahaya, setCahaya] = useState<{ left: number; width: number; tampil: boolean }>(
    { left: 0, width: 0, tampil: false },
  );
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hitung ulang posisi cahaya. Saat berpindah tab, cahaya lebih dulu
  // memanjang menutupi jarak antara tab lama dan tab baru (efek melar),
  // lalu mengerut kembali ke ukuran tab tujuan.
  const pindahkanCahaya = useCallback((melar: boolean) => {
    const wadah = wadahRef.current;
    const el = tabRefs.current[pathname];
    if (!wadah || !el) { setCahaya((c) => ({ ...c, tampil: false })); return; }
    const w = wadah.getBoundingClientRect();
    const t = el.getBoundingClientRect();
    const target = { left: t.left - w.left + 6, width: t.width - 12 };

    if (timerRef.current) clearTimeout(timerRef.current);
    setCahaya((lama) => {
      const kurangGerak = typeof window !== "undefined"
        && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!melar || !lama.tampil || kurangGerak) return { ...target, tampil: true };
      const kiri = Math.min(lama.left, target.left);
      const kanan = Math.max(lama.left + lama.width, target.left + target.width);
      timerRef.current = setTimeout(() => setCahaya({ ...target, tampil: true }), 170);
      return { left: kiri, width: kanan - kiri, tampil: true };
    });
  }, [pathname]);

  useEffect(() => {
    pindahkanCahaya(true);
    const ulang = () => pindahkanCahaya(false);
    window.addEventListener("resize", ulang);
    // Font baru selesai dimuat bisa menggeser lebar tab sedikit.
    const t = setTimeout(ulang, 350);
    return () => {
      window.removeEventListener("resize", ulang);
      clearTimeout(t);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [pindahkanCahaya]);

  function Tab({ href, label, icon: Icon }: { href: string; label: string; icon: (p: { size?: number; strokeWidth?: number }) => React.ReactElement }) {
    const active = pathname === href;
    return (
      <Link
        href={href} prefetch={false} onClick={() => startNavigation(href)}
        ref={(el) => { tabRefs.current[href] = el; }}
        aria-current={active ? "page" : undefined}
        className="relative z-10 flex flex-col items-center justify-center flex-1 h-full group"
      >
        <span className={`flex items-center justify-center px-3 py-1 transition-[color,transform] duration-300 ${active ? "text-lime-300 -translate-y-px" : "text-slate-400 group-active:text-slate-200"}`}>
          <Icon size={20} strokeWidth={active ? 2.4 : 2} />
        </span>
        <span className={`eyebrow mt-0 !text-[8.5px] transition-colors duration-300 ${active ? "text-lime-300" : "text-slate-500"}`}>{label}</span>
      </Link>
    );
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[1200] bg-[var(--navbar)]/92 backdrop-blur-xl border-t border-lime-400/12 shadow-[0_-6px_20px_rgba(0,0,0,0.25)]" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
      <div ref={wadahRef} className="relative max-w-md mx-auto h-[56px]">
        <SoketMeniskus />

        {/* Cahaya yang berjalan mengikuti tab aktif */}
        <div
          aria-hidden="true"
          data-cahaya-tab
          className="absolute pointer-events-none rounded-full"
          style={{
            left: cahaya.left, width: cahaya.width, top: 5, height: 28,
            opacity: cahaya.tampil ? 1 : 0,
            background: "radial-gradient(120% 140% at 50% 0%, rgba(180,255,58,.28) 0%, rgba(180,255,58,.10) 60%, rgba(180,255,58,0) 100%)",
            boxShadow: "0 0 18px rgba(180,255,58,.22), inset 0 0 0 1px rgba(180,255,58,.30)",
            transition: "left .22s cubic-bezier(.22,1,.36,1), width .22s cubic-bezier(.22,1,.36,1), opacity .2s linear",
          }}
        />
        <div className="flex items-center h-full">
          <div className="flex flex-1 h-full">{leftTabs.map((t) => <Tab key={t.href} {...t} />)}</div>
          <div className="w-[74px] flex-shrink-0" />
          <div className="flex flex-1 h-full">{rightTabs.map((t) => <Tab key={t.href} {...t} />)}</div>
        </div>

        {/* SOS: tombol tengah, paling besar, menonjol ke atas.
            Cincin pemisahnya kini dibentuk oleh soket meniskus, bukan border. */}
        <Link href="/sos" prefetch={false} onClick={() => startNavigation("/sos")} className="absolute left-1/2 -translate-x-1/2 -top-5 flex flex-col items-center z-10">
          <span className="sos-pulse w-14 h-14 rounded-full bg-gradient-to-br from-red-500 to-red-700 text-white flex items-center justify-center shadow-lg active:scale-95 transition-transform">
            <IkonSos size={25} />
          </span>
          <span className={`eyebrow mt-0.5 !text-[9px] ${pathname === "/sos" ? "text-red-400" : "text-red-500"}`}>SOS</span>
        </Link>
      </div>
    </nav>
  );
}
