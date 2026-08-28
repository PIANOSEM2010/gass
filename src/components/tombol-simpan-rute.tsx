"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bookmark, Loader2, Check } from "lucide-react";
import { simpanRute } from "@/lib/rute-tersimpan";
import { type Titik } from "@/components/jejak-rute";

// Tombol simpan rute. Dipakai di Riwayat Perjalanan dan di Rekomendasi Rute.
export default function TombolSimpanRute({
  path, distanceM, elevM, durationS, namaAwal, source = "riwayat", ringkas = false,
}: {
  path: Titik[] | null; distanceM: number; elevM?: number; durationS?: number | null;
  namaAwal: string; source?: string; ringkas?: boolean;
}) {
  const router = useRouter();
  const [buka, setBuka] = useState(false);
  const [nama, setNama] = useState(namaAwal);
  const [sibuk, setSibuk] = useState(false);
  const [pesan, setPesan] = useState("");
  const [selesai, setSelesai] = useState(false);

  async function simpan() {
    if (sibuk) return;
    setSibuk(true); setPesan("");
    try {
      await simpanRute({
        name: nama, path: path || [], distanceM,
        elevM: elevM ?? 0, durationS: durationS ?? null, source,
      });
      setSelesai(true); setBuka(false);
      router.refresh();
    } catch (e) {
      setPesan(e instanceof Error ? e.message : "Gagal menyimpan rute.");
    } finally { setSibuk(false); }
  }

  const nonaktif = !path || path.length < 2;

  return (
    <>
      <button onClick={() => setBuka(true)} disabled={nonaktif || selesai}
        title={nonaktif ? "Rute ini tidak punya jejak GPS" : "Simpan rute"}
        className={`${ringkas ? "px-3" : "flex-1"} border py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-1.5 disabled:opacity-45 active:scale-95 transition-transform ${selesai ? "border-lime-400/50 text-lime-300" : "border-violet-400/40 text-violet-300"}`}>
        {selesai ? <><Check size={16} /> Tersimpan</> : <><Bookmark size={16} /> {ringkas ? "" : "Simpan Rute"}</>}
      </button>

      {buka && (
        <div className="fixed inset-0 z-[4000] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center"
          onClick={() => setBuka(false)}>
          <div className="bg-[var(--kartu)] border border-lime-400/15 rounded-t-3xl sm:rounded-2xl w-full max-w-md p-5"
            onClick={(e) => e.stopPropagation()}>
            <p className="display-title text-base text-white">SIMPAN RUTE</p>
            <p className="text-[12px] text-slate-400 mt-1.5 leading-relaxed">
              Rute tersimpan bisa kamu putar ulang, pakai lagi, dan bagikan lewat tautan.
            </p>
            <label className="eyebrow !text-[9px] text-slate-500 block mt-4 mb-1.5">Nama rute</label>
            <input value={nama} onChange={(e) => setNama(e.target.value)} maxLength={80}
              className="w-full bg-[var(--isian)] border border-lime-400/15 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-lime-400/50" />
            {pesan && <p className="text-[11.5px] text-red-400 mt-2">{pesan}</p>}
            <div className="flex gap-2.5 mt-4">
              <button onClick={() => setBuka(false)} disabled={sibuk}
                className="flex-1 rounded-xl border border-white/12 text-slate-300 py-3 text-sm font-semibold">Batal</button>
              <button onClick={simpan} disabled={sibuk || nama.trim().length < 1}
                className="flex-1 rounded-xl bg-gradient-to-r from-lime-400 to-emerald-500 text-slate-950 py-3 display-title text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                {sibuk ? <Loader2 size={15} className="animate-spin" /> : <Bookmark size={15} />} Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
