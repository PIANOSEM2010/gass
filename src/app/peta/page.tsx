import { createClient } from "@/lib/supabase/server";
import PetaWrapper from "./peta-wrapper";

export default async function PetaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: markers } = await supabase
    .from("road_markers")
    .select("*")
    .eq("approved", true)
    .order("created_at", { ascending: false });

  const { data: zones } = await supabase
    .from("danger_zones")
    .select("id, category, title, description, lat, lng, radius")
    .order("created_at", { ascending: false });

  const { data: landmarks } = await supabase
    .from("landmarks")
    .select("id, category, title, description, lat, lng")
    .order("created_at", { ascending: false });

  return (
    <PetaWrapper
      initialMarkers={markers || []}
      initialZones={zones || []}
      initialLandmarks={landmarks || []}
      userId={user?.id || null}
    />
  );
}