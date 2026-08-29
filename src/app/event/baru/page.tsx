import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import FormEvent from "./form-event";

export const dynamic = "force-dynamic";

export default async function AjukanEvent() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Zona rawan dipakai untuk memeriksa jalur yang ditandai pengaju.
  const { data: zona } = await supabase
    .from("danger_zones").select("id,title,lat,lng,radius,category");

  return <FormEvent zona={(zona || []).map((z) => ({
    lat: Number(z.lat), lng: Number(z.lng),
    radius_m: Number(z.radius) || 60, name: String(z.title || "Zona rawan"),
  }))} />;
}
