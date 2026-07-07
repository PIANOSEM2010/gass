import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import InfraAdminClient from "./infra-admin-client";

export default async function AdminInfraPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/");

  const { data } = await supabase
    .from("infra_reports")
    .select("id,category,description,lat,lng,photo_url,status,admin_note,created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  const reports = (data || []).map((r) => ({
    id: String(r.id),
    category: String(r.category),
    description: (r.description as string) || "",
    lat: Number(r.lat),
    lng: Number(r.lng),
    photo_url: (r.photo_url as string) || null,
    status: String(r.status),
    admin_note: (r.admin_note as string) || null,
    created_at: (r.created_at as string) || null,
  }));

  return <InfraAdminClient reports={reports} />;
}