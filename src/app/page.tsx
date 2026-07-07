import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Map, BookOpen, Siren, Megaphone, Users, Bike, Flame, ChevronRight, Trophy, Construction, BarChart3, Zap } from "lucide-react";

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
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-white pb-8">
      {/* Hero: carbon-dark bergaya jersey balap */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-emerald-950 to-green-900 text-white px-5 pt-10 pb-12 rounded-b-[2.5rem] shadow-lg speed-lines">
        <div className="absolute -right-8 -bottom-8 opacity-[0.08]"><Bike size={210} /></div>
        {/* Strip aksen lime miring */}
        <div className="absolute right-6 top-0 h-full w-8 bg-gradient-to-b from-lime-400 to-green-500 opacity-80" style={{ transform: "skewX(-16deg)" }} />
        <div className="absolute right-16 top-0 h-full w-2.5 bg-lime-300 opacity-50" style={{ transform: "skewX(-16deg)" }} />

        <div className="relative max-w-md mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-lime-400 text-slate-950 flex items-center justify-center shadow-lg shadow-lime-500/20">
              <Bike size={26} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="display-title text-4xl leading-none tracking-tight">BUG</h1>
              <p className="eyebrow text-lime-300/90">Bulungan untuk Goweser</p>
            </div>
          </div>
          <p className="mt-6 display-title text-2xl text-white/95">
            {user ? `Gas terus, ${firstName || "Goweser"}!` : "Selamat datang, Goweser!"}
          </p>
          <p className="text-sm text-white/70 mt-1">&quot;Berbagi jalan, berbagi tanggung jawab&quot;</p>

          {user && (
            <div className="mt-5 flex gap-2">
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur rounded-xl px-3 py-2 border border-white/10">
                <Flame size={16} className="text-orange-400" />
                <span className="display-num text-xl leading-none">{streak}</span>
                <span className="eyebrow !text-[9px] text-white/60">hari streak</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur rounded-xl px-3 py-2 border border-white/10">
                <Zap size={16} className="text-lime-300" />
                <span className="display-num text-xl leading-none">{totalKm.toFixed(1)}</span>
                <span className="eyebrow !text-[9px] text-white/60">km total</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pt-6">
        {/* Fitur Utama */}
        <h3 className="display-title text-lg text-slate-800 mb-3 px-1">Fitur Utama</h3>

        {/* SOS memanjang, di dalam Fitur Utama, di atas 4 fitur lain */}
        <Link href="/sos" className="flex items-center gap-3 rounded-2xl bg-white border-2 border-red-200 p-4 shadow-md mb-3 active:scale-[0.98] transition-transform overflow-hidden relative">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-red-700 text-white flex items-center justify-center shadow-md shadow-red-200 flex-shrink-0"><Siren size={24} /></div>
          <div className="flex-1 min-w-0">
            <h2 className="display-title text-base text-red-600">Tombol Darurat SOS</h2>
            <p className="text-xs text-gray-500">Tekan saat darurat, kirim lokasi otomatis</p>
          </div>
          <ChevronRight className="text-red-400 flex-shrink-0" size={20} />
        </Link>

        {/* 4 fitur lain */}
        <div className="grid grid-cols-2 gap-3">
          {features.map(({ href, label, desc, icon: Icon, grad }) => (
            <Link key={href} href={href} className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all active:scale-[0.98] border border-slate-100">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 bg-gradient-to-br ${grad} text-white shadow-sm`}>
                <Icon size={24} />
              </div>
              <h2 className="display-title text-base text-slate-900 leading-tight">{label}</h2>
              <p className="text-xs text-gray-500 mt-1">{desc}</p>
            </Link>
          ))}
        </div>

        {/* Lapor infrastruktur, untuk semua pengguna jalan */}
        <Link href="/lapor" className="mt-3 flex items-center gap-3 rounded-2xl bg-white border-2 border-amber-200 p-4 shadow-md active:scale-[0.98] transition-transform">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center shadow-md shadow-amber-200 flex-shrink-0"><Construction size={24} /></div>
          <div className="flex-1 min-w-0">
            <h2 className="display-title text-base text-amber-700">Lapor Jalan Rusak</h2>
            <p className="text-xs text-gray-500">Foto lubang, lampu mati, atau marka pudar</p>
          </div>
          <ChevronRight className="text-amber-400 flex-shrink-0" size={20} />
        </Link>

        {/* Aktivitas Gowes (sekunder, di bawah) */}
        <h3 className="display-title text-lg text-slate-800 mt-6 mb-3 px-1">Aktivitas Gowes</h3>
        <Link href="/catat" className="relative block rounded-2xl bg-gradient-to-br from-orange-500 via-red-500 to-red-700 text-white p-4 shadow-md active:scale-[0.98] transition-transform overflow-hidden speed-lines">
          <div className="flex items-center justify-between relative">
            <div>
              <p className="eyebrow !text-[10px] text-white/80 flex items-center gap-1"><Flame size={13} /> {user ? "Streak kamu" : "Mulai streak gowesmu"}</p>
              {user ? (
                <p className="display-num text-5xl leading-none mt-1">{streak}<span className="display-title text-lg ml-1.5">hari</span></p>
              ) : (
                <p className="display-title text-2xl leading-tight mt-1">Catat Perjalanan</p>
              )}
              <p className="text-xs text-white/85 mt-1.5">{user ? `Total ${totalKm.toFixed(1)} km, ketuk untuk gowes` : "Gowes 1 km tiap hari, jaga streakmu"}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0"><Bike size={24} /></div>
          </div>
        </Link>

        <Link href="/leaderboard" className="mt-3 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-yellow-400 to-amber-500 text-white p-4 shadow-sm active:scale-[0.98] transition-transform">
          <Trophy size={22} className="flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h2 className="display-title text-base">Papan Peringkat</h2>
            <p className="text-xs opacity-90">Lihat ranking streak pesepeda</p>
          </div>
          <ChevronRight size={20} className="flex-shrink-0" />
        </Link>

        <Link href="/dashboard" className="mt-3 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-slate-800 to-slate-950 text-white p-4 shadow-sm active:scale-[0.98] transition-transform speed-lines">
          <BarChart3 size={22} className="flex-shrink-0 text-lime-300" />
          <div className="flex-1 min-w-0">
            <h2 className="display-title text-base">Dashboard Keselamatan</h2>
            <p className="text-xs opacity-80">Data laporan, zona rawan, dan aktivitas warga</p>
          </div>
          <ChevronRight size={20} className="flex-shrink-0" />
        </Link>
      </div>
    </div>
  );
}