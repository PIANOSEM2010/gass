import { sendViaTelnyx, toE164, isTelnyxConfigured } from "@/lib/telnyx";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// ENDPOINT DIAGNOSTIK TELNYX
// Pakai: buka /api/telnyx-test?to=081234567890 di browser (harus sudah login).
// Menampilkan hasil mentah beserta pesan error dari Telnyx, sehingga masalah
// konfigurasi langsung kelihatan tanpa harus menekan tombol SOS sungguhan.
export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return Response.json(
        { ok: false, pesan: "Belum login. Login dulu di situs, lalu buka alamat ini lagi." },
        { status: 401 }
      );
    }

    const url = new URL(req.url);
    const to = url.searchParams.get("to");
    if (!to) {
      return Response.json({
        ok: false,
        pesan: "Tambahkan nomor tujuan, contoh: /api/telnyx-test?to=081234567890",
        konfigurasi: {
          apiKeyTerpasang: Boolean(process.env.TELNYX_API_KEY),
          nomorPengirim: process.env.TELNYX_FROM_NUMBER || "(belum di-set)",
          jalur: process.env.TELNYX_CHANNEL || "sms",
          templateWhatsApp: process.env.TELNYX_WA_TEMPLATE_NAME || "(belum di-set)",
        },
      });
    }

    if (!isTelnyxConfigured()) {
      return Response.json(
        {
          ok: false,
          pesan: "Telnyx belum dikonfigurasi. Set TELNYX_API_KEY dan TELNYX_FROM_NUMBER di Netlify, lalu deploy ulang.",
        },
        { status: 500 }
      );
    }

    const target = toE164(to);
    if (!target) {
      return Response.json({ ok: false, pesan: `Nomor tidak valid: ${to}` }, { status: 400 });
    }

    const result = await sendViaTelnyx(
      [target],
      "Tes pesan dari BUG (Bulungan untuk Goweser). Jika kamu menerima ini, jalur pengiriman SOS sudah berfungsi."
    );

    return Response.json({
      ok: result.sent > 0,
      tujuan: target,
      jalur: process.env.TELNYX_CHANNEL || "sms",
      terkirim: result.sent,
      gagal: result.failed,
      errors: result.errors,
      catatan:
        result.sent > 0
          ? "Telnyx menerima permintaan. Cek HP tujuan — bila belum masuk, biasanya soal rute operator/regulasi negara tujuan."
          : "Pengiriman gagal — baca 'errors' untuk penyebab pastinya.",
    });
  } catch (e) {
    return Response.json(
      { ok: false, pesan: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
