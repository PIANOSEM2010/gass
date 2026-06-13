"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Siren, X, MapPin } from "lucide-react";

type SosAlert = {
  id: string;
  user_id: string;
  lat: number;
  lng: number;
  created_at: string;
  author_name: string;
};

export default function SosAlertProvider() {
  const [alerts, setAlerts] = useState<SosAlert[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const currentUserIdRef = useRef<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;
    let audioCtx: AudioContext | null = null;

    function playBeep() {
      try {
        if (!audioCtx) {
          audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        }
        // dua nada "darurat"
        [0, 0.45].forEach((offset) => {
          const osc = audioCtx!.createOscillator();
          const gain = audioCtx!.createGain();
          osc.connect(gain);
          gain.connect(audioCtx!.destination);
          osc.frequency.value = 880;
          osc.type = "sine";
          const t = audioCtx!.currentTime + offset;
          gain.gain.setValueAtTime(0.25, t);
          gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
          osc.start(t);
          osc.stop(t + 0.4);
        });
      } catch {
        /* ignore */
      }
    }

    function speakSos(name: string) {
      try {
        if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
        const synth = window.speechSynthesis;
        const text = `Perhatian, darurat. Atas nama ${name}, membutuhkan bantuan di lokasi ini. Mohon segera berikan pertolongan.`;
        const run = () => {
          const voices = synth.getVoices();
          const v =
            voices.find((x) => /google/i.test(x.name) && /^id/i.test(x.lang)) ||
            voices.find((x) => x.lang === "id-ID") ||
            voices.find((x) => x.lang && x.lang.toLowerCase().startsWith("id")) ||
            null;
          const u = new SpeechSynthesisUtterance(text);
          if (v) u.voice = v;
          u.lang = "id-ID";
          u.rate = 0.98;
          u.pitch = 1.0;
          synth.cancel();
          synth.speak(u);
        };
        if (synth.getVoices().length === 0) {
          synth.onvoiceschanged = () => { synth.onvoiceschanged = null; run(); };
          synth.getVoices();
        } else {
          run();
        }
      } catch {
        /* ignore */
      }
    }

    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (mounted) {
        setCurrentUserId(user?.id || null);
        currentUserIdRef.current = user?.id || null;
      }

      if (typeof window !== "undefined" && "Notification" in window) {
        if (Notification.permission === "default") {
          Notification.requestPermission();
        }
      }
    }
    init();

    const channel = supabase
      .channel("sos-broadcast")
      .on(
        "broadcast",
        { event: "new-sos" },
        (msg) => {
          console.log("[SosAlertProvider] Broadcast received:", msg);
          const p = msg.payload as SosAlert;
          if (!mounted) return;
          // Jangan tampilkan / bunyikan ke pelapor sendiri
          if (currentUserIdRef.current && p.user_id === currentUserIdRef.current) return;

          const alert: SosAlert = {
            id: p.id,
            user_id: p.user_id,
            lat: p.lat,
            lng: p.lng,
            created_at: p.created_at,
            author_name: p.author_name || "Pengguna",
          };

          setAlerts((prev) => [alert, ...prev].slice(0, 5));
          playBeep();
          speakSos(alert.author_name);

          if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
            new Notification("SOS Darurat", {
              body: `${alert.author_name} membutuhkan bantuan`,
              icon: "/favicon.ico",
            });
          }
        }
      )
      .subscribe((status) => {
        console.log("[SosAlertProvider] Subscription status:", status);
      });

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
      try {
        window.speechSynthesis.cancel();
      } catch {
        /* ignore */
      }
    };
  }, []);

  // Tampilkan layar darurat penuh saat notifikasi push diklik
  useEffect(() => {
    function addFromPush(p) {
      const alert = {
        id: p.id || `push-${Date.now()}`,
        user_id: "",
        lat: typeof p.lat === "number" ? p.lat : 0,
        lng: typeof p.lng === "number" ? p.lng : 0,
        created_at: new Date().toISOString(),
        author_name: p.author_name || "Pengguna",
      };
      setAlerts((prev) => [alert, ...prev.filter((a) => a.id !== alert.id)].slice(0, 5));
    }

    try {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get("sosAlert") === "1") {
        addFromPush({
          id: sp.get("id"),
          author_name: sp.get("name") || undefined,
          lat: sp.get("lat") ? parseFloat(sp.get("lat")) : undefined,
          lng: sp.get("lng") ? parseFloat(sp.get("lng")) : undefined,
        });
        const url = new URL(window.location.href);
        ["sosAlert", "id", "name", "lat", "lng"].forEach((k) => url.searchParams.delete(k));
        window.history.replaceState({}, "", url.pathname + url.search);
      }
    } catch {
      /* ignore */
    }

    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      const onMessage = (event) => {
        if (event.data && event.data.type === "sos-notification-click") {
          addFromPush(event.data.payload || {});
        }
      };
      navigator.serviceWorker.addEventListener("message", onMessage);
      return () => navigator.serviceWorker.removeEventListener("message", onMessage);
    }
  }, []);

  function dismiss(id: string) {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    try {
      window.speechSynthesis.cancel();
    } catch {
      /* ignore */
    }
  }

  function viewAndHelp(id: string) {
    dismiss(id);
    if (pathname !== "/forum") {
      router.push("/forum");
    }
  }

  const visibleAlerts = alerts.filter((a) => a.user_id !== currentUserId);
  if (visibleAlerts.length === 0) return null;

  const current = visibleAlerts[0];
  const moreCount = visibleAlerts.length - 1;

  return (
    <div className="fixed inset-0 z-[3000] bg-red-700 text-white flex flex-col items-center justify-center px-6 py-10 text-center">
      <button
        onClick={() => dismiss(current.id)}
        className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30"
        aria-label="Tutup"
      >
        <X size={22} />
      </button>

      <div className="relative mb-6">
        <span className="absolute inset-0 rounded-full bg-white/30 animate-ping" />
        <div className="relative w-24 h-24 rounded-full bg-white/20 flex items-center justify-center">
          <Siren size={52} className="animate-pulse" />
        </div>
      </div>

      <p className="text-xs font-semibold tracking-[0.2em] opacity-90 mb-1">PERINGATAN DARURAT</p>
      <h1 className="text-3xl font-extrabold mb-2">SOS DARURAT</h1>
      <p className="text-lg mb-1">
        <span className="font-bold">{current.author_name}</span> membutuhkan bantuan
      </p>
      <p className="text-sm opacity-90 mb-6">{new Date(current.created_at).toLocaleString("id-ID")}</p>

      <div className="bg-white/15 rounded-xl px-4 py-3 mb-6 text-sm">
        <div className="flex items-center justify-center gap-2">
          <MapPin size={16} />
          <span>{current.lat.toFixed(5)}, {current.lng.toFixed(5)}</span>
        </div>
      </div>

      <div className="w-full max-w-xs space-y-3">
        <button
          onClick={() => window.open(`https://www.google.com/maps?q=${current.lat},${current.lng}`, "_blank")}
          className="w-full bg-white text-red-700 font-bold py-3 rounded-xl"
        >
          Buka Lokasi di Peta
        </button>
        <button
          onClick={() => viewAndHelp(current.id)}
          className="w-full bg-red-900/40 border border-white/40 text-white font-semibold py-3 rounded-xl"
        >
          Lihat & Bantu
        </button>
        <button
          onClick={() => dismiss(current.id)}
          className="w-full text-white/80 text-sm py-2"
        >
          Tutup peringatan
        </button>
      </div>

      {moreCount > 0 && (
        <p className="mt-5 text-sm bg-white/20 px-3 py-1 rounded-full">
          +{moreCount} peringatan lainnya
        </p>
      )}
    </div>
  );
}