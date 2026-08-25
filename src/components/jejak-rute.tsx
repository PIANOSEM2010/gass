"use client";
import React from "react";

export type Titik = { lat: number; lng: number };

// Menggambar jejak rute asli (bukan grafik hiasan) dari daftar titik GPS.
// Koordinat dinormalkan ke kotak gambar dengan menjaga rasio, sehingga bentuk
// rutenya tidak gepeng. Dipakai di kartu umpan dan petak aktivitas profil.
export default function JejakRute({
  path, width = 300, height = 90, warna = "#B4FF3A", tebal = 2.5, titikUjung = true,
}: {
  path: Titik[] | null; width?: number; height?: number;
  warna?: string; tebal?: number; titikUjung?: boolean;
}) {
  const d = React.useMemo(() => {
    if (!path || path.length < 2) return null;
    // Ambil maksimal 160 titik agar ringan namun bentuknya tetap utuh.
    const langkah = Math.max(1, Math.floor(path.length / 160));
    const p = path.filter((_, i) => i % langkah === 0);
    const lats = p.map((t) => t.lat), lngs = p.map((t) => t.lng);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    const spanLat = Math.max(maxLat - minLat, 1e-6);
    const spanLng = Math.max(maxLng - minLng, 1e-6);
    const pad = 8;
    const skala = Math.min((width - pad * 2) / spanLng, (height - pad * 2) / spanLat);
    const offX = (width - spanLng * skala) / 2;
    const offY = (height - spanLat * skala) / 2;
    const xy = p.map((t) => [
      offX + (t.lng - minLng) * skala,
      // sumbu y dibalik: lintang besar berarti ke utara (atas)
      height - (offY + (t.lat - minLat) * skala),
    ] as [number, number]);
    return { garis: xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" "), awal: xy[0], akhir: xy[xy.length - 1] };
  }, [path, width, height]);

  if (!d) {
    return (
      <div className="flex items-center justify-center text-[10px] text-slate-600" style={{ width, height }}>
        jejak rute tidak tersimpan
      </div>
    );
  }
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" className="overflow-visible">
      <path d={d.garis} fill="none" stroke={warna} strokeWidth={tebal}
        strokeLinecap="round" strokeLinejoin="round" opacity="0.95" />
      {titikUjung && (
        <>
          <circle cx={d.awal[0]} cy={d.awal[1]} r={tebal + 1.2} fill="#ffffff" />
          <circle cx={d.akhir[0]} cy={d.akhir[1]} r={tebal + 1.8} fill={warna} />
        </>
      )}
    </svg>
  );
}
