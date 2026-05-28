import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { BookOpen, CheckCircle2, Users, Bike, ShieldCheck } from "lucide-react";

const AUDIENCE_CONFIG = {
  pesepeda:    { icon: Bike,         color: "bg-green-100 text-green-700",   label: "Untuk Pesepeda" },
  pengendara:  { icon: ShieldCheck,  color: "bg-orange-100 text-orange-700", label: "Untuk Pengendara Motor" },
  semua:       { icon: Users,        color: "bg-blue-100 text-blue-700",     label: "Untuk Semua" },
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

  const completedCount = Object.values(progressMap).filter((p) => p.completed).length;

  return (
    <div className="px-4 pt-8 max-w-md mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <BookOpen size={28} className="text-green-600" />
        <h1 className="text-2xl font-bold text-gray-900">Modul Edukasi</h1>
      </div>
      <p className="text-sm text-gray-600 mb-4">
        Etika berbagi jalan untuk pesepeda dan pengendara motor di Bulungan.
      </p>

      {user && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-center gap-3">
          <CheckCircle2 size={24} className="text-green-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-green-800">
              Kamu sudah selesaikan {completedCount} dari {modules?.length || 0} modul
            </p>
            <p className="text-xs text-green-700">
              {completedCount === modules?.length ? "Selamat! Kamu sudah selesaikan semua modul." : "Terus belajar untuk jadi pesepeda yang lebih sadar."}
            </p>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {modules?.map((m) => {
          const aud = AUDIENCE_CONFIG[m.target_audience as keyof typeof AUDIENCE_CONFIG] || AUDIENCE_CONFIG.semua;
          const Icon = aud.icon;
          const progress = progressMap[m.id];
          return (
            <Link
              key={m.id}
              href={`/edukasi/${m.slug}`}
              className="block bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-3 mb-2">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${aud.color}`}>
                  <Icon size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${aud.color}`}>
                      {aud.label}
                    </span>
                    {progress?.completed && (
                      <CheckCircle2 size={14} className="text-green-600" />
                    )}
                  </div>
                  <h2 className="font-semibold text-gray-900 leading-tight">{m.title}</h2>
                </div>
              </div>
              <p className="text-xs text-gray-600 ml-13 pl-13" style={{ paddingLeft: "52px" }}>
                {m.summary}
              </p>
              {progress?.completed && progress.score !== null && (
                <p className="text-xs text-green-700 mt-2 font-medium" style={{ paddingLeft: "52px" }}>
                  ✓ Skor: {progress.score}/3
                </p>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}