import { NextResponse } from "next/server";
import webpush from "web-push";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { sendFcmToTokens } from "@/lib/fcm";

export const runtime = "nodejs";

type PushSub = {
  endpoint: string;
  p256dh: string;
  auth: string;
  user_id: string;
};

export async function POST(req: Request) {
  try {
    // 1. Pastikan pemanggil sudah login
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Ambil data SOS dari body
    const body = await req.json();
    const { id, author_name, lat, lng } = body || {};

    // 3. Konfigurasi VAPID — OPSIONAL. Kalau tidak ada, web-push dilewati
    //    tapi FCM (aplikasi Android) TETAP dikirim.
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT;
    const webPushReady = Boolean(publicKey && privateKey && subject);
    if (webPushReady) webpush.setVapidDetails(subject!, publicKey!, privateKey!);

    // 4. Client admin (service role) untuk baca semua langganan
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: "Service role belum di-setup" }, { status: 500 });
    }
    const admin = createAdminClient(supabaseUrl, serviceKey);

    // 5. Web-push (browser/PWA) — best effort. Kalau tidak ada VAPID atau
    //    tidak ada langganan, bagian ini dilewati dan lanjut ke FCM.
    let sent = 0;
    const toDelete: string[] = [];
    let subs: PushSub[] = [];
    if (webPushReady) {
      const { data, error } = await admin
        .from("push_subscriptions")
        .select("endpoint, p256dh, auth, user_id")
        .neq("user_id", user.id);
      if (!error) subs = (data ?? []) as PushSub[];
    }

    // 6. Isi notifikasi (cocok dengan public/sw.js)
    const notifPayload = JSON.stringify({
      title: "🚨 SOS Darurat",
      body: `${author_name || "Pengguna"} membutuhkan bantuan`,
      url: "/",
      tag: `sos-${id || Date.now()}`,
      payload: { id: id || null, author_name: author_name || "Pengguna", lat, lng },
    });

    // 7. Kirim ke semua langganan web (bila ada); bersihkan yang mati (404/410)
    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            notifPayload,
            { urgency: "high", TTL: 3600 }
          );
          sent++;
        } catch (err) {
          const status = (err as { statusCode?: number })?.statusCode;
          if (status === 404 || status === 410) {
            toDelete.push(s.endpoint);
          }
        }
      })
    );

    if (toDelete.length > 0) {
      await admin.from("push_subscriptions").delete().in("endpoint", toDelete);
    }

    // 8. Jalur kedua: FCM untuk APLIKASI ANDROID (notifikasi tetap masuk
    //    walau aplikasi tertutup & layar mati). Web-push di atas tidak
    //    menjangkau WebView aplikasi, jadi keduanya saling melengkapi.
    let fcmSent = 0;
    let fcmErrors: string[] = [];
    try {
      const { data: tokenRows } = await admin
        .from("push_tokens")
        .select("token")
        .neq("user_id", user.id);
      const tokens = (tokenRows ?? []).map((r) => String(r.token));
      if (tokens.length > 0) {
        const result = await sendFcmToTokens(tokens, {
          title: "🚨 SOS Darurat",
          body: `${author_name || "Pengguna"} membutuhkan bantuan`,
          url: "/",
          data: {
            sos_id: String(id || ""),
            author_name: String(author_name || "Pengguna"),
            lat: String(lat ?? ""),
            lng: String(lng ?? ""),
          },
        });
        fcmSent = result.sent;
        fcmErrors = result.errors;
        if (fcmErrors.length > 0) console.error("[sos-push] FCM errors:", fcmErrors);
        if (result.deadTokens.length > 0) {
          await admin.from("push_tokens").delete().in("token", result.deadTokens);
        }
      }
    } catch (e) {
      fcmErrors = [e instanceof Error ? e.message : String(e)];
      console.error("[sos-push] FCM exception:", e);
    }

    return NextResponse.json({ sent, fcmSent, fcmErrors, cleaned: toDelete.length });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Gagal mengirim push" },
      { status: 500 }
    );
  }
}