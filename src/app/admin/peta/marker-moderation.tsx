"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Check, X, MapPin, Trash2 } from "lucide-react";

type Marker = {
  id: string;
  type: string;
  lat: number;
  lng: number;
  title: string;
  description: string | null;
  approved: boolean;
  created_at: string;
  author_name: string;
};

const TYPE_LABEL: Record<string, { label: string; color: string }> = {
  safe:    { label: "Aman",    color: "bg-green-100 text-green-700"  },
  danger:  { label: "Bahaya",  color: "bg-red-100 text-red-700"      },
  parking: { label: "Parkir",  color: "bg-blue-100 text-blue-700"    },
  rest:    { label: "Istirahat", color: "bg-yellow-100 text-yellow-700" },
};

export default function MarkerModeration({ initialMarkers }: { initialMarkers: Marker[] }) {
  const [markers, setMarkers] = useState<Marker[]>(initialMarkers);
  const [filter, setFilter] = useState<"pending" | "approved" | "all">("pending");
  const supabase = createClient();

  async function approve(id: string) {
    const { error } = await supabase.from("road_markers").update({ approved: true }).eq("id", id);
    if (!error) setMarkers(markers.map((m) => (m.id === id ? { ...m, approved: true } : m)));
  }

  async function unapprove(id: string) {
    const { error } = await supabase.from("road_markers").update({ approved: false }).eq("id", id);
    if (!error) setMarkers(markers.map((m) => (m.id === id ? { ...m, approved: false } : m)));
  }

  async function remove(id: string) {
    if (!confirm("Hapus laporan ini permanen?")) return;
    const { error } = await supabase.from("road_markers").delete().eq("id", id);
    if (!error) setMarkers(markers.filter((m) => m.id !== id));
  }

  const filtered = markers.filter((m) => {
    if (filter === "pending") return !m.approved;
    if (filter === "approved") return m.approved;
    return true;
  });
  const pendingCount = markers.filter((m) => !m.approved).length;

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <button onClick={() => setFilter("pending")} className={`px-3 py-1.5 rounded-full text-xs font-medium ${filter === "pending" ? "bg-yellow-500 text-white" : "bg-white text-gray-700 border border-gray-300"}`}>Pending ({pendingCount})</button>
        <button onClick={() => setFilter("approved")} className={`px-3 py-1.5 rounded-full text-xs font-medium ${filter === "approved" ? "bg-green-600 text-white" : "bg-white text-gray-700 border border-gray-300"}`}>Disetujui ({markers.length - pendingCount})</button>
        <button onClick={() => setFilter("all")} className={`px-3 py-1.5 rounded-full text-xs font-medium ${filter === "all" ? "bg-gray-900 text-white" : "bg-white text-gray-700 border border-gray-300"}`}>Semua ({markers.length})</button>
      </div>
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center text-gray-500">Tidak ada data.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((m) => {
            const typeCfg = TYPE_LABEL[m.type] || { label: m.type, color: "bg-gray-100 text-gray-700" };
            return (
              <div key={m.id} className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${typeCfg.color}`}>{typeCfg.label}</span>
                  {m.approved ? (<span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Aktif</span>) : (<span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Pending</span>)}
                </div>
                <h3 className="font-semibold text-gray-900">{m.title}</h3>
                {m.description && <p className="text-sm text-gray-600 mt-1">{m.description}</p>}
                <div className="flex items-center gap-2 text-xs text-gray-500 mt-2 mb-3">
                  <MapPin size={12} />
                  <a href={`https://www.google.com/maps?q=${m.lat},${m.lng}`} target="_blank" rel="noopener noreferrer" className="text-green-700 hover:underline">{m.lat.toFixed(5)}, {m.lng.toFixed(5)}</a>
                  <span></span>
                  <span>{m.author_name}</span>
                </div>
                <div className="flex gap-2">
                  {!m.approved ? (
                    <button onClick={() => approve(m.id)} className="flex-1 bg-green-600 text-white py-1.5 rounded-lg text-sm font-medium flex items-center justify-center gap-1"><Check size={14} /> Setujui</button>
                  ) : (
                    <button onClick={() => unapprove(m.id)} className="flex-1 bg-yellow-500 text-white py-1.5 rounded-lg text-sm font-medium flex items-center justify-center gap-1"><X size={14} /> Sembunyikan</button>
                  )}
                  <button onClick={() => remove(m.id)} className="px-3 bg-white border border-red-300 text-red-600 py-1.5 rounded-lg"><Trash2 size={14} /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
