import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { MapPin, Clock } from "lucide-react";

export default async function RiwayatPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: logs } = await supabase
    .from("sos_logs")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="px-4 pt-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Riwayat SOS</h1>
      <p className="text-sm text-gray-600 mb-6">Daftar tombol darurat yang pernah kamu tekan.</p>
      {(!logs || logs.length === 0) ? (
        <div className="bg-white rounded-xl p-8 text-center text-gray-500">Belum ada riwayat SOS.</div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <div key={log.id} className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                <Clock size={14} />
                {new Date(log.created_at).toLocaleString("id-ID")}
              </div>
              <a href={`https://www.google.com/maps?q=${log.lat},${log.lng}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-green-700 hover:underline">
                <MapPin size={16} />
                {log.lat.toFixed(5)}, {log.lng.toFixed(5)}
              </a>
              <span className="inline-block mt-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{log.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
