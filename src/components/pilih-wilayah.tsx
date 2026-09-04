"use client";
import { useState } from "react";
import { MapPin, Loader2, Crosshair, Check } from "lucide-react";
import { deteksiWilayah, type Wilayah } from "@/lib/wilayah";

// Pemilih wilayah.
//
// Dua cara disediakan bersama, dan itu disengaja:
//   - Tombol deteksi memakai lokasi peranti, cepat dan tanpa mengetik. Tetapi
//     ia butuh izin lokasi, bisa meleset di dalam gedung, dan tidak cocok bagi
//     orang yang sedang mendaftar dari luar daerahnya.
//   - Isian manual selalu bisa dipakai, termasuk saat izin lokasi ditolak.
//
// Karena itu deteksi diperlakukan sebagai USULAN yang mengisi kolom, bukan
// keputusan akhir. Pengguna tetap bisa menimpanya.
export default function PilihWilayah({
  nilai, ubah, wajib = false,
}: {
  nilai: Wilayah | null;
  ubah: (w: Wilayah | null) => void;
  wajib?: boolean;
}) {
  const [mendeteksi, setMendeteksi] = useState(false);
  const [pesan, setPesan] = useState("");

  async function deteksi() {
    if (mendeteksi) return;
    setMendeteksi(true); setPesan("");
    try {
      const w = await deteksiWilayah();
      if (!w) {
        setPesan("Lokasi tidak terbaca. Isi sendiri nama kabupaten atau kotamu.");
        return;
      }
      ubah(w);
      setPesan(`Terdeteksi: ${w.nama}${w.provinsi ? `, ${w.provinsi}` : ""}`);
    } catch {
      setPesan("Izin lokasi ditolak. Isi sendiri nama kabupaten atau kotamu.");
    } finally {
      setMendeteksi(false);
    }
  }

  return (
    <div>
      <label className="eyebrow !text-[9px] text-slate-500 block mb-1.5">
        Kabupaten atau kota{wajib ? "" : " (boleh dilewati)"}
      </label>

      <div className="relative">
        <MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          value={nilai?.nama || ""}
          onChange={(e) => {
            const teks = e.target.value;
            ubah(teks.trim()
              ? { nama: teks, provinsi: nilai?.provinsi || "", lat: nilai?.lat ?? 0, lng: nilai?.lng ?? 0 }
              : null);
            setPesan("");
          }}
          placeholder="Kabupaten Bulungan"
          maxLength={80}
          className="w-full bg-[var(--isian)] border border-lime-400/15 rounded-xl pl-10 pr-3 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-lime-400/50"
        />
      </div>

      <button type="button" onClick={deteksi} disabled={mendeteksi}
        className="mt-2 w-full flex items-center justify-center gap-2 rounded-xl border border-lime-400/30 text-lime-300 py-2.5 text-[12.5px] font-semibold disabled:opacity-60">
        {mendeteksi ? <Loader2 size={14} className="animate-spin" /> : <Crosshair size={14} />}
        {mendeteksi ? "Membaca lokasi…" : "Deteksi dari lokasiku"}
      </button>

      {nilai?.provinsi && (
        <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-500">
          <Check size={12} className="text-lime-400" /> {nilai.provinsi}
        </p>
      )}
      {pesan && <p className="mt-1.5 text-[11px] text-slate-400 leading-relaxed">{pesan}</p>}

      <p className="mt-1.5 text-[10.5px] text-slate-600 leading-relaxed">
        Dipakai untuk memusatkan peta, membatasi pencarian tempat, dan menamai
        kartu gowesmu. Bisa diubah kapan saja lewat Profil.
      </p>
    </div>
  );
}
