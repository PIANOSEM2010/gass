import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { CheckCircle2, Users, Bike, ShieldCheck, ChevronRight } from "lucide-react";
import KepalaHalaman from "@/components/kepala-halaman";
import { IkonEdukasi } from "@/components/bug-icons";

const AUDIENCE_CONFIG = {
  pesepeda:   { icon: Bike,        grad: "from-green-500 to-emerald-600", badge: "bg-lime-400/15 text-lime-300",   label: "Untuk Pesepeda" },
  pengendara: { icon: ShieldCheck, grad: "from-orange-500 to-amber-500",  badge: "bg-orange-400/15 text-orange-300", label: "Untuk Pengendara Motor" },
  semua:      { icon: Users,       grad: "from-blue-500 to-cyan-500",     badge: "bg-sky-400/15 text-sky-300",     label: "Untuk Semua" },
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
    <div className="min-h-screen bg-[var(--latar)] pb-8">
      <KepalaHalaman
        ikon={<IkonEdukasi size={22} />}
        judul="MODUL EDUKASI"
        keterangan="Etika berbagi jalan untuk pesepeda & pengendara di Bulungan"
        anak={user ? (
          <div className="mt-5">
            <div className="flex justify-between items-end mb-2">
              <span className="eyebrow !text-[9px] text-slate-500">Kemajuan belajar</span>
              <span className="display-num text-lg leading-none text-white">
                {completedCount}<span className="text-slate-500 text-sm">/{total}</span>
              </span>
            </div>
            <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-lime-400 to-emerald-500 rounded-full"
                style={{ width: `${pct}%`, transition: "width .5s cubic-bezier(.22,1,.36,1)" }} />
            </div>
            {completedCount === total && total > 0 && (
              <p className="text-[11px] mt-2 text-lime-300 flex items-center gap-1.5">
                <CheckCircle2 size={13} /> Semua modul selesai.
              </p>
            )}
          </div>
        ) : undefined}
      />

      <div className="max-w-md mx-auto px-4 pt-5">
        {/* Daftar modul */}
        {/* Ditata per sasaran pembaca: pesepeda, pengendara, lalu keduanya.
            Sebelumnya semua modul berbaris tanpa pengelompokan sehingga
            pembaca tidak tahu mana yang ditujukan untuk dirinya. */}
        <div className="space-y-3 jenjang">
          {(!modules || modules.length === 0) && (
            <div className="rounded-2xl border border-lime-400/12 bg-[var(--kartu)] p-8 text-center">
              <p className="display-title text-lime-300">MODUL BELUM TERSEDIA</p>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Materi edukasi sedang disiapkan. Sementara itu, kamu bisa melihat peta jalur aman atau mulai mencatat gowes.
              </p>
            </div>
          )}
          {(["pesepeda", "pengendara", "semua"] as const).map((sasaran) => {
            const isi = (modules || []).filter((m) =>
              sasaran === "semua"
                ? !["pesepeda", "pengendara"].includes(String(m.target_audience))
                : String(m.target_audience) === sasaran);
            if (isi.length === 0) return null;
            const judulKelompok = sasaran === "pesepeda" ? "Untuk pesepeda"
              : sasaran === "pengendara" ? "Untuk pengendara bermotor" : "Untuk semua pengguna jalan";
            return (
              <section key={sasaran} className="pt-1">
                <div className="flex items-center gap-2.5 mb-2.5">
                  <span className="h-[3px] w-6 rounded-sm flex-shrink-0"
                    style={{ background: "repeating-linear-gradient(90deg,#B4FF3A 0 7px,transparent 7px 12px)" }} />
                  <p className="eyebrow !text-[9px] text-lime-400/80">{judulKelompok}</p>
                  <span className="text-[10px] text-slate-600">{isi.length} modul</span>
                </div>
                <div className="space-y-3">
          {isi.map((m) => {
            const aud = AUDIENCE_CONFIG[m.target_audience as keyof typeof AUDIENCE_CONFIG] || AUDIENCE_CONFIG.semua;
            const Icon = aud.icon;
            const progress = progressMap[m.id];
            return (
              <Link
                key={m.id}
                href={`/edukasi/${m.slug}`}
                className="block bg-[var(--kartu)] rounded-2xl p-4 shadow-sm hover:shadow-md transition-all active:scale-[0.99] border border-white/5"
              >
                <div className="flex items-start gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br ${aud.grad} text-white shadow-sm`}>
                    <Icon size={22} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${aud.badge}`}>{aud.label}</span>
                      {progress?.completed && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-lime-400 text-slate-950 font-semibold flex items-center gap-1">
                          <CheckCircle2 size={11} /> Selesai
                        </span>
                      )}
                    </div>
                    <h2 className="display-title text-[15px] text-white leading-tight">{m.title}</h2>
                    <p className="text-xs text-slate-400 mt-1">{m.summary}</p>
                    {progress?.completed && progress.score !== null && (
                      <p className="text-xs text-lime-300 mt-2 font-semibold">Skor: {progress.score}/3</p>
                    )}
                  </div>
                  <ChevronRight className="text-slate-600 flex-shrink-0 mt-1" size={18} />
                </div>
              </Link>
            );
          })}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}