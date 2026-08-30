import { createClient } from "@/lib/supabase/client";
import { tanpaDemo } from "@/lib/tanpa-demo";

// Rekor pribadi.
//
// Catatan penting soal kejujuran data: yang dibandingkan hanyalah hal yang
// benar-benar tersimpan per perjalanan, yaitu jarak, durasi, elevasi, dan
// kecepatan rata-rata. Rekor semacam "5 km tercepat" TIDAK dihitung, karena
// jejak rute yang kita simpan tidak memuat cap waktu per titik; menghitungnya
// dari rata-rata hanya akan menghasilkan angka yang terlihat meyakinkan tapi
// tidak benar.
export type Rekor = { jenis: string; nilai: string; selisih: string };

export async function periksaRekorPribadi(
  userId: string,
  sekarang: { distanceM: number; durationS: number; elevM: number },
): Promise<Rekor[]> {
  const sb = createClient();
  // Kolom penanda contoh bisa saja belum dipasang; bila begitu, kueri diulang
  // tanpa penyaring itu agar rekor pribadi tetap bisa dihitung.
  const { data, error } = await tanpaDemo((saring) => {
    const q = sb
      .from("activities")
      .select("distance_m,duration_s,elevation_gain_m,started_at")
      .eq("user_id", userId);
    return (saring ? q.eq("is_demo", false) : q)
      .order("started_at", { ascending: false })
      .limit(400);
  });
  if (error || !data || data.length < 2) return [];

  // Perjalanan terbaru adalah yang baru saja disimpan, jadi dikeluarkan dari
  // pembanding. Tanpa ini, setiap perjalanan akan selalu "menyamai rekor".
  const sebelumnya = data.slice(1);
  if (sebelumnya.length === 0) return [];

  const angka = (v: unknown) => Number(v) || 0;
  const kmSekarang = sekarang.distanceM / 1000;
  const rekor: Rekor[] = [];

  // 1) Jarak terjauh
  const jarakTerjauh = Math.max(...sebelumnya.map((r) => angka(r.distance_m))) / 1000;
  if (kmSekarang > jarakTerjauh && kmSekarang >= 0.5) {
    rekor.push({
      jenis: "Jarak terjauh",
      nilai: `${kmSekarang.toFixed(2).replace(".", ",")} km`,
      selisih: `lebih jauh ${(kmSekarang - jarakTerjauh).toFixed(2).replace(".", ",")} km`,
    });
  }

  // 2) Kecepatan rata-rata tertinggi, hanya untuk perjalanan minimal 2 km
  //    supaya perjalanan pendek tidak memunculkan rekor palsu.
  if (kmSekarang >= 2 && sekarang.durationS > 0) {
    const rataSekarang = kmSekarang / (sekarang.durationS / 3600);
    const pembanding = sebelumnya
      .filter((r) => angka(r.distance_m) >= 2000 && angka(r.duration_s) > 0)
      .map((r) => (angka(r.distance_m) / 1000) / (angka(r.duration_s) / 3600));
    if (pembanding.length) {
      const tertinggi = Math.max(...pembanding);
      if (rataSekarang > tertinggi) {
        rekor.push({
          jenis: "Kecepatan rata-rata tertinggi",
          nilai: `${rataSekarang.toFixed(1).replace(".", ",")} km/j`,
          selisih: `lebih cepat ${(rataSekarang - tertinggi).toFixed(1).replace(".", ",")} km/j`,
        });
      }
    }
  }

  // 3) Elevasi terbanyak
  const elevTertinggi = Math.max(...sebelumnya.map((r) => angka(r.elevation_gain_m)));
  if (sekarang.elevM > elevTertinggi && sekarang.elevM >= 10) {
    rekor.push({
      jenis: "Elevasi terbanyak",
      nilai: `${Math.round(sekarang.elevM)} m`,
      selisih: `lebih tinggi ${Math.round(sekarang.elevM - elevTertinggi)} m`,
    });
  }

  // 4) Durasi terlama
  const durasiTerlama = Math.max(...sebelumnya.map((r) => angka(r.duration_s)));
  if (sekarang.durationS > durasiTerlama && sekarang.durationS >= 300) {
    const m = Math.round((sekarang.durationS - durasiTerlama) / 60);
    rekor.push({
      jenis: "Waktu terlama",
      nilai: `${Math.floor(sekarang.durationS / 60)} menit`,
      selisih: m >= 1 ? `lebih lama ${m} menit` : "lebih lama dari sebelumnya",
    });
  }

  return rekor;
}
