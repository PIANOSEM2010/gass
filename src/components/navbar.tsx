"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Map, Siren, BookOpen, User, Bike } from "lucide-react";

const nav = [
  { href: "/", label: "Beranda", icon: Home },
  { href: "/peta", label: "Peta", icon: Map },
  { href: "/catat", label: "Gowes", icon: Bike },
  { href: "/sos", label: "SOS", icon: Siren },
  { href: "/edukasi", label: "Edukasi", icon: BookOpen },
  { href: "/profil", label: "Profil", icon: User },
];

export default function Navbar() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          const isSos = href === "/sos";
          // SOS selalu merah terang; lainnya hijau saat aktif, abu saat tidak
          const color = isSos ? "text-red-600" : active ? "text-green-600" : "text-gray-500";
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center flex-1 h-full ${color}`}
            >
              {isSos ? (
                <span className="flex items-center justify-center w-9 h-9 rounded-full bg-red-600 text-white -mt-1 shadow-md shadow-red-300">
                  <Icon size={22} />
                </span>
              ) : (
                <Icon size={22} />
              )}
              <span className={`text-xs mt-1 ${isSos ? "font-bold text-red-600" : ""}`}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}