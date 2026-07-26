// Menentukan NAMA KOTA/KABUPATEN dari koordinat GPS (reverse geocoding).
//
// Dipakai kartu gowes & caption agar tulisannya mengikuti lokasi asli
// perjalanan (mis. "GOWES DI TARAKAN" saat gowes di Tarakan), bukan
// nama daerah tetap.

type Pt = { lat: number; lng: number };

// Cache per koordinat yang dibulatkan (~1 km) agar tidak memanggil berulang
const cache = new Map<string, string>();

function keyOf(lat: number, lng: number): string {
  return `${lat.toFixed(2)},${lng.toFixed(2)}`;
}

export function pickName(a: Record<string, string>): string {
  // Di Indonesia, tingkat kabupaten/kota hampir selalu diberi label eksplisit
  // ("Kabupaten Bulungan", "Kota Tarakan", "Kabupaten Malinau"). Itu penanda
  // paling bisa dipercaya, jadi dicari lebih dulu di SELURUH field alamat —
  // sebelum jatuh ke urutan umum di bawahnya.
  const values = Object.values(a || {}).filter((v) => typeof v === "string");
  const kabKota = values.find((v) => /^(Kabupaten|Kota)\s+/i.test(v));
  const raw =
    kabKota ||
    a.county ||        // umumnya memuat kabupaten/kota
    a.city ||          // kota
    a.regency ||
    a.municipality ||
    a.town ||
    a.city_district ||
    a.village ||
    a.suburb ||
    a.state ||         // provinsi sebagai pilihan terakhir
    "";
  return raw
    .replace(/^(Kabupaten|Kota Administrasi|Kota|Kecamatan|Kelurahan|Desa|Daerah Khusus Ibukota)\s+/i, "")
    .trim();
}

async function fetchOnce(lat: number, lng: number, zoom: number): Promise<string> {
  const url =
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2` +
    `&lat=${lat}&lon=${lng}&zoom=${zoom}&addressdetails=1&accept-language=id`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`geocode ${res.status}`);
  const j = await res.json();
  return pickName(j.address || {});
}

// Ambil nama tempat dari satu titik. Mengembalikan "" bila gagal.
//
// Utamakan lewat server aplikasi (/api/place-name): di sana permintaan
// mengirim identitas aplikasi & hasilnya di-cache bersama, jadi lebih andal.
// Bila route tidak tersedia, baru minta langsung dari layanan peta.
export async function reverseGeocodePlace(lat: number, lng: number): Promise<string> {
  const k = keyOf(lat, lng);
  const hit = cache.get(k);
  if (hit !== undefined) return hit;

  // 1. Lewat server aplikasi
  try {
    const res = await fetch(`/api/place-name?lat=${lat}&lng=${lng}`, { cache: "no-store" });
    if (res.ok) {
      const j = (await res.json()) as { name?: string };
      if (j?.name) {
        cache.set(k, j.name);
        return j.name;
      }
    }
  } catch {
    /* lanjut ke cara langsung */
  }

  // 2. Langsung ke layanan peta (cadangan)
  for (const zoom of [10, 12]) {
    try {
      const name = await fetchOnce(lat, lng, zoom);
      if (name) {
        cache.set(k, name);
        return name;
      }
    } catch {
      await new Promise((r) => setTimeout(r, 700));
    }
  }
  return "";
}

// Ambil nama tempat dari sebuah jalur perjalanan (memakai titik tengah,
// paling mewakili keseluruhan rute).
export async function placeNameFromPath(path: Pt[] | null | undefined): Promise<string> {
  if (!path || path.length === 0) return "";
  const mid = path[Math.floor(path.length / 2)];
  if (!mid || typeof mid.lat !== "number" || typeof mid.lng !== "number") return "";
  return reverseGeocodePlace(mid.lat, mid.lng);
}
