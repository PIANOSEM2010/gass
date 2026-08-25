"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import {
  IkonPeta, IkonEdukasi, IkonKampanye, IkonForum, IkonPantau, IkonRute, IkonLapor, IkonTrofi,
} from "@/components/bug-icons";

// Geser fitur di puncak halaman Umpan. Semua fitur BUG tetap satu ketukan
// tanpa memakan slot navbar - digulir mendatar, bukan ditumpuk ke bawah.
const FITUR = [
  { href: "/peta", label: "Peta Jalur", ket: "Jalur aman & zona rawan", ikon: IkonPeta, warna: "#38BDF8" },
  { href: "/edukasi", label: "Edukasi", ket: "Etika berbagi jalan", ikon: IkonEdukasi, warna: "#B4FF3A" },
  { href: "/pantau", label: "Teman Pantau", ket: "Keluarga memantau langsung", ikon: IkonPantau, warna: "#2DD4BF" },
  { href: "/peta?rekomendasi=1", label: "Rekomendasi Rute", ket: "Rute melingkar otomatis", ikon: IkonRute, warna: "#A78BFA" },
  { href: "/lapor", label: "Lapor Jalan", ket: "Laporkan jalan rusak", ikon: IkonLapor, warna: "#FBBF24" },
  { href: "/leaderboard", label: "Papan Peringkat", ket: "Peringkat goweser Bulungan", ikon: IkonTrofi, warna: "#FB7185" },
  { href: "/kampanye", label: "Kampanye", ket: "Berbagi jalan untuk pesepeda", ikon: IkonKampanye, warna: "#FB923C" },
  { href: "/forum", label: "Forum", ket: "Komunitas pesepeda", ikon: IkonForum, warna: "#60A5FA" },
];

export default function GeserFitur() {
  const relRef = useRef<HTMLDivElement>(null);
  const [aktif, setAktif] = useState(0);

  function saatGulir() {
    const el = relRef.current;
    if (!el) return;
    const lebarKartu = el.scrollWidth / FITUR.length;
    setAktif(Math.round(el.scrollLeft / lebarKartu));
  }

  return (
    <section className="pt-3">
      <div className="flex items-center justify-between px-5 mb-2">
        <p className="eyebrow !text-[9px] text-slate-500">Yang bisa kamu lakukan</p>
        <span className="text-[10px] text-slate-600">geser →</span>
      </div>

      <div ref={relRef} onScroll={saatGulir}
        className="flex gap-2.5 overflow-x-auto px-5 pb-2 no-scrollbar snap-x snap-mandatory">
        {FITUR.map((f) => (
          <Link key={f.href} href={f.href}
            className="snap-start flex-shrink-0 w-[150px] rounded-2xl border border-white/8 bg-[#0C1A15] p-3.5 active:scale-[.97] transition-transform">
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl mb-2.5"
              style={{ background: `${f.warna}1F`, color: f.warna }}>
              <f.ikon size={20} />
            </span>
            <p className="display-title text-[12.5px] text-white leading-tight">{f.label}</p>
            <p className="text-[10.5px] text-slate-500 mt-1 leading-snug">{f.ket}</p>
          </Link>
        ))}
      </div>

      <div className="flex justify-center gap-1.5 pb-1">
        {FITUR.map((f, i) => (
          <span key={f.href}
            className="h-1 rounded-full transition-all"
            style={{
              width: i === aktif ? 14 : 5,
              background: i === aktif ? "#B4FF3A" : "rgba(255,255,255,.18)",
            }} />
        ))}
      </div>
    </section>
  );
}
