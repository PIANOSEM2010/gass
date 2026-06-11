import { createClient } from "@/lib/supabase/server";
import LandmarkWrapper from "./landmark-wrapper";

export default async function AdminLandmarkPage() {
  const supabase = await createClient();
  const { data: landmarks } = await supabase
    .from("landmarks")
    .select("*")
    .order("created_at", { ascending: false });

  const userIds = [...new Set(landmarks?.map((l) => l.created_by).filter(Boolean) || [])];
  const { data: profiles } = userIds.length > 0
    ? await supabase.from("profiles").select("id, full_name").in("id", userIds)
    : { data: [] };
  const nameMap = new Map(profiles?.map((p) => [p.id, p.full_name]) || []);

  const enriched = (landmarks || []).map((l) => ({
    ...l,
    author_name: l.created_by ? nameMap.get(l.created_by) || "Anonim" : "Sistem",
  }));

  return (
    <div className="px-4 pt-6 pb-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Landmark</h1>
      <p className="text-sm text-gray-600 mb-6">
        Tandai tempat penting bagi pesepeda: perbelanjaan, kafe, kantor, kesehatan, bengkel sepeda, dan lainnya. Landmark yang ditambahkan langsung tampil di peta publik.
      </p>
      <LandmarkWrapper initialLandmarks={enriched} />
    </div>
  );
}