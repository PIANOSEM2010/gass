// Menentukan apakah sebuah event sudah lewat.
//
// Aturannya berbasis TANGGAL, bukan jam: event yang dilaksanakan hari ini tetap
// aktif sepanjang hari itu, dan baru masuk daftar selesai keesokan harinya.
// Memakai jam akan membingungkan, karena gowes bareng sering molor dan peserta
// yang datang telat akan menemukan eventnya sudah "selesai" padahal rombongan
// masih di jalan.
//
// Semua perbandingan memakai waktu Bulungan (WITA, UTC+8), bukan waktu peladen,
// supaya event tidak berpindah hari hanya karena letak peladen Netlify.
const WITA_MS = 8 * 3600 * 1000;

function tanggalWita(waktu: number): string {
  return new Date(waktu + WITA_MS).toISOString().slice(0, 10);
}

/** Tanggal hari ini menurut waktu Bulungan, bentuk YYYY-MM-DD. */
export function hariIniWita(): string {
  return tanggalWita(Date.now());
}

/**
 * Event dianggap selesai bila tanggal pelaksanaannya sudah lewat.
 * Event tanpa waktu tidak pernah dianggap selesai, karena panitianya belum
 * menentukan kapan akan berlangsung.
 */
export function eventSelesai(mulai: string | null | undefined): boolean {
  if (!mulai) return false;
  const t = new Date(mulai).getTime();
  if (!Number.isFinite(t)) return false;
  return tanggalWita(t) < hariIniWita();
}

/** Event sedang berlangsung: tanggal pelaksanaannya adalah hari ini. */
export function eventHariIni(mulai: string | null | undefined): boolean {
  if (!mulai) return false;
  const t = new Date(mulai).getTime();
  if (!Number.isFinite(t)) return false;
  return tanggalWita(t) === hariIniWita();
}
