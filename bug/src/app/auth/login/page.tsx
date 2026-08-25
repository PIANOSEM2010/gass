"use client";
import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  KerangkaAuth, LogoGoogle, TandaSah, PetunjukTombol, kelasIsian, useTombolTali,
} from "@/components/auth-ui";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [lihatSandi, setLihatSandi] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  const emailSah = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const sandiSah = password.length >= 6;
  const sisaIsian = (emailSah ? 0 : 1) + (sandiSah ? 0 : 1);
  const emailRef = useRef<HTMLInputElement>(null);
  const sandiRef = useRef<HTMLInputElement>(null);
  const t = useTombolTali(sisaIsian);

  function tuntunKeKolomKosong() {
    t.getarkan();
    (!emailSah ? emailRef : sandiRef).current?.focus();
  }

  const pesanTombol = sisaIsian === 2
    ? "Dua isian lagi sebelum tombol ini diam."
    : sisaIsian === 1
      ? (emailSah ? "Tinggal kata sandi — tombolnya mulai melambat." : "Tinggal email — tombolnya mulai melambat.")
      : "Terkunci. Silakan masuk.";

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (sisaIsian > 0) { tuntunKeKolomKosong(); return; }
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
  // (Authentication -> Providers -> Google).
  async function handleGoogle() {
    setGoogleLoading(true);
    setError("");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) { setError(error.message); setGoogleLoading(false); }
    } catch {
      setError("Gagal membuka halaman Google. Coba lagi.");
      setGoogleLoading(false);
    }
  }

  return (
    <KerangkaAuth
      baris={["BULUNGAN", "UNTUK"]} sorot="GOWESER"
      keterangan="Platform keselamatan pesepeda Kabupaten Bulungan."
    >
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
        <div className="relative">
          <input ref={emailRef} type="email" required value={email}
            onChange={(e) => { setEmail(e.target.value); t.picuGoyangan(); }}
            placeholder="nama@email.com" className={kelasIsian(emailSah, "pr-11")} />
          <TandaSah tampil={emailSah} />
        </div>
        <div className="relative">
          <input ref={sandiRef} type={lihatSandi ? "text" : "password"} required value={password}
            onChange={(e) => { setPassword(e.target.value); t.picuGoyangan(); }}
            placeholder="Kata sandi (min. 6 huruf)" className={kelasIsian(sandiSah, "pr-[86px]")} />
          <TandaSah tampil={sandiSah} kanan={54} />
          <button type="button" onClick={() => setLihatSandi((v) => !v)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-lime-400">
            {lihatSandi ? "tutup" : "lihat"}
          </button>
        </div>

        {error && <p className="text-red-400 text-xs pt-1">{error}</p>}

        {/* Wadah lebih tinggi agar tombol punya ruang menghindar tanpa
            menggeser tata letak di sekitarnya. */}
        <div className="relative h-[52px] pt-1" onMouseMove={t.hindari}>
          <button ref={t.tombolRef} type="submit" disabled={loading}
            onClick={(e) => { if (sisaIsian > 0) { e.preventDefault(); tuntunKeKolomKosong(); } }}
            aria-describedby="petunjuk-masuk" style={t.gayaTombol}
            className={`absolute inset-x-0 top-1 rounded-xl py-3.5 display-title text-base tracking-wide disabled:opacity-60 ${t.kelasAnimasi} ${t.kelasWarna}`}>
            {loading ? "MEMPROSES…" : "MASUK"}
          </button>
        </div>
        <PetunjukTombol id="petunjuk-masuk" sisa={sisaIsian} pesan={pesanTombol} />
      </form>

      <div className="flex items-center justify-between mt-5 text-xs">
        <Link href="/auth/lupa-password" className="text-slate-400">Lupa kata sandi?</Link>
        <span className="text-slate-400">
          Baru di BUG? <Link href="/auth/register" className="text-lime-400 font-semibold">Buat akun</Link>
        </span>
      </div>
    </KerangkaAuth>
  );
}
