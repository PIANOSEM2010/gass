// ============================================================================
// Kartu gowes "keluarga Tanah"
//
// Tiga template yang diterjemahkan dari rancangan: Blok Tegas, Cap Terakota,
// dan Lintasan Tanah. Ketiganya memakai palet tanah (terakota, krem, sage)
// dengan huruf display berkait, jadi terasa seperti cetakan poster, bukan
// tangkapan layar aplikasi.
//
// Dua hal yang saya tambahkan di luar rancangan agar hasilnya lebih kuat:
//   1. Rute digambar sebagai jalan sungguhan (bahu jalan + marka putus-putus),
//      bukan garis tunggal. Ini benang merah dengan jati diri BUG.
//   2. Tekstur butiran halus dan garis kontur tanah di latar, supaya bidang
//      warna lebar tidak terasa seperti gradien digital yang kosong.
// ============================================================================

export type Pt = { lat: number; lng: number };
export type Rasio = "1:1" | "4:5";

export type OpsiKartu = {
  template: string;
  warna: string;
  rasio: Rasio;
  path: Pt[];
  distanceM: number;
  durationS: number;
  elevM: number;
  place: string;
  kalori?: number;
  kecMaks?: number;
  rekor?: string | null;
  // Penanda titik pada jalur: A = mulai, huruf berikutnya = titik lewat,
  // huruf terakhir = selesai. Dipakai pada kartu rute yang dibagikan supaya
  // pembaca langsung tahu gowes dari mana ke mana.
  penanda?: { label: string; nama?: string }[];
  photo?: HTMLImageElement | null;
  transparent?: boolean;
  date?: Date;
};

// Palet tanah. "kertas" = bidang terang, "tanah" = bidang gelap/terakota,
// "garis" = warna rute dan aksen.
export const WARNA_TANAH: Record<string, {
  nama: string; tanah: string; tanahTua: string; kertas: string;
  garis: string; teksTanah: string; teksKertas: string;
}> = {
  terakota: {
    nama: "Terakota", tanah: "#C0632C", tanahTua: "#9E4A1C", kertas: "#F2E7D2",
    garis: "#F6EEDD", teksTanah: "#FDF6E8", teksKertas: "#A24A17",
  },
  sawah: {
    nama: "Malam Sawah", tanah: "#2C3A2B", tanahTua: "#1D281D", kertas: "#E7E9D8",
    garis: "#CFE08A", teksTanah: "#EEF2DF", teksKertas: "#3A5230",
  },
  krem: {
    nama: "Lintasan Krem", tanah: "#E4D8BE", tanahTua: "#D2C2A2", kertas: "#F6EFDF",
    garis: "#B95A25", teksTanah: "#5A3A1C", teksKertas: "#A24A17",
  },
  arang: {
    nama: "Arang", tanah: "#221F1C", tanahTua: "#141210", kertas: "#EFE7D8",
    garis: "#E0873F", teksTanah: "#F2EAE0", teksKertas: "#2A2521",
  },
};
export const WARNA_TANAH_KEYS = ["terakota", "sawah", "krem", "arang"];

export const TEMPLATE_TANAH: { key: string; nama: string; ket: string }[] = [
  { key: "blok", nama: "Blok Tegas", ket: "Blok keras, angka setinggi layar" },
  { key: "cap", nama: "Cap Terakota", ket: "Angka keluar tepi, cap rekor" },
  { key: "tanah", nama: "Lintasan Tanah", ket: "Latar krem, peta sage" },
];

const SERIF = '"Georgia", "Times New Roman", serif';
const SANS = '"Barlow Condensed", "Arial Narrow", system-ui, sans-serif';

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

export function muatGambar(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const im = new Image();
    im.crossOrigin = "anonymous";
    im.onload = () => res(im);
    im.onerror = () => rej(new Error("Gambar gagal dimuat"));
    im.src = src;
  });
}

