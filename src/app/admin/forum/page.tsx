import { createClient } from "@/lib/supabase/server";
import ForumModeration from "./forum-moderation";

export default async function AdminForumPage() {
  const supabase = await createClient();
  const { data: posts } = await supabase
    .from("forum_posts")
    .select("*")
    .order("created_at", { ascending: false });

  const userIds = [...new Set(posts?.map((p) => p.user_id) || [])];
  const { data: profiles } = userIds.length > 0
    ? await supabase.from("profiles").select("id, full_name").in("id", userIds)
    : { data: [] };
  const nameMap = new Map(profiles?.map((p) => [p.id, p.full_name]) || []);

  const enriched = posts?.map((p) => ({ ...p, author_name: nameMap.get(p.user_id) || "Anonim" })) || [];

  return (
    <div className="px-4 pt-6 pb-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Moderasi Forum</h1>
      <p className="text-sm text-gray-600 mb-6">Tinjau dan kelola post forum.</p>
      <ForumModeration initialPosts={enriched} />
    </div>
  );
}