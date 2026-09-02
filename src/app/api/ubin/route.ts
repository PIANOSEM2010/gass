export const runtime = "nodejs";

// Proksi ubin peta OpenStreetMap.
//
// Dipakai saat menggambar kartu event: peta latarnya perlu masuk ke dalam
// kanvas, lalu kanvas itu diekspor menjadi gambar untuk dibagikan.
//
// Kenapa lewat proksi, bukan langsung dari server ubin:
//   1. Kanvas yang memuat gambar dari domain lain menjadi "tercemar", dan
//      peramban menolak mengekspornya. Dengan proksi, ubinnya datang dari
//      domain yang sama sehingga kartunya bisa diunduh dan dibagikan.
//   2. OpenStreetMap mewajibkan setiap permintaan menyebut identitas
//      aplikasinya. Itu hanya bisa disetel di sisi server.
//   3. Hasilnya bisa disimpan sementara, jadi ubin yang sama tidak diminta
//      berulang kali oleh banyak pengguna sekaligus.
const UA = "BUG-BulunganUntukGoweser/1.0 (https://gass-bulungan.netlify.app)";

// Batas zoom dijaga agar tidak dipakai menarik ubin dalam jumlah besar.
const ZOOM_MIN = 10;
const ZOOM_MAKS = 17;

export async function GET(req: Request) {
  const u = new URL(req.url);
  const z = Number(u.searchParams.get("z"));
  const x = Number(u.searchParams.get("x"));
  const y = Number(u.searchParams.get("y"));

  if (![z, x, y].every(Number.isInteger)) {
    return new Response("Parameter tidak sah", { status: 400 });
  }
  if (z < ZOOM_MIN || z > ZOOM_MAKS) {
    return new Response("Zoom di luar batas", { status: 400 });
  }
  const batas = 2 ** z;
  if (x < 0 || y < 0 || x >= batas || y >= batas) {
    return new Response("Ubin di luar jangkauan", { status: 400 });
  }

  try {
    const res = await fetch(`https://tile.openstreetmap.org/${z}/${x}/${y}.png`, {
      headers: { "User-Agent": UA, Accept: "image/png,image/*" },
      // Disimpan sementara di sisi peladen: ubin peta praktis tidak berubah.
      next: { revalidate: 60 * 60 * 24 * 7 },
    });
    if (!res.ok) return new Response("Ubin tidak tersedia", { status: 502 });

    const isi = await res.arrayBuffer();
    return new Response(isi, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=604800, immutable",
      },
    });
  } catch {
    return new Response("Gagal mengambil ubin", { status: 502 });
  }
}
