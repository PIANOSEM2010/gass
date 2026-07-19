// src/app/api/activity/route.ts
// Simpan ride + hitung streak berdasar TOTAL jarak hari itu (service role, bypass RLS).
// Elevasi dihitung akurat dari DEM via Open-Meteo (fallback ke estimasi GPS dari klien).
export const runtime = "nodejs";

function witaDate(offsetDays = 0): string {
  return new Date(Date.now() + 8 * 3600 * 1000 + offsetDays * 86400000)
    .toISOString()
    .slice(0, 10);
}

// Hitung total kenaikan elevasi dari profil tanah (DEM 90 m, Open-Meteo). null jika gagal.
async function elevationGainViaApi(path: { lat: number; lng: number }[]): Promise<number | null> {
  try {
    if (!Array.isArray(path) || path.length < 3) return null;
    const maxPts = 100;
    const stepN = Math.max(1, Math.ceil(path.length / maxPts));
    const sampled: { lat: number; lng: number }[] = [];
    for (let i = 0; i < path.length; i += stepN) sampled.push(path[i]);
    const lastP = path[path.length - 1];
    const lastS = sampled[sampled.length - 1];
    if (!lastS || lastS.lat !== lastP.lat || lastS.lng !== lastP.lng) sampled.push(lastP);
    if (sampled.length < 3) return null;

    const lat = sampled.map((p) => Number(p.lat).toFixed(5)).join(",");
    const lon = sampled.map((p) => Number(p.lng).toFixed(5)).join(",");
    const res = await fetch(`https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lon}`);
    if (!res.ok) return null;
    const data = await res.json();
    const elevs = data?.elevation;
    if (!Array.isArray(elevs) || elevs.length < 3) return null;

    let gain = 0;
    for (let i = 1; i < elevs.length; i++) {
      const diff = Number(elevs[i]) - Number(elevs[i - 1]);
      if (diff > 1) gain += diff;
    }
    return Math.round(gain);
  } catch {
    return null;
  }
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
    const clientElev = Math.max(0, Math.round(Number(b?.elevation_gain_m) || 0));
    const path = Array.isArray(b?.path) ? b.path : null;
    const fullName = typeof b?.fullName === "string" ? b.fullName : null;
    const organization = typeof b?.organization === "string" ? b.organization : null;
    const started_at = typeof b?.started_at === "string" ? b.started_at : null;
    const ended_at = typeof b?.ended_at === "string" ? b.ended_at : null;

    // Elevasi akurat via DEM; kalau gagal pakai estimasi GPS dari klien
    const apiElev = await elevationGainViaApi(path || []);
    const elevation_gain_m = apiElev !== null ? apiElev : clientElev;

    const today = witaDate(0);
    const yesterday = witaDate(-1);
    // Masa tenggang streak: masih hidup bila gowes terakhir dalam 2 hari terakhir
    // (hari ini, kemarin, atau kemarin lusa). Baru putus bila bolong 2 hari penuh.
    const dayBefore = witaDate(-2);
    const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };

    // 1) Simpan aktivitas
    await fetch(`${url}/rest/v1/activities`, {
      method: "POST",
      headers,
      body: JSON.stringify({ user_id: userId, distance_m, duration_s, elevation_gain_m, path, activity_date: today, started_at, ended_at }),
    });

    // 2) Total jarak hari ini
    const sumRes = await fetch(
      `${url}/rest/v1/activities?user_id=eq.${userId}&activity_date=eq.${today}&select=distance_m`,
      { headers }
    );
    const acts = await sumRes.json().catch(() => []);
    const todayTotal = Array.isArray(acts)
      ? acts.reduce((s: number, a: { distance_m?: number }) => s + (Number(a?.distance_m) || 0), 0)
      : distance_m;

    // 3) Streak lama
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

    // 4) Streak maju kalau total hari ini >= 1 km dan hari ini belum dihitung
    const qualifies = todayTotal >= 1000;
    let newStreak = prevStreak;
    let newLast = prevLast;
    if (qualifies && prevLast !== today) {
      newStreak = (prevLast === yesterday || prevLast === dayBefore) ? prevStreak + 1 : 1;
      newLast = today;
    }
    const newLongest = Math.max(prevLongest, newStreak);

    // 5) Upsert
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

    const effective = (newLast === today || newLast === yesterday || newLast === dayBefore) ? newStreak : 0;
    return Response.json({
      ok: true,
      current_streak: effective,
      qualifies,
      today_km: Math.round((todayTotal / 1000) * 100) / 100,
      elevation_gain_m,
    });
  } catch (err) {
    return Response.json({ ok: false, error: err instanceof Error ? err.message : "error" }, { status: 500 });
  }
}