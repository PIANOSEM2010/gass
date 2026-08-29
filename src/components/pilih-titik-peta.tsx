"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
import { MapPin, Trash2, Undo2, Flag } from "lucide-react";
import { type TitikEvent, cekPoint, tandaiUjung } from "@/lib/titik-event";

const PetaTitik = dynamic(() => import("./peta-titik"), {
  ssr: false,
  loading: () => <div className="h-72 rounded-2xl bg-[var(--relung)] animate-pulse" />,
});

const MAKS = 120;

// Penanda jalur event.
//
// Jalur dibentuk dari banyak titik supaya mengikuti bentuk jalan, bukan garis
// lurus yang memotong-motong. Karena itu batasnya dilonggarkan jauh, dan hanya
// titik yang ditandai sebagai CEK POINT yang mendapat huruf dan tampil di
// kartu bagikan. Cek point bukan tempat berhenti akhir - rombongan berkumpul
// sebentar lalu lanjut.
export default function PilihTitikPeta({
  titik, ubah,
}: { titik: TitikEvent[]; ubah: (t: TitikEvent[]) => void }) {
  const [pesan, setPesan] = useState("");

  function tambah(lat: number, lng: number) {
    if (titik.length >= MAKS) { setPesan(`Maksimal ${MAKS} titik.`); return; }
    setPesan("");
    ubah(tandaiUjung([...titik, { lat, lng }]));
  }

  function ubahSatu(i: number, isi: Partial<TitikEvent>) {
    ubah(tandaiUjung(titik.map((t, k) => (k === i ? { ...t, ...isi } : t))));
  }

  const cek = cekPoint(titik);
  const hurufDari = (i: number) => cek.find((c) => c.indeks === i)?.huruf ?? "";

  return (
    <div>
      <PetaTitik titik={titik} onTambah={tambah} />

      <div className="flex items-center gap-2 mt-2">
        <p className="text-[11.5px] text-slate-500 flex-1 leading-relaxed">
          {titik.length === 0
            ? "Ketuk peta untuk menandai titik pertama. Tandai sesering mungkin mengikuti belokan jalan agar jalurnya rapi."
            : `${titik.length} titik · ${cek.length} cek point. Titik pertama dan terakhir otomatis jadi cek point.`}
        </p>
        {titik.length > 0 && (
          <>
            <button type="button" onClick={() => ubah(tandaiUjung(titik.slice(0, -1)))}
              className="rounded-lg border border-white/12 text-slate-300 px-2.5 py-1.5 text-[11px] flex items-center gap-1 flex-shrink-0">
              <Undo2 size={13} /> Batal 1
            </button>
            <button type="button" onClick={() => ubah([])}
              className="rounded-lg border border-red-400/30 text-red-300 px-2.5 py-1.5 text-[11px] flex items-center gap-1 flex-shrink-0">
              <Trash2 size={13} /> Hapus
            </button>
          </>
        )}
      </div>
      {pesan && <p className="text-[11px] text-amber-300 mt-1">{pesan}</p>}

      {titik.length > 0 && (
        <ol className="mt-3 space-y-1.5 max-h-72 overflow-y-auto pr-1">
          {titik.map((t, i) => {
            const ujung = i === 0 || i === titik.length - 1;
            const huruf = hurufDari(i);
            return (
              <li key={i} className={`rounded-xl border px-3 py-2 ${t.cek ? "border-lime-400/35 bg-lime-400/8" : "border-white/8 bg-[var(--kartu)]"}`}>
                <div className="flex items-center gap-2.5">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center display-title text-[11px] flex-shrink-0 ${t.cek
                    ? (i === titik.length - 1 ? "bg-lime-400 text-slate-950" : "bg-white text-slate-950")
                    : "bg-white/10 text-slate-500"}`}>
                    {huruf || "·"}
                  </span>
                  <span className="text-[11.5px] text-slate-400 flex-1 min-w-0 truncate">
                    {t.lat.toFixed(5)}, {t.lng.toFixed(5)}
                  </span>
                  <span className="text-[10px] text-slate-600 flex-shrink-0">
                    {i === 0 ? "Start" : i === titik.length - 1 ? "Finish" : t.cek ? "Cek point" : "Titik jalur"}
                  </span>
                </div>

                {!ujung && (
                  <button type="button" onClick={() => ubahSatu(i, { cek: !t.cek, nama: t.cek ? "" : t.nama })}
                    className={`mt-2 w-full rounded-lg py-1.5 text-[11px] font-semibold flex items-center justify-center gap-1.5 border ${t.cek
                      ? "border-lime-400/40 text-lime-300"
                      : "border-white/12 text-slate-400"}`}>
                    <Flag size={12} />
                    {t.cek ? "Batalkan sebagai cek point" : "Tandai titik ini sebagai cek point"}
                  </button>
                )}

                {t.cek && (
                  <div className="mt-2">
                    <label className="eyebrow !text-[8.5px] text-slate-500 block mb-1">
                      Nama tempat untuk titik {huruf}
                    </label>
                    <input value={t.nama || ""} onChange={(e) => ubahSatu(i, { nama: e.target.value })}
                      maxLength={40}
                      placeholder={i === 0 ? "Misal: Unikal" : i === titik.length - 1 ? "Misal: Alun-alun Tanjung Selor" : "Misal: Warung Pak Udin"}
                      className="w-full bg-[var(--isian)] border border-lime-400/15 rounded-lg px-3 py-2 text-[12px] text-white placeholder:text-slate-600 focus:outline-none focus:border-lime-400/50" />
                    <p className="text-[10px] text-slate-600 mt-1">
                      Nama ini muncul di samping huruf {huruf} pada kartu bagikan.
                    </p>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {titik.length === 0 && (
        <p className="mt-3 flex items-start gap-1.5 text-[11px] text-slate-600 leading-relaxed">
          <MapPin size={13} className="flex-shrink-0 mt-0.5" />
          Cek point adalah titik berkumpul kembali, bukan tempat berhenti akhir. Yang muncul di kartu bagikan hanya cek point.
        </p>
      )}
    </div>
  );
}
