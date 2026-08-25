// Pengirim pesan via TELNYX (pengganti gateway Fonnte).
//
// Dua jalur tersedia:
//  1. SMS      → POST /v2/messages           (paling sederhana, tanpa template)
//  2. WhatsApp → POST /v2/messages/whatsapp  (butuh WABA + template disetujui Meta)
//
// Env yang dipakai:
//   TELNYX_API_KEY          Kunci API v2 (Bearer)
//   TELNYX_FROM_NUMBER      Nomor Telnyx pengirim, format E.164 (mis. +12025550123)
//   TELNYX_CHANNEL          "sms" (bawaan) atau "whatsapp"
//   TELNYX_WA_TEMPLATE_NAME Nama template WhatsApp yang sudah disetujui Meta
//   TELNYX_WA_TEMPLATE_LANG Kode bahasa template (bawaan "id")

export type SendResult = {
  sent: number;
  failed: number;
  errors: string[];
};

// Ubah nomor apa pun menjadi format internasional E.164 (+62...).
// "081234567890" → "+6281234567890"; "6281..." → "+6281..."; "81..." → "+6281..."
export function toE164(raw: string): string | null {
  let d = String(raw || "").trim();
  const hadPlus = d.startsWith("+");
  d = d.replace(/\D/g, "");
  if (!d) return null;
  if (!hadPlus) {
    if (d.startsWith("0")) d = "62" + d.slice(1);
    else if (d.startsWith("8")) d = "62" + d;
  }
  if (d.length < 9 || d.length > 15) return null;
  return "+" + d;
}

export function normalizeTargets(list: string[]): string[] {
  const out: string[] = [];
  for (const raw of list) {
    const n = toE164(raw);
    if (n) out.push(n);
  }
  return Array.from(new Set(out));
}

function config() {
  const apiKey = process.env.TELNYX_API_KEY;
  const from = process.env.TELNYX_FROM_NUMBER;
  const channel = (process.env.TELNYX_CHANNEL || "sms").toLowerCase();
  return { apiKey, from, channel };
}

export function isTelnyxConfigured(): boolean {
  const { apiKey, from } = config();
  return Boolean(apiKey && from);
}

async function postTelnyx(path: string, payload: unknown, apiKey: string): Promise<void> {
  const res = await fetch(`https://api.telnyx.com/v2/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Telnyx ${res.status}: ${text.slice(0, 300)}`);
  }
}

// Parameter template WhatsApp tidak boleh memuat baris baru, tab, atau
// spasi berlebih (aturan Meta) — jadi pesan dirapikan menjadi satu baris.
function sanitizeForTemplate(text: string): string {
  return text.replace(/[\r\n\t]+/g, " · ").replace(/\s{2,}/g, " ").trim().slice(0, 900);
}

// Kirim SMS ke banyak nomor (Telnyx: satu permintaan per nomor)
export async function sendTelnyxSms(targets: string[], text: string): Promise<SendResult> {
  const { apiKey, from } = config();
  if (!apiKey || !from) {
    return { sent: 0, failed: targets.length, errors: ["TELNYX_API_KEY / TELNYX_FROM_NUMBER belum di-set"] };
  }
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];
  await Promise.all(
    targets.map(async (to) => {
      try {
        await postTelnyx("messages", { from, to, text }, apiKey);
        sent++;
      } catch (e) {
        failed++;
        if (errors.length < 3) errors.push(e instanceof Error ? e.message : String(e));
      }
    })
  );
  return { sent, failed, errors };
}

// Kirim WhatsApp memakai TEMPLATE yang sudah disetujui Meta.
// Template harus punya satu variabel {{1}} untuk isi pesan SOS.
export async function sendTelnyxWhatsApp(targets: string[], text: string): Promise<SendResult> {
  const { apiKey, from } = config();
  const name = process.env.TELNYX_WA_TEMPLATE_NAME;
  const lang = process.env.TELNYX_WA_TEMPLATE_LANG || "id";
  if (!apiKey || !from) {
    return { sent: 0, failed: targets.length, errors: ["TELNYX_API_KEY / TELNYX_FROM_NUMBER belum di-set"] };
  }
  if (!name) {
    return { sent: 0, failed: targets.length, errors: ["TELNYX_WA_TEMPLATE_NAME belum di-set (template wajib untuk pesan yang dimulai oleh sistem)"] };
  }
  const body = sanitizeForTemplate(text);
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];
  await Promise.all(
    targets.map(async (to) => {
      try {
        await postTelnyx(
          "messages/whatsapp",
          {
            from,
            to,
            whatsapp_message: {
              type: "template",
              template: {
                name,
                language: { policy: "deterministic", code: lang },
                components: [{ type: "body", parameters: [{ type: "text", text: body }] }],
              },
            },
          },
          apiKey
        );
        sent++;
      } catch (e) {
        failed++;
        if (errors.length < 3) errors.push(e instanceof Error ? e.message : String(e));
      }
    })
  );
  return { sent, failed, errors };
}

// Kirim lewat jalur sesuai TELNYX_CHANNEL
export async function sendViaTelnyx(targets: string[], text: string): Promise<SendResult> {
  const { channel } = config();
  return channel === "whatsapp" ? sendTelnyxWhatsApp(targets, text) : sendTelnyxSms(targets, text);
}
