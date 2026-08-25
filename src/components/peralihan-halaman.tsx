"use client";
import { usePathname } from "next/navigation";

// Peralihan antar halaman: isi halaman muncul naik-memudar setiap kali
// alamat berubah. Dipasang di layout supaya berlaku menyeluruh tanpa perlu
// menyentuh tiap halaman satu per satu.
export default function PeralihanHalaman({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return <div key={pathname} className="halaman-masuk">{children}</div>;
}
