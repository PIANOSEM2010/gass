import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PemutarRute from "./pemutar-rute";
import { type Titik } from "@/components/jejak-rute";

export const dynamic = "force-dynamic";

export default async function HalamanRute({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: r } = await supabase
    .from("saved_routes")
    .select("id,user_id,name,note,path,distance_m,elevation_m,duration_s,share_token,created_at")
    .eq("share_token", token).maybeSingle();
  if (!r) notFound();

  const { data: pemilik } = await supabase
    .from("profiles").select("full_name").eq("id", String(r.user_id)).maybeSingle();

  return (
    <PemutarRute
      nama={String(r.name)}
      pemilik={(pemilik?.full_name as string) || "Goweser"}
      path={Array.isArray(r.path) ? (r.path as Titik[]) : []}
      distanceM={Number(r.distance_m) || 0}
      elevM={Number(r.elevation_m) || 0}
      durationS={r.duration_s ? Number(r.duration_s) : null}
      token={String(r.share_token)}
      milikSaya={Boolean(user) && String(r.user_id) === user?.id}
      id={String(r.id)}
    />
  );
}
