"use client";
import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [school, setSchool] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, school },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="px-4 pt-12 max-w-md mx-auto">
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
          <h2 className="text-xl font-bold text-green-800 mb-2">Pendaftaran berhasil!</h2>
          <p className="text-sm text-green-700">
            Cek email kamu di <strong>{email}</strong> untuk link konfirmasi. Setelah klik link, kamu bisa masuk.
          </p>
          <Link href="/auth/login" className="inline-block mt-4 text-green-700 font-medium underline">
            Ke halaman masuk
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-12 max-w-md mx-auto">
      <h1 className="text-3xl font-bold text-green-700 text-center">Daftar</h1>
      <p className="text-center text-gray-500 text-sm mt-1 mb-8">Bergabung dengan komunitas pesepeda Bulungan</p>

      <form onSubmit={handleRegister} className="bg-white rounded-xl p-6 shadow-sm space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap</label>
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Asal Sekolah</label>
          <input
            type="text"
            value={school}
            onChange={(e) => setSchool(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="SMA Negeri ... Bulungan"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Min. 6 karakter"
          />
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-400"
        >
          {loading ? "Memproses..." : "Daftar"}
        </button>
      </form>

      <p className="text-center text-sm text-gray-600 mt-6">
        Sudah punya akun?{" "}
        <Link href="/auth/login" className="text-green-700 font-medium">
          Masuk di sini
        </Link>
      </p>
    </div>
  );
}