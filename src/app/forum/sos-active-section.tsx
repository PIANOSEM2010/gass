"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Siren, MapPin, Clock, User } from "lucide-react";
import SosChatBox from "./sos-chat-box";

type SosActive = {
  id: string;
  user_id: string;
  lat: number;
  lng: number;
  created_at: string;
  author_name?: string;
};

export default function SosActiveSection() {
  const [sosList, setSosList] = useState<SosActive[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;

    async function loadActive() {
      // Ambil SOS dalam 1 jam terakhir
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data: logs } = await supabase
        .from("sos_logs")
        .select("id, user_id, lat, lng, created_at")
        .gte("created_at", oneHourAgo)
        .order("created_at", { ascending: false });

      if (!mounted || !logs) return;

      // Enrich dengan nama pelapor
      const userIds = [...new Set(logs.map((l) => l.user_id))];
      const { data: profiles } = userIds.length
        ? await supabase.from("profiles").select("id, full_name").in("id", userIds)
        : { data: [] };

      const nameMap = new Map<string, string>();
      profiles?.forEach((p) => nameMap.set(p.id, p.full_name));

      const enriched: SosActive[] = logs.map((l) => ({
        ...l,
        author_name: nameMap.get(l.user_id) || "Pengguna",
      }));

      if (mounted) {
        setSosList(enriched);
        setLoading(false);
      }
    }

    loadActive();

    // Subscribe ke SOS baru
    const channel = supabase
      .channel("forum-sos-active")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "sos_logs" },
        async (payload) => {
          const newLog = payload.new as SosActive;
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", newLog.user_id)
            .single();

          const enriched: SosActive = {
            ...newLog,
            author_name: profile?.full_name || "Pengguna",
          };

          if (mounted) {
            setSosList((prev) => [enriched, ...prev]);
          }
        }
      )
      .subscribe();

    // Auto-remove SOS yang sudah lewat 1 jam, dicek setiap menit
    const interval = setInterval(() => {
      if (!mounted) return;
      const cutoff = Date.now() - 60 * 60 * 1000;
      setSosList((prev) => prev.filter((s) => new Date(s.created_at).getTime() > cutoff));
    }, 60 * 1000);

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  if (loading) return null;
  if (sosList.length === 0) return null;

  return (
    <div className="mb-6 space-y-3">
      <div className="flex items-center gap-2 mb-3">
        <Siren size={22} className="text-red-600 animate-pulse" />
        <h2 className="text-lg font-bold text-red-700">SOS Aktif</h2>
        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
          {sosList.length} darurat
        </span>
      </div>

      {sosList.map((sos) => (
        <div
          key={sos.id}
          className="bg-white rounded-xl shadow-md border-l-4 border-red-600 p-4"
        >
          <div className="flex items-start gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <Siren size={20} className="text-red-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-red-700 text-sm">SOS Darurat</p>
              <div className="space-y-1 text-xs mt-1">
                <p className="flex items-center gap-1 text-gray-900 font-medium">
                  <User size={12} />
                  {sos.author_name}
                </p>
    <a            
                  href={`https://www.google.com/maps?q=${sos.lat},${sos.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-green-700 hover:underline"
                >
                  <MapPin size={12} />
                  {sos.lat.toFixed(5)}, {sos.lng.toFixed(5)}
                </a>
                <p className="flex items-center gap-1 text-gray-500">
                  <Clock size={12} />
                  {new Date(sos.created_at).toLocaleTimeString("id-ID")}
                </p>
              </div>
            </div>
          </div>

          <SosChatBox sosLogId={sos.id} />
        </div>
      ))}
    </div>
  );
}