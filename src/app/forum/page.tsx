import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { MessageSquare, Plus, User } from "lucide-react";

export default async function ForumPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: posts } = await supabase
    .from("forum_posts")
    .select("id, title, body, created_at, user_id")
    .eq("approved", true)
    .order("created_at", { ascending: false })
    .limit(50);

  // Get author names
  const userIds = [...new Set(posts?.map((p) => p.user_id) || [])];
  const { data: profiles } = userIds.length > 0
    ? await supabase.from("profiles").select("id, full_name").in("id", userIds)
    : { data: [] };
  const nameMap = new Map(profiles?.map((p) => [p.id, p.full_name]) || []);

  // Comment counts
  const postIds = posts?.map((p) => p.id) || [];
  const { data: commentCounts } = postIds.length > 0
    ? await supabase.from("forum_comments").select("post_id").in("post_id", postIds)
    : { data: [] };
  const countMap = new Map<string, number>();
  commentCounts?.forEach((c) => {
    countMap.set(c.post_id, (countMap.get(c.post_id) || 0) + 1);
  });

  return (
    <div className="px-4 pt-8 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <MessageSquare size={26} className="text-green-600" />
          <h1 className="text-2xl font-bold text-gray-900">Forum</h1>
        </div>
        {user && (
          <Link
            href="/forum/baru"
            className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1"
          >
            <Plus size={16} />
            Tulis
          </Link>
        )}
      </div>
      <p className="text-sm text-gray-600 mb-6">
        Cerita, pertanyaan, dan laporan dari pelajar pesepeda Bulungan.
      </p>

      {!user && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4 text-sm">
          <Link href="/auth/login" className="text-green-700 font-medium">Masuk</Link>{" "}
          <span className="text-yellow-800">untuk membuat post atau memberi komentar.</span>
        </div>
      )}

      {(!posts || posts.length === 0) ? (
        <div className="bg-white rounded-xl p-8 text-center text-gray-500">
          Belum ada post di forum. Jadilah yang pertama!
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/forum/${post.id}`}
              className="block bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <h2 className="font-semibold text-gray-900 mb-1 leading-tight">{post.title}</h2>
              <p className="text-sm text-gray-600 line-clamp-2 mb-3">{post.body}</p>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <User size={12} />
                  <span>{nameMap.get(post.user_id) || "Anonim"}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <MessageSquare size={12} />
                    {countMap.get(post.id) || 0}
                  </span>
                  <span>
                    {new Date(post.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}