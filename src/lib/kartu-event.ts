import QRCode from "qrcode";
import { type TitikEvent, cekPoint } from "@/lib/titik-event";
import { gambarPetaOsm, KREDIT_OSM } from "@/lib/peta-kanvas";

// Kartu bagikan event.
//
// Isinya tiga hal yang benar-benar dibutuhkan orang yang menerima kiriman ini:
// jalur yang akan dilewati, peringatan daerah rawan beserta etika bersepeda,
// dan kode QR untuk langsung membuka halaman event dan bergabung.
//
// Digambar dengan bahasa visual yang sama dengan kartu gowes: latar terakota,
// jalur digambar sebagai jalan sungguhan dengan marka putus-putus, dan huruf
// berkait untuk angka besar.
const SERIF = '"Georgia", "Times New Roman", serif';
const SANS = '"Barlow Condensed", "Arial Narrow", system-ui, sans-serif';

const TANAH = "#C0632C";
const TANAH_TUA = "#9E4A1C";
const KERTAS = "#F2E7D2";
const TEKS_KERTAS = "#A24A17";

function jalurBulat(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const k = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + k, y);
  c.arcTo(x + w, y, x + w, y + h, k);
  c.arcTo(x + w, y + h, x, y + h, k);
  c.arcTo(x, y + h, x, y, k);
  c.arcTo(x, y, x + w, y, k);
  c.closePath();
}

// Memotong teks agar muat pada lebar tertentu, dengan tanda elipsis.
function potong(c: CanvasRenderingContext2D, teks: string, lebar: number) {
  if (c.measureText(teks).width <= lebar) return teks;
  let t = teks;
  while (t.length > 3 && c.measureText(t + "…").width > lebar) t = t.slice(0, -1);
  return t.trimEnd() + "…";
}

