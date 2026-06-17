import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BookOpen } from "lucide-react";
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
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white pb-8">
      <div className="max-w-md mx-auto px-4 pt-6">
        <Link href="/edukasi" className="inline-flex items-center gap-1 text-sm text-green-700 font-medium mb-4">
          <ArrowLeft size={16} /> Kembali ke daftar
        </Link>

        <div className="bg-gradient-to-br from-green-600 to-emerald-700 text-white rounded-3xl p-5 shadow-lg mb-5">
          <BookOpen size={28} className="mb-3 opacity-90" />
          <h1 className="text-2xl font-extrabold leading-tight">{module.title}</h1>
          <p className="text-sm opacity-90 italic mt-1">{module.summary}</p>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          {module.content.split("\n\n").map((para: string, i: number) => (
            <p key={i} className="text-gray-800 mb-4 leading-relaxed whitespace-pre-line last:mb-0">{para}</p>
          ))}
        </div>

        {user ? (
          <ModuleQuiz moduleId={module.id} moduleSlug={module.slug} userId={user.id} existingProgress={existingProgress} />
        ) : (
          <div className="mt-6 bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center">
            <p className="text-sm text-amber-800 mb-3">Masuk dulu untuk mengerjakan kuis dan menyimpan progres.</p>
            <Link href="/auth/login" className="inline-block bg-green-600 text-white px-5 py-2 rounded-lg font-medium">Masuk</Link>
          </div>
        )}
      </div>
    </div>
  );
}