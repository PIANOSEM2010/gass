"use client";
import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Loader2, MapPin, X, CheckCircle2, MessageSquareText } from "lucide-react";

type Report = {
  id: string; category: string; description: string;
  lat: number; lng: number; photo_url: string | null; status: string;
  admin_note: string | null; created_at: string | null;
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
const STATUS_BADGE: Record<string, string> = {
  dilaporkan: "bg-amber-100 text-amber-700", diverifikasi: "bg-blue-100 text-blue-700",
  diteruskan: "bg-violet-100 text-violet-700", ditangani: "bg-green-100 text-green-700",
};

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Makassar" }).format(new Date(iso));
  } catch { return ""; }
}

export default function InfraAdminClient({ reports: initial }: { reports: Report[] }) {
  const [reports, setReports] = useState<Report[]>(initial);
  const [selected, setSelected] = useState<Report | null>(null);
  // Draft di dalam modal: status & catatan yang sedang diedit admin
  const [draftStatus, setDraftStatus] = useState("");
  const [draftNote, setDraftNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  function openDetail(r: Report) {
    setSelected(r);
    setDraftStatus(r.status);
    setDraftNote(r.admin_note || "");
    setSaveMsg("");
  }

  async function save() {
    if (!selected) return;
    setSaving(true);
    setSaveMsg("");
    const supabase = createClient();
    const { error } = await supabase
      .from("infra_reports")
      .update({ status: draftStatus, admin_note: draftNote.trim() || null })
      .eq("id", selected.id);
    setSaving(false);
    if (error) {
      setSaveMsg("Gagal menyimpan: " + error.message);
      return;
    }
    setReports((rs) => rs.map((r) => (r.id === selected.id ? { ...r, status: draftStatus, admin_note: draftNote.trim() || null } : r)));
    setSelected((s) => (s ? { ...s, status: draftStatus, admin_note: draftNote.trim() || null } : s));
    setSaveMsg("Tersimpan. Pelapor bisa melihat status & catatan ini.");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-4 pt-6 pb-10 max-w-2xl mx-auto">
        <Link href="/admin" className="inline-flex items-center gap-1 text-sm text-gray-600 mb-4"><ArrowLeft size={16} /> Admin</Link>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Laporan Infrastruktur</h1>
        <p className="text-sm text-gray-500 mb-5">{reports.length} laporan. Klik laporan untuk melihat detail & menindaklanjuti.</p>

        {reports.length === 0 ? (
          <p className="text-center text-gray-400 py-16 text-sm">Belum ada laporan masuk.</p>
        ) : (
          <div className="space-y-3">
            {reports.map((r) => (
              <button
                key={r.id}
                onClick={() => openDetail(r)}
                className="w-full text-left bg-white rounded-2xl border border-gray-100 shadow-sm p-3 hover:shadow-md hover:border-gray-200 active:scale-[0.995] transition"
              >
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
                    {r.description ? (
                      <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{r.description}</p>
                    ) : (
                      <p className="text-xs text-gray-400 italic mt-0.5">Tanpa keterangan</p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_BADGE[r.status] || "bg-gray-100 text-gray-600"}`}>
                        {FLOW.find((f) => f.key === r.status)?.label || r.status}
                      </span>
                      {r.admin_note && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-gray-500">
                          <MessageSquareText size={11} /> Ada catatan admin
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Modal detail laporan */}
      {selected && (
        <div className="fixed inset-0 z-[3000] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSelected(null)} />
          <div className="relative bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
              <p className="font-bold text-gray-900">{CAT_LABEL[selected.category] || "Laporan"}</p>
              <button onClick={() => setSelected(null)} className="p-1.5 rounded-full hover:bg-gray-100" aria-label="Tutup">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Foto besar dari pelapor */}
              {selected.photo_url ? (
                <a href={selected.photo_url} target="_blank" rel="noopener noreferrer" title="Buka foto ukuran penuh">
                  <img src={selected.photo_url} alt={selected.category} className="w-full max-h-80 object-contain bg-gray-950 rounded-xl" />
                </a>
              ) : (
                <div className="w-full h-32 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 text-sm">Pelapor tidak menyertakan foto</div>
              )}

              {/* Penjelasan pelapor */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Penjelasan pelapor</p>
                {selected.description ? (
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{selected.description}</p>
                ) : (
                  <p className="text-sm text-gray-400 italic">Tanpa keterangan</p>
                )}
                <p className="text-[11px] text-gray-400 mt-1">Dilaporkan {fmtDate(selected.created_at)}</p>
                <a href={`https://www.google.com/maps?q=${selected.lat},${selected.lng}`} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-600 mt-1">
                  <MapPin size={12} /> {selected.lat.toFixed(5)}, {selected.lng.toFixed(5)} — buka di Google Maps
                </a>
              </div>

              {/* Ubah status */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Status penanganan</p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {FLOW.map((f) => {
                    const active = draftStatus === f.key;
                    return (
                      <button key={f.key} onClick={() => setDraftStatus(f.key)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${active ? `${STATUS_CLS[f.key]} text-white` : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                        {f.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Catatan perkembangan dari admin */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Catatan perkembangan (terlihat oleh pelapor)</p>
                <textarea
                  value={draftNote}
                  onChange={(e) => setDraftNote(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="Contoh: Sudah dicek di lokasi, laporan valid. Diteruskan ke Dinas PUPR, perkiraan perbaikan minggu depan."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {saveMsg && (
                <p className={`text-xs flex items-center gap-1.5 ${saveMsg.startsWith("Gagal") ? "text-red-600" : "text-green-700"}`}>
                  {!saveMsg.startsWith("Gagal") && <CheckCircle2 size={14} />} {saveMsg}
                </p>
              )}

              <button
                onClick={save}
                disabled={saving}
                className="w-full bg-gray-900 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:bg-gray-400"
              >
                {saving ? <><Loader2 size={18} className="animate-spin" /> Menyimpan...</> : "Simpan Status & Catatan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
