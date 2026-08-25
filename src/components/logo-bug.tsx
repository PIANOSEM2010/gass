// Lambang BUG, Arah A "Perisai Roda".
// Perisai = keselamatan; jeruji = sepeda; ujung runcing di bawah = penanda
// lokasi Bulungan. Digambar sebagai SVG agar tetap tajam di 18 px maupun 512 px.
const JALUR_PERISAI =
  "M32 4.5 L56.5 13.8 V31 C56.5 46 45.5 56 32 60.5 C18.5 56 7.5 46 7.5 31 V13.8 Z";

export default function LogoBug({
  size = 36, kotak = true, warnaGaris = "#FFFFFF",
}: { size?: number; kotak?: boolean; warnaGaris?: string }) {
  // Jeruji roda: 14 batang dari pusat, meniru pelek sepeda sungguhan.
  const jeruji = Array.from({ length: 14 }, (_, i) => {
    const a = (i * Math.PI * 2) / 14 + Math.PI / 14;
    return {
      x1: 32 + 3.4 * Math.cos(a), y1: 30 + 3.4 * Math.sin(a),
      x2: 32 + 14.6 * Math.cos(a), y2: 30 + 14.6 * Math.sin(a),
    };
  });

  const isi = (
    <>
      <path d={JALUR_PERISAI} fill="none" stroke={warnaGaris} strokeWidth="3.6" strokeLinejoin="round" />
      <circle cx="32" cy="30" r="15.6" fill="none" stroke={warnaGaris} strokeWidth="2.6" />
      <g stroke={warnaGaris} strokeWidth="1.7" strokeLinecap="round" opacity="0.92">
        {jeruji.map((j, i) => <line key={i} x1={j.x1} y1={j.y1} x2={j.x2} y2={j.y2} />)}
      </g>
      <circle cx="32" cy="30" r="4.6" fill="#5BE24A" />
    </>
  );

  if (!kotak) {
    return <svg width={size} height={size} viewBox="0 0 64 64" aria-label="BUG" role="img">{isi}</svg>;
  }
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-label="BUG" role="img">
      <defs>
        <linearGradient id="bugKotak" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#123024" />
          <stop offset="100%" stopColor="#08170F" />
        </linearGradient>
      </defs>
      <rect x="0.9" y="0.9" width="62.2" height="62.2" rx="16"
        fill="url(#bugKotak)" stroke="rgba(180,255,58,.32)" strokeWidth="1.4" />
      <g transform="translate(32 31) scale(0.82) translate(-32 -31)">{isi}</g>
    </svg>
  );
}
