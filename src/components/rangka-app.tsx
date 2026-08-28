"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoBug from "@/components/logo-bug";
import TombolTema from "@/components/tema";
import {
  IkonPetaJalur, IkonModul, IkonTemanPantau, IkonRuteLingkar,
  IkonLaporJalan, IkonDasbor, IkonKampanyeJalan, IkonForumGowes,
  IkonCatatGowes, IkonDaruratSos,
} from "@/components/fitur-ikon";
import { IkonBeranda, IkonProfil } from "@/components/bug-icons";

// Rangka tampilan.
//
// Di ponsel, aplikasi tetap seperti apa adanya: satu kolom penuh dengan navbar
// di bawah. Di layar lebar, kolom sempit di tengah monitor terasa seperti
// halaman ponsel yang dipaksa masuk ke desktop, jadi mulai lebar 1024px
// navigasinya berpindah ke bilah samping dan kolom isinya dilebarkan.
// Halaman-halamannya tidak perlu diubah satu per satu.
const UTAMA = [
  { href: "/", label: "Umpan", ikon: IkonBeranda },
  { href: "/peta", label: "Peta Jalur", ikon: IkonPetaJalur },
  { href: "/catat", label: "Catat Gowes", ikon: IkonCatatGowes },
  { href: "/edukasi", label: "Edukasi", ikon: IkonModul },
  { href: "/profil", label: "Profil", ikon: IkonProfil },
];
const LAIN = [
  { href: "/cari", label: "Cari Goweser", ikon: IkonProfil },
  { href: "/rute", label: "Rute Tersimpan", ikon: IkonRuteLingkar },
  { href: "/pantau", label: "Teman Pantau", ikon: IkonTemanPantau },
  { href: "/forum", label: "Forum", ikon: IkonForumGowes },
  { href: "/kampanye", label: "Kampanye", ikon: IkonKampanyeJalan },
  { href: "/lapor", label: "Lapor Jalan", ikon: IkonLaporJalan },
  { href: "/dashboard", label: "Dasbor Keselamatan", ikon: IkonDasbor },
];

export default function RangkaApp({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Halaman masuk dan daftar berdiri sendiri, tanpa bilah samping.
  const tanpaRangka = pathname.startsWith("/auth");

  if (tanpaRangka) return <>{children}</>;

  function Tautan({ href, label, ikon: Ikon }: { href: string; label: string; ikon: (p: { size?: number; aksen?: string }) => React.ReactElement }) {
    const aktif = pathname === href;
    return (
      <Link href={href} prefetch={false}
        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${aktif
          ? "bg-lime-400/12 text-lime-300"
          : "text-slate-400 hover:bg-white/5 hover:text-slate-200"}`}>
        <Ikon size={19} />
        <span className={`text-[13.5px] ${aktif ? "display-title" : "font-medium"}`}>{label}</span>
      </Link>
    );
  }

  return (
    <div className="lg:flex lg:justify-center lg:gap-6 lg:px-6">
      {/* Bilah samping, hanya di layar lebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:flex-shrink-0 lg:h-screen lg:sticky lg:top-0 lg:py-6">
        <div className="flex items-center gap-2.5 px-2 mb-6">
          <LogoBug size={40} />
          <span className="display-title text-[20px] text-white leading-none">
            BUG
            <span className="block eyebrow !text-[7px] text-lime-400/70 mt-1">Bulungan untuk Goweser</span>
          </span>
        </div>

        <nav className="space-y-1">
          {UTAMA.map((t) => <Tautan key={t.href} {...t} />)}
        </nav>

        <p className="eyebrow !text-[9px] text-slate-600 px-3 mt-6 mb-2">Fitur lain</p>
        <nav className="space-y-1 overflow-y-auto no-scrollbar">
          {LAIN.map((t) => <Tautan key={t.href} {...t} />)}
        </nav>

        <div className="mt-auto pt-5 space-y-2">
          <Link href="/sos" prefetch={false}
            className="flex items-center justify-center gap-2 rounded-xl bg-red-600 text-white py-3 display-title text-sm teks-terang">
            <IkonDaruratSos size={18} aksen="#ffffff" /> TOMBOL DARURAT
          </Link>
          <div className="flex items-center justify-between px-2 pt-1">
            <span className="text-[11px] text-slate-600">Tema tampilan</span>
            <TombolTema />
          </div>
        </div>
      </aside>

      {/* Kolom isi */}
      <div className="w-full lg:max-w-[600px] lg:py-6">{children}</div>
    </div>
  );
}
