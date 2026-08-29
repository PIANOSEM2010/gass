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

// Kotak pembatas kasar Kabupaten Bulungan dan sekitarnya, supaya "Jl. Durian"
// tidak tertukar dengan jalan bernama sama di Jawa.
const KOTAK = { kiri: 116.60, atas: 3.60, kanan: 118.10, bawah: 2.20 };

function rapikan(nama: string): string {
  return nama.replace(/^Jalan\s+/i, "Jl. ").replace(/^Gang\s+/i, "Gg. ").trim();
}

export async function GET(req: Request) {
  const u = new URL(req.url);
  const q = (u.searchParams.get("q") || "").trim();
  if (q.length < 3) return Response.json({ hasil: [] });

  const kunci = q.toLowerCase();
  const ada = simpanan.get(kunci);
  if (ada && Date.now() - ada.pada < UMUR_MS) {
    return Response.json({ hasil: ada.hasil, dari: "simpanan" });
  }

  try {
    const url =
      `https://nominatim.openstreetmap.org/search?format=jsonv2` +
      `&q=${encodeURIComponent(q)}` +
      `&viewbox=${KOTAK.kiri},${KOTAK.atas},${KOTAK.kanan},${KOTAK.bawah}` +
      `&bounded=1&limit=6&addressdetails=1&accept-language=id`;
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
