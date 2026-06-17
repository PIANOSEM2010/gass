import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import RiwayatClient from "./riwayat-client";

type Pt = { lat: number; lng: number };

export default async function RiwayatPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data } = await supabase
    .from("activities")
    .select("id,distance_m,duration_s,elevation_gain_m,path,started_at,activity_date")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const rides = (data || []).map((a) => ({
    id: String(a.id),
    distance_m: Number(a.distance_m) || 0,
    duration_s: Number(a.duration_s) || 0,
    elevation_gain_m: Number(a.elevation_gain_m) || 0,
    path: Array.isArray(a.path) ? (a.path as Pt[]) : null,
    started_at: (a.started_at as string) || null,
    activity_date: (a.activity_date as string) || null,
  }));

  return <RiwayatClient rides={rides} />;
}