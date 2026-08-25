// Mengecilkan foto sebelum diunggah.
//
// Ini penyebab story lama muncul atau tidak muncul sama sekali di ponsel:
// foto kamera bisa 4000 px dan 5 MB, diunggah apa adanya lalu diunduh apa
// adanya lewat data seluler. Setelah dikecilkan ke sisi terpanjang 1280 px
// dengan mutu 0,82 ukurannya biasanya turun ke 150-350 KB.
export async function kecilkanGambar(
  berkas: File, sisiMaks = 1280, mutu = 0.82,
): Promise<Blob> {
  const gambar = await new Promise<HTMLImageElement>((res, rej) => {
    const url = URL.createObjectURL(berkas);
    const im = new Image();
    im.onload = () => { URL.revokeObjectURL(url); res(im); };
    im.onerror = () => { URL.revokeObjectURL(url); rej(new Error("Foto tidak bisa dibaca")); };
    im.src = url;
  });

  const skala = Math.min(1, sisiMaks / Math.max(gambar.width, gambar.height));
  // Foto yang sudah kecil tidak perlu diproses ulang.
  if (skala >= 1 && berkas.size < 500 * 1024) return berkas;

  const w = Math.round(gambar.width * skala);
  const h = Math.round(gambar.height * skala);
  const kanvas = document.createElement("canvas");
  kanvas.width = w; kanvas.height = h;
  const c = kanvas.getContext("2d");
  if (!c) return berkas;
  c.imageSmoothingQuality = "high";
  c.drawImage(gambar, 0, 0, w, h);

  return new Promise((res) => {
    kanvas.toBlob((b) => res(b || berkas), "image/jpeg", mutu);
  });
}
