"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Siren, X } from "lucide-react";

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
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.value = 880;
        osc.type = "sine";
        gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.4);
      } catch {
        /* ignore */
      }
    }

    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (mounted) setCurrentUserId(user?.id || null);

      // Request notification permission
      if (typeof window !== "undefined" && "Notification" in window) {
        if (Notification.permission === "default") {
          Notification.requestPermission();
        }
      }
    }
    init();

    // Subscribe ke SOS baru
    const channel = supabase
      .channel("global-sos-alert")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "sos_logs" },
        async (payload) => {
          const newLog = payload.new as { id: string; user_id: string; lat: number; lng: number; created_at: string };

          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", newLog.user_id)
            .single();

          const alert: SosAlert = {
            id: newLog.id,
            user_id: newLog.user_id,
            lat: newLog.lat,
            lng: newLog.lng,
            created_at: newLog.created_at,
            author_name: profile?.full_name || "Pengguna",
          };

          if (!mounted) return;

          setAlerts((prev) => [alert, ...prev].slice(0, 3));
          playBeep();

          if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
            new Notification("SOS Darurat Baru", {
              body: `${alert.author_name} membutuhkan bantuan`,
              icon: "/favicon.ico",
            });
          }
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  function dismiss(id: string) {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }

  function viewAndHelp(id: string) {
    dismiss(id);
    if (pathname !== "/forum") {
      router.push("/forum");
    }
  }

  // Jangan tampilkan alert ke pelapor sendiri
  const visibleAlerts = alerts.filter((a) => a.user_id !== currentUserId);

  if (visibleAlerts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[2000] space-y-3 max-w-sm">
      {visibleAlerts.map((alert) => (
        <div
          key={alert.id}
          className="bg-white rounded-xl shadow-2xl border-l-4 border-red-600 p-4"
          style={{ animation: "slide-in 0.3s ease-out" }}
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 animate-pulse">
              <Siren size={20} className="text-red-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <p className="font-bold text-red-700 text-sm">SOS Darurat Baru</p>
                <button onClick={() => dismiss(alert.id)} className="text-gray-400 hover:text-gray-700">
                  <X size={16} />
                </button>
              </div>
              <p className="text-xs text-gray-900 font-medium mb-2">
                {alert.author_name} membutuhkan bantuan
              </p>
              <button
                onClick={() => viewAndHelp(alert.id)}
                className="bg-red-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-red-700 w-full"
              >
                Lihat & Bantu
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}