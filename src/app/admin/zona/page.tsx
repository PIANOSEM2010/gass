import { createClient } from "@/lib/supabase/server";
import ZonaWrapper from "./zona-wrapper";

export default async function AdminZonaPage() {
  const supabase = await createClient();
  const { data: zones } = await supabase
    .from("danger_zones")
    .select("*")
    .order("created_at", { ascending: false });

  const userIds = [...new Set(zones?.map((z) => z.created_by).filter(Boolean) || [])];
  const { data: profiles } = userIds.length > 0
    ? await supabase.from("profiles").select("id, full_name").in("id", userIds)
    : { data: [] };
  const nameMap = new Map(profiles?.map((p) => [p.id, p.full_name]) || []);

  const enriched = (zones || []).map((z) => ({
    ...z,
    author_name: z.created_by ? nameMap.get(z.created_by) || "Anonim" : "Sistem",
  }));

  return (
    <div className="px-4 pt-6 pb-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Zona Rawan Kecelakaan</h1>
      <p className="text-sm text-gray-600 mb-6">
        Tandai area rawan kecelakaan, potensi rawan, dan area berbahaya bagi pesepeda. Zona yang ditambahkan langsung tampil di peta publik.
      </p>
      <ZonaWrapper initialZones={enriched} />
    </div>
  );
}