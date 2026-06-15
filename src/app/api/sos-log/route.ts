// src/app/api/sos-log/route.ts
// Menyimpan log SOS lewat server memakai service role → MELEWATI RLS,
// sehingga tidak terhalang sesi login yang kedaluwarsa di perangkat pengguna.

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
      return Response.json(
        { ok: false, error: "Konfigurasi Supabase belum lengkap di server" },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const userId = typeof body?.userId === "string" ? body.userId : null;
    const lat = Number(body?.lat);
    const lng = Number(body?.lng);
    const message = typeof body?.message === "string" ? body.message : "";

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return Response.json({ ok: false, error: "Koordinat tidak valid" }, { status: 400 });
    }

    // Insert lewat PostgREST dengan service role (bypass RLS)
    const res = await fetch(`${url}/rest/v1/sos_logs`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({ user_id: userId, lat, lng, message }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      return Response.json(
        { ok: false, error: "Gagal menyimpan log SOS", detail: data },
        { status: 500 }
      );
    }

    const row = Array.isArray(data) ? data[0] : data;
    return Response.json({ ok: true, id: row?.id ?? null, created_at: row?.created_at ?? null });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : "Kesalahan tak terduga" },
      { status: 500 }
    );
  }
}