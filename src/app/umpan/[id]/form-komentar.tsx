"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function FormKomentar({ activityId }: { activityId: string }) {
  const router = useRouter();
  const [teks, setTeks] = useState("");
  const [sibuk, setSibuk] = useState(false);
  const [galat, setGalat] = useState("");

  async function kirim(e: React.FormEvent) {
    e.preventDefault();
    const isi = teks.trim();
    if (!isi || sibuk) return;
    setSibuk(true); setGalat("");
    try {
      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) throw new Error("Kamu perlu masuk dulu.");
      const { error } = await sb.from("activity_comments").insert({ activity_id: activityId, user_id: user.id, body: isi });
      if (error) throw error;
      setTeks(""); router.refresh();
    } catch (err) {
      setGalat(err instanceof Error ? err.message : "Gagal mengirim komentar.");
    } finally { setSibuk(false); }
  }

  return (
    <form onSubmit={kirim} className="mt-4">
      <div className="flex gap-2">
        <input value={teks} onChange={(e) => setTeks(e.target.value)} maxLength={500}
          placeholder="Tulis komentar…"
          className="flex-1 bg-[var(--isian)] border border-lime-400/15 rounded-xl px-4 py-3 text-sm placeholder:text-slate-500 focus:outline-none focus:border-lime-400/50" />
        <button type="submit" disabled={sibuk || !teks.trim()}
          className="rounded-xl px-4 bg-gradient-to-r from-lime-400 to-emerald-500 text-slate-950 display-title text-sm disabled:opacity-40">
          Kirim
        </button>
      </div>
      {galat && <p className="text-red-400 text-xs mt-2">{galat}</p>}
    </form>
  );
}
