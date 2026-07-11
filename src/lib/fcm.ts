// Pengirim notifikasi FCM (Firebase Cloud Messaging) HTTP v1 — tanpa dependensi
// tambahan: JWT service account ditandatangani dengan modul crypto bawaan Node.
//
// Butuh env FIREBASE_SERVICE_ACCOUNT berisi seluruh isi file JSON service
// account Firebase (satu baris). Diambil dari:
// Firebase Console → Project settings → Service accounts → Generate new private key
import crypto from "crypto";

type ServiceAccount = {
  project_id: string;
  client_email: string;
  private_key: string;
};

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function getServiceAccount(): ServiceAccount | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;
  try {
    const sa = JSON.parse(raw) as ServiceAccount;
    if (!sa.project_id || !sa.client_email || !sa.private_key) return null;
    return sa;
  } catch {
    return null;
  }
}

// Cache access token OAuth (berlaku ~1 jam)
let cachedToken: { token: string; exp: number } | null = null;

async function getAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.exp - 60 > now) return cachedToken.token;

  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(JSON.stringify({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));
  const signingInput = `${header}.${claims}`;
  // Env sering menyimpan newline sebagai \n literal — kembalikan jadi newline asli
  const privateKey = sa.private_key.replace(/\\n/g, "\n");
  const signature = crypto.createSign("RSA-SHA256").update(signingInput).sign(privateKey);
  const jwt = `${signingInput}.${b64url(signature)}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!res.ok) throw new Error(`OAuth gagal: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { token: data.access_token, exp: now + (data.expires_in || 3600) };
  return data.access_token;
}

export type FcmSendResult = { sent: number; deadTokens: string[]; errors: string[] };

// Kirim notifikasi ke banyak token FCM. Token mati (UNREGISTERED) dikembalikan
// agar pemanggil bisa menghapusnya dari database. SEMUA kegagalan dilaporkan
// lewat `errors` — tidak ada yang ditelan diam-diam.
export async function sendFcmToTokens(
  tokens: string[],
  notif: { title: string; body: string; url?: string; data?: Record<string, string> }
): Promise<FcmSendResult> {
  const sa = getServiceAccount();
  if (!sa) {
    return {
      sent: 0, deadTokens: [],
      errors: ["FIREBASE_SERVICE_ACCOUNT tidak ada / bukan JSON valid di environment server"],
    };
  }
  if (tokens.length === 0) return { sent: 0, deadTokens: [], errors: [] };

  let accessToken: string;
  try {
    accessToken = await getAccessToken(sa);
  } catch (e) {
    return {
      sent: 0, deadTokens: [],
      errors: [`OAuth gagal: ${e instanceof Error ? e.message : String(e)}`],
    };
  }
  const endpoint = `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`;

  let sent = 0;
  const deadTokens: string[] = [];
  const errors: string[] = [];

  await Promise.all(
    tokens.map(async (token) => {
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: {
              token,
              notification: { title: notif.title, body: notif.body },
              data: { ...(notif.data || {}), url: notif.url || "/" },
              android: {
                priority: "HIGH",
                notification: {
                  channel_id: "sos-popup",
                  sound: "default",
                  default_sound: true,
                  default_vibrate_timings: true,
                  notification_priority: "PRIORITY_MAX",
                  visibility: "PUBLIC",
                },
              },
            },
          }),
        });
        if (res.ok) {
          sent++;
        } else {
          const text = await res.text();
          // Token tidak terdaftar lagi (app di-uninstall dsb) → tandai untuk dihapus
          if (res.status === 404 || text.includes("UNREGISTERED") || text.includes("INVALID_ARGUMENT")) {
            deadTokens.push(token);
          }
          if (errors.length < 3) errors.push(`FCM ${res.status}: ${text.slice(0, 300)}`);
        }
      } catch (e) {
        if (errors.length < 3) errors.push(`fetch gagal: ${e instanceof Error ? e.message : String(e)}`);
      }
    })
  );

  return { sent, deadTokens, errors };
}
