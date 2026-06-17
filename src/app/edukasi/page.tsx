import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { BookOpen, CheckCircle2, Users, Bike, ShieldCheck, ChevronRight } from "lucide-react";

const AUDIENCE_CONFIG = {
  pesepeda:   { icon: Bike,        grad: "from-green-500 to-emerald-600", badge: "bg-green-100 text-green-700",   label: "Untuk Pesepeda" },
  pengendara: { icon: ShieldCheck, grad: "from-orange-500 to-amber-500",  badge: "bg-orange-100 text-orange-700", label: "Untuk Pengendara Motor" },
  semua:      { icon: Users,       grad: "from-blue-500 to-cyan-500",     badge: "bg-blue-100 text-blue-700",     label: "Untuk Semua" },
};

export default async function EdukasiPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: modules } = await supabase
    .from("modules")
    .select("*")
    .order("order_index");

  let progressMap: Record<string, { completed: boolean; score: number | null }> = {};
  if (user) {
    const { data: progress } = await supabase
      .from("module_progress")
      .select("module_id, completed, score")
      .eq("user_id", user.id);
    progress?.forEach((p) => {
      progressMap[p.module_id] = { completed: p.completed, score: p.score };
    });
  }

  const total = modules?.length || 0;
  const completedCount = Object.values(progressMap).filter((p) => p.completed).length;
  const pct = total ? Math.round((completedCount / total) * 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white pb-8">
      <div className="max-w-md mx-auto px-4 pt-6">
        {/* Header gradient + progress */}
        <div className="bg-gradient-to-br from-green-600 to-emerald-700 text-white rounded-3xl p-5 shadow-lg mb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0"><BookOpen size={26} /></div>
            <div className="min-w-0">
              <h1 className="text-xl font-extrabold leading-none">Modul Edukasi</h1>
              <p className="text-xs opacity-90 mt-1">Etika berbagi jalan untuk pesepeda & pengendara di Bulungan</p>
            </div>
          </div>
          {user && (
            <div className="mt-4">
              <div className="flex justify-between text-xs opacity-90 mb-1.5">
                <span>Progress belajar</span>
                <span className="font-semibold">{completedCount}/{total} modul</span>
              </div>
              <div className="h-2.5 bg-white/25 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
              {completedCount === total && total > 0 && (
                <p className="text-xs mt-2 font-medium flex items-center gap-1"><CheckCircle2 size={14} /> Selamat! Semua modul selesai.</p>
              )}
            </div>
          )}
        </div>

        {/* Daftar modul */}
        <div className="space-y-3">
          {modules?.map((m) => {
            const aud = AUDIENCE_CONFIG[m.target_audience as keyof typeof AUDIENCE_CONFIG] || AUDIENCE_CONFIG.semua;
            const Icon = aud.icon;
            const progress = progressMap[m.id];
            return (
              <Link
                key={m.id}
                href={`/edukasi/${m.slug}`}
                className="block bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all active:scale-[0.99] border border-gray-100"
              >
                <div className="flex items-start gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br ${aud.grad} text-white shadow-sm`}>
                    <Icon size={22} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${aud.badge}`}>{aud.label}</span>
                      {progress?.completed && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-green-600 text-white font-medium flex items-center gap-1">
                          <CheckCircle2 size={11} /> Selesai
                        </span>
                      )}
                    </div>
                    <h2 className="font-bold text-gray-900 leading-tight">{m.title}</h2>
                    <p className="text-xs text-gray-500 mt-1">{m.summary}</p>
                    {progress?.completed && progress.score !== null && (
                      <p className="text-xs text-green-700 mt-2 font-semibold">Skor: {progress.score}/3</p>
                    )}
                  </div>
                  <ChevronRight className="text-gray-300 flex-shrink-0 mt-1" size={18} />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}