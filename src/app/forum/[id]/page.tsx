import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, User } from "lucide-react";
import CommentSection from "./comment-section";

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: post } = await supabase
    .from("forum_posts")
    .select("*")
    .eq("id", id)
    .single();

  if (!post) notFound();

  const { data: authorProfile } = await supabase
    .from("profiles")
    .select("full_name, school")
    .eq("id", post.user_id)
    .single();

  const { data: comments } = await supabase
    .from("forum_comments")
    .select("*")
    .eq("post_id", id)
    .order("created_at", { ascending: true });

  const commentUserIds = [...new Set(comments?.map((c) => c.user_id) || [])];
  const { data: commentProfiles } = commentUserIds.length > 0
    ? await supabase.from("profiles").select("id, full_name").in("id", commentUserIds)
    : { data: [] };
  const nameMap = new Map(commentProfiles?.map((p) => [p.id, p.full_name]) || []);

  return (
    <div className="px-4 pt-6 pb-8 max-w-md mx-auto">
      <Link href="/forum" className="inline-flex items-center gap-1 text-sm text-green-700 mb-4">
        <ArrowLeft size={16} />
        Kembali
      </Link>

      <article className="bg-white rounded-xl p-5 shadow-sm">
        <h1 className="text-xl font-bold text-gray-900 mb-2 leading-tight">{post.title}</h1>
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-4 pb-4 border-b border-gray-100">
          <User size={12} />
          <span>{authorProfile?.full_name || "Anonim"}</span>
          {authorProfile?.school && <span>• {authorProfile.school}</span>}
          <span>• {new Date(post.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</span>
        </div>
        {post.image_url && (
          <img src={post.image_url} alt="Kartu gowes" className="w-full rounded-xl border border-gray-100 mb-4" />
        )}
        <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">{post.body}</p>
      </article>

      <CommentSection
        postId={post.id}
        userId={user?.id || null}
        initialComments={comments?.map((c) => ({ ...c, author_name: nameMap.get(c.user_id) || "Anonim" })) || []}
      />
    </div>
  );
}