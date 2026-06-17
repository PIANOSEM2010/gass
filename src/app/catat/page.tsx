import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import CatatClient from "./catat-client";

function witaDate(off = 0): string {
  return new Date(Date.now() + 8 * 3600 * 1000 + off * 86400000).toISOString().slice(0, 10);
}

export default async function GowesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase.from("profiles").select("full_name, school").eq("id", user.id).single();
  const meta = user.user_metadata || {};
  const fullName: string = profile?.full_name || meta.full_name || "Pesepeda";
  const organization: string = meta.organization || profile?.school || "";

  const { data: mine } = await supabase.from("user_streaks")
    .select("current_streak,longest_streak,last_activity_date,total_distance_m,total_rides")
    .eq("user_id", user.id).single();

  const { data: rows } = await supabase.from("user_streaks")
    .select("user_id,current_streak,last_activity_date,total_distance_m,total_rides,full_name,organization")
    .order("current_streak", { ascending: false }).limit(100);

  const today = witaDate(0), yest = witaDate(-1);
  const alive = (d: string | null) => d === today || d === yest;
  const myStreak = mine && alive(mine.last_activity_date) ? mine.current_streak : 0;

  const board = (rows || [])
    .map((r) => ({
      user_id: r.user_id, name: r.full_name || "Pesepeda", org: r.organization || "-",
      km: Number(r.total_distance_m) / 1000, rides: r.total_rides,
      streak: alive(r.last_activity_date) ? r.current_streak : 0,
    }))
    .sort((a, b) => b.streak - a.streak || b.km - a.km);

  return (
    <CatatClient
      userId={user.id} fullName={fullName} organization={organization}
      myStreak={myStreak} longest={mine?.longest_streak ?? 0}
      totalKm={mine ? Number(mine.total_distance_m) / 1000 : 0}
      totalRides={mine?.total_rides ?? 0} board={board}
    />
  );
}