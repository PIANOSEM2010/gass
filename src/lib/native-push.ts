// Push notification NATIVE (FCM) untuk aplikasi Android BUG.
//
// Web-push (service worker) tidak berfungsi di dalam WebView aplikasi,
// jadi di aplikasi kita memakai Firebase Cloud Messaging:
// - Saat user login di aplikasi, kita minta izin notifikasi lalu daftarkan
//   token FCM perangkat ini ke tabel `push_tokens` di Supabase.
// - Server (route /api/sos-push) mengirim ke token-token itu lewat FCM,
//   sehingga notifikasi tetap muncul walau APLIKASI TERTUTUP & LAYAR MATI.
import { registerPlugin } from "@capacitor/core";
import { createClient } from "@/lib/supabase/client";
import { isNativeApp } from "@/lib/native-geo";

type PermissionStatus = { receive: "prompt" | "prompt-with-rationale" | "granted" | "denied" };
type Token = { value: string };
type PushListenerHandle = { remove: () => Promise<void> };

interface PushPlugin {
  requestPermissions(): Promise<PermissionStatus>;
  register(): Promise<void>;
  addListener(event: "registration", cb: (token: Token) => void): Promise<PushListenerHandle>;
  addListener(event: "registrationError", cb: (err: unknown) => void): Promise<PushListenerHandle>;
  addListener(event: "pushNotificationActionPerformed", cb: (action: { notification: { data?: Record<string, string> } }) => void): Promise<PushListenerHandle>;
}

let pushCache: PushPlugin | null = null;
function getPush(): PushPlugin {
  if (!pushCache) pushCache = registerPlugin<PushPlugin>("PushNotifications");
  return pushCache;
}

let initialized = false;

// Panggil sekali setelah tahu user login. Aman dipanggil berulang.
export async function initNativePush(userId: string): Promise<void> {
  if (!isNativeApp() || initialized || !userId) return;
  initialized = true;

  try {
    const push = getPush();

    // Saat token diterima → simpan ke Supabase (upsert per token)
    await push.addListener("registration", async (token) => {
      try {
        const supabase = createClient();
        await supabase.from("push_tokens").upsert(
          { user_id: userId, token: token.value, platform: "android" },
          { onConflict: "token" }
        );
      } catch {
        /* jangan ganggu aplikasi bila gagal */
      }
    });

    await push.addListener("registrationError", () => {
      /* abaikan; user bisa coba lagi nanti */
    });

    // Saat notifikasi DIKETUK (app tertutup/latar belakang) → buka halaman terkait
    await push.addListener("pushNotificationActionPerformed", (action) => {
      const url = action?.notification?.data?.url;
      if (url && typeof url === "string" && url.startsWith("/")) {
        window.location.href = url;
      }
    });

    const perm = await push.requestPermissions();
    if (perm.receive === "granted") {
      await push.register();
    }
  } catch {
    initialized = false; // izinkan percobaan ulang
  }
}
