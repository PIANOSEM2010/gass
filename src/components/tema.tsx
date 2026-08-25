"use client";
import { useEffect, useState } from "react";

// Pengalih tema. Pilihan disimpan di peranti; bila belum pernah memilih,
// tema mengikuti pengaturan sistem.
export type Tema = "gelap" | "terang";

export function terapkanTema(t: Tema) {
  document.documentElement.dataset.tema = t;
  try { window.localStorage.setItem("bug-tema", t); } catch { /* mode privat */ }
}

export default function TombolTema() {
  const [tema, setTema] = useState<Tema>("gelap");

  useEffect(() => {
    let awal: Tema = "gelap";
    try {
      const t = window.localStorage.getItem("bug-tema");
      if (t === "terang" || t === "gelap") awal = t;
      else if (window.matchMedia("(prefers-color-scheme: light)").matches) awal = "terang";
    } catch { /* abaikan */ }
    setTema(awal);
    document.documentElement.dataset.tema = awal;
  }, []);

  function ganti() {
    const b: Tema = tema === "gelap" ? "terang" : "gelap";
    setTema(b);
    terapkanTema(b);
  }

  const gelap = tema === "gelap";
  return (
    <button onClick={ganti} aria-label={gelap ? "Ganti ke tema terang" : "Ganti ke tema gelap"}
      className="relative w-[52px] h-[26px] rounded-full border border-lime-400/25 bg-lime-400/8 flex-shrink-0 overflow-hidden">
      {/* bulatan penanda yang bergeser */}
      <span className="absolute top-[2px] w-[20px] h-[20px] rounded-full flex items-center justify-center transition-all duration-300"
        style={{
          left: gelap ? 2 : 28,
          background: gelap ? "#0F241C" : "#B4FF3A",
          color: gelap ? "#B4FF3A" : "#062014",
          boxShadow: gelap ? "none" : "0 0 12px rgba(180,255,58,.5)",
        }}>
        {gelap ? (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
          </svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
            <circle cx="12" cy="12" r="4.2" fill="currentColor" stroke="none" />
            <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4" />
          </svg>
        )}
      </span>
    </button>
  );
}

// Menyetel tema sedini mungkin agar halaman tidak berkedip putih lalu gelap.
export function SkripTema() {
  const kode = `(function(){try{var t=localStorage.getItem('bug-tema');if(!t)t=window.matchMedia('(prefers-color-scheme: light)').matches?'terang':'gelap';document.documentElement.dataset.tema=t;}catch(e){document.documentElement.dataset.tema='gelap';}})();`;
  return <script dangerouslySetInnerHTML={{ __html: kode }} />;
}
