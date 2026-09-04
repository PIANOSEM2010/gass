export const runtime = "nodejs";

// Jangan pernah dipranata maupun disimpan oleh lapisan cache kerangka kerja.
// Tiap ubin berbeda hanya pada parameter alamatnya, dan cache yang mengabaikan
// parameter akan mengembalikan ubin yang sama berulang kali - yang tampak
// sebagai peta bermotif berulang, bukan peta sungguhan.
export const dynamic = "force-dynamic";
export const revalidate = 0;

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
    // Tanpa cache kerangka kerja. Cache data bawaan menyimpan isi tanggapan
    // dan tidak dirancang untuk berkas gambar; penyimpanan sementaranya
    // diserahkan ke lapisan jaringan lewat tajuk Cache-Control di bawah.
    const res = await fetch(`https://tile.openstreetmap.org/${z}/${x}/${y}.png`, {
      headers: { "User-Agent": UA, Accept: "image/png,image/*" },
      cache: "no-store",
    });
    if (!res.ok) {
      return new Response(`Ubin tidak tersedia (${res.status})`, { status: 502 });
    }

    const isi = await res.arrayBuffer();
    return new Response(isi, {
      headers: {
        "Content-Type": "image/png",
        "Content-Length": String(isi.byteLength),
        "Cache-Control": "public, max-age=604800",
        // Menegaskan bahwa tanggapan berbeda untuk alamat berbeda.
        "X-Ubin": `${z}/${x}/${y}`,
      },
    });
  } catch {
    return new Response("Gagal mengambil ubin", { status: 502 });
  }
}
