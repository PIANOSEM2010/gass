"use client";
import { useNav, maneuverIcon } from "@/app/nav-provider";
import { Navigation, X } from "lucide-react";

// Panduan belok-per-belok yang tampil di halaman Catat Gowes.
//
// Menampilkan manuver berikutnya beserta sisa jaraknya: "400 m belok kiri".
// Panduannya memakai penyedia navigasi yang sama dengan halaman Peta Jalur,
// jadi tidak ada dua mesin navigasi yang bisa berbeda hasilnya.
function jarakTerbaca(meter: number): string | null {
  // Jarak bisa belum terhitung bila GPS baru menyala atau data langkah rute
  // tidak sejajar dengan garis rutenya. Kembalikan null agar tampilan memilih
  // kalimat pengganti; menulis "NaN m" di layar pesepeda yang sedang mengayuh
  // lebih buruk daripada tidak menampilkan angka sama sekali.
  if (!Number.isFinite(meter) || meter < 0) return null;
  if (meter >= 1000) return `${(meter / 1000).toFixed(1).replace(".", ",")} km`;
  if (meter >= 100) return `${Math.round(meter / 50) * 50} m`;
  return `${Math.max(10, Math.round(meter / 10) * 10)} m`;
}

export default function PanduanBelok() {
  const { navigating, navInfo, route, stop } = useNav();
  if (!navigating || !route) return null;

  const jarak = navInfo ? jarakTerbaca(navInfo.distanceToNext) : null;
  const dekat = Boolean(navInfo && Number.isFinite(navInfo.distanceToNext) && navInfo.distanceToNext <= 40);

  return (
    <div className={`mb-3 rounded-2xl border px-4 py-3 transition-colors ${dekat
      ? "border-lime-400/60 bg-lime-400/15"
      : "border-sky-400/30 bg-sky-400/10"}`}>
      <div className="flex items-center gap-3">
        <span className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${dekat
          ? "bg-lime-400 text-slate-950"
          : "bg-sky-400/20 text-sky-300"}`}>
          {navInfo ? maneuverIcon(navInfo.type, 22) : <Navigation size={20} />}
        </span>

        <div className="min-w-0 flex-1">
          {navInfo ? (
            <>
              {jarak ? (
                <p className="display-num text-[26px] leading-none text-white">{jarak}</p>
              ) : (
                <p className="display-title text-[15px] text-white leading-none">IKUTI JALUR</p>
              )}
              <p className="text-[12.5px] text-slate-300 mt-1 leading-snug line-clamp-2">
                {navInfo.instruction || "Terus mengikuti jalur event."}
              </p>
            </>
          ) : (
            <>
              <p className="display-title text-[14px] text-white">MENCARI POSISI…</p>
              <p className="text-[11.5px] text-slate-400 mt-0.5">
                Panduan belok muncul begitu sinyal GPS terkunci.
              </p>
            </>
          )}
        </div>

        <button onClick={stop} aria-label="Matikan panduan"
          className="text-slate-500 p-1 flex-shrink-0">
          <X size={17} />
        </button>
      </div>

      <p className="text-[10.5px] text-slate-500 mt-2">
        {route.label}{Number.isFinite(route.info.distance) ? ` · ${(route.info.distance / 1000).toFixed(1).replace(".", ",")} km` : ""}
      </p>
    </div>
  );
}
