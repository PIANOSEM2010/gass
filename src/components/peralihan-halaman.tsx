"use client";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

// Peralihan antar halaman: isi halaman muncul naik-memudar setiap kali alamat
// berubah. Sekaligus menegakkan ulang pilihan tema pada setiap perpindahan,
// karena atribut tema pada <html> hanya disetel sekali oleh skrip di <head>;
// bila ada apa pun yang menimpanya di tengah jalan, halaman sempat berkedip
// kembali ke tema gelap.
export default function PeralihanHalaman({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    try {
      const t = window.localStorage.getItem("bug-tema");
      const mau = t === "terang" || t === "gelap"
        ? t
        : window.matchMedia("(prefers-color-scheme: light)").matches ? "terang" : "gelap";
      if (document.documentElement.dataset.tema !== mau) {
        document.documentElement.dataset.tema = mau;
      }
    } catch { /* mode privat */ }
  }, [pathname]);

  return <div key={pathname} className="halaman-masuk">{children}</div>;
}
