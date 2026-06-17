import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { MessageSquare, Plus, User } from "lucide-react";
import SosActiveSection from "./sos-active-section";

export default async function ForumPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: posts } = await supabase
    .from("forum_posts")
    .select("id, title, body, created_at, user_id")
    .eq("approved", true)
    .order("created_at", { ascending: false })
    .limit(50);

  const userIds = [...new Set(posts?.map((p) => p.user_id) || [])];
  const { data: profiles } = userIds.length > 0
    ? await supabase.from("profiles").select("id, full_name").in("id", userIds)
    : { data: [] };
  const nameMap = new Map(profiles?.map((p) => [p.id, p.full_name]) || []);

  const postIds = posts?.map((p) => p.id) || [];
  const { data: commentCounts } = postIds.length > 0
    ? await supabase.from("forum_comments").select("post_id").in("post_id", postIds)
    : { data: [] };
  const countMap = new Map<string, number>();
  commentCounts?.forEach((c) => {
    countMap.set(c.post_id, (countMap.get(c.post_id) || 0) + 1);
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white pb-8">
      <div className="max-w-md mx-auto px-4 pt-6">
        {/* Header gradient */}
        <div className="bg-gradient-to-br from-violet-600 to-purple-700 text-white rounded-3xl p-5 shadow-lg mb-5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0"><MessageSquare size={24} /></div>
              <div className="min-w-0">
                <h1 className="text-xl font-extrabold leading-none">Forum</h1>
                <p className="text-xs opacity-90 mt-1">Cerita & diskusi pesepeda Bulungan</p>
              </div>
            </div>
            {user && (
              <Link href="/forum/baru" className="bg-white text-purple-700 px-3 py-2 rounded-xl text-sm font-bold flex items-center gap-1 flex-shrink-0 shadow-sm active:scale-95 transition-transform">
                <Plus size={16} /> Tulis
              </Link>
            )}
          </div>
        </div>

        <SosActiveSection />

        {!user && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4 text-sm">
            <Link href="/auth/login" className="text-green-700 font-bold">Masuk</Link>{" "}
            <span className="text-amber-800">untuk membuat post atau memberi komentar.</span>
          </div>
        )}

        {!posts || posts.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center text-gray-400 shadow-sm">
            <MessageSquare size={40} className="mx-auto mb-3 opacity-40" />
            Belum ada post di forum. Jadilah yang pertama!
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/forum/${post.id}`}
                className="block bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all active:scale-[0.99] border border-gray-100"
              >
                <h2 className="font-bold text-gray-900 mb-1 leading-tight">{post.title}</h2>
                <p className="text-sm text-gray-600 line-clamp-2 mb-3">{post.body}</p>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0"><User size={12} /></span>
                    <span className="font-medium">{nameMap.get(post.user_id) || "Anonim"}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1"><MessageSquare size={12} /> {countMap.get(post.id) || 0}</span>
                    <span>{new Date(post.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}