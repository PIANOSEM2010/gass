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

  return <PetaWrapper initialMarkers={markers || []} userId={user?.id || null} />;
}