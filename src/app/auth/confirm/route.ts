import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Konfirmasi link email (daftar & reset password) memakai TOKEN_HASH.
//
// Kenapa: alur lama (?code=... + exchangeCodeForSession) hanya sah bila link
// dibuka di BROWSER YANG SAMA dengan tempat permintaan dibuat (PKCE verifier
// tersimpan lokal). Daftar dari aplikasi lalu buka link di Chrome = "invalid".
// Dengan token_hash + verifyOtp, verifikasi terjadi murni di server —
// link sah dibuka di mana pun.
//
// Template email di Supabase harus menunjuk ke route ini (lihat instruksi).
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/";

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      // Sesi terbentuk (cookie tertulis) → lanjut ke tujuan
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  return NextResponse.redirect(
    new URL("/auth/login?pesan=Link+tidak+valid+atau+sudah+kedaluwarsa.+Silakan+minta+link+baru.", request.url)
  );
}
