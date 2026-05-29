import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { lat, lng, userName, userEmail } = await request.json();

    const apiKey = process.env.RESEND_API_KEY;
    const adminEmail = process.env.ADMIN_EMAIL;

    if (!apiKey || !adminEmail) {
      return NextResponse.json(
        { error: "Server email belum dikonfigurasi" },
        { status: 500 }
      );
    }

    const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
    const timestamp = new Date().toLocaleString("id-ID", {
      day: "numeric", month: "long", year: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });

    const html = `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #dc2626, #991b1b); color: white; padding: 24px; border-radius: 12px 12px 0 0;">
    <h1 style="margin: 0; font-size: 24px;">🚨 SOS DARURAT</h1>
    <p style="margin: 4px 0 0 0; opacity: 0.9;">Platform BUG — Bulungan untuk Goweser</p>
  </div>
  <div style="background: #fef2f2; padding: 24px; border: 2px solid #fecaca; border-top: 0; border-radius: 0 0 12px 12px;">
    <p style="margin: 0 0 16px 0; font-size: 16px; color: #7f1d1d;">
      <strong>${userName}</strong> menekan tombol darurat dan membutuhkan bantuan.
    </p>

    <div style="background: white; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
      <p style="margin: 0 0 8px 0; font-size: 12px; color: #6b7280; text-transform: uppercase;">Lokasi GPS</p>
      <p style="margin: 0 0 12px 0; font-family: monospace; color: #111827;">${lat.toFixed(6)}, ${lng.toFixed(6)}</p>
      <a href="${mapsUrl}" style="display: inline-block; background: #16a34a; color: white; padding: 10px 16px; text-decoration: none; border-radius: 6px; font-weight: 600;">
        📍 Buka di Google Maps
      </a>
    </div>

    <div style="background: white; padding: 16px; border-radius: 8px;">
      <p style="margin: 0 0 4px 0; font-size: 12px; color: #6b7280;">Email pelapor</p>
      <p style="margin: 0 0 12px 0; color: #111827;">${userEmail || "Tidak tersedia"}</p>
      <p style="margin: 0 0 4px 0; font-size: 12px; color: #6b7280;">Waktu kejadian</p>
      <p style="margin: 0; color: #111827;">${timestamp}</p>
    </div>

    <p style="margin: 20px 0 0 0; font-size: 12px; color: #6b7280; text-align: center;">
      Pesan otomatis dari sistem BUG. Hubungi pelapor melalui WhatsApp atau lokasi terdekat.
    </p>
  </div>
</body>
</html>`;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "BUG Alert <onboarding@resend.dev>",
        to: [adminEmail],
        subject: `🚨 SOS dari ${userName} — Bulungan`,
        html,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.error("Resend error:", errData);
      return NextResponse.json(
        { error: errData.message || "Gagal kirim email" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({ success: true, id: data.id });
  } catch (err) {
    console.error("SOS email error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 }
    );
  }
}