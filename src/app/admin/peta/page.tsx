import { createClient } from "@/lib/supabase/server";
import MarkerModeration from "./marker-moderation";

export default async function AdminPetaPage() {
  const supabase = await createClient();
  const { data: markers } = await supabase
    .from("road_markers")
    .select("*")
    .order("approved", { ascending: true })
    .order("created_at", { ascending: false });

  const userIds = [...new Set(markers?.map((m) => m.user_id).filter(Boolean) || [])];
  const { data: profiles } = userIds.length > 0
    ? await supabase.from("profiles").select("id, full_name").in("id", userIds)
    : { data: [] };
  const nameMap = new Map(profiles?.map((p) => [p.id, p.full_name]) || []);

  const enriched = markers?.map((m) => ({
    ...m,
    author_name: m.user_id ? nameMap.get(m.user_id) || "Anonim" : "Sistem",
  })) || [];

  return (
    <div className="px-4 pt-6 pb-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Moderasi Peta</h1>
      <p className="text-sm text-gray-600 mb-6">
        Setujui atau tolak laporan jalur dari pengguna. Laporan yang disetujui akan muncul di peta publik.
      </p>
      <MarkerModeration initialMarkers={enriched} />
    </div>
  );
}