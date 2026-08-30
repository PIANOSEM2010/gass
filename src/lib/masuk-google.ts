import { Capacitor } from "@capacitor/core";
import { createClient } from "@/lib/supabase/client";

// Masuk dengan Google, di aplikasi Android maupun di peramban.
//
// Kenapa perlu jalur khusus untuk aplikasi:
// Google menolak halaman masuknya dibuka di dalam WebView aplikasi, demi
// keamanan. Itu sebabnya tombol Google selama ini gagal di APK sementara
// berhasil di peramban.
//
// Jalan keluarnya bukan memasang SDK Google dan mendaftarkan sidik jari
// keystore - itu perlu Play Store dan urusan tanda tangan. Cukup buka halaman
// Google di PERAMBAN SISTEM (Chrome Custom Tabs), yang memang diizinkan Google,
// lalu tangkap kepulangannya lewat tautan dalam bermerek aplikasi sendiri.
//
// Alur lengkapnya:
//   1. Aplikasi meminta Supabase membuatkan alamat masuk Google, tanpa
//      langsung berpindah halaman (`skipBrowserRedirect`).
//   2. Alamat itu dibuka di peramban sistem.
//   3. Setelah pengguna menyetujui, Google mengembalikannya ke
//      `id.bulungan.bug://auth/callback?code=...`
//   4. Android mengenali skema itu sebagai milik aplikasi BUG dan membangunkannya.
//   5. Aplikasi menukar kode itu menjadi sesi.
//
// Penukaran kode berhasil karena penanda rahasianya (code verifier) tersimpan
// di penyimpanan halaman aplikasi, dan halaman itu tidak pernah berpindah -
// yang berpindah hanya peramban sistem di luar aplikasi.

export const SKEMA_APLIKASI = "id.bulungan.bug://auth/callback";

export function diAplikasi(): boolean {
  try { return Capacitor.isNativePlatform(); } catch { return false; }
}

/**
 * Memulai proses masuk dengan Google.
 * @param tujuan halaman yang dituju setelah berhasil masuk
 */
export async function masukGoogle(tujuan = "/profil"): Promise<void> {
  const sb = createClient();

  if (!diAplikasi()) {
    // Peramban: biarkan Supabase yang memindahkan halaman seperti biasa.
    const { error } = await sb.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(tujuan)}`,
      },
    });
    if (error) throw new Error(error.message);
    return;
  }

  // Aplikasi: minta alamatnya saja, lalu buka di peramban sistem.
  const { data, error } = await sb.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${SKEMA_APLIKASI}?next=${encodeURIComponent(tujuan)}`,
      skipBrowserRedirect: true,
    },
  });
  if (error) throw new Error(error.message);
  if (!data?.url) throw new Error("Alamat masuk Google tidak diterima.");

  const { Browser } = await import("@capacitor/browser");
  await Browser.open({ url: data.url, presentationStyle: "popover" });
}

/**
 * Menyelesaikan proses masuk setelah aplikasi dibangunkan oleh tautan dalam.
 * @returns halaman tujuan bila berhasil, atau null bila tautannya bukan untuk ini
 */
export async function selesaikanMasukGoogle(alamat: string): Promise<string | null> {
  if (!alamat.startsWith("id.bulungan.bug://")) return null;

  // Skema buatan sendiri tidak selalu terbaca oleh URL(), jadi bagian
  // parameternya diambil langsung.
  const tanya = alamat.includes("?") ? alamat.slice(alamat.indexOf("?") + 1) : "";
  const params = new URLSearchParams(tanya);

  const galat = params.get("error_description") || params.get("error");
  if (galat) throw new Error(galat);

  const kode = params.get("code");
  if (!kode) return null;

  const sb = createClient();
  const { error } = await sb.auth.exchangeCodeForSession(kode);
  if (error) throw new Error(error.message);

  try {
    const { Browser } = await import("@capacitor/browser");
    await Browser.close();
  } catch { /* sebagian peranti menutupnya sendiri */ }

  const tujuan = params.get("next") || "/profil";
  return tujuan.startsWith("/") && !tujuan.startsWith("//") ? tujuan : "/profil";
}
