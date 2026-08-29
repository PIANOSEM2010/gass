import type { Titik } from "@/components/jejak-rute";

type Zona = { lat: number; lng: number; radius_m?: number | null; name?: string | null };

// Mengubah selisih derajat menjadi meter pada lintang tertentu. Cukup akurat
// untuk jarak pendek seperti lebar zona rawan.
function keMeter(dLat: number, dLng: number, latRata: number) {
  return {
    y: dLat * 111320,
    x: dLng * 111320 * Math.cos((latRata * Math.PI) / 180),
  };
}

// Jarak terpendek dari sebuah titik ke RUAS garis a-b, dalam meter.
//
// Ini inti perbaikannya. Sebelumnya yang diukur hanyalah jarak ke titik-titik
// jalur, sehingga zona yang berada di samping jalan ikut tertangkap padahal
// jalannya tidak melewatinya. Sebaliknya, zona yang benar-benar dilintasi di
// tengah ruas panjang justru bisa lolos karena tidak ada titik di dekatnya.
// Mengukur ke ruasnya menjawab pertanyaan yang sebenarnya: apakah jalan ini
// melintasi zona itu.
function jarakKeRuas(
  p: { lat: number; lng: number },
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const latRata = (a.lat + b.lat) / 2;
  const A = keMeter(p.lat - a.lat, p.lng - a.lng, latRata);
  const B = keMeter(b.lat - a.lat, b.lng - a.lng, latRata);

  const panjangKuadrat = B.x * B.x + B.y * B.y;
  if (panjangKuadrat === 0) return Math.hypot(A.x, A.y);

  // Proyeksi titik ke ruas, dibatasi agar tidak keluar dari ujung-ujungnya.
  let t = (A.x * B.x + A.y * B.y) / panjangKuadrat;
  t = Math.max(0, Math.min(1, t));

  return Math.hypot(A.x - B.x * t, A.y - B.y * t);
}

export type HasilPeriksa = {
  aman: boolean;
  pelanggaran: { nama: string; jarak_m: number }[];
};

// Memeriksa apakah sebuah jalur benar-benar MELINTASI zona rawan.
//
// Peringatan hanya muncul bila jalannya masuk ke dalam radius zona, ditambah
// toleransi kecil untuk ketidaktepatan GPS dan lebar badan jalan. Zona yang
// hanya berada di dekat jalur tetapi tidak dilewati tidak lagi dilaporkan:
// peringatan yang terlalu sering muncul membuat orang berhenti membacanya,
// dan itu lebih berbahaya daripada tidak ada peringatan sama sekali.
export function periksaJalurAman(
  path: Titik[],
  zona: Zona[],
  toleransiMeter = 15,
): HasilPeriksa {
  if (!path || path.length < 2 || !zona?.length) return { aman: true, pelanggaran: [] };

  const titik = path.filter((t) => t && Number.isFinite(t.lat) && Number.isFinite(t.lng));
  if (titik.length < 2) return { aman: true, pelanggaran: [] };

  const pelanggaran: { nama: string; jarak_m: number }[] = [];

  for (const z of zona) {
    const batas = (z.radius_m ?? 60) + toleransiMeter;
    let terdekat = Infinity;

    for (let i = 1; i < titik.length; i++) {
      const d = jarakKeRuas(z, titik[i - 1], titik[i]);
      if (d < terdekat) terdekat = d;
      if (terdekat < batas) break;
    }

    if (terdekat < batas) {
      pelanggaran.push({ nama: z.name || "Zona rawan", jarak_m: Math.round(terdekat) });
    }
  }

  // Yang paling dalam dilintasi ditampilkan lebih dulu.
  pelanggaran.sort((a, b) => a.jarak_m - b.jarak_m);
  return { aman: pelanggaran.length === 0, pelanggaran };
}
