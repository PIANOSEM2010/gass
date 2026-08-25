"use client";
// Geometri jeruji roda sebagai latar struktural (bukan foto hiasan).
// Dipakai di kartu jarak halaman Catat Gowes, sesuai rancangan.
export default function RodaLatar({ className = "", putar = false }: { className?: string; putar?: boolean }) {
  const n = 24;
  const jeruji = Array.from({ length: n }, (_, i) => {
    const a = (i * Math.PI * 2) / n;
    return {
      x1: 150 + 26 * Math.cos(a), y1: 150 + 26 * Math.sin(a),
      x2: 150 + 138 * Math.cos(a), y2: 150 + 138 * Math.sin(a),
    };
  });
  return (
    <svg viewBox="0 0 300 300" className={`${className} ${putar ? "nav-wheel" : ""}`} aria-hidden="true">
      {jeruji.map((j, i) => (
        <line key={i} x1={j.x1} y1={j.y1} x2={j.x2} y2={j.y2} stroke="rgba(180,255,58,.18)" strokeWidth="1" />
      ))}
      <circle cx="150" cy="150" r="138" fill="none" stroke="rgba(180,255,58,.22)" strokeWidth="2" />
      <circle cx="150" cy="150" r="26" fill="none" stroke="rgba(180,255,58,.3)" strokeWidth="2" />
    </svg>
  );
}
