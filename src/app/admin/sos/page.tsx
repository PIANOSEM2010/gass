import { createClient } from "@/lib/supabase/server";
import { MapPin, Clock, User } from "lucide-react";

export default async function AdminSosPage() {
  const supabase = await createClient();
  const { data: logs } = await supabase.from("sos_logs").select("*").order("created_at", { ascending: false }).limit(100);
  const userIds = [...new Set(logs?.map((l) => l.user_id) || [])];
  const { data: profiles } = userIds.length > 0 ? await supabase.from("profiles").select("id, full_name, school").in("id", userIds) : { data: [] };
  const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

  return (
    <div className="px-4 pt-6 pb-8">
      <h1 className="display-title text-2xl text-white mb-1">SOS Logs</h1>
      <p className="text-sm text-slate-400 mb-6">Menampilkan {logs?.length || 0} dari maks. 100 SOS terbaru.</p>
      {(!logs || logs.length === 0) ? (
        <div className="bg-[var(--kartu)] rounded-xl p-8 text-center text-slate-400">Belum ada SOS tercatat.</div>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => {
            const profile = profileMap.get(log.user_id);
            return (
              <div key={log.id} className="bg-[var(--kartu)] rounded-xl p-4 shadow-sm border-l-4 border-red-500">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400"><Clock size={12} />{new Date(log.created_at).toLocaleString("id-ID")}</div>
                  <span className="text-xs bg-red-400/15 text-red-300 px-2 py-0.5 rounded-full">{log.status}</span>
                </div>
                <div className="flex items-center gap-2 text-sm font-medium text-white mb-1"><User size={14} />{profile?.full_name || "Anonim"}</div>
                {profile?.school && <p className="text-xs text-slate-400 ml-6 mb-2">{profile.school}</p>}
                <a href={`https://www.google.com/maps?q=${log.lat},${log.lng}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-lime-300 hover:underline"><MapPin size={14} />{log.lat.toFixed(5)}, {log.lng.toFixed(5)}</a>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
