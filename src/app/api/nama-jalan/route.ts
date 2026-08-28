export const runtime = "nodejs";

// Nama JALAN dari koordinat, di sisi server.
//
// Berbeda dari /api/place-name yang mengembalikan tingkat kabupaten/kota,
// jalur ini mencari tingkat jalan: "Jl. Jelarai Raya", "Jl. Durian", dan
// seterusnya. Dipakai untuk menandai rute: mulai dari jalan mana, melewati
// jalan apa, selesai di mana.
//
// Dikerjakan di server karena Nominatim mewajibkan identitas aplikasi pada
// setiap permintaan, dan hasilnya bisa disimpan sementara untuk dipakai
// bersama semua pengguna sehingga tidak membebani layanan gratis itu.
type Simpanan = { nama: string; pada: number };
const simpanan = new Map<string, Simpanan>();
const UMUR_MS = 7 * 24 * 3600 * 1000;

const UA = "BUG-BulunganUntukGoweser/1.0 (https://gass-bulungan.netlify.app)";

// Dibulatkan ke ~50 meter supaya titik yang berdekatan memakai hasil yang sama.
function kunci(lat: number, lng: number) {
  return `${lat.toFixed(4)},${lng.toFixed(4)}`;
}

function rapikan(nama: string): string {
  return nama
    .replace(/^Jalan\s+/i, "Jl. ")
    .replace(/^Gang\s+/i, "Gg. ")
    .trim();
}

export async function GET(req: Request) {
  const u = new URL(req.url);
  const lat = Number(u.searchParams.get("lat"));
  const lng = Number(u.searchParams.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return Response.json({ error: "lat/lng tidak sah" }, { status: 400 });
  }

  const k = kunci(lat, lng);
  const ada = simpanan.get(k);
  if (ada && Date.now() - ada.pada < UMUR_MS) {
    return Response.json({ nama: ada.nama, dari: "simpanan" });
  }

  try {
    const url =
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2` +
      `&lat=${lat}&lon=${lng}&zoom=17&addressdetails=1&accept-language=id`;
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Nominatim ${res.status}`);
    const j = (await res.json()) as { address?: Record<string, string>; name?: string };
    const a = j.address || {};

    // Urutan pencarian: nama jalan lebih dulu, lalu penanda tempat, lalu
    // wilayah terkecil yang masih berguna bagi pengguna.
    const nama =
      a.road || a.pedestrian || a.footway || a.cycleway || a.path ||
      j.name || a.neighbourhood || a.hamlet || a.suburb ||
      a.village || a.town || "";

    const hasil = nama ? rapikan(nama) : "";
    if (hasil) simpanan.set(k, { nama: hasil, pada: Date.now() });
    return Response.json({ nama: hasil });
  } catch (e) {
    return Response.json(
      { nama: "", error: e instanceof Error ? e.message : "gagal" },
      { status: 200 },
    );
  }
}
