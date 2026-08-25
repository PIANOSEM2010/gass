"use client";
// Loading screen antar-halaman.
//
// Cara kerja: saat pengguna menekan menu (atau Link mana pun yang memanggil
// startNavigation), overlay berlogo BUG muncul. Begitu halaman tujuan selesai
// dimuat (dideteksi dari perubahan pathname), overlay disembunyikan, dengan
// durasi minimum singkat agar tidak berkedip saat halaman terbuka instan.
import { createContext, useContext, useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

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

// Navigasi terprogram (router.push) TIDAK terdeteksi oleh pemantau klik link,
// jadi tombol yang memakainya, mis. pop-up mini aktivitas, harus memakai
// hook ini agar loading screen tetap muncul.
export function useNavigateWithLoading(): (href: string) => void {
  const router = useRouter();
  const { startNavigation } = useNavLoading();
  return useCallback(
    (href: string) => {
      startNavigation(href);
      router.push(href);
    },
    [router, startNavigation]
  );
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
      {/* Overlay penuh dipakai di SEMUA perpindahan agar konsisten. Aman
          sekarang: sesi gowes & pantau tahan-putus (dipulihkan otomatis). */}
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
    <div className="fixed inset-x-0 top-0 bottom-[56px] z-[1100] flex flex-col items-center justify-center nav-loading-backdrop">
      <div className="relative w-[150px] h-[150px] flex items-center justify-center">
        {/* Cahaya yang berdenyut di belakang roda */}
        <span className="absolute inset-0 rounded-full pointer-events-none muat-denyut"
          style={{ background: "radial-gradient(circle at center, rgba(180,255,58,.22) 0%, transparent 62%)" }} />

        {/* Lintasan marka jalan yang berputar: kesan jalan bergerak, bukan
            sekadar cincin berputar */}
        <svg width="150" height="150" viewBox="0 0 120 120" className="absolute muat-marka" aria-hidden="true">
          <circle cx="60" cy="60" r="56" fill="none" stroke="rgba(255,176,32,.5)"
            strokeWidth="2.5" strokeLinecap="round" strokeDasharray="9 13" />
        </svg>

        {/* Roda berjeruji yang berputar */}
        <svg width="128" height="128" viewBox="0 0 120 120" className="nav-wheel" aria-hidden="true">
          <circle cx="60" cy="60" r="46" fill="none" stroke="rgba(255,255,255,.09)" strokeWidth="6" />
          <circle cx="60" cy="60" r="41" fill="none" stroke="rgba(255,255,255,.16)" strokeWidth="1.5" />
          <g stroke="rgba(180,255,58,.34)" strokeWidth="1.4">
            {spokes.map((s, i) => (
              <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} />
            ))}
          </g>
          <circle cx="60" cy="60" r="7" fill="#B4FF3A" />
        </svg>

        {/* Busur terang yang mengejar, arah berlawanan supaya terasa hidup */}
        <svg width="150" height="150" viewBox="0 0 120 120" className="absolute muat-busur" aria-hidden="true">
          <defs>
            <linearGradient id="bugBusur" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#D9FF7A" />
              <stop offset="100%" stopColor="#22C55E" stopOpacity="0.15" />
            </linearGradient>
          </defs>
          <circle cx="60" cy="60" r="46" fill="none" stroke="url(#bugBusur)" strokeWidth="4"
            strokeLinecap="round" strokeDasharray="74 215" />
        </svg>
      </div>

      <p className="display-title text-xl text-white mt-6 tracking-[0.22em]">BUG</p>
      <div className="mt-2.5 h-[3px] w-24 rounded-sm overflow-hidden bg-white/8">
        <span className="block h-full w-1/3 muat-batang"
          style={{ background: "linear-gradient(90deg,transparent,#B4FF3A,transparent)" }} />
      </div>
      <p className="eyebrow !text-[8.5px] text-slate-500 mt-3">Menyiapkan jalur</p>
    </div>
  );
}
