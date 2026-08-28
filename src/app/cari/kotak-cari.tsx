"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";

export default function KotakCari({ awal }: { awal: string }) {
  const router = useRouter();
  const [teks, setTeks] = useState(awal);

  function cari(e: React.FormEvent) {
    e.preventDefault();
    const q = teks.trim();
    router.push(q.length >= 2 ? `/cari?q=${encodeURIComponent(q)}` : "/cari");
  }

  return (
    <form onSubmit={cari} className="flex gap-2">
      <div className="relative flex-1">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
        <input value={teks} onChange={(e) => setTeks(e.target.value)}
          placeholder="Cari nama goweser…" autoFocus
          className="w-full bg-[var(--isian)] border border-lime-400/15 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-lime-400/50" />
      </div>
      <button type="submit"
        className="rounded-xl bg-gradient-to-r from-lime-400 to-emerald-500 text-slate-950 px-4 display-title text-sm">
        Cari
      </button>
    </form>
  );
}
