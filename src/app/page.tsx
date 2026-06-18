import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Map, BookOpen, Siren, Megaphone, Users, Bike, Flame, ChevronRight, Trophy, Construction, BarChart3 } from "lucide-react";

function witaDate(off = 0): string {
  return new Date(Date.now() + 8 * 3600 * 1000 + off * 86400000).toISOString().slice(0, 10);
}

const features = [
  { href: "/peta", label: "Peta Jalur", desc: "Jalur ramah sepeda Bulungan", icon: Map, grad: "from-blue-500 to-cyan-500" },
  { href: "/edukasi", label: "Modul Edukasi", desc: "Etika berbagi jalan", icon: BookOpen, grad: "from-emerald-500 to-green-600" },
  { href: "/kampanye", label: "Kampanye", desc: "Berbagi jalan untuk pesepeda", icon: Megaphone, grad: "from-amber-500 to-orange-500" },
  { href: "/forum", label: "Forum", desc: "Komunitas pesepeda", icon: Users, grad: "from-violet-500 to-purple-600" },
];

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let firstName = "";
  let streak = 0;
  let totalKm = 0;
  if (user) {
    const meta = user.user_metadata || {};
    firstName = String(meta.full_name || "").split(" ")[0] || "";
    const { data: s } = await supabase
      .from("user_streaks")
      .select("current_streak,last_activity_date,total_distance_m")
      .eq("user_id", user.id)
      .maybeSingle();
    if (s) {
      const today = witaDate(0), yest = witaDate(-1);
      streak = s.last_activity_date === today || s.last_activity_date === yest ? s.current_streak : 0;
      totalKm = Number(s.total_distance_m) / 1000;
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white pb-8">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-green-600 to-emerald-700 text-white px-5 pt-10 pb-10 rounded-b-[2.5rem] shadow-lg">
        <div className="absolute -right-6 -top-6 opacity-10"><Bike size={170} /></div>
        <div className="relative max-w-md mx-auto">
          <div className="flex items-center gap-2">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center font-extrabold text-xl">B</div>
            <div>
              <h1 className="text-2xl font-extrabold leading-none">BUG</h1>
              <p className="text-xs opacity-90">Bulungan untuk Goweser</p>
            </div>
          </div>
          <p className="mt-5 text-lg font-semibold">
            {user ? `Halo, ${firstName || "Goweser"}!` : "Selamat datang, Goweser!"}
          </p>
          <p className="text-sm opacity-90 italic">&quot;Berbagi jalan, berbagi tanggung jawab&quot;</p>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pt-5">
        {/* Fitur Utama */}
        <h3 className="font-bold text-gray-800 mb-3 px-1">Fitur Utama</h3>

        {/* SOS memanjang, di dalam Fitur Utama, di atas 4 fitur lain */}
        <Link href="/sos" className="flex items-center gap-3 rounded-2xl bg-white border-2 border-red-200 p-4 shadow-md mb-3 active:scale-[0.98] transition-transform">
          <div className="w-12 h-12 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-md shadow-red-200 flex-shrink-0"><Siren size={24} /></div>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-red-600">Tombol Darurat SOS</h2>
            <p className="text-xs text-gray-500">Tekan saat darurat, kirim lokasi otomatis</p>
          </div>
          <ChevronRight className="text-red-400 flex-shrink-0" size={20} />
        </Link>

        {/* 4 fitur lain */}
        <div className="grid grid-cols-2 gap-3">
          {features.map(({ href, label, desc, icon: Icon, grad }) => (
            <Link key={href} href={href} className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all active:scale-[0.98]">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 bg-gradient-to-br ${grad} text-white shadow-sm`}>
                <Icon size={24} />
              </div>
              <h2 className="font-bold text-sm text-gray-900">{label}</h2>
              <p className="text-xs text-gray-500 mt-1">{desc}</p>
            </Link>
          ))}
        </div>

        {/* Lapor infrastruktur, untuk semua pengguna jalan */}
        <Link href="/lapor" className="mt-3 flex items-center gap-3 rounded-2xl bg-white border-2 border-amber-200 p-4 shadow-md active:scale-[0.98] transition-transform">
          <div className="w-12 h-12 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-200 flex-shrink-0"><Construction size={24} /></div>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-amber-700">Lapor Jalan atau fasilitas Rusak</h2>
            <p className="text-xs text-gray-500">Foto lubang, lampu mati, atau marka pudar</p>
          </div>
          <ChevronRight className="text-amber-400 flex-shrink-0" size={20} />
        </Link>

        {/* Aktivitas Gowes (sekunder, di bawah) */}
        <h3 className="font-bold text-gray-800 mt-6 mb-3 px-1">Aktivitas Gowes</h3>
        <Link href="/catat" className="block rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 text-white p-4 shadow-sm active:scale-[0.98] transition-transform">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs opacity-90 flex items-center gap-1"><Flame size={14} /> {user ? "Streak kamu" : "Mulai streak gowesmu"}</p>
              {user ? (
                <p className="text-3xl font-extrabold leading-none mt-1">{streak}<span className="text-sm font-bold ml-1">hari</span></p>
              ) : (
                <p className="text-xl font-extrabold leading-tight mt-1">Catat Perjalanan</p>
              )}
              <p className="text-xs opacity-90 mt-1.5">{user ? `Total ${totalKm.toFixed(1)} km, ketuk untuk gowes` : "Gowes 1 km tiap hari, jaga streakmu"}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0"><Bike size={24} /></div>
          </div>
        </Link>

        <Link href="/leaderboard" className="mt-3 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-yellow-400 to-amber-500 text-white p-4 shadow-sm active:scale-[0.98] transition-transform">
          <Trophy size={22} className="flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-sm">Papan Peringkat</h2>
            <p className="text-xs opacity-90">Lihat ranking streak pesepeda</p>
          </div>
          <ChevronRight size={20} className="flex-shrink-0" />
        </Link>

        <Link href="/dashboard" className="mt-3 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-slate-700 to-slate-900 text-white p-4 shadow-sm active:scale-[0.98] transition-transform">
          <BarChart3 size={22} className="flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-sm">Dashboard Keselamatan</h2>
            <p className="text-xs opacity-90">Data laporan, zona rawan, dan aktivitas warga</p>
          </div>
          <ChevronRight size={20} className="flex-shrink-0" />
        </Link>
      </div>
    </div>
  );
}