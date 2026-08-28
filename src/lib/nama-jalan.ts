// Nama jalan dari koordinat, untuk menandai titik-titik pada rute.
const simpanan = new Map<string, string>();

export async function namaJalan(lat: number, lng: number): Promise<string> {
  const k = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  const ada = simpanan.get(k);
  if (ada !== undefined) return ada;
  try {
    const res = await fetch(`/api/nama-jalan?lat=${lat}&lng=${lng}`, { cache: "no-store" });
    const j = (await res.json()) as { nama?: string };
    const nama = j?.nama || "";
    simpanan.set(k, nama);
    return nama;
  } catch {
    return "";
  }
}

// Mengambil nama jalan beberapa titik sekaligus, satu per satu dengan jeda.
// Nominatim adalah layanan gratis dengan batas satu permintaan per detik;
// menembakkan semuanya serentak berisiko diblokir, dan penanda rute jadi kosong.
export async function namaBeberapaJalan(
  titik: { lat: number; lng: number }[],
  jeda = 1100,
): Promise<string[]> {
  const hasil: string[] = [];
  for (let i = 0; i < titik.length; i++) {
    hasil.push(await namaJalan(titik[i].lat, titik[i].lng));
    if (i < titik.length - 1) await new Promise((r) => setTimeout(r, jeda));
  }
  return hasil;
}
