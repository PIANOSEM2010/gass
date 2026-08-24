"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Roda berjeruji — motif yang sama dengan logo, dipakai sebagai latar struktural
function RodaJeruji({ className = "" }: { className?: string }) {
  const jeruji = Array.from({ length: 20 }, (_, i) => {
    const a = (i * Math.PI * 2) / 20;
    return { x1: 165 + 40 * Math.cos(a), y1: 150 + 40 * Math.sin(a), x2: 165 + 142 * Math.cos(a), y2: 150 + 142 * Math.sin(a) };
  });
  return (
    <svg viewBox="0 0 330 300" className={className} aria-hidden="true">
      {jeruji.map((j, i) => (
        <line key={i} x1={j.x1} y1={j.y1} x2={j.x2} y2={j.y2} stroke="rgba(180,255,58,.26)" strokeWidth="1" />
      ))}
      <circle cx="165" cy="150" r="142" fill="none" stroke="rgba(180,255,58,.3)" strokeWidth="2" />
      <circle cx="165" cy="150" r="40" fill="none" stroke="rgba(180,255,58,.45)" strokeWidth="2" />
      <circle cx="165" cy="150" r="8" fill="#B4FF3A" />
    </svg>
  );
}

function LogoGoogle() {
  return (
    <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#4285F4" d="M45 24c0-1.6-.1-2.7-.4-3.9H24v7.1h12c-.2 1.9-1.5 4.7-4.4 6.6l6.8 5.3C42.4 35.6 45 30.3 45 24z" />
      <path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.3l-6.9-5.3c-1.8 1.3-4.3 2.2-7.6 2.2-5.8 0-10.7-3.8-12.5-9.1l-7.1 5.5C8 41 15.4 46 24 46z" />
      <path fill="#FBBC05" d="M11.5 28.5c-.5-1.4-.7-2.9-.7-4.5s.3-3.1.7-4.5l-7.1-5.5C2.9 17 2 20.4 2 24s.9 7 2.4 10z" />
      <path fill="#EA4335" d="M24 10.6c3.2 0 5.4 1.4 6.7 2.6l5.9-5.8C33 4.1 29.9 2 24 2 15.4 2 8 7 4.4 14l7.1 5.5c1.8-5.3 6.7-9 12.5-9z" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [lihatSandi, setLihatSandi] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/profil");
      router.refresh();
    }
  }

  // Masuk dengan Google. Perlu penyedia Google diaktifkan di Supabase
  // (Authentication -> Providers -> Google). Bila belum, pesan errornya tampil di layar.
  async function handleGoogle() {
    setGoogleLoading(true);
    setError("");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) {
        setError(error.message);
        setGoogleLoading(false);
      }
    } catch {
      setError("Gagal membuka halaman Google. Coba lagi.");
      setGoogleLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#071310] text-white relative overflow-hidden -mb-20">
      <RodaJeruji className="absolute -top-16 -right-28 w-[330px] h-[300px] opacity-50 pointer-events-none" />

      <div className="relative px-6 pt-16">
        <h1 className="display-title text-[42px] leading-[0.9] tracking-tight">
          BULUNGAN<br />UNTUK<br /><span className="text-lime-400">GOWESER</span>
        </h1>
        <div className="mt-4 h-[3px] w-24 rounded-sm opacity-90"
          style={{ background: "repeating-linear-gradient(90deg,#B4FF3A 0 12px,transparent 12px 22px)" }} />
        <p className="mt-3 text-[13px] leading-relaxed text-slate-400 max-w-[220px]">
          Platform keselamatan pesepeda Kabupaten Bulungan.
        </p>
      </div>

      <div className="relative px-5 mt-10 pb-16">
        <button onClick={handleGoogle} disabled={googleLoading}
          className="w-full bg-white text-slate-800 rounded-xl py-3.5 flex items-center justify-center gap-2.5 font-semibold text-sm active:scale-[.98] transition-transform disabled:opacity-70">
          <LogoGoogle />
          {googleLoading ? "Membuka Google…" : "Masuk dengan Google"}
        </button>

        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-lime-400/15" />
          <span className="eyebrow text-slate-500 !text-[10px]">atau email</span>
          <div className="flex-1 h-px bg-lime-400/15" />
        </div>

        <form onSubmit={handleLogin} className="space-y-2.5">
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="nama@email.com"
            className="w-full bg-[#0B1F18] border border-lime-400/15 rounded-xl px-4 py-3.5 text-sm placeholder:text-slate-500 focus:outline-none focus:border-lime-400/50" />
          <div className="relative">
            <input type={lihatSandi ? "text" : "password"} required value={password}
              onChange={(e) => setPassword(e.target.value)} placeholder="Kata sandi"
              className="w-full bg-[#0B1F18] border border-lime-400/15 rounded-xl px-4 py-3.5 pr-16 text-sm placeholder:text-slate-500 focus:outline-none focus:border-lime-400/50" />
            <button type="button" onClick={() => setLihatSandi((v) => !v)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-lime-400">
              {lihatSandi ? "tutup" : "lihat"}
            </button>
          </div>

          {error && <p className="text-red-400 text-xs pt-1">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full bg-gradient-to-r from-lime-400 to-emerald-500 text-slate-950 rounded-xl py-3.5 display-title text-base tracking-wide disabled:opacity-60 active:scale-[.98] transition-transform">
            {loading ? "MEMPROSES…" : "MASUK"}
          </button>
        </form>

        <div className="flex items-center justify-between mt-5 text-xs">
          <Link href="/auth/lupa-password" className="text-slate-400">Lupa kata sandi?</Link>
          <span className="text-slate-400">
            Baru di BUG? <Link href="/auth/register" className="text-lime-400 font-semibold">Buat akun</Link>
          </span>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-2"
        style={{ background: "repeating-linear-gradient(115deg,#FFB020 0 10px,#071310 10px 20px)" }} />
    </div>
  );
}
