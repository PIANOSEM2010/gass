import { createClient } from "@/lib/supabase/client";

// Wilayah pengguna.
//
// Aplikasi ini lahir untuk Kabupaten Bulungan, dan banyak bagiannya dulu
// menuliskan nama itu secara tetap: judul dasbor, titik awal peta, batas
// pencarian tempat, dan nama tempat cadangan pada kartu. Modul ini menggantikan
// semuanya dengan wilayah milik penggunanya sendiri.
//
// Wilayah didapat dari dua arah, dan keduanya dipakai bersama:
//   1. Dipilih sendiri saat mendaftar, atau diubah kapan saja lewat profil.
//   2. Dideteksi dari lokasi peranti, sebagai usulan saat mendaftar dan sebagai
//      cadangan bila profilnya belum terisi.
//
// Hasilnya disimpan di peranti supaya halaman tidak perlu menunggu jaringan
// setiap kali membutuhkan nama wilayah.
export type Wilayah = {
  nama: string;       // "Kabupaten Bulungan"
  provinsi: string;   // "Kalimantan Utara"
  lat: number;
  lng: number;
};

// Dipakai hanya bila pengguna belum punya wilayah dan lokasinya tidak diketahui.
export const WILAYAH_BAWAAN: Wilayah = {
  nama: "Kabupaten Bulungan",
  provinsi: "Kalimantan Utara",
  lat: 2.8450,
  lng: 117.3680,
};

const KUNCI = "bug-wilayah";

export function bacaWilayahTersimpan(): Wilayah | null {
  try {
    const t = window.localStorage.getItem(KUNCI);
    if (!t) return null;
    const w = JSON.parse(t) as Wilayah;
    return w?.nama && Number.isFinite(w.lat) ? w : null;
  } catch { return null; }
}

export function simpanWilayah(w: Wilayah) {
  try { window.localStorage.setItem(KUNCI, JSON.stringify(w)); } catch { /* mode privat */ }
}

/** Nama wilayah untuk ditampilkan, tanpa menunggu jaringan. */
export function namaWilayahCepat(): string {
  return bacaWilayahTersimpan()?.nama || WILAYAH_BAWAAN.nama;
}

/**
 * Mendeteksi wilayah dari lokasi peranti.
 * Dipakai sebagai usulan saat mendaftar, dan sebagai cadangan bila profil
 * penggunanya belum terisi.
 */
export async function deteksiWilayah(): Promise<Wilayah | null> {
  try {
    const { getPositionOnce } = await import("@/lib/native-geo");
    const p = await getPositionOnce(12000);
    const lat = p.coords.latitude, lng = p.coords.longitude;

    const res = await fetch(`/api/place-name?lat=${lat}&lng=${lng}`, { cache: "no-store" });
    const j = (await res.json()) as { ok?: boolean; name?: string; provinsi?: string };
    if (!j?.name) return null;

    return {
      nama: j.name,
      provinsi: j.provinsi || "",
      lat, lng,
    };
  } catch {
    return null;
  }
}

/** Mengambil wilayah pengguna dari profilnya, lalu menyimpannya di peranti. */
export async function muatWilayahPengguna(): Promise<Wilayah> {
  const tersimpan = bacaWilayahTersimpan();
  if (tersimpan) return tersimpan;

  try {
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (user) {
      const { data } = await sb.from("profiles")
        .select("region,province,region_lat,region_lng")
        .eq("id", user.id).maybeSingle();
      if (data?.region) {
        const w: Wilayah = {
          nama: String(data.region),
          provinsi: String(data.province || ""),
          lat: Number(data.region_lat) || WILAYAH_BAWAAN.lat,
          lng: Number(data.region_lng) || WILAYAH_BAWAAN.lng,
        };
        simpanWilayah(w);
        return w;
      }
    }
  } catch { /* jaringan bermasalah; lanjut ke deteksi */ }

  const terdeteksi = await deteksiWilayah();
  if (terdeteksi) { simpanWilayah(terdeteksi); return terdeteksi; }

  return WILAYAH_BAWAAN;
}

/** Menyimpan wilayah ke profil pengguna. */
export async function simpanWilayahKeProfil(w: Wilayah): Promise<void> {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return;
  const { error } = await sb.from("profiles").update({
    region: w.nama,
    province: w.provinsi || null,
    region_lat: w.lat,
    region_lng: w.lng,
  }).eq("id", user.id);
  if (error) throw new Error(error.message);
  simpanWilayah(w);
}
