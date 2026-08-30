"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { buatPerjalananContoh, NAMA_CONTOH } from "@/lib/data-contoh";
import { type TitikEvent } from "@/lib/titik-event";
import { Loader2, Trash2, Plus, AlertTriangle } from "lucide-react";

type EventPilihan = { id: string; nama: string; mulai: string | null; jalur: TitikEvent[] };

export default function PengelolaContoh({
  events, userId, jumlahAda,
}: { events: EventPilihan[]; userId: string; jumlahAda: number }) {
  const router = useRouter();
  const [pilih, setPilih] = useState(events[0]?.id || "");
  const [jumlah, setJumlah] = useState(8);
  const [sibuk, setSibuk] = useState<"" | "buat" | "hapus">("");
  const [pesan, setPesan] = useState("");

  const event = events.find((e) => e.id === pilih);

  async function buat() {
    if (!event || sibuk) return;
    if (event.jalur.length < 2) { setPesan("Event ini belum punya jalur."); return; }
    setSibuk("buat"); setPesan("");
    try {
      const sb = createClient();
      const mulai = event.mulai ? new Date(event.mulai) : new Date();
      const data = buatPerjalananContoh(
        event.jalur, NAMA_CONTOH.slice(0, jumlah), mulai, event.nama,
      );
      const { error } = await sb.from("activities").insert(
        data.map((d) => ({
          user_id: userId,      // pemilik teknis: akun admin, agar aturan akses tetap jalan
          event_id: event.id,
          is_demo: true,
          demo_name: d.demo_name,
          distance_m: d.distance_m,
          duration_s: d.duration_s,
          elevation_gain_m: d.elevation_gain_m,
          path: d.path,
          started_at: d.started_at,
          activity_date: d.activity_date,
          note: d.note,
        })),
      );
      if (error) throw error;
      setPesan(`${data.length} perjalanan contoh dibuat untuk ${event.nama}.`);
      router.refresh();
    } catch (e) {
      setPesan(e instanceof Error ? e.message : "Gagal membuat data contoh.");
    } finally { setSibuk(""); }
  }

  async function hapusSemua() {
    if (sibuk) return;
    setSibuk("hapus"); setPesan("");
    try {
      const sb = createClient();
      const { error } = await sb.from("activities").delete().eq("is_demo", true);
      if (error) throw error;
      setPesan("Seluruh data contoh dihapus.");
      router.refresh();
    } catch (e) {
      setPesan(e instanceof Error ? e.message : "Gagal menghapus data contoh.");
    } finally { setSibuk(""); }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-amber-400/35 bg-amber-400/10 px-4 py-3">
        <p className="text-[12px] text-amber-200 leading-relaxed flex gap-2">
          <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" />
          <span>
            Data ini hanya untuk memperagakan aplikasi. Setiap perjalanan diberi label
            <strong> CONTOH</strong> di seluruh tampilan, tidak dihitung dalam statistik
            pribadi maupun papan peringkat, dan tidak boleh dipakai untuk menyebut jumlah
            pengguna sungguhan.
          </span>
        </p>
      </div>

      <div className="kartu-bug p-4">
        <label className="eyebrow !text-[9px] text-slate-500 block mb-1.5">Event</label>
        <select value={pilih} onChange={(e) => setPilih(e.target.value)}
          className="w-full bg-[var(--isian)] border border-lime-400/15 rounded-xl px-4 py-3 text-sm text-white focus:outline-none">
          {events.length === 0 && <option value="">Belum ada event disetujui</option>}
          {events.map((e) => (
            <option key={e.id} value={e.id}>{e.nama}</option>
          ))}
        </select>

        {event && (
          <p className="text-[11px] text-slate-500 mt-2">
            {event.jalur.length} titik jalur ·{" "}
            {event.mulai
              ? new Date(event.mulai).toLocaleDateString("id-ID", { dateStyle: "medium" })
              : "tanpa waktu"}
          </p>
        )}

        <label className="eyebrow !text-[9px] text-slate-500 block mb-1.5 mt-4">
          Jumlah perjalanan contoh
        </label>
        <div className="flex gap-2">
          {[4, 8, 12].map((n) => (
            <button key={n} onClick={() => setJumlah(n)}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold border-2 ${jumlah === n
                ? "border-lime-400/60 bg-lime-400/10 text-lime-300"
                : "border-white/10 text-slate-400"}`}>
              {n}
            </button>
          ))}
        </div>

        <button onClick={buat} disabled={Boolean(sibuk) || !event}
          className="w-full mt-4 bg-gradient-to-r from-lime-400 to-emerald-500 text-slate-950 py-3.5 rounded-xl display-title text-base flex items-center justify-center gap-2 disabled:opacity-60">
          {sibuk === "buat" ? <Loader2 size={17} className="animate-spin" /> : <Plus size={17} />}
          BUAT DATA CONTOH
        </button>
      </div>

      <div className="kartu-bug p-4">
        <p className="display-title text-[14px] text-white">DATA CONTOH SAAT INI</p>
        <p className="display-num text-[32px] text-lime-300 mt-1">{jumlahAda}</p>
        <p className="text-[11px] text-slate-500 mb-3">perjalanan bertanda contoh</p>
        <button onClick={hapusSemua} disabled={Boolean(sibuk) || jumlahAda === 0}
          className="w-full rounded-xl border border-red-400/35 text-red-300 py-3 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40">
          {sibuk === "hapus" ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
          Hapus seluruh data contoh
        </button>
      </div>

      {pesan && <p className="text-[12px] text-slate-300">{pesan}</p>}
    </div>
  );
}
