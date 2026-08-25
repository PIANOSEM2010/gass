import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { sendFcmToTokens } from "@/lib/fcm";

export const runtime = "nodejs";

// ENDPOINT DIAGNOSTIK — buka https://<situs>/api/push-test di browser yang
// sedang LOGIN dengan akun yang sama dengan di aplikasi. Endpoint ini:
// 1. Mengambil semua token FCM milik akunmu
// 2. Mengirim notifikasi tes ke token-token itu
// 3. Menampilkan hasil mentahnya (termasuk error) sebagai JSON
// Sehingga kita tahu PASTI apakah jalur server -> Firebase -> HP bekerja.
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { ok: false, step: "auth", pesan: "Belum login. Buka situs, login dulu dengan akun yang sama seperti di aplikasi, lalu buka /api/push-test lagi." },
        { status: 401 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ ok: false, step: "env", pesan: "SUPABASE_SERVICE_ROLE_KEY belum di-set di Netlify" }, { status: 500 });
    }
    const admin = createAdminClient(supabaseUrl, serviceKey);

    const { data: rows, error } = await admin
      .from("push_tokens")
      .select("token, platform, created_at")
      .eq("user_id", user.id);
    if (error) {
      return NextResponse.json({ ok: false, step: "db", pesan: error.message }, { status: 500 });
    }

    const tokens = (rows ?? []).map((r) => String(r.token));
    if (tokens.length === 0) {
      return NextResponse.json({
        ok: false,
        step: "token",
        pesan: "Tidak ada token FCM untuk akun ini. Buka aplikasi Android, login, dan pastikan status di menu SOS 'terdaftar', lalu coba lagi.",
      });
    }

    const result = await sendFcmToTokens(tokens, {
      title: "🔔 Tes Notifikasi BUG",
      body: "Jika kamu melihat ini di HP, jalur notifikasi bekerja!",
      url: "/sos",
      data: { test: "1" },
    });

    if (result.deadTokens.length > 0) {
      await admin.from("push_tokens").delete().in("token", result.deadTokens);
    }

    return NextResponse.json({
      ok: result.sent > 0,
      jumlahToken: tokens.length,
      terkirim: result.sent,
      tokenMati: result.deadTokens.length,
      errors: result.errors,
      catatan:
        result.sent > 0
          ? "Server BERHASIL menyerahkan notifikasi ke Firebase. Kalau HP tidak menampilkannya, masalah ada di sisi perangkat (channel/baterai/mode)."
          : "Pengiriman gagal — lihat 'errors' di atas untuk penyebab pastinya.",
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, step: "exception", pesan: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
