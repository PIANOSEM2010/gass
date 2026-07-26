import { pickName } from "@/lib/place-name";

export const runtime = "nodejs";

// Menentukan nama kabupaten/kota dari koordinat, DI SISI SERVER.
//
// Kenapa di server:
//  - Bisa mengirim identitas aplikasi (User-Agent) sesuai aturan pemakaian
//    layanan peta Nominatim, sehingga permintaan tidak mudah ditolak.
//  - Hasilnya di-cache dan dipakai bersama semua pengguna (lebih hemat & cepat).
//
// Sekaligus jadi alat UJI: buka di browser untuk memeriksa hasil suatu titik, mis.
//   /api/place-name?lat=2.8450&lng=117.3680          (Tanjung Selor, Bulungan)
//   /api/place-name?lat=3.3131&lng=117.5913&debug=1  (Tarakan, + rincian field)

type CacheEntry = { name: string; at: number };
const cache = new Map<string, CacheEntry>();
const TTL_MS = 7 * 24 * 3600 * 1000; // seminggu

const UA = "BUG-BulunganUntukGoweser/1.0 (https://gass-bulungan.netlify.app)";

async function lookup(lat: number, lng: number, zoom: number) {
  const url =
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2` +
    `&lat=${lat}&lon=${lng}&zoom=${zoom}&addressdetails=1&accept-language=id`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  return (await res.json()) as { address?: Record<string, string>; display_name?: string };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  const debug = searchParams.get("debug") === "1";

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return Response.json(
      { ok: false, pesan: "Sertakan lat & lng yang valid, contoh: /api/place-name?lat=2.845&lng=117.368" },
      { status: 400 }
    );
  }

  const key = `${lat.toFixed(2)},${lng.toFixed(2)}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS && !debug) {
    return Response.json({ ok: true, name: hit.name, cached: true });
  }

  // Coba tingkat kabupaten/kota (zoom 10), lalu tingkat lebih rinci bila kosong
  let lastErr = "";
  for (const zoom of [10, 12]) {
    try {
      const data = await lookup(lat, lng, zoom);
      const address = data.address || {};
      const name = pickName(address);
      if (name) {
        cache.set(key, { name, at: Date.now() });
        return Response.json({
          ok: true,
          name,
          zoom,
          ...(debug ? { address, display_name: data.display_name } : {}),
        });
      }
      lastErr = "nama tidak ditemukan pada hasil";
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
      await new Promise((r) => setTimeout(r, 700)); // hormati batas laju layanan
    }
  }

  return Response.json({ ok: false, name: "", pesan: lastErr || "gagal" }, { status: 502 });
}
