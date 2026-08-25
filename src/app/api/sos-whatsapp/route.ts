// src/app/api/sos-whatsapp/route.ts
// Mengirim pesan SOS otomatis ke kontak darurat pengguna + admin.
//
// Pengirim utama: TELNYX (SMS atau WhatsApp, lihat src/lib/telnyx.ts).
// Fonnte hanya dipakai sebagai jaring pengaman bila Telnyx belum siap/gagal -
// karena ini fitur darurat, pesan tidak boleh gagal terkirim total.
//
// Pilih pengirim lewat env SOS_PROVIDER: "telnyx" (bawaan) | "fonnte" | "both".
// Semua kunci HANYA dibaca di server, tidak pernah sampai ke browser.

import { sendViaTelnyx, normalizeTargets, isTelnyxConfigured } from "@/lib/telnyx";

export const runtime = "nodejs";

// Fonnte memakai nomor tanpa tanda "+" (mis. 6281...)
function toFonnteNumbers(list: string[]): string[] {
  return normalizeTargets(list).map((n) => n.replace(/^\+/, ""));
}

async function sendViaFonnte(rawTargets: string[], message: string) {
  const token = process.env.FONNTE_TOKEN;
  if (!token) return { sent: 0, failed: rawTargets.length, errors: ["FONNTE_TOKEN belum di-set"] };
  const targets = toFonnteNumbers(rawTargets);
  if (targets.length === 0) return { sent: 0, failed: 0, errors: ["Tidak ada nomor tujuan"] };

  const params = new URLSearchParams();
  params.append("target", targets.join(","));
  params.append("message", message);
  params.append("countryCode", "62");

  try {
    const res = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: {
        Authorization: token, // Fonnte tidak memakai "Bearer"
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return { sent: 0, failed: targets.length, errors: [`Fonnte ${res.status}: ${JSON.stringify(data).slice(0, 200)}`] };
    }
    return { sent: targets.length, failed: 0, errors: [] as string[] };
  } catch (e) {
    return { sent: 0, failed: targets.length, errors: [e instanceof Error ? e.message : String(e)] };
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const message: string = typeof body?.message === "string" ? body.message : "";
    const contacts: string[] = Array.isArray(body?.contacts) ? body.contacts : [];

    if (!message.trim()) {
      return Response.json({ ok: false, error: "Pesan kosong" }, { status: 400 });
    }

    // Nomor admin dari env (boleh lebih dari satu, dipisah koma)
    const adminNumbers = (process.env.ADMIN_WHATSAPP || "").split(",");
    const rawTargets = [...contacts, ...adminNumbers].filter(Boolean);
    const targets = normalizeTargets(rawTargets);

    if (targets.length === 0) {
      return Response.json({ ok: false, error: "Tidak ada nomor tujuan" }, { status: 400 });
    }

    const provider = (process.env.SOS_PROVIDER || "telnyx").toLowerCase();
    const useTelnyx = provider !== "fonnte" && isTelnyxConfigured();

    let telnyx: { sent: number; failed: number; errors: string[] } | null = null;
    let fonnte: { sent: number; failed: number; errors: string[] } | null = null;

    if (useTelnyx) {
      telnyx = await sendViaTelnyx(targets, message);
      if (telnyx.errors.length > 0) console.error("[sos] Telnyx:", telnyx.errors);
    }

    // Jaring pengaman: pakai Fonnte bila Telnyx tidak dipakai, tidak ada yang
    // terkirim, atau memang diminta mengirim lewat keduanya.
    const needFallback = provider === "fonnte" || provider === "both" || !telnyx || telnyx.sent === 0;
    if (needFallback && process.env.FONNTE_TOKEN) {
      fonnte = await sendViaFonnte(rawTargets, message);
      if (fonnte.errors.length > 0) console.error("[sos] Fonnte:", fonnte.errors);
    }

    const totalSent = (telnyx?.sent || 0) + (fonnte?.sent || 0);
    if (totalSent === 0) {
      return Response.json(
        {
          ok: false,
          error: "Semua jalur pengiriman gagal",
          targets: targets.length,
          telnyx,
          fonnte,
        },
        { status: 502 }
      );
    }

    return Response.json({
      ok: true,
      targets: targets.length,
      provider: telnyx && telnyx.sent > 0 ? "telnyx" : "fonnte",
      telnyx,
      fonnte,
    });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : "Kesalahan tak terduga" },
      { status: 500 }
    );
  }
}
