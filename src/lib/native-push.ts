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
  createChannel(channel: {
    id: string; name: string; description?: string;
    importance?: 1 | 2 | 3 | 4 | 5; visibility?: 0 | 1 | -1;
    sound?: string; vibration?: boolean; lights?: boolean;
  }): Promise<void>;
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

// ---- Status registrasi (untuk ditampilkan di halaman SOS agar mudah didiagnosa) ----
let pushStatus = "belum-mulai";
const statusListeners: ((s: string) => void)[] = [];
function setStatus(s: string) {
  pushStatus = s;
  statusListeners.forEach((cb) => { try { cb(s); } catch { /* abaikan */ } });
}
export function getPushStatus(): string { return pushStatus; }
export function onPushStatus(cb: (s: string) => void): () => void {
  statusListeners.push(cb);
  cb(pushStatus);
  return () => {
    const i = statusListeners.indexOf(cb);
    if (i >= 0) statusListeners.splice(i, 1);
  };
}

// Panggil sekali setelah tahu user login. Aman dipanggil berulang.
export async function initNativePush(userId: string): Promise<void> {
  if (!isNativeApp() || initialized || !userId) return;
  initialized = true;
  setStatus("memulai");

  try {
    const push = getPush();

    // Saat token diterima → simpan ke Supabase (upsert per token)
    await push.addListener("registration", async (token) => {
      setStatus("token-diterima");
      try {
        const supabase = createClient();
        const { error } = await supabase.from("push_tokens").upsert(
          { user_id: userId, token: token.value, platform: "android" },
          { onConflict: "token" }
        );
        setStatus(error ? `gagal-simpan: ${error.message}` : "terdaftar");
      } catch (e) {
        setStatus(`gagal-simpan: ${e instanceof Error ? e.message : "unknown"}`);
      }
    });

    await push.addListener("registrationError", (err) => {
      setStatus(`gagal-registrasi: ${typeof err === "object" ? JSON.stringify(err) : String(err)}`);
    });

    // Saat notifikasi DIKETUK (app tertutup/latar belakang) → buka halaman terkait
    await push.addListener("pushNotificationActionPerformed", (action) => {
      const url = action?.notification?.data?.url;
      if (url && typeof url === "string" && url.startsWith("/")) {
        window.location.href = url;
      }
    });

    const perm = await push.requestPermissions();
    if (perm.receive !== "granted") setStatus(`izin: ${perm.receive}`);
    if (perm.receive === "granted") {
      setStatus("izin-ok, mendaftar…");
      // WAJIB: buat channel "sos" — notifikasi FCM yang menyebut channel yang
      // belum ada akan DIBUANG diam-diam oleh Android 8+.
      try {
        await push.createChannel({
          id: "sos",
          name: "SOS Darurat",
          description: "Peringatan darurat dari sesama goweser",
          importance: 5,
          visibility: 1,
          vibration: true,
          lights: true,
        });
      } catch { /* channel mungkin sudah ada */ }
      await push.register();
    }
  } catch (e) {
    initialized = false; // izinkan percobaan ulang
    setStatus(`error: ${e instanceof Error ? e.message : "plugin tidak tersedia"}`);
  }
}
