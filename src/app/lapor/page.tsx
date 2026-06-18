import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import LaporClient from "./lapor-client";

export default async function LaporPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data } = await supabase
    .from("infra_reports")
    .select("id,user_id,category,description,lat,lng,photo_url,status,created_at")
    .order("created_at", { ascending: false })
    .limit(60);

  const reports = (data || []).map((r) => ({
    id: String(r.id),
    category: String(r.category),
    description: (r.description as string) || "",
    lat: Number(r.lat),
    lng: Number(r.lng),
    photo_url: (r.photo_url as string) || null,
    status: String(r.status),
    created_at: (r.created_at as string) || null,
    mine: r.user_id === user.id,
  }));

  return <LaporClient userId={user.id} reports={reports} />;
}