"use client";
// Terpasang di layout. Tugasnya satu: kalau sedang berjalan sebagai APLIKASI
// Android dan user sudah login, daftarkan perangkat ini untuk notifikasi FCM
// (SOS dсб tetap masuk walau aplikasi ditutup & layar mati).
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { isNativeApp } from "@/lib/native-geo";
import { initNativePush } from "@/lib/native-push";

export default function PushRegistrar() {
  useEffect(() => {
    if (!isNativeApp()) return;
    const supabase = createClient();

    // Cek sesi sekarang + dengarkan login berikutnya
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) initNativePush(data.user.id);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) initNativePush(session.user.id);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return null;
}
