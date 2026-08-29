"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
import { MapPin, Trash2, Undo2 } from "lucide-react";
import { type Titik } from "@/components/jejak-rute";

const PetaTitik = dynamic(() => import("./peta-titik"), {
  ssr: false,
  loading: () => <div className="h-64 rounded-2xl bg-[var(--relung)] animate-pulse" />,
});

const HURUF = "ABCDEFGHIJ";

// Penanda jalur event: pengguna mengetuk peta satu per satu untuk menandai
// titik-titik yang akan dilewati, berurutan dari start ke finish.
export default function PilihTitikPeta({
  titik, ubah,
}: { titik: Titik[]; ubah: (t: Titik[]) => void }) {
  const [pesan, setPesan] = useState("");

  function tambah(lat: number, lng: number) {
    if (titik.length >= HURUF.length) {
      setPesan(`Maksimal ${HURUF.length} titik.`);
      return;
    }
    setPesan("");
    ubah([...titik, { lat, lng }]);
  }

  return (
    <div>
      <PetaTitik titik={titik} onTambah={tambah} />

      <div className="flex items-center gap-2 mt-2">
        <p className="text-[11.5px] text-slate-500 flex-1">
          {titik.length === 0
            ? "Ketuk peta untuk menandai titik START."
            : titik.length === 1
              ? "Ketuk lagi untuk menandai titik berikutnya."
              : `${titik.length} titik ditandai. Titik terakhir dihitung sebagai FINISH.`}
        </p>
        {titik.length > 0 && (
          <>
            <button type="button" onClick={() => ubah(titik.slice(0, -1))}
              className="rounded-lg border border-white/12 text-slate-300 px-2.5 py-1.5 text-[11px] flex items-center gap-1">
              <Undo2 size={13} /> Batal 1
            </button>
            <button type="button" onClick={() => ubah([])}
              className="rounded-lg border border-red-400/30 text-red-300 px-2.5 py-1.5 text-[11px] flex items-center gap-1">
              <Trash2 size={13} /> Hapus
            </button>
          </>
        )}
      </div>
      {pesan && <p className="text-[11px] text-amber-300 mt-1">{pesan}</p>}

      {titik.length > 0 && (
        <ol className="mt-3 space-y-1.5">
          {titik.map((t, i) => (
            <li key={i} className="flex items-center gap-2.5 rounded-xl border border-white/8 bg-[var(--kartu)] px-3 py-2">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center display-title text-[11px] flex-shrink-0 ${i === titik.length - 1 && titik.length > 1 ? "bg-lime-400 text-slate-950" : "bg-white text-slate-950"}`}>
                {HURUF[i]}
              </span>
              <span className="text-[11.5px] text-slate-400 flex-1">
                {t.lat.toFixed(5)}, {t.lng.toFixed(5)}
              </span>
              <span className="text-[10px] text-slate-600">
                {i === 0 ? "Start" : i === titik.length - 1 ? "Finish" : "Lewat"}
              </span>
            </li>
          ))}
        </ol>
      )}

      {titik.length === 0 && (
        <p className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-600">
          <MapPin size={13} /> Titik pertama menjadi start, titik terakhir menjadi finish.
        </p>
      )}
    </div>
  );
}
