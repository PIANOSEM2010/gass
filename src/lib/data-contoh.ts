import type { TitikEvent } from "@/lib/titik-event";
import type { Titik } from "@/components/jejak-rute";

// Pembuat perjalanan CONTOH untuk peragaan.
//
// Semua yang dihasilkan di sini ditandai `is_demo` di basis data, dan penandanya
// melekat pada barisnya, bukan hanya pada tampilan. Perjalanan contoh tidak
// pernah ikut dihitung dalam statistik pribadi maupun papan peringkat, dan bisa
// dihapus seluruhnya dengan satu perintah.
//
// Data contoh berguna untuk memperagakan aplikasi saat presentasi ketika belum
// ada peserta yang sempat merekam. Ia bukan pengganti data sungguhan, dan tidak
// boleh dipakai untuk mengklaim jumlah pengguna.

/** Panjang jalur dalam meter. */
function panjang(path: Titik[]): number {
  let m = 0;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i];
    const dLat = ((b.lat - a.lat) * Math.PI) / 180;
    const dLng = ((b.lng - a.lng) * Math.PI) / 180;
    const lat = ((a.lat + b.lat) / 2) * (Math.PI / 180);
    m += Math.sqrt(dLat * dLat + (dLng * Math.cos(lat)) ** 2) * 6371000;
  }
  return m;
}

/**
 * Membentuk jejak yang mengikuti jalur event dengan simpangan kecil.
 *
 * Simpangannya sengaja ada: dua orang yang menggowes rute sama tidak akan
 * menghasilkan jejak yang persis identik, dan jejak yang identik justru menjadi
 * penanda bahwa datanya dibuat mesin.
 */
function jejakDariJalur(jalur: TitikEvent[], acak: () => number): Titik[] {
  const hasil: Titik[] = [];
  const simpangan = 0.00012; // sekitar 13 meter

  for (let i = 1; i < jalur.length; i++) {
    const a = jalur[i - 1], b = jalur[i];
    // Tiap ruas dipecah agar jejaknya rapat seperti rekaman GPS sungguhan.
    const bagian = 6;
    for (let k = 0; k < bagian; k++) {
      const t = k / bagian;
      hasil.push({
        lat: a.lat + (b.lat - a.lat) * t + (acak() - 0.5) * simpangan,
        lng: a.lng + (b.lng - a.lng) * t + (acak() - 0.5) * simpangan,
      });
    }
  }
  const akhir = jalur[jalur.length - 1];
  if (akhir) hasil.push({ lat: akhir.lat, lng: akhir.lng });
  return hasil;
}

/** Pengacak dengan benih tetap, supaya hasilnya bisa diulang bila perlu. */
function pengacak(benih: number): () => number {
  let s = benih >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export type PerjalananContoh = {
  demo_name: string;
  distance_m: number;
  duration_s: number;
  elevation_gain_m: number;
  path: Titik[];
  started_at: string;
  activity_date: string;
  note: string;
};

/**
 * Menyusun sejumlah perjalanan contoh sepanjang jalur sebuah event.
 *
 * @param nama daftar nama peserta yang akan diwakili
 * @param mulaiEvent waktu mulai event; perjalanan disebar di sekitarnya
 */
export function buatPerjalananContoh(
  jalur: TitikEvent[],
  nama: string[],
  mulaiEvent: Date,
  namaEvent: string,
): PerjalananContoh[] {
  if (jalur.length < 2) return [];

  return nama.map((n, i) => {
    const acak = pengacak(1000 + i * 7919);
    const path = jejakDariJalur(jalur, acak);
    const jarak = panjang(path);

    // Kecepatan rata-rata rombongan gowes santai: 13 sampai 21 km/jam.
    const kecepatan = 13 + acak() * 8;
    const durasi = Math.round((jarak / 1000 / kecepatan) * 3600);

    // Peserta berangkat tidak serentak: tersebar dalam 12 menit pertama.
    const geserMenit = Math.round(acak() * 12);
    const mulai = new Date(mulaiEvent.getTime() + geserMenit * 60000);

    // Elevasi wajar untuk Bulungan yang relatif datar.
    const elevasi = Math.round((jarak / 1000) * (2 + acak() * 5));

    return {
      demo_name: n,
      distance_m: Math.round(jarak),
      duration_s: durasi,
      elevation_gain_m: elevasi,
      path,
      started_at: mulai.toISOString(),
      activity_date: new Date(mulai.getTime() + 8 * 3600000).toISOString().slice(0, 10),
      note: `[CONTOH] ${namaEvent}`,
    };
  });
}

/** Nama peserta bawaan untuk peragaan. */
export const NAMA_CONTOH = [
  "Andi Prasetyo", "Bella Safitri", "Candra Wijaya", "Dewi Lestari",
  "Eko Nugroho", "Fitri Handayani", "Gilang Ramadhan", "Hana Puspita",
  "Irfan Maulana", "Julia Anggraini", "Kiki Rahmawati", "Lukman Hakim",
];
