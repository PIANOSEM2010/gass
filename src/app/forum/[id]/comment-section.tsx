"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { User, Send, Trash2 } from "lucide-react";
import Link from "next/link";

type Comment = {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  author_name: string;
};

export default function CommentSection({
  postId,
  userId,
  initialComments,
}: {
  postId: string;
  userId: string | null;
  initialComments: Comment[];
}) {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || !text.trim()) return;
    setSaving(true);
    const supabase = createClient();

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .single();

    const { data, error } = await supabase
      .from("forum_comments")
      .insert({ post_id: postId, user_id: userId, body: text.trim() })
      .select()
      .single();

    if (!error && data) {
      setComments([...comments, { ...data, author_name: profile?.full_name || "Anonim" }]);
      setText("");
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus komentar ini?")) return;
    const supabase = createClient();
    const { error } = await supabase.from("forum_comments").delete().eq("id", id);
    if (!error) setComments(comments.filter((c) => c.id !== id));
  }

  return (
    <div className="mt-6">
      <h2 className="font-semibold text-white mb-3">
        Komentar ({comments.length})
      </h2>

      <div className="space-y-3 mb-4">
        {comments.length === 0 ? (
          <p className="text-sm text-slate-400 italic">Belum ada komentar. Jadilah yang pertama!</p>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="bg-[var(--kartu)] rounded-xl p-4 shadow-sm">
              <div className="flex items-start justify-between mb-1">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <User size={12} />
                  <span className="font-medium text-slate-200">{c.author_name}</span>
                  <span>•</span>
                  <span>{new Date(c.created_at).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                {userId === c.user_id && (
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="text-slate-500 hover:text-red-600"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              <p className="text-sm text-slate-100 leading-relaxed whitespace-pre-wrap">{c.body}</p>
            </div>
          ))
        )}
      </div>

      {userId ? (
        <form onSubmit={handleSubmit} className="bg-[var(--kartu)] rounded-xl p-3 shadow-sm">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Tulis komentarmu..."
            rows={2}
            className="w-full px-3 py-2 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-none text-sm"
          />
          <div className="flex justify-end mt-2">
            <button
              type="submit"
              disabled={!text.trim() || saving}
              className="bg-green-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium disabled:bg-white/15 flex items-center gap-1"
            >
              <Send size={14} />
              {saving ? "Mengirim..." : "Kirim"}
            </button>
          </div>
        </form>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-sm text-yellow-800 text-center">
          <Link href="/auth/login" className="font-medium underline">Masuk</Link>{" "}
          untuk memberi komentar.
        </div>
      )}
    </div>
  );
}