import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ModuleQuiz from "./quiz";

export default async function ModulePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: module } = await supabase
    .from("modules")
    .select("*")
    .eq("slug", slug)
    .single();

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
    <div className="px-4 pt-6 pb-8 max-w-md mx-auto">
      <Link
        href="/edukasi"
        className="inline-flex items-center gap-1 text-sm text-green-700 mb-4"
      >
        <ArrowLeft size={16} />
        Kembali ke daftar
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 leading-tight mb-2">{module.title}</h1>
      <p className="text-sm text-gray-600 italic mb-6">{module.summary}</p>

      <div className="bg-white rounded-xl p-5 shadow-sm prose prose-sm max-w-none">
        {module.content.split("\n\n").map((para: string, i: number) => (
          <p key={i} className="text-gray-800 mb-4 leading-relaxed whitespace-pre-line">{para}</p>
        ))}
      </div>

      {user ? (
        <ModuleQuiz
          moduleId={module.id}
          moduleSlug={module.slug}
          userId={user.id}
          existingProgress={existingProgress}
        />
      ) : (
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
          <p className="text-sm text-yellow-800 mb-3">
            Masuk dulu untuk mengerjakan kuis dan menyimpan progres
          </p>
          <Link href="/auth/login" className="inline-block bg-green-600 text-white px-5 py-2 rounded-lg font-medium">
            Masuk
          </Link>
        </div>
      )}
    </div>
  );
}