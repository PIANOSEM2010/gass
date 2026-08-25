"use client";
import { Avatar } from "@/components/umpan-kartu";

// Lencana juara. Digambar sendiri, bukan emoji, supaya tajam di segala ukuran
// dan memakai motif jeruji roda seperti lambang BUG. Tiap peringkat punya
// bentuk pita dan jumlah bintang yang berbeda, jadi bisa dibedakan bahkan oleh
// mata yang sulit membedakan warna.
const RUPA = {
  1: { nama: "JUARA 1", luar: "#F6C544", dalam: "#FFE9A3", garis: "#8A5B00", pita: "#E0342F", bintang: 3 },
  2: { nama: "JUARA 2", luar: "#C9D4DC", dalam: "#EEF3F6", garis: "#4E5C67", pita: "#5A6B78", bintang: 2 },
  3: { nama: "JUARA 3", luar: "#CB8B5A", dalam: "#F0D3B9", garis: "#6B3F1C", pita: "#8A5230", bintang: 1 },
} as const;

export function LencanaJuara({ peringkat, size = 64 }: { peringkat: 1 | 2 | 3; size?: number }) {
  const r = RUPA[peringkat];
  const jeruji = Array.from({ length: 12 }, (_, i) => {
    const a = (i * Math.PI * 2) / 12 + Math.PI / 12;
    return { x1: 32 + 7 * Math.cos(a), y1: 34 + 7 * Math.sin(a), x2: 32 + 17 * Math.cos(a), y2: 34 + 17 * Math.sin(a) };
  });
  const bintang = Array.from({ length: r.bintang }, (_, i) => (i - (r.bintang - 1) / 2) * 9);

  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-label={r.nama} role="img">
      {/* Pita: dua kaki kain di belakang medali */}
      <path d="M20 4 L27 4 L31 20 L24 22 Z" fill={r.pita} />
      <path d="M44 4 L37 4 L33 20 L40 22 Z" fill={r.pita} opacity=".82" />
      {/* Piringan medali */}
      <circle cx="32" cy="34" r="21" fill={r.luar} stroke={r.garis} strokeWidth="2" />
      <circle cx="32" cy="34" r="16.5" fill={r.dalam} />
      {/* Jeruji roda di dalam piringan */}
      <g stroke={r.garis} strokeWidth="1.1" opacity=".45">
        {jeruji.map((j, i) => <line key={i} x1={j.x1} y1={j.y1} x2={j.x2} y2={j.y2} />)}
      </g>
      <circle cx="32" cy="34" r="7" fill={r.luar} stroke={r.garis} strokeWidth="1.2" />
      <text x="32" y="38.5" textAnchor="middle" fontSize="10" fontWeight="800" fill={r.garis}>{peringkat}</text>
      {/* Bintang penanda peringkat, jumlahnya berbeda tiap tingkat */}
      <g fill={r.garis} opacity=".8">
        {bintang.map((dx, i) => (
          <circle key={i} cx={32 + dx} cy={50.5} r="1.9" />
        ))}
      </g>
    </svg>
  );
}

export type Peserta = {
  user_id: string; nama: string; asal: string; foto: string | null;
  streak: number; km: number; rides: number; saya: boolean;
};

// Podium tiga besar: juara 1 di tengah dan paling tinggi, seperti mimbar juara
// sungguhan, bukan sekadar tiga baris daftar.
export function Podium({ tiga }: { tiga: Peserta[] }) {
  if (tiga.length === 0) return null;
  const urut: (Peserta | undefined)[] = [tiga[1], tiga[0], tiga[2]];
  const tinggi = [100, 132, 86];
  const rank: (1 | 2 | 3)[] = [2, 1, 3];

  return (
    <div className="relative">
      <div className="absolute inset-x-0 top-4 h-32 pointer-events-none"
        style={{ background: "radial-gradient(60% 80% at 50% 0%, rgba(246,197,68,.16) 0%, transparent 70%)" }} />
      <div className="relative flex items-end justify-center gap-2.5">
        {urut.map((p, i) =>
          !p ? <div key={i} className="flex-1" /> : (
            <div key={p.user_id} className="flex-1 flex flex-col items-center min-w-0">
              {/* Blok atas diberi tinggi tetap supaya nama yang membungkus dua
                  baris tidak menggeser mimbar dan ketiganya tetap sejajar. */}
              <div className="h-[152px] flex flex-col items-center justify-end w-full">
                <LencanaJuara peringkat={rank[i]} size={rank[i] === 1 ? 60 : 48} />
                <div className="mt-1.5">
                  <Avatar nama={p.nama} foto={p.foto} ukuran={rank[i] === 1 ? 44 : 36} />
                </div>
                <p className={`display-title text-white text-center leading-[1.1] mt-1.5 px-0.5 w-full line-clamp-2 ${rank[i] === 1 ? "text-[12.5px]" : "text-[11px]"}`}>
                  {p.nama.split(" ").slice(0, 2).join(" ")}
                </p>
                <p className="text-[9px] text-slate-500 text-center truncate w-full px-0.5">{p.asal || "-"}</p>
              </div>

              {/* Mimbar */}
              <div className="w-full mt-2 rounded-t-xl border border-b-0 border-white/10 flex flex-col items-center justify-start pt-2 overflow-hidden"
                style={{
                  height: tinggi[i],
                  background: rank[i] === 1
                    ? "linear-gradient(180deg, rgba(246,197,68,.22) 0%, rgba(246,197,68,.05) 100%)"
                    : "linear-gradient(180deg, rgba(255,255,255,.09) 0%, rgba(255,255,255,.02) 100%)",
                }}>
                <p className="display-num text-[22px] leading-none text-white">{p.streak}</p>
                <p className="eyebrow !text-[7.5px] text-slate-500 mt-1">hari</p>
                <p className="display-num text-[12px] text-lime-300 mt-1">{p.km.toFixed(1).replace(".", ",")} km</p>
              </div>
            </div>
          ),
        )}
      </div>
      <div className="h-[3px] rounded-sm"
        style={{ background: "repeating-linear-gradient(90deg,#FFB020 0 12px,transparent 12px 22px)" }} />
    </div>
  );
}
