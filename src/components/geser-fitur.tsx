"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import {
  IkonPetaJalur, IkonModul, IkonTemanPantau, IkonRuteLingkar,
  IkonLaporJalan, IkonDasbor, IkonKampanyeJalan, IkonForumGowes,
} from "@/components/fitur-ikon";

// Geser fitur di puncak halaman Umpan. Semua fitur BUG tetap satu ketukan
// tanpa memakan slot navbar - digulir mendatar, bukan ditumpuk ke bawah.
const FITUR = [
  { href: "/peta", label: "Peta Jalur", ket: "Jalur aman & zona rawan", ikon: IkonPetaJalur, warna: "#38BDF8" },
  { href: "/edukasi", label: "Edukasi", ket: "Etika berbagi jalan", ikon: IkonModul, warna: "#B4FF3A" },
  { href: "/pantau", label: "Teman Pantau", ket: "Keluarga memantau langsung", ikon: IkonTemanPantau, warna: "#2DD4BF" },
  { href: "/peta?rekomendasi=1", label: "Rekomendasi Rute", ket: "Rute melingkar otomatis", ikon: IkonRuteLingkar, warna: "#A78BFA" },
  { href: "/lapor", label: "Lapor Jalan", ket: "Laporkan jalan rusak", ikon: IkonLaporJalan, warna: "#FBBF24" },
  { href: "/dashboard", label: "Dasbor Keselamatan", ket: "Data keselamatan pesepeda Bulungan", ikon: IkonDasbor, warna: "#FB7185" },
  { href: "/event", label: "Event Gowes", ket: "Gowes bareng di Bulungan", ikon: IkonKampanyeJalan, warna: "#FB923C" },
  { href: "/kampanye", label: "Kampanye", ket: "Berbagi jalan untuk pesepeda", ikon: IkonKampanyeJalan, warna: "#F472B6" },
  { href: "/forum", label: "Forum", ket: "Komunitas pesepeda", ikon: IkonForumGowes, warna: "#60A5FA" },
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
      <div className="flex items-end justify-between px-5 mb-2.5">
        <div>
          <p className="eyebrow !text-[9px] text-lime-400/70">Yang bisa kamu lakukan</p>
          <p className="display-title text-[16px] text-white leading-none mt-1">SEMUA FITUR BUG</p>
        </div>
        <span className="text-[10px] text-slate-600 pb-0.5 flex-shrink-0">geser →</span>
      </div>

      <div ref={relRef} onScroll={saatGulir}
        className="flex gap-2.5 overflow-x-auto px-5 pb-3 no-scrollbar snap-x snap-mandatory jenjang">
        {FITUR.map((f) => (
          <Link key={f.href} href={f.href}
            className="snap-start flex-shrink-0 w-[158px] relative rounded-2xl overflow-hidden p-3.5 active:scale-[.97] transition-transform"
            style={{
              background: `linear-gradient(160deg, ${f.warna}14 0%, var(--kartu) 58%)`,
              border: `1px solid ${f.warna}2E`,
            }}>
            {/* cahaya aksen di sudut kartu */}
            <span className="absolute -top-10 -right-8 w-28 h-28 pointer-events-none"
              style={{ background: `radial-gradient(circle at center, ${f.warna}2A 0%, transparent 70%)` }} />
            <span className="absolute inset-x-0 top-0 h-px"
              style={{ background: `linear-gradient(90deg, transparent, ${f.warna}88, transparent)` }} />
            <span className="relative inline-flex items-center justify-center w-11 h-11 rounded-xl mb-3"
              style={{ background: `${f.warna}22`, color: f.warna, boxShadow: `0 0 18px ${f.warna}22` }}>
              <f.ikon size={21} aksen={f.warna} />
            </span>
            <p className="relative display-title text-[13px] text-white leading-tight">{f.label}</p>
            <p className="relative text-[10.5px] text-slate-400 mt-1 leading-snug">{f.ket}</p>
            <span className="relative block mt-3 h-[2px] w-8 rounded-sm"
              style={{ background: `repeating-linear-gradient(90deg, ${f.warna} 0 6px, transparent 6px 11px)` }} />
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
