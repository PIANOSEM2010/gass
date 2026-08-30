"use client";
import { useState, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { masukGoogle } from "@/lib/masuk-google";
import {
  KerangkaAuth, LogoGoogle, TandaSah, PetunjukTombol, kelasIsian, useTombolTali,
} from "@/components/auth-ui";

// useSearchParams membuat halaman ini harus dirender di peramban. Tanpa
// pembungkus Suspense, proses pranata halaman saat build akan gagal.
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <IsiLoginPage />
    </Suspense>
  );
}

function IsiLoginPage() {
  const router = useRouter();
  // Ke mana pengguna dikembalikan setelah masuk. Hanya jalur dalam aplikasi
  // yang diterima; alamat luar ditolak agar tautan masuk tidak bisa dipakai
  // mengarahkan orang ke situs lain.
  const params = useSearchParams();
  const tujuan = (() => {
    const n = params?.get("next") || "";
    return n.startsWith("/") && !n.startsWith("//") ? n : "/profil";
  })();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [lihatSandi, setLihatSandi] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  // Galat dari proses masuk Google di aplikasi dikirim lewat alamat, karena
  // saat itu halaman ini baru saja dibuka ulang.
  const galatTautan = params?.get("galat") || "";

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

  // Sebutkan isian yang belum beres, bukan sekadar jumlahnya, supaya
  // pengguna tahu apa yang harus dikerjakan tanpa menebak.
  const belum = [
    !emailSah ? (email.trim() ? "email belum benar" : "email") : null,
    !sandiSah ? (password ? "kata sandi minimal 6 huruf" : "kata sandi") : null,
  ].filter(Boolean) as string[];
  const pesanTombol = belum.length === 0
    ? "Semua sudah terisi. Silakan masuk."
    : `Belum diisi: ${belum.join(" dan ")}.`;

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
      router.push(tujuan);
      router.refresh();
    }
  }

  // Masuk dengan Google. Perlu penyedia Google diaktifkan di Supabase
  // (Authentication -> Providers -> Google).
  async function handleGoogle() {
    setGoogleLoading(true);
    setError("");
    try {
      // Di aplikasi Android, halaman Google dibuka di peramban sistem karena
      // Google menolak WebView. Di peramban, alurnya seperti biasa.
      await masukGoogle(tujuan);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal membuka halaman Google. Coba lagi.");
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

        {(error || galatTautan) && <p className="text-red-400 text-xs pt-1">{error || galatTautan}</p>}

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
          Baru di BUG? <Link href={`/auth/register?next=${encodeURIComponent(tujuan)}`} className="text-lime-400 font-semibold">Buat akun</Link>
        </span>
      </div>
    </KerangkaAuth>
  );
}
