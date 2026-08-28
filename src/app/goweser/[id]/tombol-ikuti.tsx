"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2, UserPlus, UserCheck } from "lucide-react";

export default function TombolIkuti({ targetId, awalnyaIkut }: { targetId: string; awalnyaIkut: boolean }) {
  const router = useRouter();
  const [ikut, setIkut] = useState(awalnyaIkut);
  const [sibuk, setSibuk] = useState(false);

  async function tekan() {
    if (sibuk) return;
    setSibuk(true);
    const berikutnya = !ikut;
    setIkut(berikutnya);
    try {
      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) throw new Error("belum masuk");
      if (berikutnya) await sb.from("follows").insert({ follower_id: user.id, followee_id: targetId });
      else await sb.from("follows").delete().eq("follower_id", user.id).eq("followee_id", targetId);
      router.refresh();
    } catch {
      // Kembalikan tampilan bila gagal, supaya tombolnya tidak berbohong.
      setIkut(!berikutnya);
    } finally { setSibuk(false); }
  }

  return (
    <button onClick={tekan} disabled={sibuk}
      className={`rounded-full px-4 py-2 display-title text-[11px] flex items-center gap-1.5 flex-shrink-0 transition-colors ${ikut
        ? "border border-white/15 text-slate-300"
        : "bg-gradient-to-r from-lime-400 to-emerald-500 text-slate-950"}`}>
      {sibuk ? <Loader2 size={13} className="animate-spin" /> : ikut ? <UserCheck size={13} /> : <UserPlus size={13} />}
      {ikut ? "DIIKUTI" : "IKUTI"}
    </button>
  );
}
