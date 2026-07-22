"use client";
// Loading screen antar-halaman.
//
// Cara kerja: saat pengguna menekan menu (atau Link mana pun yang memanggil
// startNavigation), overlay berlogo BUG muncul. Begitu halaman tujuan selesai
// dimuat (dideteksi dari perubahan pathname), overlay disembunyikan — dengan
// durasi minimum singkat agar tidak berkedip saat halaman terbuka instan.
import { createContext, useContext, useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useGowes } from "./gowes-provider";
import { usePantau } from "./pantau-provider";
import { useNav } from "./nav-provider";

type NavLoadingValue = {
  loading: boolean;
  startNavigation: (href?: string) => void;
};

const NavLoadingContext = createContext<NavLoadingValue | null>(null);

export function useNavLoading(): NavLoadingValue {
  const ctx = useContext(NavLoadingContext);
  if (!ctx) return { loading: false, startNavigation: () => {} };
  return ctx;
}

const MIN_VISIBLE_MS = 450; // durasi minimum overlay agar transisi terasa halus

export default function NavLoadingProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const targetRef = useRef<string | null>(null);
  const shownAtRef = useRef(0);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Apakah ada aktivitas GPS yang sedang berjalan (catat gowes / teman pantau /
  // navigasi rute)? Bila ya, JANGAN tampilkan overlay penuh saat pindah menu —
  // ActivityDock sudah menampilkan statusnya, dan overlay penuh yang menutup
  // peta/WebView bisa mengganggu sesi GPS yang sedang aktif.
  const gowes = useGowes();
  const pantau = usePantau();
  const nav = useNav();
  const activityRunning =
    gowes.status === "tracking" ||
    gowes.status === "paused" ||
    pantau.sharing ||
    Boolean(nav.navInfo);

  const startNavigation = useCallback((href?: string) => {
    // Abaikan bila menuju halaman yang sedang dibuka
    if (href && href === pathname) return;
    // Jangan tampilkan overlay penuh saat ada sesi GPS berjalan (lihat catatan di atas)
    if (activityRunning) return;
    targetRef.current = href ?? null;
    shownAtRef.current = Date.now();
    setLoading(true);

    // Pengaman: bila navigasi gagal/terlalu lama, tetap tutup overlay
    if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
    safetyTimerRef.current = setTimeout(() => setLoading(false), 8000);
  }, [pathname, activityRunning]);

  // Saat pathname berubah = halaman baru sudah render → sembunyikan overlay
  useEffect(() => {
    if (!loading) return;
    const elapsed = Date.now() - shownAtRef.current;
    const wait = Math.max(0, MIN_VISIBLE_MS - elapsed);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      setLoading(false);
      targetRef.current = null;
    }, wait);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Deteksi OTOMATIS semua klik pada link internal (<a href="/...">), sehingga
  // loading screen muncul di seluruh tombol menu tanpa perlu mengubah tiap Link.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      // Abaikan klik dengan modifier (buka tab baru) atau klik kanan/tengah
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      const a = target?.closest("a");
      if (!a) return;
      const href = a.getAttribute("href");
      const targetAttr = a.getAttribute("target");
      // Hanya navigasi internal di tab yang sama
      if (!href || !href.startsWith("/") || href.startsWith("//") || targetAttr === "_blank") return;
      if (a.hasAttribute("download")) return;
      // Bandingkan path saja (abaikan hash/query yang menuju halaman sama)
      const targetPath = href.split(/[?#]/)[0];
      if (targetPath === pathname) return;
      startNavigation(href);
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [pathname, startNavigation]);

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
    };
  }, []);

  return (
    <NavLoadingContext.Provider value={{ loading, startNavigation }}>
      {children}
      {loading && <NavLoadingOverlay />}
    </NavLoadingContext.Provider>
  );
}

function NavLoadingOverlay() {
  // Jeruji roda dibuat programatik, memancar dari hub ke pelek
  const spokes = Array.from({ length: 16 }, (_, i) => {
    const a = (i * Math.PI * 2) / 16;
    return {
      x1: 60 + 11 * Math.cos(a),
      y1: 60 + 11 * Math.sin(a),
      x2: 60 + 46 * Math.cos(a),
      y2: 60 + 46 * Math.sin(a),
    };
  });

  return (
    <div className="fixed inset-0 z-[3000] flex flex-col items-center justify-center nav-loading-backdrop">
      {/* Cahaya hijau lembut di belakang roda */}
      <div className="absolute w-64 h-64 rounded-full bg-lime-400/15 blur-3xl" />

      <div className="relative flex items-center justify-center">
        {/* Roda sepeda berputar (perlahan & mulus) */}
        <svg width="128" height="128" viewBox="0 0 120 120" className="nav-wheel" aria-hidden="true">
          <defs>
            <linearGradient id="bugArc" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#bef264" />
              <stop offset="100%" stopColor="#4ade80" />
            </linearGradient>
          </defs>
          {/* ban luar */}
          <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="6" />
          {/* pelek */}
          <circle cx="60" cy="60" r="47" fill="none" stroke="rgba(255,255,255,0.20)" strokeWidth="2" />
          {/* jeruji */}
          <g stroke="rgba(255,255,255,0.28)" strokeWidth="1.5">
            {spokes.map((s, i) => (
              <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} />
            ))}
          </g>
          {/* hub */}
          <circle cx="60" cy="60" r="11" fill="none" stroke="rgba(255,255,255,0.32)" strokeWidth="2" />
          <circle cx="60" cy="60" r="4" fill="#bef264" />
          {/* pentil — penanda agar putaran terlihat */}
          <circle cx="60" cy="8" r="3.5" fill="#4ade80" />
        </svg>

        {/* Busur progres hijau (berputar lebih cepat, terpisah dari roda) */}
        <svg width="128" height="128" viewBox="0 0 120 120" className="absolute nav-arc" aria-hidden="true">
          <circle
            cx="60" cy="60" r="52" fill="none"
            stroke="url(#bugArc)" strokeWidth="4" strokeLinecap="round"
            strokeDasharray="70 260"
          />
        </svg>
      </div>

      {/* Wordmark elegan */}
      <div className="mt-8 flex flex-col items-center nav-wordmark">
        <span className="display-title text-2xl text-white tracking-[0.15em]">BUG</span>
        <span className="eyebrow mt-1 text-lime-300/70 !text-[9px] tracking-[0.3em]">BULUNGAN UNTUK GOWESER</span>
      </div>

      <style>{`
        .nav-loading-backdrop {
          background: radial-gradient(120% 120% at 50% 40%, rgba(6,12,10,0.72), rgba(2,6,4,0.90));
          backdrop-filter: blur(16px) saturate(120%);
          -webkit-backdrop-filter: blur(16px) saturate(120%);
          animation: navFade 220ms ease-out;
        }
        .nav-wheel { animation: navSpin 2.4s linear infinite; transform-origin: 50% 50%; }
        .nav-arc { animation: navSpin 1s cubic-bezier(0.5,0,0.5,1) infinite; transform-origin: 50% 50%; }
        .nav-wordmark { animation: navPulse 1.8s ease-in-out infinite; }
        @keyframes navSpin { to { transform: rotate(360deg); } }
        @keyframes navFade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes navPulse { 0%,100% { opacity: 0.6; } 50% { opacity: 1; } }
      `}</style>
    </div>
  );
}
