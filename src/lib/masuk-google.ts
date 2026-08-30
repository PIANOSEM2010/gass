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

// Halaman tujuan disimpan di peranti, bukan diselipkan ke alamat pulang.
//
// Supabase mencocokkan alamat pulang dengan daftar izinnya secara persis,
// termasuk bagian parameternya. Alamat berparameter seperti
// "id.bulungan.bug://auth/callback?next=/profil" tidak akan cocok dengan
// entri "id.bulungan.bug://auth/callback" di daftar izin, dan Supabase diam-diam
// mengalihkan ke Site URL - yaitu situs webnya, bukan aplikasi. Menyimpan
// tujuan di peranti membuat alamat pulangnya selalu sama persis.
const KUNCI_TUJUAN = "bug-tujuan-setelah-masuk";

function simpanTujuan(tujuan: string) {
  try { window.localStorage.setItem(KUNCI_TUJUAN, tujuan); } catch { /* mode privat */ }
}

function ambilTujuan(): string {
  try {
    const t = window.localStorage.getItem(KUNCI_TUJUAN) || "";
    window.localStorage.removeItem(KUNCI_TUJUAN);
    return t.startsWith("/") && !t.startsWith("//") ? t : "/profil";
  } catch { return "/profil"; }
}

/**
 * Memeriksa apakah plugin tautan dalam sudah ada di APK yang terpasang.
 * Bila belum, masuk dengan Google tidak akan bisa diselesaikan karena aplikasi
 * tidak dapat menangkap kepulangan dari Google.
 */
export async function tautanDalamSiap(): Promise<boolean> {
  if (!diAplikasi()) return true;
  try {
    const { App } = await import("@capacitor/app");
    await App.getLaunchUrl();
    return true;
  } catch {
    return false;
  }
}

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
  simpanTujuan(tujuan);
  const { data, error } = await sb.auth.signInWithOAuth({
    provider: "google",
    options: {
      // Tanpa parameter apa pun, supaya cocok persis dengan daftar izin Supabase.
      redirectTo: SKEMA_APLIKASI,
      skipBrowserRedirect: true,
    },
  });
  if (error) throw new Error(error.message);
  if (!data?.url) throw new Error("Alamat masuk Google tidak diterima.");

  // Membuka halaman Google di peramban sistem.
  //
  // Jalur utamanya plugin Browser. Tetapi plugin Capacitor punya dua sisi -
  // JavaScript dan Java - dan sisi Java-nya hanya ikut bila APK dibangun ulang.
  // Bila aplikasi yang terpasang belum diperbarui, plugin ini melempar
  // "not implemented on android". Untuk itu ada jalur cadangan: berpindah
  // halaman biasa. Capacitor sendiri membuka alamat di luar wilayah aplikasi
  // lewat peramban sistem, sehingga hasilnya sama tanpa perlu plugin apa pun.
  try {
    const { Browser } = await import("@capacitor/browser");
    await Browser.open({ url: data.url, presentationStyle: "popover" });
  } catch {
    window.location.href = data.url;
  }
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

  return ambilTujuan();
}
