import React from "react";

// Kepala halaman seragam untuk seluruh aplikasi: pita marka jalan tipis,
// judul display, keterangan, dan slot kanan opsional. Menggantikan
// spanduk gradien warna-warni yang dulu berbeda-beda di tiap halaman.
export default function KepalaHalaman({
  ikon, judul, keterangan, warna = "#B4FF3A", kanan, anak,
}: {
  ikon?: React.ReactNode;
  judul: string;
  keterangan?: string;
  warna?: string;
  kanan?: React.ReactNode;
  anak?: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden border-b border-white/8">
      <div
        className="absolute -top-20 -right-16 w-64 h-64 pointer-events-none"
        style={{ background: `radial-gradient(circle at center, ${warna}22 0%, transparent 65%)` }}
      />
      <div className="relative max-w-md mx-auto px-5 pt-6 pb-5">
        <div className="flex items-center gap-3">
          {ikon && (
            <span className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${warna}1F`, color: warna }}>
              {ikon}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="display-title text-[20px] leading-none text-white">{judul}</h1>
            {keterangan && <p className="text-[11.5px] text-slate-400 mt-1.5 leading-snug">{keterangan}</p>}
          </div>
          {kanan}
        </div>
        <div className="mt-4 h-[3px] w-20 rounded-sm"
          style={{ background: `repeating-linear-gradient(90deg,${warna} 0 11px,transparent 11px 20px)` }} />
        {anak}
      </div>
    </div>
  );
}
