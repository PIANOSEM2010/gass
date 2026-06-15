// src/app/api/sos-whatsapp/route.ts
// Mengirim pesan SOS otomatis via gateway Fonnte ke kontak darurat pengguna + admin.
// Token Fonnte HANYA dibaca dari server (env), tidak pernah terekspos ke browser.

export const runtime = "nodejs";

function normalizeNumbers(list: string[]): string[] {
  const out: string[] = [];
  for (const raw of list) {
    if (!raw) continue;
    const digits = String(raw).replace(/[^\d]/g, "");
    if (digits.length >= 8) out.push(digits);
  }
  return out;
}

export async function POST(req: Request) {
  try {
    const token = process.env.FONNTE_TOKEN;
    if (!token) {
      return Response.json(
        { ok: false, error: "FONNTE_TOKEN belum di-set di environment" },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const message: string = typeof body?.message === "string" ? body.message : "";
    const contacts: string[] = Array.isArray(body?.contacts) ? body.contacts : [];

    if (!message.trim()) {
      return Response.json({ ok: false, error: "Pesan kosong" }, { status: 400 });
    }

    // Nomor admin dari env (boleh lebih dari satu, pisahkan dengan koma)
    const adminNumbers = (process.env.ADMIN_WHATSAPP || "").split(",");

    // Gabungkan kontak darurat pengguna + admin, bersihkan & buang duplikat
    const targets = Array.from(new Set(normalizeNumbers([...contacts, ...adminNumbers])));

    if (targets.length === 0) {
      return Response.json({ ok: false, error: "Tidak ada nomor tujuan" }, { status: 400 });
    }

    // Fonnte: satu request, banyak tujuan (dipisah koma).
    // countryCode 62 otomatis mengubah angka 0 di depan menjadi 62.
    const params = new URLSearchParams();
    params.append("target", targets.join(","));
    params.append("message", message);
    params.append("countryCode", "62");

    const fonnteRes = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: {
        Authorization: token, // Fonnte tidak memakai "Bearer", token langsung
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const data = await fonnteRes.json().catch(() => null);

    if (!fonnteRes.ok) {
      return Response.json(
        { ok: false, error: "Gateway Fonnte menolak permintaan", detail: data },
        { status: 502 }
      );
    }

    return Response.json({ ok: true, targets: targets.length, fonnte: data });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : "Kesalahan tak terduga" },
      { status: 500 }
    );
  }
}