export async function gambarKartuEvent(
  kanvas: HTMLCanvasElement,
  o: {
    nama: string; titik: TitikEvent[]; distanceM: number;
    mulai: string | null; titikKumpul: string | null;
    etika: string; rawan: string; tautan: string;
  },
) {
  const W = 1080, H = 1350;   // rasio 4:5, paling pas untuk dibagikan
  kanvas.width = W; kanvas.height = H;
  const c = kanvas.getContext("2d");
  if (!c) return;

  const spasi = (v: number) => { try { c.letterSpacing = `${v}px`; } catch { /* peramban lama */ } };
  const fSerif = (px: number) => `bold ${px}px ${SERIF}`;
  const fSans = (px: number, w = 700) => `${w} ${px}px ${SANS}`;

  // --- Latar ---
  c.fillStyle = TANAH; c.fillRect(0, 0, W, H);
  c.save(); c.globalAlpha = 0.07; c.strokeStyle = "#000"; c.lineWidth = 3;
  for (let i = 0; i < 11; i++) {
    const y = H * (0.09 + i * 0.085);
    c.beginPath(); c.moveTo(-40, y);
    c.bezierCurveTo(W * 0.3, y - 30, W * 0.7, y + 30, W + 40, y - 8);
    c.stroke();
  }
  c.restore();
  c.save(); c.globalAlpha = 0.055;
  for (let i = 0; i < 3000; i++) {
    c.fillStyle = i % 2 ? "#000" : "#fff";
    c.fillRect(Math.random() * W, Math.random() * H, 2, 2);
  }
  c.restore();

  // Pita bahaya di sudut kanan atas
  c.save();
  c.beginPath(); c.moveTo(W, 0); c.lineTo(W, 190); c.lineTo(W - 190, 0); c.closePath(); c.clip();
  c.strokeStyle = "#FFB020"; c.lineWidth = 11; c.globalAlpha = 0.85;
  for (let i = -200; i < 240; i += 34) {
    c.beginPath(); c.moveTo(W - 200 + i, -20); c.lineTo(W + 40 + i, 240); c.stroke();
  }
  c.restore();

  // --- Kepala ---
  spasi(2); c.font = fSans(30, 800);
  const wLenc = c.measureText("BUG").width + 44;
  jalurBulat(c, 74, 66, wLenc, 50, 25);
  c.fillStyle = KERTAS; c.fill();
  c.fillStyle = TEKS_KERTAS; c.textAlign = "center";
  c.fillText("BUG", 74 + wLenc / 2, 101);
  c.textAlign = "left"; spasi(4);
  c.fillStyle = "rgba(253,246,232,.85)"; c.font = fSans(24, 700);
  c.fillText("EVENT GOWES BERSAMA", 74 + wLenc + 20, 100);
  spasi(0);

  // Nama event, dibungkus paling banyak dua baris
  c.fillStyle = "#FDF6E8";
  const ukuranNama = o.nama.length > 34 ? 52 : o.nama.length > 22 ? 62 : 74;
  c.font = fSerif(ukuranNama);
  const kata = o.nama.split(/\s+/);
  const baris: string[] = [];
  let kini = "";
  for (const w of kata) {
    const coba = kini ? `${kini} ${w}` : w;
    if (c.measureText(coba).width > W - 148) { if (kini) baris.push(kini); kini = w; }
    else kini = coba;
  }
  if (kini) baris.push(kini);
  let y = 200;
  for (const b of baris.slice(0, 2)) { c.fillText(b, 74, y); y += ukuranNama * 1.08; }

  // Waktu & titik kumpul
  spasi(3); c.font = fSans(25, 700);
  c.fillStyle = "rgba(253,246,232,.8)";
  const infoWaktu = o.mulai
    ? new Date(o.mulai).toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" }).toUpperCase()
    : "WAKTU MENYUSUL";
  c.fillText(potong(c, infoWaktu, W - 148), 74, y + 14);
  if (o.titikKumpul) {
    c.fillText(potong(c, `KUMPUL: ${o.titikKumpul.toUpperCase()}`, W - 148), 74, y + 50);
  }
  spasi(0);

  // --- Peta sungguhan dengan rute di atasnya ---
  //
  // Sebelumnya rutenya digambar sebagai garis mengambang di bidang kosong.
  // Bentuknya bagus, tapi penerima kartu tidak bisa tahu jalurnya lewat mana.
  // Sekarang peta OpenStreetMap digambar lebih dulu sebagai latar, lengkap
  // dengan nama jalan dan sungainya, lalu rute ditimpakan di atasnya.
  const by = y + (o.titikKumpul ? 84 : 50);
  const bh = 424;
  const bx = 62, bw = W - 124;

  jalurBulat(c, bx, by, bw, bh, 34);
  c.save();
  c.clip();
  c.fillStyle = TANAH_TUA; c.fillRect(bx, by, bw, bh);

  const p = o.titik.filter((t) => Number.isFinite(t.lat) && Number.isFinite(t.lng));
  let keKanvas: (t: { lat: number; lng: number }) => [number, number];
  let adaPeta = false;

  if (p.length >= 2) {
    const peta = await gambarPetaOsm(c, p, { x: bx, y: by, w: bw, h: bh }, { gelap: true, pad: 76 });
    keKanvas = peta.keKanvas;
    adaPeta = peta.berhasil;

    // Bila ubin peta gagal dimuat, jalurnya tetap digambar dengan penskalaan
    // sendiri supaya kartunya tidak pernah kosong.
    if (!adaPeta) {
      const lats = p.map((q) => q.lat), lngs = p.map((q) => q.lng);
      const miLa = Math.min(...lats), maLa = Math.max(...lats);
      const miLo = Math.min(...lngs), maLo = Math.max(...lngs);
      const sLa = maLa - miLa || 1e-6, sLo = maLo - miLo || 1e-6;
      const pad = 78;
      const sc = Math.min((bw - pad * 2) / sLo, (bh - pad * 2) / sLa);
      const ox = bx + (bw - sLo * sc) / 2;
      const oy = by + (bh - sLa * sc) / 2;
      keKanvas = (t) => [ox + (t.lng - miLo) * sc, oy + (maLa - t.lat) * sc];
    }

    const xy = p.map((q) => keKanvas(q));

    const garis = (lw: number, warna: string, dash: number[] = [], dy = 0, blur = 0) => {
      c.save();
      if (blur) { c.shadowColor = warna; c.shadowBlur = blur; }
      c.setLineDash(dash); c.lineWidth = lw; c.strokeStyle = warna;
      c.lineJoin = "round"; c.lineCap = "round"; c.beginPath();
      xy.forEach(([qx, qy], i) => (i === 0 ? c.moveTo(qx, qy + dy) : c.lineTo(qx, qy + dy)));
      c.stroke(); c.restore();
    };

    // Rute: lapis gelap sebagai bayangan, lalu pendar hijau, lalu garis terang
    // dengan marka putus-putus di tengahnya.
    garis(26, "rgba(0,0,0,.55)", [], 6);
    garis(20, "rgba(180,255,58,.35)", [], 0, 26);
    garis(13, "#B4FF3A");
    garis(4, "rgba(10,20,16,.75)", [16, 20]);

    // Penanda cek point: hanya titik bertanda yang diberi huruf, karena
    // memberi huruf pada semua titik akan membuat kartu penuh lingkaran
    // tanpa arti. Nama tempatnya ditempel sebagai pelat di sampingnya supaya
    // penerima kartu langsung tahu "A itu di mana".
    const kiriKotak = bx, kananKotak = bx + bw;
    const labelTerpakai: { x: number; y: number; w: number }[] = [];

    for (const cp of cekPoint(o.titik)) {
      const t = xy[cp.indeks];
      if (!t) continue;
      const [px, py] = t;
      const akhir = cp.indeks === xy.length - 1;

      const nama = (cp.titik.nama || "").trim();
      if (nama) {
        c.font = fSans(23, 700);
        const lebarTeks = Math.min(c.measureText(nama).width, 250);
        const wPelat = lebarTeks + 22;
        const hPelat = 34;

        let plx = px + 34;
        if (plx + wPelat > kananKotak - 12) plx = px - 34 - wPelat;
        if (plx < kiriKotak + 12) plx = Math.min(px + 34, kananKotak - 12 - wPelat);
        let ply = py - hPelat / 2;
        let putar = 0;
        while (putar < 6 && labelTerpakai.some((l) =>
          Math.abs(l.y - ply) < hPelat + 4 && Math.abs(l.x - plx) < Math.max(l.w, wPelat))) {
          ply += hPelat + 8;
          putar++;
        }
        labelTerpakai.push({ x: plx, y: ply, w: wPelat });

        c.save();
        c.shadowColor = "rgba(0,0,0,.45)"; c.shadowBlur = 10; c.shadowOffsetY = 3;
        jalurBulat(c, plx, ply, wPelat, hPelat, 17);
        c.fillStyle = "rgba(10,20,16,.9)";
        c.fill();
        c.restore();
        c.fillStyle = "#F2E7D2";
        c.font = fSans(23, 700);
        c.fillText(potong(c, nama, 250), plx + 11, ply + 23);
      }

      c.save();
      c.shadowColor = "rgba(0,0,0,.5)"; c.shadowBlur = 14; c.shadowOffsetY = 4;
      c.fillStyle = akhir ? "#B4FF3A" : KERTAS;
      c.beginPath(); c.arc(px, py, 26, 0, Math.PI * 2); c.fill();
      c.restore();
      c.strokeStyle = "rgba(10,20,16,.85)"; c.lineWidth = 3;
      c.beginPath(); c.arc(px, py, 26, 0, Math.PI * 2); c.stroke();
      c.fillStyle = "#0A1410"; c.textAlign = "center"; c.font = fSans(27, 800);
      c.fillText(cp.huruf, px, py + 9);
      c.textAlign = "left";
    }
  } else {
    keKanvas = () => [bx + bw / 2, by + bh / 2];
    c.fillStyle = "rgba(253,246,232,.6)"; c.textAlign = "center"; c.font = fSans(30, 600);
    c.fillText("Jalur belum ditandai", bx + bw / 2, by + bh / 2);
    c.textAlign = "left";
  }

  // Keterangan hak cipta peta. Wajib menyertai ubin OpenStreetMap, dan kartu
  // ini akan dibagikan ke luar aplikasi.
  if (adaPeta) {
    c.font = fSans(18, 600);
    const wKredit = c.measureText(KREDIT_OSM).width + 18;
    c.fillStyle = "rgba(10,20,16,.6)";
    jalurBulat(c, bx + bw - wKredit - 12, by + bh - 34, wKredit, 24, 8);
    c.fill();
    c.fillStyle = "rgba(242,231,210,.9)";
    c.fillText(KREDIT_OSM, bx + bw - wKredit - 3, by + bh - 17);
  }

  c.restore();
  // Jarak & jumlah titik
  spasi(4); c.font = fSans(23, 700);
  c.fillStyle = "rgba(253,246,232,.7)";
  c.fillText("JARAK JALUR", 74, by + bh + 44);
  spasi(0);
  c.fillStyle = "#FDF6E8"; c.font = fSerif(58);
  c.fillText(`${(o.distanceM / 1000).toFixed(1).replace(".", ",")} km`, 74, by + bh + 102);

  // --- Kotak catatan + kode QR ---
  const cy = by + bh + 130;
  const ch = H - cy - 96;
  jalurBulat(c, 62, cy, W - 124, ch, 30);
  c.fillStyle = KERTAS; c.fill();

  // Kode QR di kanan
  const qrUkuran = 210;
  try {
    const dataUrl = await QRCode.toDataURL(o.tautan, {
      margin: 1, width: qrUkuran * 2,
      color: { dark: "#5A2A0C", light: "#F2E7D2" },
    });
    const gambar = await new Promise<HTMLImageElement>((res, rej) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = () => rej(new Error("qr gagal"));
      im.src = dataUrl;
    });
    c.drawImage(gambar, W - 62 - 34 - qrUkuran, cy + 34, qrUkuran, qrUkuran);
    spasi(3);
    c.fillStyle = TEKS_KERTAS; c.font = fSans(21, 800); c.textAlign = "center";
    c.fillText("PINDAI UNTUK", W - 62 - 34 - qrUkuran / 2, cy + 34 + qrUkuran + 32);
    c.fillText("GABUNG EVENT", W - 62 - 34 - qrUkuran / 2, cy + 34 + qrUkuran + 58);
    c.textAlign = "left"; spasi(0);
  } catch { /* tanpa QR, sisa kartu tetap berguna */ }

  // Daftar cek point, supaya penerima tahu titik berkumpulnya di mana
  const lebarTeks = W - 124 - 68 - qrUkuran - 34;
  let ty = cy + 62;
  const cp = cekPoint(o.titik);
  if (cp.length > 0) {
    spasi(3); c.font = fSans(22, 800); c.fillStyle = TEKS_KERTAS;
    c.fillText("CEK POINT", 96, ty);
    spasi(0); ty += 28;
    c.font = fSans(22, 600); c.fillStyle = "#6B4423";
    const potongan = cp.map((x, i) =>
      `${x.huruf} ${x.titik.nama?.trim() || (i === 0 ? "Start" : i === cp.length - 1 ? "Finish" : "Cek point")}`);
    // Disusun jadi paling banyak dua baris agar nama tempat tidak terpotong.
    const barisCek: string[] = [];
    let kiniCek = "";
    for (const bagian of potongan) {
      const coba = kiniCek ? `${kiniCek}  →  ${bagian}` : bagian;
      if (c.measureText(coba).width > lebarTeks && kiniCek) { barisCek.push(kiniCek); kiniCek = bagian; }
      else kiniCek = coba;
    }
    if (kiniCek) barisCek.push(kiniCek);
    for (const b of barisCek.slice(0, 2)) { c.fillText(potong(c, b, lebarTeks), 96, ty); ty += 28; }
    ty += 8;
  }
  const aman = /tidak melewati zona rawan/i.test(o.rawan);
  spasi(3); c.font = fSans(22, 800);
  c.fillStyle = aman ? "#3F7A12" : "#A0521A";
  c.fillText(aman ? "JALUR AMAN" : "DAERAH RAWAN DI JALUR INI", 96, ty);
  spasi(0); ty += 30;

  c.font = fSans(23, 600);
  c.fillStyle = "#6B4423";
  for (const b of o.rawan.split("\n").filter(Boolean).slice(0, 3)) {
    c.fillText(potong(c, `• ${b}`, lebarTeks), 96, ty);
    ty += 30;
  }

  // Etika bersepeda
  ty += 16;
  spasi(3); c.font = fSans(22, 800); c.fillStyle = TEKS_KERTAS;
  c.fillText("ETIKA BERSEPEDA", 96, ty);
  spasi(0); ty += 30;
  c.font = fSans(23, 600); c.fillStyle = "#6B4423";
  const batasBawah = cy + ch - 26;
  for (const b of o.etika.split("\n").filter(Boolean)) {
    if (ty > batasBawah) break;
    c.fillText(potong(c, `• ${b}`, lebarTeks), 96, ty);
    ty += 30;
  }

  // Kaki kartu
  spasi(4); c.font = fSans(21, 700);
  c.fillStyle = "rgba(253,246,232,.75)"; c.textAlign = "center";
  c.fillText("DICATAT DENGAN BUG  ·  BULUNGAN UNTUK GOWESER", W / 2, H - 48);
  c.textAlign = "left"; spasi(0);
}
