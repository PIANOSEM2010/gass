"use client";
import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Loader2, MapPin } from "lucide-react";

type Report = {
  id: string; category: string; description: string;
  lat: number; lng: number; photo_url: string | null; status: string; created_at: string | null;
};

const CAT_LABEL: Record<string, string> = {
  lubang: "Jalan Berlubang", lampu: "Lampu Mati", marka: "Marka Pudar",
  rambu: "Rambu Rusak", genangan: "Genangan Air", lainnya: "Lainnya",
};
const FLOW: { key: string; label: string }[] = [
  { key: "dilaporkan", label: "Dilaporkan" },
  { key: "diverifikasi", label: "Diverifikasi" },
  { key: "diteruskan", label: "Diteruskan" },
  { key: "ditangani", label: "Ditangani" },
];
const STATUS_CLS: Record<string, string> = {
  dilaporkan: "bg-amber-500", diverifikasi: "bg-blue-600", diteruskan: "bg-violet-600", ditangani: "bg-green-600",
};

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Makassar" }).format(new Date(iso));
  } catch { return ""; }
}

export default function InfraAdminClient({ reports: initial }: { reports: Report[] }) {
  const [reports, setReports] = useState<Report[]>(initial);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function setStatus(id: string, status: string) {
    setSavingId(id);
    const supabase = createClient();
    const { error } = await supabase.from("infra_reports").update({ status }).eq("id", id);
    if (!error) setReports((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)));
    setSavingId(null);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-4 pt-6 pb-10 max-w-2xl mx-auto">
        <Link href="/admin" className="inline-flex items-center gap-1 text-sm text-gray-600 mb-4"><ArrowLeft size={16} /> Admin</Link>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Laporan Infrastruktur</h1>
        <p className="text-sm text-gray-500 mb-5">{reports.length} laporan. Ubah status untuk menindaklanjuti.</p>

        {reports.length === 0 ? (
          <p className="text-center text-gray-400 py-16 text-sm">Belum ada laporan masuk.</p>
        ) : (
          <div className="space-y-3">
            {reports.map((r) => (
              <div key={r.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3">
                <div className="flex gap-3">
                  {r.photo_url ? (
                    <img src={r.photo_url} alt={r.category} className="w-20 h-20 rounded-xl object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 text-xs flex-shrink-0">Tanpa foto</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-gray-900">{CAT_LABEL[r.category] || "Laporan"}</p>
                      <span className="text-[10px] text-gray-400 flex-shrink-0">{fmtDate(r.created_at)}</span>
                    </div>
                    {r.description ? <p className="text-xs text-gray-600 mt-0.5">{r.description}</p> : <p className="text-xs text-gray-400 italic mt-0.5">Tanpa keterangan</p>}
                    <a href={`https://www.google.com/maps?q=${r.lat},${r.lng}`} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-blue-600 mt-1">
                      <MapPin size={12} /> {r.lat.toFixed(5)}, {r.lng.toFixed(5)}
                    </a>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                  {savingId === r.id && <Loader2 size={14} className="animate-spin text-gray-400" />}
                  {FLOW.map((f) => {
                    const active = r.status === f.key;
                    return (
                      <button key={f.key} onClick={() => setStatus(r.id, f.key)} disabled={savingId === r.id}
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full transition-colors ${active ? `${STATUS_CLS[f.key]} text-white` : "bg-gray-100 text-gray-600"}`}>
                        {f.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}