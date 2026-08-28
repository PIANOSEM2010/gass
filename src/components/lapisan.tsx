"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

// Lapisan mengambang (dialog, lembar bawah, layar penuh).
//
// Wajib dipakai untuk semua tampilan mengambang. Pembungkus animasi halaman
// membentuk konteks penumpukan sendiri, sehingga apa pun di dalamnya tetap
// tertimpa navbar dan tombol mengambang meski z-index-nya jauh lebih tinggi.
// Dengan portal ke <body>, lapisan keluar dari pembungkus itu dan benar-benar
// berada di atas segalanya.
export default function Lapisan({ children }: { children: React.ReactNode }) {
  const [siap, setSiap] = useState(false);
  useEffect(() => {
    setSiap(true);
    // Halaman di belakang dikunci agar tidak ikut tergulir.
    const asal = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = asal; };
  }, []);
  if (!siap) return null;
  return createPortal(children, document.body);
}
