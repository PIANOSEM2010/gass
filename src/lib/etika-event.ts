import type { TitikEvent } from "@/lib/titik-event";

// Etika bersepeda selama event, disusun sistem.
//
// Sebelumnya kolom ini diketik sendiri oleh pengaju, dan itu bermasalah: yang
// paling perlu diingatkan justru yang paling jarang ditulis, dan tiap event
// jadi punya aturan berbeda-beda untuk situasi yang sama. Sekarang aturannya
// disusun dari sifat jalur itu sendiri, sehingga setiap event mendapat
// peringatan yang memang relevan dengannya.
export function susunEtikaEvent(o: {
  titik: TitikEvent[];
  distanceM: number;
  mulai: string | null;
  adaZonaRawan: boolean;
  namaZona: string[];
}): string[] {
  const aturan: string[] = [];
  const km = o.distanceM / 1000;
  const jumlahCek = o.titik.filter((t) => t.cek).length;

  // --- Aturan dasar rombongan, berlaku untuk semua event ---
  aturan.push("Berjajar paling banyak dua orang, dan menyusut jadi satu banjar begitu ada kendaraan hendak menyusul.");
  aturan.push("Teruskan aba-aba bahaya dari depan ke belakang: lubang, pasir, kendaraan berhenti, atau anjing di pinggir jalan.");
  aturan.push("Peserta paling berpengalaman berada di barisan paling belakang, bukan paling depan.");
  aturan.push("Rombongan berjalan mengikuti kecepatan peserta paling lambat. Jangan pernah meninggalkan siapa pun sendirian.");

  // --- Waktu berangkat menentukan kebutuhan lampu ---
  if (o.mulai) {
    const jam = new Date(o.mulai).getHours();
    if (jam < 6 || jam >= 17) {
      aturan.push("Berangkat saat hari masih gelap: lampu belakang merah wajib menyala, dan lampu depan putih untuk melihat jalan. Pakaian terang saja tidak cukup.");
    } else if (jam >= 15) {
      aturan.push("Perjalanan berpotensi selesai menjelang magrib. Bawa lampu belakang merah dan nyalakan sebelum langit meredup.");
    } else if (jam >= 10 && jam < 15) {
      aturan.push("Berangkat pada jam terik. Bawa air minimal 500 ml per 10 km dan berhenti minum di tiap cek point.");
    }
  }

  // --- Panjang jalur menentukan kebutuhan istirahat dan perbekalan ---
  if (km >= 30) {
    aturan.push(`Jalur sepanjang ${km.toFixed(1).replace(".", ",")} km termasuk jauh. Bawa ban dalam cadangan, pompa, dan kunci L. Periksa tekanan ban sebelum berangkat.`);
  } else if (km >= 15) {
    aturan.push("Periksa tekanan ban, rem, dan kekencangan roda sebelum berangkat. Tiga hal itu yang paling sering menyebabkan celaka di tengah jalan.");
  }

  // --- Cek point ---
  if (jumlahCek >= 2) {
    aturan.push(`Berkumpul kembali di setiap cek point (${jumlahCek} titik). Rombongan baru melanjutkan setelah peserta terakhir tiba.`);
  }

  // --- Zona rawan ---
  if (o.adaZonaRawan) {
    const daftar = o.namaZona.slice(0, 3).join(", ");
    aturan.push(`Jalur ini melewati zona rawan${daftar ? ` (${daftar})` : ""}. Turunkan kecepatan, satu banjar, dan jangan menyalip sesama peserta di bagian itu.`);
  }

  // --- Aturan penutup, selalu ada ---
  aturan.push("Helm wajib dipakai sepanjang perjalanan, termasuk saat rombongan berjalan pelan.");
  aturan.push("Patuhi lampu pengatur lalu lintas. Rombongan yang terpotong lampu merah menunggu di seberang, bukan menerobos agar tetap bersama.");
  aturan.push("Bila ada peserta jatuh atau sakit, seluruh rombongan berhenti dan gunakan tombol SOS di aplikasi BUG.");

  return aturan;
}
