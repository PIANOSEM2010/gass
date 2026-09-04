"use client";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

type Hasil = { alamat: string; ukuran: number; sidik: string; galat?: string };

// Menguji proksi ubin peta.
//
// Poster event pernah menampilkan satu ubin yang sama berulang-ulang, dan
// penyebabnya tidak bisa ditebak dari luar. Alat ini meminta tiga ubin yang
// berdampingan lalu membandingkan ukuran dan sidik isinya. Bila ketiganya
// identik, masalahnya ada pada proksi atau lapisan cache; bila berbeda,
// masalahnya pada cara menggambarnya.
const CONTOH = [
  { z: 14, x: 13383, y: 8062 },
  { z: 14, x: 13384, y: 8062 },
  { z: 14, x: 13384, y: 8063 },
];

async function sidikIsi(buf: ArrayBuffer): Promise<string> {
  try {
    const h = await crypto.subtle.digest("SHA-256", buf);
    return [...new Uint8Array(h)].slice(0, 6).map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    // Peramban lama tanpa crypto.subtle: pakai penanda sederhana.
    const b = new Uint8Array(buf);
    let n = 0;
    for (let i = 0; i < b.length; i += 997) n = (n * 31 + b[i]) >>> 0;
    return n.toString(16);
  }
}

export default function UjiUbin() {
  const [hasil, setHasil] = useState<Hasil[] | null>(null);

  useEffect(() => {
    (async () => {
      const keluar: Hasil[] = [];
      for (const u of CONTOH) {
        const alamat = `/api/ubin?z=${u.z}&x=${u.x}&y=${u.y}`;
        try {
          const res = await fetch(alamat, { cache: "no-store" });
          if (!res.ok) {
            keluar.push({ alamat, ukuran: 0, sidik: "-", galat: `HTTP ${res.status}` });
            continue;
          }
          const buf = await res.arrayBuffer();
          keluar.push({ alamat, ukuran: buf.byteLength, sidik: await sidikIsi(buf) });
        } catch (e) {
          keluar.push({
            alamat, ukuran: 0, sidik: "-",
            galat: e instanceof Error ? e.message : "gagal",
          });
        }
      }
      setHasil(keluar);
    })();
  }, []);

  const sidikUnik = hasil ? new Set(hasil.map((h) => h.sidik)).size : 0;
  const semuaBerhasil = hasil ? hasil.every((h) => !h.galat) : false;

  return (
    <div className="kartu-bug p-4">
      <p className="display-title text-[14px] text-white mb-2">UBIN PETA POSTER</p>

      {!hasil ? (
        <p className="flex items-center gap-2 text-[12px] text-slate-500">
          <Loader2 size={14} className="animate-spin" /> Menguji tiga ubin…
        </p>
      ) : (
        <>
          <div className="space-y-1.5">
            {hasil.map((h) => (
              <div key={h.alamat} className="flex items-center gap-2 text-[11px]">
                <span className="font-mono text-slate-500 truncate flex-1">
                  {h.alamat.replace("/api/ubin?", "")}
                </span>
                <span className={h.galat ? "text-red-300" : "text-slate-300"}>
                  {h.galat ? h.galat : `${Math.round(h.ukuran / 1024)} KB · ${h.sidik}`}
                </span>
              </div>
            ))}
          </div>

          <p className={`mt-3 rounded-xl px-3 py-2.5 text-[11.5px] leading-relaxed border ${
            !semuaBerhasil
              ? "border-red-400/35 bg-red-500/10 text-red-200"
              : sidikUnik === hasil.length
                ? "border-lime-400/30 bg-lime-400/10 text-lime-200"
                : "border-amber-400/35 bg-amber-400/10 text-amber-100"}`}>
            {!semuaBerhasil
              ? "Ubin tidak bisa diambil. Peta pada poster akan memakai tampilan cadangan tanpa peta."
              : sidikUnik === hasil.length
                ? "Ketiga ubin berbeda. Proksi peta bekerja dengan benar."
                : "Ketiga ubin ternyata sama persis. Ada lapisan cache yang mengabaikan parameter alamat, dan itulah yang membuat peta poster bermotif berulang."}
          </p>
        </>
      )}
    </div>
  );
}
