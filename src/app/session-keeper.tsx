"use client";
// Penjaga sesi untuk APLIKASI Android.
//
// Masalah: WebView Android menulis cookie ke disk secara TERTUNDA. Kalau
// aplikasi dibunuh (swipe dari recent) sebelum sempat menulis, cookie sesi
// Supabase hilang → user tampak logout padahal tidak pernah menekan Keluar.
//
// Solusi: setiap kali sesi ada/diperbarui, simpan salinannya di localStorage
// (lebih tahan banting). Saat aplikasi dibuka dan cookie ternyata hilang,
// pulihkan sesi dari salinan itu secara otomatis.
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { isNativeApp } from "@/lib/native-geo";

const KEY = "bug-session-backup";

export default function SessionKeeper() {
  useEffect(() => {
    if (!isNativeApp()) return;
    const supabase = createClient();

    // 1. Saat aplikasi dibuka: kalau sesi (cookie) hilang tapi ada cadangan,
    //    pulihkan. Muat ulang HANYA bila tidak ada aktivitas yang sedang berjalan,
    //    supaya pencatatan gowes / Teman Pantau tidak ikut mati karena reload.
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) return;
        const raw = localStorage.getItem(KEY);
        if (!raw) return;
        const saved = JSON.parse(raw) as { access_token?: string; refresh_token?: string };
        if (!saved?.access_token || !saved?.refresh_token) return;
        const { error } = await supabase.auth.setSession({
          access_token: saved.access_token,
          refresh_token: saved.refresh_token,
        });
        if (!error) {
          // setSession sudah memulihkan sesi di memori + menulis ulang cookie.
          // Reload hanya perlu agar Server Component ikut mengenali login —
          // tapi reload mematikan pencatatan yang sedang berjalan. Jadi lewati
          // reload bila ada aktivitas aktif (ditandai flag di bawah).
          const busy = typeof window !== "undefined" && window.sessionStorage.getItem("bug-activity-active") === "1";
          if (!busy) window.location.reload();
        } else {
          // Cadangan sudah tidak berlaku (mis. user memang logout) — buang.
          localStorage.removeItem(KEY);
        }
      } catch {
        /* jangan ganggu aplikasi */
      }
    })();

    // 2. Setiap sesi baru / token diperbarui: perbarui cadangan.
    //    Logout yang disengaja (tombol Keluar) menghapus cadangan.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      try {
        if (session?.refresh_token && session?.access_token) {
          localStorage.setItem(
            KEY,
            JSON.stringify({
              access_token: session.access_token,
              refresh_token: session.refresh_token,
            })
          );
        } else if (event === "SIGNED_OUT") {
          localStorage.removeItem(KEY);
        }
      } catch {
        /* abaikan */
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return null;
}
