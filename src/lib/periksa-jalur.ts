import type { Titik } from "@/components/jejak-rute";

type Zona = { lat: number; lng: number; radius_m?: number | null; name?: string | null };

// Jarak dua titik dalam meter (cukup akurat untuk jarak pendek).
function meterAntara(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat = ((a.lat + b.lat) / 2) * (Math.PI / 180);
  const x = dLng * Math.cos(lat);
  return Math.sqrt(dLat * dLat + x * x) * 6371000;
}

export type HasilPeriksa = {
  aman: boolean;
  pelanggaran: { nama: string; jarak_m: number }[];
};

// Memeriksa apakah sebuah jalur benar-benar menjauhi zona rawan.
//
// Ini lapisan kedua, bukan pengganti penghindaran di sisi penyedia rute.
// OpenRouteService bisa mengabaikan permintaan avoid_polygons bila tidak ada
// jalan alternatif, dan diam-diam mengembalikan rute yang tetap melintas.
// Karena itu hasilnya diperiksa ulang di sini sebelum ditawarkan ke pengguna:
// aplikasi keselamatan tidak boleh menyarankan jalur melewati titik rawan
// tanpa memberi tahu.
export function periksaJalurAman(
  path: Titik[],
  zona: Zona[],
  tambahanMeter = 25,
): HasilPeriksa {
  if (!path?.length || !zona?.length) return { aman: true, pelanggaran: [] };

  // Titik jalur diringkas supaya pemeriksaan tetap ringan di ponsel.
  const langkah = Math.max(1, Math.ceil(path.length / 300));
  const titik = path.filter((_, i) => i % langkah === 0);

  const pelanggaran: { nama: string; jarak_m: number }[] = [];
  for (const z of zona) {
    const batas = (z.radius_m ?? 60) + tambahanMeter;
    let terdekat = Infinity;
    for (const t of titik) {
      const d = meterAntara(t, z);
      if (d < terdekat) terdekat = d;
      if (terdekat < batas) break;
    }
    if (terdekat < batas) {
      pelanggaran.push({ nama: z.name || "Zona rawan", jarak_m: Math.round(terdekat) });
    }
  }
  return { aman: pelanggaran.length === 0, pelanggaran };
}
