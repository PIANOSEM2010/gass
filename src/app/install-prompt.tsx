"use client";
import { useEffect, useState } from "react";
import { Download, X, Share } from "lucide-react";
import { isNativeApp } from "@/lib/native-geo";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [iosHint, setIosHint] = useState(false);
  const [androidApk, setAndroidApk] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Sedang berjalan di dalam aplikasi Android (Capacitor)? jangan tawarkan pemasangan
    if (isNativeApp()) return;

    // Sudah terpasang (mode standalone)? jangan tampilkan
    const nav = navigator as Navigator & { standalone?: boolean };
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
    if (standalone) return;

    // Sudah ditutup di sesi ini? hormati pilihan pengguna
    try {
      if (sessionStorage.getItem("bug-install-dismissed") === "1") return;
    } catch {
      /* ignore */
    }

    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onBIP);

    const onInstalled = () => {
      setVisible(false);
      setDeferred(null);
    };
    window.addEventListener("appinstalled", onInstalled);

    // iPhone/Safari: tidak mendukung beforeinstallprompt → tampilkan petunjuk manual
    const ua = navigator.userAgent;
    const isIOS = /iphone|ipad|ipod/i.test(ua);
    const isSafari = /safari/i.test(ua) && !/crios|fxios/i.test(ua);
    if (isIOS && isSafari) {
      setIosHint(true);
      setVisible(true);
    }

    // Android (browser): tawarkan APLIKASI NATIVE (unduh APK), bukan PWA.
    // APK punya GPS latar belakang (jalan walau layar mati) — jauh lebih baik.
    if (/android/i.test(ua)) {
      setAndroidApk(true);
      setVisible(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setVisible(false);
    setDeferred(null);
  }

  function close() {
    setVisible(false);
    try {
      sessionStorage.setItem("bug-install-dismissed", "1");
    } catch {
      /* ignore */
    }
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-20 left-3 right-3 z-[2000] max-w-md mx-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-3 flex items-center gap-3">
        <img src="/icon-192.png" alt="BUG" className="w-11 h-11 rounded-xl flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 leading-tight">Pasang Aplikasi BUG</p>
          {iosHint ? (
            <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
              Ketuk <Share size={12} className="inline" /> Bagikan → "Tambahkan ke Layar Utama"
            </p>
          ) : androidApk ? (
            <p className="text-xs text-gray-500 mt-0.5">Catat gowes & Teman Pantau tetap jalan walau layar mati</p>
          ) : (
            <p className="text-xs text-gray-500 mt-0.5">Akses lebih cepat, langsung dari layar HP</p>
          )}
        </div>
        {androidApk ? (
          <a
            href="/bug.apk"
            download
            onClick={close}
            className="bg-green-600 text-white text-sm font-medium px-3 py-2 rounded-lg flex items-center gap-1.5 flex-shrink-0"
          >
            <Download size={16} /> Unduh
          </a>
        ) : !iosHint && (
          <button
            onClick={install}
            className="bg-green-600 text-white text-sm font-medium px-3 py-2 rounded-lg flex items-center gap-1.5 flex-shrink-0"
          >
            <Download size={16} /> Pasang
          </button>
        )}
        <button onClick={close} className="text-gray-400 hover:text-gray-700 flex-shrink-0 p-1" aria-label="Tutup">
          <X size={18} />
        </button>
      </div>
    </div>
  );
}