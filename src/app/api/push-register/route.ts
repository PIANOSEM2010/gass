import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Mendaftarkan token FCM perangkat untuk user yang sedang login.
// Dilakukan di SERVER (service role) supaya kasus "ganti akun di HP yang sama"
// berjalan mulus: kepemilikan token berpindah ke akun yang baru login,
// tanpa perlu melonggarkan RLS di sisi client.
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ ok: false, pesan: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const token = typeof body?.token === "string" ? body.token.trim() : "";
    const platform = typeof body?.platform === "string" ? body.platform : "android";
    if (!token || token.length < 20 || token.length > 4096) {
      return NextResponse.json({ ok: false, pesan: "Token tidak valid" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ ok: false, pesan: "Service role belum di-setup" }, { status: 500 });
    }
    const admin = createAdminClient(supabaseUrl, serviceKey);

    // Upsert: token = kunci; user_id berpindah ke user yang login sekarang
    const { error } = await admin.from("push_tokens").upsert(
      { token, user_id: user.id, platform },
      { onConflict: "token" }
    );
    if (error) {
      return NextResponse.json({ ok: false, pesan: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { ok: false, pesan: e instanceof Error ? e.message : "Gagal mendaftar token" },
      { status: 500 }
    );
  }
}
