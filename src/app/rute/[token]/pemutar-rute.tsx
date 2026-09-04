"use client";
import Link from "next/link";
import { namaWilayahCepat } from "@/lib/wilayah";
import { useEffect, useRef, useState } from "react";
import { Play, Pause, Share2, Download, Loader2, Trash2, Map as MapIcon } from "lucide-react";
import { type Titik } from "@/components/jejak-rute";
import { gambarKartuTanah } from "@/lib/kartu-tanah";
import { tautanRute } from "@/lib/rute-tersimpan";
import { shareImageDataUrl } from "@/lib/native-share";
import { namaBeberapaJalan } from "@/lib/nama-jalan";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

// Pemutar rute: jejaknya digambar bertahap seperti sedang ditelusuri ulang,
// dengan penanda yang berjalan di ujung garis. Digambar di SVG, bukan peta,
// supaya ringan dan tetap jalan tanpa koneksi ke penyedia ubin peta.
export default function PemutarRute({
  nama, pemilik, path, distanceM, elevM, durationS, token, milikSaya, id,
}: {
  nama: string; pemilik: string; path: Titik[]; distanceM: number; elevM: number;
  durationS: number | null; token: string; milikSaya: boolean; id: string;
}) {
  const router = useRouter();
  const [maju, setMaju] = useState(1);      // 0..1
  const [main, setMain] = useState(false);
  const [pesan, setPesan] = useState("");
  const [namaJalanTitik, setNamaJalanTitik] = useState<string[]>([]);
  const [sibuk, setSibuk] = useState(false);
  const kanvasRef = useRef<HTMLCanvasElement>(null);

  // Penanda titik pada jalur. Rute pendek cukup A ke B; rute panjang diberi
  // titik lewat di tengah supaya arah gowesnya jelas terbaca di kartu.
  const penandaDasar = (() => {
    const km = distanceM / 1000;
    const jumlah = km >= 20 ? 4 : km >= 8 ? 3 : 2;
    const huruf = ["A", "B", "C", "D"];
    return Array.from({ length: jumlah }, (_, i) => ({
      label: huruf[i],
      peran: i === 0 ? "Mulai" : i === jumlah - 1 ? "Selesai" : `Melewati`,
    }));
  })();

  // Penanda akhir: huruf + peran + nama jalan (bila sudah didapat).
  const penandaTitik = penandaDasar.map((t, i) => ({
    ...t, nama: namaJalanTitik[i] || "",
  }));

  const W = 340, H = 240;
  const xy = (() => {
    if (path.length < 2) return [] as [number, number][];
    const lats = path.map((p) => p.lat), lngs = path.map((p) => p.lng);
    const miLa = Math.min(...lats), maLa = Math.max(...lats);
    const miLo = Math.min(...lngs), maLo = Math.max(...lngs);
    const sLa = maLa - miLa || 1e-6, sLo = maLo - miLo || 1e-6;
    const pad = 22;
    const sc = Math.min((W - pad * 2) / sLo, (H - pad * 2) / sLa);
    const ox = (W - sLo * sc) / 2, oy = (H - sLa * sc) / 2;
    return path.map((p) => [ox + (p.lng - miLo) * sc, oy + (maLa - p.lat) * sc] as [number, number]);
  })();

  // Nama jalan tiap penanda diambil sekali, berurutan dengan jeda, karena
  // Nominatim membatasi satu permintaan per detik.
  useEffect(() => {
    if (path.length < 2) return;
    let hidup = true;
    const titik = penandaDasar.map((_, i) => {
      const bagian = penandaDasar.length === 1 ? 0 : i / (penandaDasar.length - 1);
      return path[Math.round(bagian * (path.length - 1))];
    });
    namaBeberapaJalan(titik).then((n) => { if (hidup) setNamaJalanTitik(n); }).catch(() => null);
    return () => { hidup = false; };
    // penandaDasar hanya bergantung pada jarak, jadi cukup dihitung sekali.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path.length, distanceM]);

  useEffect(() => {
    if (!main) return;
    const t = setInterval(() => {
      setMaju((m) => {
        if (m >= 1) { setMain(false); return 1; }
        return Math.min(1, m + 0.012);
      });
    }, 40);
    return () => clearInterval(t);
  }, [main]);

  // Penanda diletakkan berdasarkan panjang jalur agar tidak bertumpuk.
  const indeksPanjang = (() => {
    const kum: number[] = [0];
    for (let i = 1; i < xy.length; i++) {
      kum.push(kum[i - 1] + Math.hypot(xy[i][0] - xy[i - 1][0], xy[i][1] - xy[i - 1][1]));
    }
    const total = kum[kum.length - 1] || 1;
    return (bagian: number) => {
      const target = bagian * total;
      let lo = 0, hi = kum.length - 1;
      while (lo < hi) { const m = (lo + hi) >> 1; if (kum[m] < target) lo = m + 1; else hi = m; }
      return lo;
    };
  })();

  const sampai = Math.max(2, Math.round(xy.length * maju));
  const d = xy.slice(0, sampai).map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const ujung = xy[sampai - 1];

  function putar() {
    if (maju >= 1) setMaju(0);
    setMain(true);
  }

  async function bagikan() {
    const k = kanvasRef.current;
    if (!k || sibuk) return;
    setSibuk(true); setPesan("");
    try {
      const teks =
        `Rute ${nama}\n${(distanceM / 1000).toFixed(2).replace(".", ",")} km.\n` +
        `Buka rutenya: ${tautanRute(token)}`;
      const r = await shareImageDataUrl(
        k.toDataURL("image/png"),
        `rute-${nama.replace(/\s+/g, "-").toLowerCase()}.png`,
        teks,
      );
      if (r.status === "downloaded") {
        await navigator.clipboard.writeText(teks).catch(() => null);
        setPesan("Peranti ini belum bisa membuka pilihan berbagi. Gambar sudah diunduh dan tautannya disalin.");
      } else if (r.status === "failed") {
        setPesan(`Gagal membagikan: ${r.error || "tidak diketahui"}`);
      }
    } finally { setSibuk(false); }
  }

  function unduh() {
    const k = kanvasRef.current;
    if (!k) return;
    const a = document.createElement("a");
    a.href = k.toDataURL("image/png");
    a.download = `rute-${nama.replace(/\s+/g, "-").toLowerCase()}.png`;
    a.click();
  }

  async function hapus() {
    if (sibuk) return;
    setSibuk(true);
    try {
      const sb = createClient();
      const { error } = await sb.from("saved_routes").delete().eq("id", id);
      if (error) throw error;
      router.push("/rute");
      router.refresh();
    } catch (e) {
      setPesan(e instanceof Error ? e.message : "Gagal menghapus rute.");
      setSibuk(false);
    }
  }

  // Kartu rute memakai template Blok Tegas, sama seperti kartu gowes.
  useEffect(() => {
    if (!kanvasRef.current || path.length < 2) return;
    gambarKartuTanah(kanvasRef.current, {
      template: "blok", warna: "terakota", rasio: "1:1", path,
      distanceM, durationS: durationS ?? 0, elevM, place: namaWilayahCepat(),
      kalori: Math.round((distanceM / 1000) * 35),
      penanda: penandaTitik,
    });
  }, [path, distanceM, durationS, elevM, penandaTitik]);

  return (
    <div className="min-h-screen bg-[var(--latar)] pb-10">
      <div className="max-w-md mx-auto px-4 pt-6">
        <Link href="/rute" className="text-xs text-slate-400">← Semua rute tersimpan</Link>

        <h1 className="display-title text-2xl text-white mt-3 leading-tight">{nama}</h1>
        <p className="text-[11.5px] text-slate-500 mt-1">Disimpan oleh {pemilik}</p>

        {/* Pemutar jejak */}
        <div className="mt-4 rounded-2xl border border-lime-400/12 bg-[var(--relung)] p-3">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-hidden="true">
            {/* Bayangan seluruh rute agar bentuk akhirnya tetap terbaca */}
            <path d={xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ")}
              fill="none" stroke="rgba(148,163,184,.22)" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
            <path d={d} fill="none" stroke="#B4FF3A" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
            {/* Penanda huruf pada jalur: A mulai, huruf terakhir selesai */}
            {penandaTitik.map((t, i) => {
              const pos = indeksPanjang(i / (penandaTitik.length - 1));
              const p = xy[pos];
              if (!p) return null;
              const akhir = i === penandaTitik.length - 1;
              return (
                <g key={t.label}>
                  <circle cx={p[0]} cy={p[1]} r={akhir ? 12 : 11}
                    fill={akhir ? "#B4FF3A" : "#ffffff"} stroke="#0A1410" strokeWidth="2" />
                  <text x={p[0]} y={p[1] + 4.5} textAnchor="middle" fontSize="11"
                    fontWeight="800" fill="#0A1410">{t.label}</text>
                </g>
              );
            })}
            {ujung && <circle cx={ujung[0]} cy={ujung[1]} r="4" fill="#B4FF3A" opacity=".9" />}
          </svg>

          <div className="flex items-center gap-3 mt-1">
            <button onClick={main ? () => setMain(false) : putar}
              className="w-10 h-10 rounded-full bg-lime-400 text-slate-950 flex items-center justify-center flex-shrink-0">
              {main ? <Pause size={18} /> : <Play size={18} />}
            </button>
            <input type="range" min={0} max={1} step={0.005} value={maju}
              onChange={(e) => { setMain(false); setMaju(Number(e.target.value)); }}
              className="flex-1 accent-lime-400" aria-label="Geser posisi pemutaran" />
            <span className="display-num text-sm text-slate-400 w-10 text-right">{Math.round(maju * 100)}%</span>
          </div>
        </div>

        {/* Keterangan penanda, supaya jelas gowes dari mana ke mana */}
        <div className="mt-3 rounded-2xl border border-white/8 bg-[var(--kartu)] px-4 py-3 space-y-2">
          {penandaTitik.map((t, i) => (
            <div key={t.label} className="flex items-center gap-2.5">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center display-title text-[11px] flex-shrink-0 ${i === penandaTitik.length - 1 ? "bg-lime-400 text-slate-950" : "bg-white text-slate-950"}`}>
                {t.label}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] text-white truncate">
                  {t.nama || (namaJalanTitik.length ? "Nama jalan tidak diketahui" : "Mencari nama jalan…")}
                </span>
                <span className="block text-[10.5px] text-slate-500">{t.peran}</span>
              </span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2 mt-3">
          {[
            { l: "Jarak", v: (distanceM / 1000).toFixed(2).replace(".", ","), u: "km" },
            { l: "Waktu", v: durationS ? String(Math.round(durationS / 60)) : "-", u: durationS ? "mnt" : "" },
            { l: "Elevasi", v: String(Math.round(elevM)), u: "m" },
          ].map((b) => (
            <div key={b.l} className="rounded-2xl border border-white/8 bg-[var(--kartu)] px-3 py-3">
              <p className="eyebrow !text-[8px] text-slate-500">{b.l}</p>
              <p className="display-num text-[24px] leading-none text-white mt-1">
                {b.v}<span className="display-title text-[11px] text-slate-500 ml-0.5">{b.u}</span>
              </p>
            </div>
          ))}
        </div>

        <Link href={`/peta?rute=${token}`}
          className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-lime-400 to-emerald-500 text-slate-950 py-3.5 display-title text-base">
          <MapIcon size={18} /> BUKA DI PETA JALUR
        </Link>

        <h2 className="eyebrow text-slate-500 !text-[10px] mt-6 mb-2">Kartu rute</h2>
        <canvas ref={kanvasRef} className="w-full h-auto rounded-2xl border border-white/10" />

        <div className="grid grid-cols-2 gap-2 mt-3">
          <button onClick={bagikan}
            className="rounded-xl bg-gradient-to-r from-lime-400 to-emerald-500 text-slate-950 py-3 display-title text-sm flex items-center justify-center gap-2">
            <Share2 size={16} /> Bagikan
          </button>
          <button onClick={unduh}
            className="rounded-xl border border-white/15 text-slate-200 py-3 display-title text-sm flex items-center justify-center gap-2">
            <Download size={16} /> Unduh
          </button>
        </div>
        {pesan && <p className="text-[11.5px] text-slate-400 mt-2">{pesan}</p>}

        {milikSaya && (
          <button onClick={hapus} disabled={sibuk}
            className="mt-4 w-full rounded-xl border border-red-400/30 text-red-300 py-3 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
            {sibuk ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />} Hapus rute ini
          </button>
        )}
      </div>
    </div>
  );
}
