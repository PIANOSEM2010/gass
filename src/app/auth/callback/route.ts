import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Kembalikan ke halaman yang tadi dituju pengguna, bukan selalu ke Profil.
  // Hanya jalur dalam aplikasi yang diterima, supaya tautan masuk tidak bisa
  // disalahgunakan untuk mengarahkan orang ke situs lain.
  const next = searchParams.get("next") || "";
  const aman = next.startsWith("/") && !next.startsWith("//") ? next : "/profil";
  return NextResponse.redirect(`${origin}${aman}`);
}
