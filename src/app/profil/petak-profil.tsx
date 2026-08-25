"use client";
import Link from "next/link";
import { useState } from "react";
import JejakRute, { type Titik } from "@/components/jejak-rute";

type Petak = { id: string; km: number; path: Titik[] | null };

// Tiga tab seperti rancangan: Aktivitas (petak jejak rute), Rute (daftar
// ringkas), dan Kartu (pintasan ke pembuat kartu gowes).
export default function PetakProfil({ petak }: { petak: Petak[] }) {
  const [tab, setTab] = useState<"aktivitas" | "rute" | "kartu">("aktivitas");

  return (
    <>
      <div className="flex gap-5 mt-7 border-b border-white/8">
        {(["aktivitas", "rute", "kartu"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`pb-2.5 display-title text-sm tracking-wide border-b-2 -mb-px ${tab === t ? "text-lime-300 border-lime-400" : "text-slate-500 border-transparent"}`}>
            {t.toUpperCase()}
          </button>
        ))}
      </div>

      {petak.length === 0 ? (
        <p className="text-xs text-slate-600 mt-4">Belum ada perjalanan tercatat.</p>
      ) : tab === "aktivitas" ? (
        <div className="grid grid-cols-3 gap-2 mt-3">
          {petak.map((p) => (
            <Link key={p.id} href={`/umpan/${p.id}`}
              className="rounded-xl border border-white/8 bg-[#0C1A15] p-1.5 relative overflow-hidden">
              <JejakRute path={p.path} width={92} height={58} tebal={2} titikUjung={false} />
              <p className="display-num text-[12px] text-white pl-1 pb-0.5">{p.km.toFixed(1).replace(".", ",")}</p>
            </Link>
          ))}
        </div>
      ) : tab === "rute" ? (
        <div className="mt-3 rounded-2xl border border-white/8 bg-[#0C1A15] divide-y divide-white/5">
          {petak.map((p, i) => (
            <Link key={p.id} href={`/umpan/${p.id}`} className="flex items-center justify-between px-4 py-3">
              <span className="text-[12px] text-slate-300">Rute #{petak.length - i}</span>
              <span className="display-num text-sm text-lime-300">{p.km.toFixed(2).replace(".", ",")} km</span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="mt-3 rounded-2xl border border-lime-400/20 bg-lime-400/5 p-5 text-center">
          <p className="display-title text-lime-300 text-sm">KARTU GOWES</p>
          <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
            Ubah perjalananmu jadi kartu untuk dibagikan — bisa berlatar foto atau berlatar transparan.
          </p>
          <Link href="/catat/riwayat"
            className="inline-block mt-4 rounded-xl bg-gradient-to-r from-lime-400 to-emerald-500 text-slate-950 px-5 py-2.5 display-title text-sm">
            BUAT KARTU
          </Link>
        </div>
      )}
    </>
  );
}
