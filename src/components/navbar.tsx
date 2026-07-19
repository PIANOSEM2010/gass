"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useNavLoading } from "@/app/nav-loading";
import { Home, Map, Siren, BookOpen, User, Bike, MessageSquare, type LucideIcon } from "lucide-react";

const leftTabs = [
  { href: "/", label: "Beranda", icon: Home },
  { href: "/peta", label: "Peta", icon: Map },
  { href: "/catat", label: "Gowes", icon: Bike },
];
const rightTabs = [
  { href: "/edukasi", label: "Edukasi", icon: BookOpen },
  { href: "/forum", label: "Forum", icon: MessageSquare },
  { href: "/profil", label: "Profil", icon: User },
];

export default function Navbar() {
  const pathname = usePathname();
  const { startNavigation } = useNavLoading();

  function Tab({ href, label, icon: Icon }: { href: string; label: string; icon: LucideIcon }) {
    const active = pathname === href;
    return (
      <Link href={href} onClick={() => startNavigation(href)} className="flex flex-col items-center justify-center flex-1 h-full group">
        <span className={`flex items-center justify-center rounded-xl px-3 py-1 transition-colors ${active ? "bg-lime-400/15 text-lime-300" : "text-slate-400 group-active:text-slate-200"}`}>
          <Icon size={21} strokeWidth={active ? 2.4 : 2} />
        </span>
        <span className={`eyebrow mt-0.5 !text-[9px] ${active ? "text-lime-300" : "text-slate-500"}`}>{label}</span>
      </Link>
    );
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-slate-950/95 backdrop-blur border-t border-slate-800 shadow-[0_-6px_20px_rgba(0,0,0,0.25)]">
      <div className="relative max-w-md mx-auto h-16">
        <div className="flex items-center h-full">
          <div className="flex flex-1 h-full">{leftTabs.map((t) => <Tab key={t.href} {...t} />)}</div>
          <div className="w-20 flex-shrink-0" />
          <div className="flex flex-1 h-full">{rightTabs.map((t) => <Tab key={t.href} {...t} />)}</div>
        </div>

        {/* SOS: tombol tengah, paling besar, menonjol ke atas */}
        <Link href="/sos" onClick={() => startNavigation("/sos")} className="absolute left-1/2 -translate-x-1/2 -top-6 flex flex-col items-center">
          <span className="sos-pulse w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-red-700 text-white flex items-center justify-center shadow-lg border-4 border-slate-950 active:scale-95 transition-transform">
            <Siren size={30} />
          </span>
          <span className={`eyebrow mt-1 !text-[10px] ${pathname === "/sos" ? "text-red-400" : "text-red-500"}`}>SOS</span>
        </Link>
      </div>
    </nav>
  );
}
