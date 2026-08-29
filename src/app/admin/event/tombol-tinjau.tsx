"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Check, X, Loader2 } from "lucide-react";

export default function TombolTinjau({ id }: { id: string }) {
  const router = useRouter();
  const [sibuk, setSibuk] = useState<"" | "setuju" | "tolak">("");
  const [alasan, setAlasan] = useState("");
  const [tanyaTolak, setTanyaTolak] = useState(false);
  const [galat, setGalat] = useState("");

  async function tinjau(status: "disetujui" | "ditolak") {
    if (sibuk) return;
    setSibuk(status === "disetujui" ? "setuju" : "tolak");
    setGalat("");
    try {
      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();
      const { error } = await sb.from("events").update({
        status,
        alasan_tolak: status === "ditolak" ? (alasan.trim() || null) : null,
        reviewed_by: user?.id ?? null,
        reviewed_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
      router.refresh();
    } catch (e) {
      setGalat(e instanceof Error ? e.message : "Gagal memperbarui status.");
    } finally { setSibuk(""); }
  }

  return (
    <div className="mt-2.5">
      {!tanyaTolak ? (
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => tinjau("disetujui")} disabled={Boolean(sibuk)}
            className="rounded-lg bg-gradient-to-r from-lime-400 to-emerald-500 text-slate-950 py-2.5 display-title text-[13px] flex items-center justify-center gap-1.5 disabled:opacity-60">
            {sibuk === "setuju" ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Setujui
          </button>
          <button onClick={() => setTanyaTolak(true)} disabled={Boolean(sibuk)}
            className="rounded-lg border border-red-400/35 text-red-300 py-2.5 display-title text-[13px] flex items-center justify-center gap-1.5">
            <X size={14} /> Tolak
          </button>
        </div>
      ) : (
        <div className="rounded-lg border border-red-400/25 bg-red-500/8 p-3">
          <label className="eyebrow !text-[9px] text-slate-500 block mb-1.5">Alasan penolakan</label>
          <input value={alasan} onChange={(e) => setAlasan(e.target.value)} maxLength={200}
            placeholder="Jalur melewati zona rawan tanpa pengalihan"
            className="w-full bg-[var(--isian)] border border-white/12 rounded-lg px-3 py-2 text-[12px] text-white placeholder:text-slate-600 focus:outline-none" />
          <div className="grid grid-cols-2 gap-2 mt-2">
            <button onClick={() => { setTanyaTolak(false); setAlasan(""); }}
              className="rounded-lg border border-white/12 text-slate-300 py-2 text-[12px]">Batal</button>
            <button onClick={() => tinjau("ditolak")} disabled={Boolean(sibuk)}
              className="rounded-lg bg-red-600 text-white py-2 text-[12px] font-semibold disabled:opacity-60 teks-terang">
              {sibuk === "tolak" ? "Menolak…" : "Kirim penolakan"}
            </button>
          </div>
        </div>
      )}
      {galat && <p className="text-[11px] text-red-400 mt-1.5">{galat}</p>}
    </div>
  );
}
