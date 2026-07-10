"use client";
import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LupaPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createClient();
    // Link di email akan mengarah ke halaman ganti password
    const redirectTo = `${window.location.origin}/auth/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      // Selalu tampilkan sukses walau email tak terdaftar (hindari bocornya data akun)
      setSent(true);
    }
  }

  return (
    <div className="px-4 pt-12 max-w-md mx-auto">
      <h1 className="text-3xl font-bold text-green-700 text-center">Lupa Password</h1>
      <p className="text-center text-gray-500 text-sm mt-1 mb-8">Masukkan email akunmu untuk menerima link reset</p>

      {sent ? (
        <div className="bg-white rounded-xl p-6 shadow-sm text-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-green-100 text-green-700 flex items-center justify-center mx-auto text-2xl">✓</div>
          <p className="text-gray-800 font-medium">Cek emailmu</p>
          <p className="text-sm text-gray-600">
            Jika <span className="font-medium">{email}</span> terdaftar, kami sudah mengirim link untuk mengatur ulang password. Cek juga folder spam.
          </p>
          <Link href="/auth/login" className="inline-block text-green-700 font-medium text-sm mt-2">
            Kembali ke halaman masuk
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 shadow-sm space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="kamu@email.com"
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-400"
          >
            {loading ? "Mengirim..." : "Kirim Link Reset"}
          </button>
        </form>
      )}

      <p className="text-center text-sm text-gray-600 mt-6">
        Ingat passwordmu?{" "}
        <Link href="/auth/login" className="text-green-700 font-medium">
          Masuk di sini
        </Link>
      </p>
    </div>
  );
}
