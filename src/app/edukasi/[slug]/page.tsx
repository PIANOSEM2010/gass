import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { IkonEdukasi } from "@/components/bug-icons";
import ModuleQuiz from "./quiz";

export default async function ModulePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: module } = await supabase.from("modules").select("*").eq("slug", slug).single();
  if (!module) notFound();

  let existingProgress: { completed: boolean; score: number | null } | null = null;
  if (user) {
    const { data } = await supabase
      .from("module_progress")
      .select("completed, score")
      .eq("user_id", user.id)
      .eq("module_id", module.id)
      .maybeSingle();
    existingProgress = data;
  }

  return (
    <div className="min-h-screen bg-[var(--latar)] pb-8">
      <div className="max-w-md mx-auto px-4 pt-6">
        <Link href="/edukasi" className="inline-flex items-center gap-1 text-sm text-lime-300 font-medium mb-4">
          <ArrowLeft size={16} /> Kembali ke daftar
        </Link>

        <div className="kartu-bug cahaya-sudut p-5 mb-5 muncul">
          <span className="relative inline-flex items-center justify-center w-12 h-12 rounded-xl bg-lime-400/15 text-lime-300 mb-3.5 shadow-[0_0_20px_rgba(180,255,58,.18)]">
            <IkonEdukasi size={24} />
          </span>
          <h1 className="relative display-title text-[22px] text-white leading-tight">{module.title}</h1>
          <p className="relative text-[12.5px] text-slate-400 mt-1.5 leading-relaxed">{module.summary}</p>
          <span className="relative block mt-4 h-[3px] w-16 rounded-sm"
            style={{ background: "repeating-linear-gradient(90deg,#B4FF3A 0 10px,transparent 10px 18px)" }} />
        </div>

        <div className="bg-[var(--kartu)] rounded-2xl p-5 shadow-sm border border-white/5">
          {module.content.split("\n\n").map((para: string, i: number) => (
            <p key={i} className="text-[13.5px] text-slate-300 mb-4 leading-[1.75] whitespace-pre-line last:mb-0">{para}</p>
          ))}
        </div>

        {user ? (
          <ModuleQuiz moduleId={module.id} moduleSlug={module.slug} userId={user.id} existingProgress={existingProgress} />
        ) : (
          <div className="mt-6 bg-amber-400/10 border border-amber-400/25 rounded-2xl p-5 text-center">
            <p className="text-sm text-amber-300 mb-3">Masuk dulu untuk mengerjakan kuis dan menyimpan progres.</p>
            <Link href="/auth/login" className="inline-block bg-gradient-to-r from-lime-400 to-emerald-500 text-slate-950 px-6 py-2.5 rounded-xl display-title text-sm">MASUK</Link>
          </div>
        )}
      </div>
    </div>
  );
}