// src/app/api/live/[token]/route.ts
// Baca SATU sesi pantau berdasarkan token (service role). Hanya field aman, tanpa identitas.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await ctx.params;
    if (!token || !/^[0-9a-fA-F-]{10,}$/.test(token)) return Response.json({ found: false }, { status: 200 });

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return Response.json({ found: false, error: "env" }, { status: 500 });

    const res = await fetch(
      `${url}/rest/v1/live_sessions?id=eq.${encodeURIComponent(token)}&select=sharer_name,active,lat,lng,accuracy,speed,started_at,updated_at,ended_at&limit=1`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: "no-store" }
    );
    const rows = await res.json().catch(() => []);
    const s = Array.isArray(rows) && rows[0] ? rows[0] : null;
    if (!s) return Response.json({ found: false }, { status: 200 });

    return Response.json({
      found: true,
      active: Boolean(s.active),
      sharer_name: s.sharer_name || "Goweser",
      lat: s.lat ?? null,
      lng: s.lng ?? null,
      accuracy: s.accuracy ?? null,
      speed: s.speed ?? null,
      started_at: s.started_at ?? null,
      updated_at: s.updated_at ?? null,
      ended_at: s.ended_at ?? null,
    });
  } catch (e) {
    return Response.json({ found: false, error: e instanceof Error ? e.message : "error" }, { status: 200 });
  }
}