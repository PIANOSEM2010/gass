"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Eye, EyeOff, Trash2, User } from "lucide-react";

type Post = {
  id: string;
  title: string;
  body: string;
  approved: boolean;
  created_at: string;
  user_id: string;
  author_name: string;
};

export default function ForumModeration({ initialPosts }: { initialPosts: Post[] }) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const supabase = createClient();

  async function toggleApprove(id: string, current: boolean) {
    const { error } = await supabase.from("forum_posts").update({ approved: !current }).eq("id", id);
    if (!error) setPosts(posts.map((p) => (p.id === id ? { ...p, approved: !current } : p)));
  }

  async function remove(id: string) {
    if (!confirm("Hapus post permanen?")) return;
    const { error } = await supabase.from("forum_posts").delete().eq("id", id);
    if (!error) setPosts(posts.filter((p) => p.id !== id));
  }

  if (posts.length === 0) {
    return <div className="bg-white rounded-xl p-8 text-center text-gray-500">Belum ada post.</div>;
  }

  return (
    <div className="space-y-3">
      {posts.map((p) => (
        <div key={p.id} className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            {p.approved ? (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✓ Tampil</span>
            ) : (
              <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">⊘ Tersembunyi</span>
            )}
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">{p.title}</h3>
          <p className="text-sm text-gray-600 line-clamp-2 mb-2">{p.body}</p>
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
            <User size={12} />
            <span>{p.author_name}</span>
            <span>•</span>
            <span>{new Date(p.created_at).toLocaleString("id-ID")}</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => toggleApprove(p.id, p.approved)}
              className="flex-1 bg-white border border-gray-300 text-gray-700 py-1.5 rounded-lg text-sm font-medium flex items-center justify-center gap-1"
            >
              {p.approved ? <><EyeOff size={14} /> Sembunyikan</> : <><Eye size={14} /> Tampilkan</>}
            </button>
            <button onClick={() => remove(p.id)} className="px-3 bg-white border border-red-300 text-red-600 py-1.5 rounded-lg">
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}