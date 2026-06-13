"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Bell, BellOff, BellRing, Loader2 } from "lucide-react";

type State = "loading" | "unsupported" | "default" | "granted" | "denied" | "subscribing";

function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer;
}

export default function PushEnroll() {
  const [state, setState] = useState<State>("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !("Notification" in window)
    ) {
      setState("unsupported");
      return;
    }
    (async () => {
      const perm = Notification.permission;
      if (perm === "denied") { setState("denied"); return; }
      if (perm === "granted") {
        try {
          const reg = await navigator.serviceWorker.getRegistration();
          const sub = reg ? await reg.pushManager.getSubscription() : null;
          setState(sub ? "granted" : "default");
        } catch {
          setState("default");
        }
      } else {
        setState("default");
      }
    })();
  }, []);

  async function enable() {
    setError("");
    setState("subscribing");
    try {
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) throw new Error("VAPID public key belum di-setup.");

      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setState(perm === "denied" ? "denied" : "default");
        return;
      }

      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        });
      }

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Login dulu untuk mengaktifkan notifikasi.");

      const json = sub.toJSON();
      const { error: insErr } = await supabase.from("push_subscriptions").insert({
        user_id: user.id,
        endpoint: sub.endpoint,
        p256dh: json.keys?.p256dh,
        auth: json.keys?.auth,
        user_agent: navigator.userAgent,
      });
      // 23505 = endpoint sudah terdaftar sebelumnya (aman diabaikan)
      if (insErr && insErr.code !== "23505") throw new Error(insErr.message);

      setState("granted");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengaktifkan notifikasi.");
      setState("default");
    }
  }

  async function disable() {
    setError("");
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      if (sub) {
        const supabase = createClient();
        await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        await sub.unsubscribe();
      }
      setState("default");
    } catch {
      /* abaikan */
    }
  }

  if (state === "loading") return null;

  if (state === "unsupported") {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs text-gray-500 text-center">
        Browser ini belum mendukung notifikasi push.
      </div>
    );
  }

  if (state === "denied") {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700 text-center flex items-center justify-center gap-2">
        <BellOff size={14} /> Notifikasi diblokir. Aktifkan lewat pengaturan situs di browser.
      </div>
    );
  }

  if (state === "granted") {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center justify-between">
        <span className="text-sm text-green-700 font-medium flex items-center gap-2">
          <BellRing size={16} /> Notifikasi darurat aktif
        </span>
        <button onClick={disable} className="text-xs text-green-700 underline">
          Matikan
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
          <Bell size={18} className="text-red-600" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-900">Aktifkan Notifikasi Darurat</p>
          <p className="text-xs text-gray-500 mt-0.5 mb-3">
            Dapatkan peringatan SOS dari pesepeda lain walau aplikasi sedang tertutup.
          </p>
          <button
            onClick={enable}
            disabled={state === "subscribing"}
            className="bg-red-600 text-white text-sm font-medium px-4 py-2 rounded-lg flex items-center gap-2 disabled:bg-gray-400"
          >
            {state === "subscribing" ? (<><Loader2 size={16} className="animate-spin" /> Mengaktifkan...</>) : "Aktifkan"}
          </button>
          {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
        </div>
      </div>
    </div>
  );
}