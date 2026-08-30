"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { diAplikasi, selesaikanMasukGoogle } from "@/lib/masuk-google";

// Penerima tautan dalam.
//
// Setelah pengguna menyetujui di halaman Google, Android membangunkan aplikasi
// lewat alamat id.bulungan.bug://auth/callback?code=... Komponen ini menangkap
// alamat itu, menukar kodenya menjadi sesi, lalu mengantar pengguna ke halaman
// yang tadi dituju.
//
// Dipasang di layout agar selalu mendengarkan, di halaman mana pun aplikasi
// sedang berada ketika pengguna kembali dari Google.
export default function PenerimaTautan() {
  const router = useRouter();

  useEffect(() => {
    if (!diAplikasi()) return;
    let lepas: (() => void) | null = null;

    (async () => {
      const { App } = await import("@capacitor/app");

      const tangani = async (url: string) => {
        try {
          const tujuan = await selesaikanMasukGoogle(url);
          if (tujuan) { router.replace(tujuan); router.refresh(); }
        } catch (e) {
          const pesan = e instanceof Error ? e.message : "Masuk dengan Google gagal.";
          router.replace(`/auth/login?galat=${encodeURIComponent(pesan)}`);
        }
      };

      // Aplikasi sudah berjalan lalu dibangunkan tautan.
      const pendengar = await App.addListener("appUrlOpen", (e) => { void tangani(e.url); });
      lepas = () => { void pendengar.remove(); };

      // Aplikasi baru dibuka OLEH tautan itu; peristiwa di atas bisa terlewat.
      const awal = await App.getLaunchUrl();
      if (awal?.url) void tangani(awal.url);
    })();

    return () => { lepas?.(); };
  }, [router]);

  return null;
}
