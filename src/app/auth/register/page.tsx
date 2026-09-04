"use client";
import { useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import PilihWilayah from "@/components/pilih-wilayah";
import { simpanWilayah, type Wilayah } from "@/lib/wilayah";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { masukGoogle } from "@/lib/masuk-google";
import {
  KerangkaAuth, LogoGoogle, TandaSah, PetunjukTombol, kelasIsian, useTombolTali,
} from "@/components/auth-ui";

type MemberType = "pelajar" | "pekerja";

// useSearchParams membuat halaman ini harus dirender di peramban. Tanpa
// pembungkus Suspense, proses pranata halaman saat build akan gagal.
export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <IsiRegisterPage />
    </Suspense>
  );
}

function IsiRegisterPage() {
  const params = useSearchParams();
  const tujuan = (() => {
    const n = params?.get("next") || "";
    return n.startsWith("/") && !n.startsWith("//") ? n : "/profil";
  })();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [memberType, setMemberType] = useState<MemberType>("pelajar");
  const [organization, setOrganization] = useState("");
  const [wilayah, setWilayah] = useState<Wilayah | null>(null);
  const [lihatSandi, setLihatSandi] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const isPelajar = memberType === "pelajar";
  const namaSah = fullName.trim().length >= 3;
  const asalSah = organization.trim().length >= 3;
  const emailSah = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const sandiSah = password.length >= 6;
  const sisaIsian = (namaSah ? 0 : 1) + (asalSah ? 0 : 1) + (emailSah ? 0 : 1) + (sandiSah ? 0 : 1);

  const namaRef = useRef<HTMLInputElement>(null);
  const asalRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const sandiRef = useRef<HTMLInputElement>(null);
  const t = useTombolTali(sisaIsian);

  function tuntunKeKolomKosong() {
    t.getarkan();
    const urutan: Array<[boolean, React.RefObject<HTMLInputElement | null>]> = [
      [namaSah, namaRef], [asalSah, asalRef], [emailSah, emailRef], [sandiSah, sandiRef],
    ];
    urutan.find(([sah]) => !sah)?.[1].current?.focus();
  }

  const belum = [
    !namaSah ? "nama lengkap" : null,
    !asalSah ? (isPelajar ? "asal sekolah" : "asal instansi") : null,
    !emailSah ? (email.trim() ? "email belum benar" : "email") : null,
    !sandiSah ? (password ? "kata sandi minimal 6 huruf" : "kata sandi") : null,
  ].filter(Boolean) as string[];
  const pesanTombol = belum.length === 0
    ? "Semua sudah terisi. Silakan daftar."
    : `Belum diisi: ${belum.join(", ")}.`;

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (sisaIsian > 0) { tuntunKeKolomKosong(); return; }
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName, member_type: memberType, organization,
          region: wilayah?.nama || null,
          province: wilayah?.provinsi || null,
          region_lat: wilayah?.lat || null,
          region_lng: wilayah?.lng || null,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(tujuan)}`,
      },
    });
    if (error) { setError(error.message); setLoading(false); }
    else { setSuccess(true); setLoading(false); }
  }

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

  if (success) {
    return (
      <KerangkaAuth baris={["PERIKSA", "KOTAK"]} sorot="MASUKMU"
        keterangan="Satu langkah lagi sebelum kamu bisa ikut gowes bersama.">
        <div className="rounded-2xl border border-lime-400/25 bg-lime-400/5 p-6">
          <div className="w-12 h-12 rounded-full bg-lime-400 text-slate-950 flex items-center justify-center mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
          </div>
          <h2 className="display-title text-lg text-lime-300">PENDAFTARAN BERHASIL</h2>
          <p className="text-sm text-slate-300 mt-2 leading-relaxed">
            Tautan konfirmasi sudah dikirim ke <strong className="text-white">{email}</strong>. Buka tautan itu, lalu kamu bisa masuk.
          </p>
          <Link href={`/auth/login?next=${encodeURIComponent(tujuan)}`}
            className="mt-5 block text-center bg-gradient-to-r from-lime-400 to-emerald-500 text-slate-950 rounded-xl py-3 display-title text-sm tracking-wide">
            KE HALAMAN MASUK
          </Link>
        </div>
      </KerangkaAuth>
    );
  }

  return (
    <KerangkaAuth baris={["GABUNG", "JADI"]} sorot="GOWESER"
      keterangan="Buat akun untuk mencatat gowes, memakai tombol darurat, dan ikut komunitas.">
      <button onClick={handleGoogle} disabled={googleLoading}
        className="w-full bg-white text-slate-800 rounded-xl py-3.5 flex items-center justify-center gap-2.5 font-semibold text-sm active:scale-[.98] transition-transform disabled:opacity-70">
        <LogoGoogle />
        {googleLoading ? "Membuka Google…" : "Daftar dengan Google"}
      </button>

      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-lime-400/15" />
        <span className="eyebrow text-slate-500 !text-[10px]">atau isi sendiri</span>
        <div className="flex-1 h-px bg-lime-400/15" />
      </div>

      <form onSubmit={handleRegister} className="space-y-2.5">
        <div className="relative">
          <input ref={namaRef} type="text" required value={fullName}
            onChange={(e) => { setFullName(e.target.value); t.picuGoyangan(); }}
            placeholder="Nama lengkap" className={kelasIsian(namaSah, "pr-11")} />
          <TandaSah tampil={namaSah} />
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {(["pelajar", "pekerja"] as MemberType[]).map((m) => {
            const aktif = memberType === m;
            return (
              <button key={m} type="button" onClick={() => setMemberType(m)}
                className={`rounded-xl py-3 text-sm font-semibold border transition-colors ${aktif
                  ? "border-lime-400/60 bg-lime-400/15 text-lime-300"
                  : "border-lime-400/15 bg-[var(--isian)] text-slate-400"}`}>
                {m === "pelajar" ? "Pelajar" : "Pekerja"}
              </button>
            );
          })}
        </div>

        <div className="relative">
          <input ref={asalRef} type="text" required value={organization}
            onChange={(e) => { setOrganization(e.target.value); t.picuGoyangan(); }}
            placeholder={isPelajar ? "Asal sekolah" : "Asal instansi"}
            className={kelasIsian(asalSah, "pr-11")} />
          <TandaSah tampil={asalSah} />
        </div>

          <PilihWilayah nilai={wilayah} ubah={(w) => { setWilayah(w); if (w) simpanWilayah(w); }} />

        <div className="relative">
          <input ref={emailRef} type="email" required value={email}
            onChange={(e) => { setEmail(e.target.value); t.picuGoyangan(); }}
            placeholder="nama@email.com" className={kelasIsian(emailSah, "pr-11")} />
          <TandaSah tampil={emailSah} />
        </div>

        <div className="relative">
          <input ref={sandiRef} type={lihatSandi ? "text" : "password"} required minLength={6} value={password}
            onChange={(e) => { setPassword(e.target.value); t.picuGoyangan(); }}
            placeholder="Kata sandi (min. 6 huruf)" className={kelasIsian(sandiSah, "pr-[86px]")} />
          <TandaSah tampil={sandiSah} kanan={54} />
          <button type="button" onClick={() => setLihatSandi((v) => !v)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-lime-400">
            {lihatSandi ? "tutup" : "lihat"}
          </button>
        </div>

        {error && <p className="text-red-400 text-xs pt-1">{error}</p>}

        <div className="relative h-[52px] pt-1" onMouseMove={t.hindari}>
          <button ref={t.tombolRef} type="submit" disabled={loading}
            onClick={(e) => { if (sisaIsian > 0) { e.preventDefault(); tuntunKeKolomKosong(); } }}
            aria-describedby="petunjuk-daftar" style={t.gayaTombol}
            className={`absolute inset-x-0 top-1 rounded-xl py-3.5 display-title text-base tracking-wide disabled:opacity-60 ${t.kelasAnimasi} ${t.kelasWarna}`}>
            {loading ? "MEMPROSES…" : "DAFTAR"}
          </button>
        </div>
        <PetunjukTombol id="petunjuk-daftar" sisa={sisaIsian} pesan={pesanTombol} />
      </form>

      <p className="text-center text-xs text-slate-400 mt-5">
        Sudah punya akun? <Link href={`/auth/login?next=${encodeURIComponent(tujuan)}`} className="text-lime-400 font-semibold">Masuk di sini</Link>
      </p>
    </KerangkaAuth>
  );
}
