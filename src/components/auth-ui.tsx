"use client";
import React from "react";

// Bagian tampilan yang dipakai bersama oleh halaman Masuk dan Daftar,
// supaya keduanya benar-benar seragam.

// Roda berjeruji - motif yang sama dengan logo, dipakai sebagai latar struktural
export function RodaJeruji({ className = "" }: { className?: string }) {
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

export function LogoGoogle() {
  return (
    <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#4285F4" d="M45 24c0-1.6-.1-2.7-.4-3.9H24v7.1h12c-.2 1.9-1.5 4.7-4.4 6.6l6.8 5.3C42.4 35.6 45 30.3 45 24z" />
      <path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.3l-6.9-5.3c-1.8 1.3-4.3 2.2-7.6 2.2-5.8 0-10.7-3.8-12.5-9.1l-7.1 5.5C8 41 15.4 46 24 46z" />
      <path fill="#FBBC05" d="M11.5 28.5c-.5-1.4-.7-2.9-.7-4.5s.3-3.1.7-4.5l-7.1-5.5C2.9 17 2 20.4 2 24s.9 7 2.4 10z" />
      <path fill="#EA4335" d="M24 10.6c3.2 0 5.4 1.4 6.7 2.6l5.9-5.8C33 4.1 29.9 2 24 2 15.4 2 8 7 4.4 14l7.1 5.5c1.8-5.3 6.7-9 12.5-9z" />
    </svg>
  );
}

// Tanda centang kecil yang muncul saat isian sudah sah.
export function TandaSah({ tampil, kanan = 14 }: { tampil: boolean; kanan?: number }) {
  return (
    <span
      aria-hidden="true"
      className="absolute flex items-center justify-center w-5 h-5 rounded-full bg-lime-400 text-slate-950"
      style={{
        right: kanan,
        // Dipusatkan lewat top:50% dengan margin negatif setengah tinggi,
        // bukan lewat transform, supaya animasi skala tidak menggeser
        // posisinya dari garis tengah kolom.
        top: "50%",
        marginTop: -10,
        opacity: tampil ? 1 : 0,
        transform: `scale(${tampil ? 1 : 0.5})`,
        transition: "opacity .22s ease, transform .28s cubic-bezier(.22,1.6,.36,1)",
      }}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
    </span>
  );
}

// Kelas dasar kolom isian bertema gelap.
export function kelasIsian(sah: boolean, extra = "") {
  return `w-full bg-[var(--isian)] border rounded-xl px-4 py-3.5 text-sm placeholder:text-slate-500 focus:outline-none transition-colors ${sah ? "border-lime-400/60" : "border-lime-400/15 focus:border-lime-400/50"} ${extra}`;
}

// Kerangka halaman: judul besar, strip marka, latar roda, dan pita jalan
// di bagian bawah. Dipakai halaman Masuk dan Daftar.
export function KerangkaAuth({ baris, sorot, keterangan, children }: {
  baris: string[]; sorot: string; keterangan: string; children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--latar)] text-white relative overflow-hidden -mb-20">
      <RodaJeruji className="absolute -top-16 -right-28 w-[330px] h-[300px] opacity-50 pointer-events-none" />

      <div className="relative px-6 pt-14">
        <h1 className="display-title text-[38px] leading-[0.9] tracking-tight">
          {baris.map((b) => <React.Fragment key={b}>{b}<br /></React.Fragment>)}
          <span className="text-lime-400">{sorot}</span>
        </h1>
        <div className="mt-4 h-[3px] w-24 rounded-sm opacity-90"
          style={{ background: "repeating-linear-gradient(90deg,#B4FF3A 0 12px,transparent 12px 22px)" }} />
        <p className="mt-3 text-[13px] leading-relaxed text-slate-400 max-w-[240px]">{keterangan}</p>
      </div>

      <div className="relative px-5 mt-8 pb-16">{children}</div>

      <div className="absolute bottom-0 left-0 right-0 h-2"
        style={{ background: "repeating-linear-gradient(115deg,#FFB020 0 10px,var(--latar) 10px 20px)" }} />
    </div>
  );
}

