"use client";
// Satu pop-up terpadu untuk semua aktivitas latar belakang.
// Menggantikan 3 widget terpisah (gowes, navigasi, teman pantau) yang dulu
// bertumpuk. Kini semuanya jadi satu kartu, tiap fitur satu baris dengan
// ikon (logo) dan tombol kontrolnya sendiri.
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bike, Pause, Play, Square, Radio, X, ChevronUp, Minus, Navigation } from "lucide-react";
import { useGowes } from "./gowes-provider";
import { useNav, maneuverIcon } from "./nav-provider";
import { usePantau } from "./pantau-provider";
import { formatDist } from "@/lib/routing";

function fmtDuration(s: number): string {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

export default function ActivityDock() {
  const gowes = useGowes();
  const nav = useNav();
  const pantau = usePantau();
  const pathname = usePathname();
  const router = useRouter();

  // Sebuah fitur tampil di dock hanya bila aktif DAN kita tidak sedang di halamannya
  const showGowes =
    (gowes.status === "tracking" || gowes.status === "paused" || gowes.status === "finished") &&
    pathname !== "/catat";
  const showNav = nav.navigating && pathname !== "/peta";
  const showPantau = pantau.sharing && pathname !== "/pantau";

  const [mini, setMini] = useState(false);

  if (!showGowes && !showNav && !showPantau) return null;

  const activeCount = [showGowes, showNav, showPantau].filter(Boolean).length;

  // Mode MINI: pil kecil di pojok kiri, tidak menutupi tombol peta.
  // Ketuk untuk membentangkan kembali kartu penuh.
  if (mini) {
    const primaryColor = showGowes
      ? "from-green-500 to-emerald-600"
      : showNav
      ? "from-violet-500 to-purple-700"
      : "from-teal-500 to-cyan-600";
    const Icon = showGowes ? Bike : showNav ? Navigation : Radio;
    return (
      <div className="fixed left-3 z-[2000]" style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 84px)" }}>
        <button
          onClick={() => setMini(false)}
          className={`flex items-center gap-1.5 rounded-full bg-gradient-to-br ${primaryColor} text-white shadow-lg pl-1.5 pr-3 py-1.5 active:scale-95 transition`}
          aria-label="Bentangkan panel aktivitas"
        >
          <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-white/20">
            <Icon size={15} />
            <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
            </span>
          </span>
          <span className="text-xs font-bold tabular-nums">
            {showGowes ? `${(gowes.distance / 1000).toFixed(1)} km` : showNav ? "Navigasi" : "Pantau"}
          </span>
          {activeCount > 1 && (
            <span className="ml-0.5 text-[10px] font-bold bg-white/25 rounded-full px-1.5 py-0.5">+{activeCount - 1}</span>
          )}
          <ChevronUp size={14} className="opacity-80" />
        </button>
      </div>
    );
  }

  const km = (gowes.distance / 1000).toFixed(2);
  const gowesTracking = gowes.status === "tracking";
  const gowesPaused = gowes.status === "paused";

  return (
    <div className="fixed left-3 right-3 z-[2000]" style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 84px)" }}>
      <div className="mx-auto max-w-md rounded-2xl bg-slate-900/95 backdrop-blur border border-slate-700 shadow-xl overflow-hidden">
        {/* Bilah atas: tombol ciutkan ke mode mini */}
        <div className="flex items-center justify-between px-3 py-1 bg-slate-800/60">
          <span className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">
            {activeCount > 1 ? `${activeCount} aktivitas berjalan` : "Aktivitas berjalan"}
          </span>
          <button
            onClick={() => setMini(true)}
            className="flex items-center gap-1 text-slate-300 hover:text-white text-[11px] font-medium px-2 py-0.5 rounded-md hover:bg-white/10 active:scale-95 transition"
            aria-label="Perkecil"
          >
            <Minus size={13} /> Perkecil
          </button>
        </div>

        <div className="divide-y divide-slate-700/70">
        {showGowes && (
          <div
            onClick={() => router.push("/catat")}
            className="flex items-center gap-3 px-3 py-2.5 text-white cursor-pointer active:bg-white/5 transition-colors"
          >
            <span className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-white ${gowesTracking ? "bg-gradient-to-br from-green-500 to-emerald-600" : gowesPaused ? "bg-gradient-to-br from-slate-500 to-slate-700" : "bg-gradient-to-br from-orange-500 to-amber-600"}`}>
              {gowesTracking ? (
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
                </span>
              ) : gowesPaused ? <Pause size={16} /> : <Bike size={16} />}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-wide text-slate-300 leading-tight">
                {gowesTracking ? "Merekam gowes" : gowesPaused ? "Gowes dijeda" : "Gowes belum disimpan"}
              </p>
              <p className="font-bold text-sm tabular-nums leading-tight truncate">
                {km} km · {fmtDuration(gowes.duration)}{gowesTracking ? ` · ${gowes.speed.toFixed(0)} km/j` : ""}
              </p>
            </div>
            {(gowesTracking || gowesPaused) && (
              <button
                onClick={(e) => { e.stopPropagation(); if (gowesTracking) gowes.pause(); else gowes.resume(); }}
                aria-label={gowesTracking ? "Jeda" : "Lanjut"}
                className="shrink-0 bg-white/10 hover:bg-white/20 rounded-full p-2 active:scale-90 transition"
              >
                {gowesTracking ? <Pause size={16} /> : <Play size={16} />}
              </button>
            )}
            {gowesTracking || gowesPaused ? (
              <button
                onClick={(e) => { e.stopPropagation(); gowes.finish(); }}
                aria-label="Selesai"
                className="shrink-0 bg-white/10 hover:bg-white/20 rounded-full p-2 active:scale-90 transition"
              >
                <Square size={16} />
              </button>
            ) : (
              <ChevronUp size={18} className="shrink-0 text-slate-300" />
            )}
          </div>
        )}

        {showNav && (
          <div
            onClick={() => router.push("/peta")}
            className="flex items-center gap-3 px-3 py-2.5 text-white cursor-pointer active:bg-white/5 transition-colors"
          >
            <span className="shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center text-white">
              {maneuverIcon(nav.navInfo?.type ?? 11, 18)}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-wide text-slate-300 leading-tight">
                Navigasi{nav.route?.label ? ` · ${nav.route.label.split(",")[0]}` : ""}
              </p>
              <p className="font-bold text-sm leading-tight truncate">
                {nav.navInfo?.instruction || "Mengikuti rute…"}
                {nav.navInfo && nav.navInfo.distanceToNext >= 0 ? ` · ${formatDist(nav.navInfo.distanceToNext)}` : ""}
              </p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); nav.stop(); }}
              aria-label="Akhiri navigasi"
              className="shrink-0 bg-white/10 hover:bg-white/20 rounded-full p-2 active:scale-90 transition"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {showPantau && (
          <div
            onClick={() => router.push("/pantau")}
            className="flex items-center gap-3 px-3 py-2.5 text-white cursor-pointer active:bg-white/5 transition-colors"
          >
            <span className="shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-white relative">
              <Radio size={16} />
              <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-300 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal-300" />
              </span>
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-wide text-slate-300 leading-tight">Teman Pantau</p>
              <p className="font-bold text-sm leading-tight truncate">
                {pantau.coords ? `Lokasi terkirim${pantau.lastSentAgo !== null ? ` · ${pantau.lastSentAgo} dtk lalu` : ""}` : "Menunggu sinyal GPS…"}
              </p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); pantau.stop(); }}
              aria-label="Hentikan berbagi"
              className="shrink-0 bg-white/10 hover:bg-white/20 rounded-full p-2 active:scale-90 transition"
            >
              <Square size={16} />
            </button>
          </div>
        )}
        </div>

      </div>
    </div>
  );
}