function jam(detik: number) {
  const m = Math.floor(detik / 60), s = detik % 60;
  const h = Math.floor(m / 60);
  return h > 0
    ? `${h}:${String(m % 60).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
export function gambarKartuTanah(canvas: HTMLCanvasElement, o: OpsiKartu) {
  const W = 1080;
  const H = o.rasio === "4:5" ? 1350 : 1080;
  canvas.width = W; canvas.height = H;
  const c = canvas.getContext("2d");
  if (!c) return;
  c.clearRect(0, 0, W, H);

  const p = WARNA_TANAH[o.warna] || WARNA_TANAH.terakota;
  const tembus = Boolean(o.transparent);
  const foto = !tembus ? o.photo || null : null;

  const km = (o.distanceM / 1000).toFixed(2).replace(".", ",");
  const [bulat, desimal] = km.split(",");
  const durasi = jam(o.durationS);
  const rata = o.durationS > 0 ? ((o.distanceM / 1000) / (o.durationS / 3600)).toFixed(1).replace(".", ",") : "0,0";
  const elev = String(Math.round(o.elevM));
  const tempat = o.place?.trim() ? `Gowes di ${o.place.trim()}` : "Gowes";
  const tanggal = (o.date || new Date())
    .toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }).toUpperCase();

  const spasi = (v: number) => { try { c.letterSpacing = `${v}px`; } catch { /* peramban lama */ } };
  const fSerif = (px: number) => `bold ${px}px ${SERIF}`;
  const fSans = (px: number, w = 700) => `${w} ${px}px ${SANS}`;

  // --- Latar ---------------------------------------------------------------
  const latar = (warna: string) => {
    if (foto) {
      const s = Math.max(W / foto.width, H / foto.height);
      c.drawImage(foto, (W - foto.width * s) / 2, (H - foto.height * s) / 2, foto.width * s, foto.height * s);
      const g = c.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "rgba(0,0,0,.5)"); g.addColorStop(.45, "rgba(0,0,0,.2)"); g.addColorStop(1, "rgba(0,0,0,.72)");
      c.fillStyle = g; c.fillRect(0, 0, W, H);
      return;
    }
    if (tembus) return;
    c.fillStyle = warna; c.fillRect(0, 0, W, H);
    // Garis kontur tanah: lengkung tipis mendatar, memberi kesan permukaan
    c.save();
    c.globalAlpha = .07; c.strokeStyle = "#000"; c.lineWidth = 3;
    for (let i = 0; i < 9; i++) {
      const y = H * (.12 + i * .1);
      c.beginPath(); c.moveTo(-40, y);
      c.bezierCurveTo(W * .3, y - 34, W * .7, y + 34, W + 40, y - 10);
      c.stroke();
    }
    c.restore();
    // Butiran halus supaya bidang warna tidak terasa datar
    c.save(); c.globalAlpha = .055;
    for (let i = 0; i < 2600; i++) {
      c.fillStyle = i % 2 ? "#000" : "#fff";
      c.fillRect(Math.random() * W, Math.random() * H, 2, 2);
    }
    c.restore();
  };

  // --- Rute digambar sebagai jalan -----------------------------------------
  const jalan = (bx: number, by: number, bw: number, bh: number, tebal: number, warnaJalan: string, warnaAspal: string) => {
    if (!o.path || o.path.length < 2) {
      c.textAlign = "center"; c.fillStyle = warnaJalan; c.font = fSans(30, 600);
      c.fillText("Jejak rute tidak tersimpan", bx + bw / 2, by + bh / 2);
      return;
    }
    const lats = o.path.map((q) => q.lat), lngs = o.path.map((q) => q.lng);
    const miLa = Math.min(...lats), maLa = Math.max(...lats);
    const miLo = Math.min(...lngs), maLo = Math.max(...lngs);
    const sLa = maLa - miLa || 1e-6, sLo = maLo - miLo || 1e-6;
    const sc = Math.min(bw / sLo, bh / sLa);
    const ox = bx + (bw - sLo * sc) / 2, oy = by + (bh - sLa * sc) / 2;
    const xy = o.path.map((q) => [ox + (q.lng - miLo) * sc, oy + (maLa - q.lat) * sc] as [number, number]);

    const garis = (lw: number, col: string, dash: number[] = [], dy = 0) => {
      c.save(); c.setLineDash(dash); c.lineWidth = lw; c.strokeStyle = col;
      c.lineJoin = "round"; c.lineCap = "round"; c.beginPath();
      xy.forEach(([x, y], i) => (i === 0 ? c.moveTo(x, y + dy) : c.lineTo(x, y + dy)));
      c.stroke(); c.restore();
    };
    garis(tebal + 14, "rgba(0,0,0,.24)", [], 8);   // bayangan
    garis(tebal, warnaJalan);                      // bahu jalan
    garis(tebal - 11, warnaAspal);                 // badan aspal
    garis(3.4, warnaJalan, [14, 18]);              // marka tengah

    // Penanda titik. Bila tidak disebutkan, dipakai A untuk mulai dan B untuk
    // selesai; bila ada lebih banyak, huruf tengah dibagi merata di sepanjang
    // jalur sehingga urutannya terbaca dari kiri ke kanan mengikuti rute.
    const label = o.penanda?.length && o.penanda.length >= 2
      ? o.penanda.map((t) => t.label)
      : ["A", "B"];
    const jumlah = label.length;

    // Posisi penanda dihitung dari PANJANG jalur di layar, bukan dari nomor
    // titik. Pada rute melingkar, titik ke-separuh sering jatuh berdekatan
    // dengan titik awal sehingga hurufnya bertumpuk; ukuran panjang membuat
    // jaraknya merata seperti yang terlihat mata.
    const panjangSampai: number[] = [0];
    for (let i = 1; i < xy.length; i++) {
      const dx = xy[i][0] - xy[i - 1][0], dy = xy[i][1] - xy[i - 1][1];
      panjangSampai.push(panjangSampai[i - 1] + Math.hypot(dx, dy));
    }
    const total = panjangSampai[panjangSampai.length - 1] || 1;
    const indeksPada = (bagian: number) => {
      const target = bagian * total;
      let lo = 0, hi = panjangSampai.length - 1;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (panjangSampai[mid] < target) lo = mid + 1; else hi = mid;
      }
      return lo;
    };

    const dipakai: [number, number][] = [];
    for (let i = 0; i < jumlah; i++) {
      let posisi = jumlah === 1 ? 0 : indeksPada(i / (jumlah - 1));
      // Bila masih terlalu dekat dengan penanda sebelumnya, digeser maju
      // sampai terpisah setidaknya 165 px pada kanvas 1080 (sekitar 60 px saat
      // kartunya ditampilkan seukuran layar ponsel).
      if (i > 0 && i < jumlah - 1) {
        let putar = 0;
        while (putar < 60 && dipakai.some(([ax, ay]) =>
          Math.hypot(xy[posisi][0] - ax, xy[posisi][1] - ay) < 165)) {
          posisi = Math.min(xy.length - 2, posisi + Math.max(2, Math.ceil(xy.length / 60)));
          putar++;
        }
      }
      const [px, py] = xy[posisi];
      dipakai.push([px, py]);
      const akhir = i === jumlah - 1;
      const r = akhir ? 26 : 23;

      c.save();
      c.shadowColor = "rgba(0,0,0,.4)";
      c.shadowBlur = 12;
      c.shadowOffsetY = 4;
      c.fillStyle = akhir ? warnaJalan : warnaJalan;
      c.beginPath(); c.arc(px, py, r, 0, Math.PI * 2); c.fill();
      c.restore();

      // Titik selesai diberi cincin ganda agar berbeda dari titik lewat.
      if (akhir) {
        c.strokeStyle = warnaAspal; c.lineWidth = 4;
        c.beginPath(); c.arc(px, py, r - 8, 0, Math.PI * 2); c.stroke();
      }

      c.fillStyle = warnaAspal;
      c.textAlign = "center";
      c.font = fSans(akhir ? 26 : 27, 800);
      c.fillText(label[i], px, py + (akhir ? 9 : 10));
      c.textAlign = "left";
    }

    // Keterangan nama jalan di kaki blok peta: "A JL DURIAN -> B JL RAMBUTAN".
    // Hanya digambar bila nama jalannya memang tersedia, supaya kartu tidak
    // menampilkan huruf tanpa keterangan.
    const berNama = (o.penanda || []).filter((t) => t.nama && t.nama.trim());
    if (berNama.length >= 2) {
      const tinggiPita = 62;
      const yPita = by + bh - tinggiPita + 12;
      c.save();
      c.fillStyle = "rgba(0,0,0,.30)";
      c.beginPath();
      const r = 18, xk = bx, wk = bw;
      c.moveTo(xk + r, yPita);
      c.arcTo(xk + wk, yPita, xk + wk, yPita + tinggiPita, r);
      c.arcTo(xk + wk, yPita + tinggiPita, xk, yPita + tinggiPita, r);
      c.arcTo(xk, yPita + tinggiPita, xk, yPita, r);
      c.arcTo(xk, yPita, xk + wk, yPita, r);
      c.closePath();
      c.fill();

      // Nama jalan disusun berurutan dan dipendekkan bila melebihi lebar pita.
      let x = xk + 22;
      const batas = xk + wk - 22;
      for (let i = 0; i < berNama.length; i++) {
        const t = berNama[i];
        c.font = fSans(24, 800);
        const lebarHuruf = 30;
        if (x + lebarHuruf > batas) break;

        // Bulatan huruf
        c.fillStyle = warnaJalan;
        c.beginPath(); c.arc(x + 11, yPita + tinggiPita / 2, 13, 0, Math.PI * 2); c.fill();
        c.fillStyle = warnaAspal;
        c.textAlign = "center";
        c.fillText(t.label, x + 11, yPita + tinggiPita / 2 + 8);
        c.textAlign = "left";
        x += lebarHuruf;

        // Nama jalan
        c.fillStyle = warnaJalan;
        c.font = fSans(25, 700);
        let nama = (t.nama || "").toUpperCase();
        while (nama.length > 4 && x + c.measureText(nama).width > batas - (i < berNama.length - 1 ? 34 : 0)) {
          nama = nama.slice(0, -2);
        }
        if (nama !== (t.nama || "").toUpperCase()) nama = nama.trimEnd() + "…";
        c.fillText(nama, x, yPita + tinggiPita / 2 + 8);
        x += c.measureText(nama).width + 14;

        if (i < berNama.length - 1) {
          c.fillStyle = `${warnaJalan}99`;
          c.font = fSans(24, 700);
          c.fillText("→", x, yPita + tinggiPita / 2 + 8);
          x += 30;
        }
      }
      c.restore();
    }
  };

  // --- Lencana BUG ---------------------------------------------------------
  const lencana = (x: number, y: number, isi: string, teks: string) => {
    c.save(); spasi(2); c.font = fSans(30, 800);
    const w = c.measureText("BUG").width + 44;
    jalurBulat(c, x, y, w, 50, 25); c.fillStyle = isi; c.fill();
    c.fillStyle = teks; c.textAlign = "center"; c.fillText("BUG", x + w / 2, y + 35);
    spasi(0); c.restore();
    return w;
  };

  // --- Cap rekor bulat, sedikit dimiringkan --------------------------------
  const capRekor = (x: number, y: number, r: number, isi: string, teks: string) => {
    if (!o.rekor) return;
    c.save();
    c.translate(x, y); c.rotate(-0.14);
    c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fillStyle = isi; c.fill();
    c.strokeStyle = teks; c.globalAlpha = .5; c.lineWidth = 3;
    c.beginPath(); c.arc(0, 0, r - 12, 0, Math.PI * 2); c.stroke();
    c.globalAlpha = 1;
    c.fillStyle = teks; c.textAlign = "center";
    spasi(3); c.font = fSans(21, 700); c.fillText("REKOR", 0, -r * 0.34);
    spasi(0); c.font = fSerif(r * 0.42); c.fillText(o.rekor.split("·")[0].trim(), 0, r * 0.14);
    c.font = fSans(20, 600); c.fillText((o.rekor.split("·")[1] || "").trim(), 0, r * 0.52);
    c.restore();
  };

  // --- Baris statistik -----------------------------------------------------
  const barisStat = (y: number, warnaLabel: string, warnaAngka: string, kolom: { l: string; v: string; u?: string }[]) => {
    const lk = (W - 168) / kolom.length;
    kolom.forEach((k, i) => {
      const x = 84 + lk * i;
      c.textAlign = "left"; spasi(4);
      c.fillStyle = warnaLabel; c.font = fSans(22, 700);
      c.fillText(k.l.toUpperCase(), x, y);
      spasi(0);
      c.fillStyle = warnaAngka; c.font = fSerif(54);
      c.fillText(k.v, x, y + 56);
      if (k.u) {
        const vw = c.measureText(k.v).width;
        c.fillStyle = warnaLabel; c.font = fSans(24, 700);
        c.fillText(k.u, x + vw + 10, y + 54);
      }
    });
  };

  const kolomStat = [
    { l: "Waktu", v: durasi },
    { l: "Kec. rata", v: rata, u: "km/j" },
    { l: "Elevasi", v: elev, u: "m" },
    ...(o.kalori ? [{ l: "Kalori", v: String(Math.round(o.kalori)) }] : []),
  ];

  // =========================================================================
  if (o.template === "blok") {
    // ---- BLOK TEGAS: satu blok kertas berisi angka setinggi layar ----------
    latar(p.tanah);

    const bx = 64, by = 64, bw = W - 128;
    const bh = o.rasio === "4:5" ? 560 : 430;
    jalurBulat(c, bx, by, bw, bh, 44);
    c.fillStyle = tembus || foto ? "rgba(255,255,255,.90)" : p.kertas;
    c.fill();

    lencana(bx + 40, by + 34, p.teksKertas, p.kertas);
    c.textAlign = "right"; spasi(3);
    c.fillStyle = p.teksKertas; c.font = fSans(24, 700);
    c.fillText(tanggal, bx + bw - 40, by + 66);
    spasi(0);

    c.textAlign = "left"; spasi(3);
    c.fillStyle = p.teksKertas; c.font = fSans(30, 700);
    c.fillText(tempat.toUpperCase(), bx + 42, by + 136);
    spasi(0);

    // Angka raksasa: bilangan bulat penuh, desimal lebih kecil
    const yAngka = by + bh - (o.rasio === "4:5" ? 168 : 118);
    c.fillStyle = p.teksKertas;
    c.font = fSerif(o.rasio === "4:5" ? 320 : 236);
    c.fillText(bulat, bx + 36, yAngka);
    const wb = c.measureText(bulat).width;
    c.font = fSerif(o.rasio === "4:5" ? 188 : 138);
    c.fillText("," + desimal, bx + 36 + wb, yAngka);
    const wd = c.measureText("," + desimal).width;

    spasi(9);
    c.font = fSans(34, 700);
    c.fillText("KILOMETER", bx + 42, yAngka + 62);
    spasi(0);

    if (o.rekor) {
      c.save(); spasi(3); c.font = fSans(23, 800);
      const wr = c.measureText(o.rekor.toUpperCase()).width + 40;
      jalurBulat(c, bx + bw - 40 - wr, by + 92, wr, 46, 23);
      c.fillStyle = p.teksKertas; c.fill();
      c.fillStyle = p.kertas; c.textAlign = "center";
      c.fillText(o.rekor.toUpperCase(), bx + bw - 40 - wr / 2, by + 123);
      spasi(0); c.restore();
    }
    void wd;

    // Blok peta di bawahnya
    const my = by + bh + 26;
    const mh = H - my - (o.rasio === "4:5" ? 240 : 214);
    jalurBulat(c, bx, my, bw, mh, 44);
    c.save(); c.clip();
    c.fillStyle = tembus || foto ? "rgba(0,0,0,.28)" : p.tanahTua;
    c.fillRect(bx, my, bw, mh);
    jalan(bx + 70, my + 34, bw - 140, mh - 68, 32, p.garis, p.tanahTua);
    c.restore();

    barisStat(H - 152, `${p.teksTanah}99`, p.teksTanah, kolomStat);

    c.textAlign = "center"; spasi(3);
    c.fillStyle = `${p.teksTanah}99`; c.font = fSans(19, 700);
    c.fillText(`#GOWESERAMAN${(o.place || "BULUNGAN").replace(/\s+/g, "").toUpperCase()}  ·  DICATAT DENGAN BUG`, W / 2, H - 46);
    spasi(0);

  } else if (o.template === "cap") {
    // ---- CAP TERAKOTA: angka keluar tepi, cap rekor dimiringkan -----------
    latar(p.tanah);

    // Busur besar di bawah, seperti punggung bukit
    if (!tembus && !foto) {
      c.save(); c.globalAlpha = .16; c.fillStyle = "#000";
      c.beginPath(); c.arc(W * .5, H * 1.02, W * .62, Math.PI, Math.PI * 2); c.fill();
      c.restore();
    }

    lencana(80, 76, p.kertas, p.teksKertas);
    c.textAlign = "right"; spasi(3);
    c.fillStyle = `${p.teksTanah}CC`; c.font = fSans(24, 700);
    c.fillText(`${tanggal} · ${(o.place || "BULUNGAN").toUpperCase()}`, W - 80, 110);
    spasi(0);

    c.textAlign = "left";
    c.fillStyle = p.teksTanah; c.font = fSerif(56);
    c.fillText(tempat, 80, 236);

    // Angka sengaja dibiarkan melewati tepi kanan: itu inti rancangannya
    c.font = fSerif(o.rasio === "4:5" ? 392 : 336);
    c.fillStyle = p.teksTanah;
    c.fillText(bulat + "," + desimal, 52, o.rasio === "4:5" ? 592 : 506);
    spasi(12);
    c.font = fSans(40, 700);
    c.fillText("KILOMETER", 76, o.rasio === "4:5" ? 700 : 604);
    spasi(0);

    const my = o.rasio === "4:5" ? 736 : 630;
    jalan(70, my, W - 300, H - my - 288, 30, p.garis, p.tanah);
    capRekor(W - 158, my + 58, 94, p.kertas, p.teksKertas);

    barisStat(H - 202, `${p.teksTanah}99`, p.teksTanah, kolomStat);

    // Strip berjalan di kaki kartu
    c.save();
    c.fillStyle = p.kertas; c.fillRect(0, H - 92, W, 60);
    c.beginPath(); c.rect(0, H - 92, W, 60); c.clip();
    c.fillStyle = p.teksKertas; c.textAlign = "left"; spasi(2);
    c.font = fSans(19, 800);
    const strip = `#GOWESBARENGBULUNGAN   ·   ${km} KM   ·   ${durasi}   ·   DICATAT DENGAN BUG   `;
    c.fillText(strip + strip, 26, H - 53);
    spasi(0); c.restore();

  } else {
    // ---- LINTASAN TANAH: latar krem, panel peta sage ----------------------
    const kertas = tembus || foto ? "rgba(0,0,0,0)" : p.kertas;
    if (!tembus && !foto) { c.fillStyle = kertas; c.fillRect(0, 0, W, H); }
    else latar(p.kertas);
    if (!tembus && !foto) {
      c.save(); c.globalAlpha = .05;
      for (let i = 0; i < 2200; i++) {
        c.fillStyle = "#5A3A1C";
        c.fillRect(Math.random() * W, Math.random() * H, 2, 2);
      }
      c.restore();
    }

    const teksUtama = tembus || foto ? "#FFFFFF" : p.teksKertas;
    const teksRedam = tembus || foto ? "rgba(255,255,255,.72)" : `${p.teksKertas}A8`;

    lencana(80, 74, p.teksKertas, p.kertas);
    c.textAlign = "right"; spasi(3);
    c.fillStyle = teksRedam; c.font = fSans(24, 700);
    c.fillText(tanggal, W - 80, 108);
    spasi(0);

    c.textAlign = "left";
    c.fillStyle = teksUtama; c.font = fSerif(50);
    c.fillText(tempat, 80, 214);

    // Angka besar dengan satuan kecil di sampingnya
    c.font = fSerif(o.rasio === "4:5" ? 250 : 200);
    c.fillText(bulat + "," + desimal, 74, o.rasio === "4:5" ? 420 : 372);
    const wa = c.measureText(bulat + "," + desimal).width;
    c.font = fSans(46, 700);
    c.fillStyle = teksRedam;
    c.fillText("km", 90 + wa, o.rasio === "4:5" ? 400 : 356);

    // Panel peta sage dengan rute terakota
    const my = o.rasio === "4:5" ? 470 : 420;
    const mh = o.rasio === "4:5" ? 560 : 428;
    jalurBulat(c, 74, my, W - 148, mh, 40);
    c.save(); c.clip();
    c.fillStyle = tembus || foto ? "rgba(0,0,0,.3)" : "#D9E3C8";
    c.fillRect(74, my, W - 148, mh);
    // petak sawah tipis sebagai tekstur peta
    c.globalAlpha = .5; c.strokeStyle = "#C2CFAE"; c.lineWidth = 2;
    for (let x = 74; x < W - 74; x += 76) { c.beginPath(); c.moveTo(x, my); c.lineTo(x, my + mh); c.stroke(); }
    for (let y = my; y < my + mh; y += 76) { c.beginPath(); c.moveTo(74, y); c.lineTo(W - 74, y); c.stroke(); }
    c.globalAlpha = 1;
    jalan(142, my + 40, W - 284, mh - 80, 30, p.garis, "#E9F0DC");
    c.restore();

    barisStat(my + mh + 62, teksRedam, teksUtama, kolomStat);

    if (o.rekor) {
      c.save(); spasi(3); c.font = fSans(23, 800);
      const wr = c.measureText(o.rekor.toUpperCase()).width + 40;
      jalurBulat(c, W - 80 - wr, my - 78, wr, 46, 23);
      c.fillStyle = p.teksKertas; c.fill();
      c.fillStyle = p.kertas; c.textAlign = "center";
      c.fillText(o.rekor.toUpperCase(), W - 80 - wr / 2, my - 47);
      spasi(0); c.restore();
    }

    c.textAlign = "left"; spasi(3);
    c.fillStyle = teksRedam; c.font = fSans(19, 700);
    c.fillText(`#GOWESERAMANBULUNGAN  ·  DICATAT DENGAN BUG`, 80, H - 54);
    spasi(0);
  }
}
