"use client";
// Loading screen antar-halaman.
//
// Cara kerja: saat pengguna menekan menu (atau Link mana pun yang memanggil
// startNavigation), overlay berlogo BUG muncul. Begitu halaman tujuan selesai
// dimuat (dideteksi dari perubahan pathname), overlay disembunyikan — dengan
// durasi minimum singkat agar tidak berkedip saat halaman terbuka instan.
import { createContext, useContext, useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

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

  const startNavigation = useCallback((href?: string) => {
    // Abaikan bila menuju halaman yang sedang dibuka
    if (href && href === pathname) return;
    targetRef.current = href ?? null;
    shownAtRef.current = Date.now();
    setLoading(true);

    // Pengaman: bila navigasi gagal/terlalu lama, tetap tutup overlay
    if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
    safetyTimerRef.current = setTimeout(() => setLoading(false), 8000);
  }, [pathname]);

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
  return (
    <div className="fixed inset-0 z-[3000] flex flex-col items-center justify-center bg-slate-950 nav-loading-fade">
      {/* Logo BUG: roda berputar + wordmark */}
      <div className="relative flex items-center justify-center">
        <span className="absolute w-24 h-24 rounded-full border-4 border-lime-400/20" />
        <span className="absolute w-24 h-24 rounded-full border-4 border-transparent border-t-lime-400 animate-spin" />
        <span className="display-title text-3xl text-lime-400 tracking-tight">BUG</span>
      </div>
      <p className="eyebrow mt-6 text-slate-400 !text-[11px]">Memuat…</p>

      <style>{`
        .nav-loading-fade { animation: navLoadingFade 160ms ease-out; }
        @keyframes navLoadingFade { from { opacity: 0 } to { opacity: 1 } }
      `}</style>
    </div>
  );
}
