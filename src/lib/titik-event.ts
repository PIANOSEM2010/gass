// Titik pada jalur event.
//
// Jalur dibentuk dari banyak titik agar mengikuti bentuk jalan, tidak
// miring-miring memotong. Tetapi tidak semua titik perlu diberi nama: hanya
// yang ditandai sebagai CEK POINT yang mendapat huruf dan muncul di kartu
// bagikan. Cek point bukan tempat berhenti akhir; perjalanan tetap lanjut.
export type TitikEvent = {
  lat: number;
  lng: number;
  cek?: boolean;
  nama?: string;
};

export const HURUF_CEK = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

// Mengembalikan daftar cek point beserta hurufnya, urut sesuai jalur.
export function cekPoint(titik: TitikEvent[]): { indeks: number; huruf: string; titik: TitikEvent }[] {
  const hasil: { indeks: number; huruf: string; titik: TitikEvent }[] = [];
  titik.forEach((t, i) => {
    if (!t.cek) return;
    hasil.push({ indeks: i, huruf: HURUF_CEK[hasil.length] || "•", titik: t });
  });
  return hasil;
}

// Titik pertama dan terakhir selalu menjadi cek point: itu start dan finish.
export function tandaiUjung(titik: TitikEvent[]): TitikEvent[] {
  if (titik.length === 0) return titik;
  return titik.map((t, i) =>
    i === 0 || i === titik.length - 1 ? { ...t, cek: true } : t,
  );
}
