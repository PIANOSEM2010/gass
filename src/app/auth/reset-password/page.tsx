"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [ready, setReady] = useState(false);
  const [linkValid, setLinkValid] = useState(true);

  // Saat halaman dibuka dari link email, Supabase memproses token di URL
  // dan membuat sesi sementara. Kita tunggu event itu sebelum izinkan ganti password.
  useEffect(() => {
    const supabase = createClient();
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) {
        setLinkValid(true);
        setReady(true);
      }
    });
    // Fallback: cek apakah sudah ada sesi (mis. token sudah diproses)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
      else {
        // Beri jeda; kalau tetap tak ada sesi, link kemungkinan tidak valid/kedaluwarsa
        setTimeout(() => {
          supabase.auth.getSession().then(({ data: d2 }) => {
            if (!d2.session) setLinkValid(false);
            setReady(true);
          });
        }, 1500);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) { setError("Password minimal 6 karakter"); return; }
    if (password !== confirm) { setError("Konfirmasi password tidak cocok"); return; }
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setDone(true);
      setTimeout(() => { router.push("/profil"); router.refresh(); }, 1800);
    }
  }

  if (!ready) {
    return (
      <div className="px-4 pt-12 max-w-md mx-auto text-center text-gray-500">
        Memeriksa link...
      </div>
    );
  }

  if (!linkValid) {
    return (
      <div className="px-4 pt-12 max-w-md mx-auto">
        <div className="bg-white rounded-xl p-6 shadow-sm text-center space-y-3">
          <p className="text-gray-800 font-medium">Link tidak valid atau sudah kedaluwarsa</p>
          <p className="text-sm text-gray-600">Silakan minta link reset yang baru.</p>
          <Link href="/auth/lupa-password" className="inline-block text-green-700 font-medium text-sm mt-2">
            Minta link baru
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-12 max-w-md mx-auto">
      <h1 className="text-3xl font-bold text-green-700 text-center">Password Baru</h1>
      <p className="text-center text-gray-500 text-sm mt-1 mb-8">Buat password baru untuk akunmu</p>

      {done ? (
        <div className="bg-white rounded-xl p-6 shadow-sm text-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-green-100 text-green-700 flex items-center justify-center mx-auto text-2xl">✓</div>
          <p className="text-gray-800 font-medium">Password berhasil diubah</p>
          <p className="text-sm text-gray-600">Mengarahkan ke profil...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 shadow-sm space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password baru</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Min. 6 karakter"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ulangi password baru</label>
            <input
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Ketik ulang password"
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-400"
          >
            {loading ? "Menyimpan..." : "Simpan Password Baru"}
          </button>
        </form>
      )}
    </div>
  );
}