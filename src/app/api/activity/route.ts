// src/app/api/activity/route.ts
// Simpan ride + hitung streak (service role, bypass RLS). Reset ketat ala Snapstreak.
export const runtime = "nodejs";

function witaDate(offsetDays = 0): string {
  // WITA = UTC+8
  return new Date(Date.now() + 8 * 3600 * 1000 + offsetDays * 86400000)
    .toISOString()
    .slice(0, 10);
}

export async function POST(req: Request) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return Response.json({ ok: false, error: "Supabase env belum lengkap" }, { status: 500 });

    const b = await req.json().catch(() => ({}));
    const userId = typeof b?.userId === "string" ? b.userId : null;
    if (!userId) return Response.json({ ok: false, error: "userId kosong" }, { status: 400 });

    const distance_m = Math.max(0, Math.round(Number(b?.distance_m) || 0));
    const duration_s = Math.max(0, Math.round(Number(b?.duration_s) || 0));
    const path = Array.isArray(b?.path) ? b.path : null;
    const fullName = typeof b?.fullName === "string" ? b.fullName : null;
    const organization = typeof b?.organization === "string" ? b.organization : null;
    const started_at = typeof b?.started_at === "string" ? b.started_at : null;
    const ended_at = typeof b?.ended_at === "string" ? b.ended_at : null;

    const today = witaDate(0);
    const yesterday = witaDate(-1);
    const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };

    // 1) Simpan aktivitas
    await fetch(`${url}/rest/v1/activities`, {
      method: "POST",
      headers,
      body: JSON.stringify({ user_id: userId, distance_m, duration_s, path, activity_date: today, started_at, ended_at }),
    });

    // 2) Ambil streak lama
    const getRes = await fetch(
      `${url}/rest/v1/user_streaks?user_id=eq.${userId}&select=current_streak,longest_streak,last_activity_date,total_distance_m,total_rides`,
      { headers }
    );
    const arr = await getRes.json().catch(() => []);
    const ex = Array.isArray(arr) && arr[0] ? arr[0] : null;
    const prevStreak = ex?.current_streak ?? 0;
    const prevLongest = ex?.longest_streak ?? 0;
    const prevLast = ex?.last_activity_date ?? null;
    const prevDist = Number(ex?.total_distance_m ?? 0);
    const prevRides = ex?.total_rides ?? 0;

    // 3) Hitung streak baru (hanya kalau ride >= 1 km)
    const qualifies = distance_m >= 1000;
    let newStreak = prevStreak;
    let newLast = prevLast;
    if (qualifies) {
      if (prevLast === today) newStreak = prevStreak || 1;
      else if (prevLast === yesterday) newStreak = prevStreak + 1;
      else newStreak = 1;
      newLast = today;
    }
    const newLongest = Math.max(prevLongest, newStreak);

    // 4) Upsert streak
    await fetch(`${url}/rest/v1/user_streaks`, {
      method: "POST",
      headers: { ...headers, Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify({
        user_id: userId,
        current_streak: newStreak,
        longest_streak: newLongest,
        last_activity_date: newLast,
        total_distance_m: prevDist + distance_m,
        total_rides: prevRides + 1,
        full_name: fullName,
        organization,
        updated_at: new Date().toISOString(),
      }),
    });

    const effective = newLast === today || newLast === yesterday ? newStreak : 0;
    return Response.json({ ok: true, current_streak: effective, qualifies });
  } catch (err) {
    return Response.json({ ok: false, error: err instanceof Error ? err.message : "error" }, { status: 500 });
  }
}