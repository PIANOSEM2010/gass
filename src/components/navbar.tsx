"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Map, Siren, BookOpen, User, Bike, type LucideIcon } from "lucide-react";

const leftTabs = [
  { href: "/", label: "Beranda", icon: Home },
  { href: "/peta", label: "Peta", icon: Map },
  { href: "/catat", label: "Gowes", icon: Bike },
];
const rightTabs = [
  { href: "/edukasi", label: "Edukasi", icon: BookOpen },
  { href: "/profil", label: "Profil", icon: User },
];

export default function Navbar() {
  const pathname = usePathname();

  function Tab({ href, label, icon: Icon }: { href: string; label: string; icon: LucideIcon }) {
    const active = pathname === href;
    return (
      <Link href={href} className={`flex flex-col items-center justify-center flex-1 h-full ${active ? "text-green-600" : "text-gray-500"}`}>
        <Icon size={22} />
        <span className="text-[11px] mt-1">{label}</span>
      </Link>
    );
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="relative max-w-md mx-auto h-16">
        <div className="flex items-center h-full">
          <div className="flex flex-1 h-full">{leftTabs.map((t) => <Tab key={t.href} {...t} />)}</div>
          <div className="w-20 flex-shrink-0" />
          <div className="flex flex-1 h-full">{rightTabs.map((t) => <Tab key={t.href} {...t} />)}</div>
        </div>

        {/* SOS: tombol tengah, paling besar, menonjol ke atas */}
        <Link href="/sos" className="absolute left-1/2 -translate-x-1/2 -top-6 flex flex-col items-center">
          <span className="w-16 h-16 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-300 border-4 border-white active:scale-95 transition-transform">
            <Siren size={30} />
          </span>
          <span className={`text-[11px] font-bold mt-1 ${pathname === "/sos" ? "text-red-700" : "text-red-600"}`}>SOS</span>
        </Link>
      </div>
    </nav>
  );
}