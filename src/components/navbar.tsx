"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Map, Siren, BookOpen, Users } from "lucide-react";

const nav = [
  { href: "/", label: "Beranda", icon: Home },
  { href: "/peta", label: "Peta", icon: Map },
  { href: "/sos", label: "SOS", icon: Siren },
  { href: "/edukasi", label: "Edukasi", icon: BookOpen },
  { href: "/forum", label: "Forum", icon: Users },
];

export default function Navbar() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          const isSos = href === "/sos";
          return (
            <Link key={href} href={href} className={`flex flex-col items-center justify-center flex-1 h-full ${active ? (isSos ? "text-red-600" : "text-green-600") : "text-gray-500"}`}>
              <Icon size={isSos ? 26 : 22} />
              <span className="text-xs mt-1">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}