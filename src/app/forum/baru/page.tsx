"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NewPostPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/auth/login");
      return;
    }
    const { data, error } = await supabase
      .from("forum_posts")
      .insert({ user_id: user.id, title, body })
      .select()
      .single();
    if (error) {
      setError(error.message);
      setSaving(false);
    } else if (data) {
      router.push(`/forum/${data.id}`);
    }
  }

  return (
    <div className="px-4 pt-6 pb-8 max-w-md mx-auto">
      <Link href="/forum" className="inline-flex items-center gap-1 text-sm text-green-700 mb-4">
        <ArrowLeft size={16} />
        Kembali ke forum
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">Tulis Post Baru</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl p-5 shadow-sm space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Judul</label>
          <input
            type="text"
            required
            maxLength={120}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Ceritakan secara singkat..."
          />
          <p className="text-xs text-gray-500 mt-1">{title.length}/120</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Isi</label>
          <textarea
            required
            rows={8}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-y"
            placeholder="Bagikan cerita, pertanyaan, atau ide kamu tentang bersepeda di Bulungan..."
          />
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
          💬 <strong>Etika forum:</strong> Hormati pengguna lain, hindari ujaran kasar, tidak share informasi pribadi orang lain tanpa izin. Post yang melanggar akan dihapus admin.
        </div>

        <button
          type="submit"
          disabled={saving || !title.trim() || !body.trim()}
          className="w-full bg-green-600 text-white py-2.5 rounded-lg font-medium disabled:bg-gray-400"
        >
          {saving ? "Mengirim..." : "Kirim Post"}
        </button>
      </form>
    </div>
  );
}