import type { Titik } from "@/components/jejak-rute";

// Menggambar peta OpenStreetMap ke dalam kanvas.
//
// Dipakai kartu event supaya rutenya terlihat di atas peta sungguhan - dengan
// nama jalan dan sungai - bukan garis mengambang di bidang kosong. Orang yang
// menerima kartunya jadi langsung tahu jalurnya lewat mana.
//
// Ubinnya diambil melalui /api/ubin, bukan langsung dari server OpenStreetMap,
// supaya kanvasnya tidak tercemar dan kartunya tetap bisa diekspor.

const UKURAN_UBIN = 256;

function lonKeX(lon: number, z: number) {
  return ((lon + 180) / 360) * 2 ** z;
}
function latKeY(lat: number, z: number) {
  const r = (lat * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z;
}

export type PetaTergambar = {
  /** Mengubah koordinat bumi menjadi titik pada kanvas. */
  keKanvas: (t: Titik) => [number, number];
  zoom: number;
  berhasil: boolean;
};

function muatGambar(src: string): Promise<HTMLImageElement | null> {
  return new Promise((res) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => res(null);
    im.src = src;
  });
}

/**
 * Menggambar peta yang memuat seluruh jalur, di dalam kotak yang diberikan.
 *
 * @param c konteks kanvas
 * @param path titik-titik jalur yang harus masuk semuanya
 * @param kotak area pada kanvas tempat peta digambar
 * @param opsi.gelap menggelapkan peta agar cocok dengan kartu berlatar gelap
 */
export async function gambarPetaOsm(
  c: CanvasRenderingContext2D,
  path: Titik[],
  kotak: { x: number; y: number; w: number; h: number },
  opsi: { gelap?: boolean; pad?: number } = {},
): Promise<PetaTergambar> {
  const pad = opsi.pad ?? 70;
  const bersih = path.filter((t) => t && Number.isFinite(t.lat) && Number.isFinite(t.lng));

  if (bersih.length === 0) {
    return { keKanvas: () => [kotak.x, kotak.y], zoom: 13, berhasil: false };
  }

  const lats = bersih.map((t) => t.lat), lngs = bersih.map((t) => t.lng);
  const miLa = Math.min(...lats), maLa = Math.max(...lats);
  const miLo = Math.min(...lngs), maLo = Math.max(...lngs);

  // Zoom terbesar yang masih memuat seluruh jalur di dalam kotak.
  //
  // Ubin diambil SATU TINGKAT lebih dekat lalu digambar setengah ukuran.
  // Ini cara yang sama dipakai peta pada layar beresolusi tinggi: jumlah
  // piksel peta jadi dua kali lipat pada luas yang sama, sehingga nama jalan
  // dan garis jalannya terbaca. Tanpa ini, rute panjang memaksa zoom rendah
  // dan petanya hanya menampilkan nama desa tanpa jalan sama sekali.
  const LIPAT = 2;
  const ubinTampil = UKURAN_UBIN / LIPAT;

  let dasar = 10;
  for (let z = 17; z >= 10; z--) {
    const lebar = (lonKeX(maLo, z) - lonKeX(miLo, z)) * ubinTampil;
    const tinggi = (latKeY(miLa, z) - latKeY(maLa, z)) * ubinTampil;
    if (lebar <= kotak.w - pad * 2 && tinggi <= kotak.h - pad * 2) { dasar = z; break; }
  }
  const zoom = dasar;

  // Titik tengah jalur, dalam satuan piksel tampilan pada zoom itu.
  const pusatX = ((lonKeX(miLo, zoom) + lonKeX(maLo, zoom)) / 2) * ubinTampil;
  const pusatY = ((latKeY(miLa, zoom) + latKeY(maLa, zoom)) / 2) * ubinTampil;

  // Sudut kiri atas kotak, dalam piksel dunia.
  const asalX = pusatX - kotak.w / 2;
  const asalY = pusatY - kotak.h / 2;

  const keKanvas = (t: Titik): [number, number] => [
    kotak.x + lonKeX(t.lng, zoom) * ubinTampil - asalX,
    kotak.y + latKeY(t.lat, zoom) * ubinTampil - asalY,
  ];

  // Ubin mana saja yang tersentuh kotak ini.
  const ubinX1 = Math.floor(asalX / ubinTampil);
  const ubinX2 = Math.floor((asalX + kotak.w) / ubinTampil);
  const ubinY1 = Math.floor(asalY / ubinTampil);
  const ubinY2 = Math.floor((asalY + kotak.h) / ubinTampil);
  const batas = 2 ** zoom;

  const daftar: { z: number; x: number; y: number; kx: number; ky: number }[] = [];
  for (let tx = ubinX1; tx <= ubinX2; tx++) {
    for (let ty = ubinY1; ty <= ubinY2; ty++) {
      if (tx < 0 || ty < 0 || tx >= batas || ty >= batas) continue;
      daftar.push({
        z: zoom, x: tx, y: ty,
        kx: kotak.x + tx * ubinTampil - asalX,
        ky: kotak.y + ty * ubinTampil - asalY,
      });
    }
  }

  // Jumlah ubin dibatasi agar satu kartu tidak menarik puluhan berkas.
  // Batas jumlah ubin. Karena tiap ubin digambar setengah ukuran, satu kartu
  // memerlukan lebih banyak ubin daripada sebelumnya, tapi masing-masing kecil
  // dan tersimpan di sisi peladen sehingga tidak diminta ulang.
  if (daftar.length > 90) return { keKanvas, zoom, berhasil: false };

  const gambar = await Promise.all(
    daftar.map((u) => muatGambar(`/api/ubin?z=${u.z}&x=${u.x}&y=${u.y}`)),
  );

  let terpasang = 0;
  c.save();
  c.beginPath();
  c.rect(kotak.x, kotak.y, kotak.w, kotak.h);
  c.clip();

  gambar.forEach((im, i) => {
    if (!im) return;
    c.drawImage(im, daftar[i].kx, daftar[i].ky, ubinTampil, ubinTampil);
    terpasang++;
  });

  // Peta diredam sedikit agar rutenya menonjol dan warnanya sejalan dengan
  // kartu. Tanpa ini, warna-warni peta bersaing dengan garis rute.
  if (terpasang > 0) {
    // Hanya diredam sangat tipis. Percobaan sebelumnya memakai lapisan gelap
    // 42 persen dan hasilnya petanya tidak terbaca sama sekali - yang justru
    // menghilangkan alasan memasang peta di kartu ini.
    c.fillStyle = opsi.gelap ? "rgba(10,20,16,.10)" : "rgba(255,255,255,.06)";
    c.fillRect(kotak.x, kotak.y, kotak.w, kotak.h);
  }
  c.restore();

  return { keKanvas, zoom, berhasil: terpasang > 0 };
}

/** Keterangan hak cipta yang wajib menyertai peta OpenStreetMap. */
export const KREDIT_OSM = "© OpenStreetMap contributors";