// Baris petunjuk di bawah tombol: menghitung sisa isian yang belum lengkap.
export function PetunjukTombol({ id, sisa, pesan }: { id: string; sisa: number; pesan: string }) {
  return (
    <p id={id} className={`text-[11px] pt-1 flex items-center gap-1.5 ${sisa === 0 ? "text-lime-400" : "text-slate-500"}`}>
      <span className={`inline-block w-1.5 h-1.5 rounded-full ${sisa === 0 ? "bg-lime-400" : "bg-slate-600"}`} />
      {pesan}
    </p>
  );
}

// --- Perilaku tombol "tali pengikat" -------------------------------------
// Tombol baru benar-benar diam setelah semua isian terisi sah. Selama belum,
// ia bergoyang sesaat tiap kali pengguna mengetik; di perangkat ber-tetikus ia
// juga sedikit menghindar dari kursor (dibatasi 4 kali). Di layar sentuh
// tombol tidak pernah menghindar, dan menekannya akan menuntun ke kolom kosong.
export function useTombolTali(sisaIsian: number) {
  const [geser, setGeser] = React.useState({ x: 0, y: 0 });
  const [getar, setGetar] = React.useState(false);
  const [bergoyang, setBergoyang] = React.useState(false);
  const [pakaiTetikus, setPakaiTetikus] = React.useState(false);
  const lariRef = React.useRef(0);
  const tombolRef = React.useRef<HTMLButtonElement>(null);
  const goyangTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    setPakaiTetikus(
      window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
  }, []);

  React.useEffect(() => {
    if (sisaIsian === 0) { setGeser({ x: 0, y: 0 }); lariRef.current = 0; }
  }, [sisaIsian]);

  const picuGoyangan = React.useCallback(() => {
    setBergoyang(false);
    requestAnimationFrame(() => setBergoyang(true));
    if (goyangTimer.current) clearTimeout(goyangTimer.current);
    goyangTimer.current = setTimeout(() => setBergoyang(false), 1700);
  }, []);

  const hindari = React.useCallback((e: React.MouseEvent) => {
    if (!pakaiTetikus || sisaIsian === 0 || lariRef.current >= 4) return;
    const el = tombolRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    const jarak = Math.hypot(dx, dy) || 1;
    if (jarak > 90) return;
    const kuat = sisaIsian >= 2 ? 46 : 22;
    lariRef.current += 1;
    setGeser({
      x: Math.max(-70, Math.min(70, (-dx / jarak) * kuat)),
      y: Math.max(-22, Math.min(22, (-dy / jarak) * (kuat / 2.4))),
    });
  }, [pakaiTetikus, sisaIsian]);

  const getarkan = React.useCallback(() => {
    setGetar(true);
    setTimeout(() => setGetar(false), 360);
  }, []);

  const kelasAnimasi = getar
    ? "bug-getar"
    : bergoyang && sisaIsian >= 2 ? "bug-goyah-kuat"
      : bergoyang && sisaIsian === 1 ? "bug-goyah-lemah"
        : sisaIsian > 0 ? "bug-nafas" : "";

  const kelasWarna = sisaIsian === 0
    ? "bg-gradient-to-r from-lime-400 to-emerald-500 text-slate-950 shadow-[0_0_22px_rgba(180,255,58,.35)] active:scale-[.98]"
    : "bg-lime-400/10 text-lime-300/70 border border-dashed border-lime-400/30";

  const gayaTombol: React.CSSProperties = {
    transform: `translate(${geser.x}px, ${geser.y}px)`,
    transition: "transform .38s cubic-bezier(.22,1,.36,1), background-color .3s, color .3s, box-shadow .3s",
  };

  return { tombolRef, hindari, picuGoyangan, getarkan, kelasAnimasi, kelasWarna, gayaTombol };
}
