"use client";
import { useState } from "react";
import { Search, X, Plus, Loader2, Route, AlertTriangle, ShieldCheck, GripVertical } from "lucide-react";
import { fetchRoute } from "@/lib/routing";
import { periksaJalurAman, type HasilPeriksa } from "@/lib/periksa-jalur";
import type { TitikEvent } from "@/lib/titik-event";

export type Tempat = { nama: string; alamat: string; lat: number; lng: number };
type Zona = { lat: number; lng: number; radius_m: number; name: string };

// Pembuat rute dari nama jalan.
//
// Pengguna mengetik "Jl. Durian", memilih salah satu hasil pencarian, lalu
// menambah "Jl. Salak", dan seterusnya. Setelah minimal dua tempat, rutenya
// dibuat mengikuti jalan sungguhan lewat mesin rute yang sama dengan
// Rekomendasi Rute - bukan garis lurus antar titik.
//
// Setiap ruas dihitung terpisah lalu disambung, karena mesin rute yang dipakai
// hanya menerima dua titik sekali jalan. Ini juga membuat urutan singgahnya
// benar-benar dipatuhi, tidak diatur ulang oleh penyedia rute.
export default function RuteDariNamaJalan({
  zona, selesai,
}: {
  zona: Zona[];
  selesai: (titik: TitikEvent[], jarakM: number) => void;
}) {
  const [kata, setKata] = useState("");
  const [hasil, setHasil] = useState<Tempat[]>([]);
  const [mencari, setMencari] = useState(false);
  const [daftar, setDaftar] = useState<Tempat[]>([]);
  const [membuat, setMembuat] = useState(false);
  const [pesan, setPesan] = useState("");
  const [periksa, setPeriksa] = useState<HasilPeriksa | null>(null);
  const [jarak, setJarak] = useState<number | null>(null);

  async function cari(e: React.FormEvent) {
    e.preventDefault();
    const q = kata.trim();
    if (q.length < 3) { setPesan("Ketik minimal 3 huruf."); return; }
    setMencari(true); setPesan(""); setHasil([]);
    try {
      const res = await fetch(`/api/cari-tempat?q=${encodeURIComponent(q)}`);
      const j = (await res.json()) as { hasil?: Tempat[] };
      const daftarHasil = j.hasil || [];
      setHasil(daftarHasil);
      if (daftarHasil.length === 0) {
        setPesan(`"${q}" tidak ditemukan di wilayah Bulungan. Coba tulis lebih lengkap, misalnya "Jl. Durian Tanjung Selor".`);
      }
    } catch {
      setPesan("Pencarian gagal. Periksa sambungan internet.");
    } finally { setMencari(false); }
  }

  function tambah(t: Tempat) {
    setDaftar((d) => [...d, t]);
    setHasil([]); setKata(""); setPesan("");
    setPeriksa(null); setJarak(null);
  }

  function hapus(i: number) {
    setDaftar((d) => d.filter((_, k) => k !== i));
    setPeriksa(null); setJarak(null);
  }

  function geser(i: number, arah: -1 | 1) {
    const j = i + arah;
    if (j < 0 || j >= daftar.length) return;
    const baru = [...daftar];
    [baru[i], baru[j]] = [baru[j], baru[i]];
    setDaftar(baru);
    setPeriksa(null); setJarak(null);
  }

  async function buatRute() {
    if (daftar.length < 2) { setPesan("Tambahkan minimal dua tempat."); return; }
    setMembuat(true); setPesan("");
    try {
      const titik: TitikEvent[] = [];
      let total = 0;

      for (let i = 0; i < daftar.length - 1; i++) {
        const a = { lat: daftar[i].lat, lng: daftar[i].lng };
        const b = { lat: daftar[i + 1].lat, lng: daftar[i + 1].lng };
        const ruas = await fetchRoute(a, b, null);
        total += ruas.info.distance;

        // Titik hasil rute diringkas agar jalurnya tetap mulus tanpa
        // menyimpan ribuan koordinat yang tidak berpengaruh pada bentuk.
        const langkah = Math.max(1, Math.ceil(ruas.coords.length / 40));
        const ringkas = ruas.coords.filter((_, k) => k % langkah === 0);
        if (ringkas[ringkas.length - 1] !== ruas.coords[ruas.coords.length - 1]) {
          ringkas.push(ruas.coords[ruas.coords.length - 1]);
        }

        ringkas.forEach(([lat, lng], k) => {
          // Titik sambungan antar ruas jangan digandakan.
          if (i > 0 && k === 0) return;
          titik.push({ lat, lng });
        });
      }

      // Tempat yang diketik pengguna dijadikan cek point, dengan namanya.
      for (const t of daftar) {
        let dekat = 0, jarakTerdekat = Infinity;
        titik.forEach((q, k) => {
          const d = Math.hypot(q.lat - t.lat, q.lng - t.lng);
          if (d < jarakTerdekat) { jarakTerdekat = d; dekat = k; }
        });
        titik[dekat] = { ...titik[dekat], cek: true, nama: t.nama };
      }

      const cek = periksaJalurAman(titik, zona);
      setPeriksa(cek);
      setJarak(total);
      selesai(titik, total);
    } catch (e) {
      setPesan(
        e instanceof Error && /rute/i.test(e.message)
          ? "Mesin rute tidak menemukan jalan yang menghubungkan tempat-tempat itu. Coba kurangi jaraknya atau ganti salah satu tempat."
          : "Gagal membuat rute. Coba lagi sebentar.",
      );
    } finally { setMembuat(false); }
  }

  return (
    <div>
      <form onSubmit={cari} className="flex gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={kata} onChange={(e) => setKata(e.target.value)}
            placeholder="Jl. Durian, Jl. Salak, Jl. Skip 2…"
            className="w-full bg-[var(--isian)] border border-lime-400/15 rounded-xl pl-10 pr-3 py-2.5 text-[13px] text-white placeholder:text-slate-500 focus:outline-none focus:border-lime-400/50" />
        </div>
        <button type="submit" disabled={mencari}
          className="rounded-xl bg-lime-400/15 text-lime-300 px-4 display-title text-[13px] disabled:opacity-50">
          {mencari ? <Loader2 size={15} className="animate-spin" /> : "Cari"}
        </button>
      </form>

      {hasil.length > 0 && (
        <ul className="mt-2 rounded-xl border border-white/10 bg-[var(--kartu)] divide-y divide-white/5 overflow-hidden">
          {hasil.map((t, i) => (
            <li key={i}>
              <button type="button" onClick={() => tambah(t)}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left">
                <Plus size={15} className="text-lime-400 flex-shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[12.5px] text-white truncate">{t.nama}</span>
                  {t.alamat && <span className="block text-[10.5px] text-slate-500 truncate">{t.alamat}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {daftar.length > 0 && (
        <ol className="mt-3 space-y-1.5">
          {daftar.map((t, i) => (
            <li key={i} className="flex items-center gap-2 rounded-xl border border-white/8 bg-[var(--kartu)] px-3 py-2">
              <GripVertical size={14} className="text-slate-600 flex-shrink-0" />
              <span className="w-5 h-5 rounded-full bg-white text-slate-950 display-title text-[10px] flex items-center justify-center flex-shrink-0">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[12.5px] text-white truncate">{t.nama}</span>
                {t.alamat && <span className="block text-[10px] text-slate-500 truncate">{t.alamat}</span>}
              </span>
              <button type="button" onClick={() => geser(i, -1)} disabled={i === 0}
                className="text-slate-500 px-1 disabled:opacity-25 text-[13px]" aria-label="Naikkan">↑</button>
              <button type="button" onClick={() => geser(i, 1)} disabled={i === daftar.length - 1}
                className="text-slate-500 px-1 disabled:opacity-25 text-[13px]" aria-label="Turunkan">↓</button>
              <button type="button" onClick={() => hapus(i)}
                className="text-red-400 px-1" aria-label="Hapus"><X size={14} /></button>
            </li>
          ))}
        </ol>
      )}

      {pesan && <p className="text-[11.5px] text-amber-300 mt-2 leading-relaxed">{pesan}</p>}

      {daftar.length >= 2 && (
        <button type="button" onClick={buatRute} disabled={membuat}
          className="w-full mt-3 rounded-xl bg-gradient-to-r from-lime-400 to-emerald-500 text-slate-950 py-3 display-title text-[14px] flex items-center justify-center gap-2 disabled:opacity-60">
          {membuat ? <Loader2 size={16} className="animate-spin" /> : <Route size={16} />}
          {membuat ? "MENYUSUN RUTE…" : "BUAT RUTE OTOMATIS"}
        </button>
      )}

      {jarak !== null && (
        <div className="mt-2.5">
          <p className="display-num text-[19px] text-lime-300">
            {(jarak / 1000).toFixed(2).replace(".", ",")} km
            <span className="display-title text-[11px] text-slate-500 ml-2">mengikuti jalan sungguhan</span>
          </p>
          {periksa && (periksa.aman ? (
            <p className="mt-1.5 flex items-center gap-1.5 text-[11.5px] text-lime-300">
              <ShieldCheck size={14} /> Jalur tidak melewati zona rawan yang terpetakan.
            </p>
          ) : (
            <div className="mt-1.5 rounded-xl border border-amber-400/35 bg-amber-400/10 px-3 py-2.5">
              <p className="text-[11.5px] font-semibold text-amber-300 flex items-center gap-1.5">
                <AlertTriangle size={13} /> Melewati {periksa.pelanggaran.length} zona rawan
              </p>
              <ul className="mt-1 text-[10.5px] text-amber-200/85 list-disc list-inside">
                {periksa.pelanggaran.slice(0, 3).map((v) => <li key={v.nama}>{v.nama}</li>)}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
