export const runtime = "nodejs";

// Mencari koordinat dari nama jalan atau tempat, dibatasi wilayah Bulungan.
//
// Dikerjakan di server karena Nominatim mewajibkan identitas aplikasi pada
// setiap permintaan, dan hasilnya disimpan sementara agar pencarian yang sama
// tidak membebani layanan gratis itu berulang kali.
type Simpanan = { hasil: Tempat[]; pada: number };
type Tempat = { nama: string; alamat: string; lat: number; lng: number };

const simpanan = new Map<string, Simpanan>();
const UMUR_MS = 24 * 3600 * 1000;
const UA = "BUG-BulunganUntukGoweser/1.0 (https://gass-bulungan.netlify.app)";

// Pencarian dibatasi di sekitar wilayah penggunanya, bukan di kotak tetap.
//
// Batas ini penting: tanpa itu "Jl. Durian" bisa tertukar dengan jalan bernama
// sama di provinsi lain. Tetapi kotak yang tertulis tetap membuat aplikasi
// hanya berguna di satu kabupaten, jadi titik pusatnya dikirim pemanggil.
const RADIUS_DERAJAT = 0.75; // kira-kira 80 km

function rapikan(nama: string): string {
  return nama.replace(/^Jalan\s+/i, "Jl. ").replace(/^Gang\s+/i, "Gg. ").trim();
}

export async function GET(req: Request) {
  const u = new URL(req.url);
  const q = (u.searchParams.get("q") || "").trim();
  if (q.length < 3) return Response.json({ hasil: [] });

  const lat = Number(u.searchParams.get("lat"));
  const lng = Number(u.searchParams.get("lng"));
  const adaPusat = Number.isFinite(lat) && Number.isFinite(lng);
  const kotak = adaPusat
    ? {
        kiri: lng - RADIUS_DERAJAT, kanan: lng + RADIUS_DERAJAT,
        atas: lat + RADIUS_DERAJAT, bawah: lat - RADIUS_DERAJAT,
      }
    : null;

  const kunci = `${q.toLowerCase()}|${adaPusat ? `${lat.toFixed(2)},${lng.toFixed(2)}` : "id"}`;
  const ada = simpanan.get(kunci);
  if (ada && Date.now() - ada.pada < UMUR_MS) {
    return Response.json({ hasil: ada.hasil, dari: "simpanan" });
  }

  try {
    const url =
      `https://nominatim.openstreetmap.org/search?format=jsonv2` +
      `&q=${encodeURIComponent(q)}` +
      (kotak
        ? `&viewbox=${kotak.kiri},${kotak.atas},${kotak.kanan},${kotak.bawah}&bounded=1`
        : "&countrycodes=id") +
      `&limit=6&addressdetails=1&accept-language=id`;
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Nominatim ${res.status}`);

    type Baris = {
      lat: string; lon: string; name?: string; display_name?: string;
      address?: Record<string, string>;
    };
    const j = (await res.json()) as Baris[];

    const hasil: Tempat[] = j.map((b) => {
      const a = b.address || {};
      const nama = b.name || a.road || a.neighbourhood || a.village || (b.display_name || "").split(",")[0];
      const wilayah = [a.village, a.suburb, a.city_district, a.city || a.town, a.county]
        .filter(Boolean).slice(0, 2).join(", ");
      return {
        nama: rapikan(nama || q),
        alamat: wilayah || (b.display_name || "").split(",").slice(1, 3).join(",").trim(),
        lat: Number(b.lat), lng: Number(b.lon),
      };
    }).filter((t) => Number.isFinite(t.lat) && Number.isFinite(t.lng));

    simpanan.set(kunci, { hasil, pada: Date.now() });
    return Response.json({ hasil });
  } catch (e) {
    return Response.json(
      { hasil: [], error: e instanceof Error ? e.message : "gagal" },
      { status: 200 },
    );
  }
}
