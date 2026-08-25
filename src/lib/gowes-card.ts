// ============================================================
// KARTU GOWES BUG, modul bersama (dipakai halaman Catat & Riwayat)
// Desain sporty: font condensed italic, garis kecepatan diagonal,
// panel kaca, rute dengan efek glow.
// Fitur: 4 template (Rute, Momen, Statistik, Ringkas), 5 palet warna,
// foto perjalanan sebagai latar, dan mode LATAR TRANSPARAN (PNG alpha)
// untuk ditempel di story Instagram/WhatsApp.
// ============================================================
import type { Pt } from "@/app/gowes-provider";

export function fmtDuration(s: number): string {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

// Pilihan warna kartu: gradasi latar + warna aksen (rute, angka, strip)
export const PALETTES: Record<string, { name: string; grad: [string, string]; accent: string; accent2: string }> = {
  hijau:   { name: "Hijau",   grad: ["#052e16", "#022c22"], accent: "#a3e635", accent2: "#4ade80" },
  senja:   { name: "Senja",   grad: ["#7c2d12", "#450a0a"], accent: "#fde047", accent2: "#fb923c" },
  samudra: { name: "Samudra", grad: ["#083344", "#0c1a2e"], accent: "#22d3ee", accent2: "#67e8f9" },
  ungu:    { name: "Ungu",    grad: ["#3b0764", "#1e1b4b"], accent: "#e879f9", accent2: "#c4b5fd" },
  malam:   { name: "Malam",   grad: ["#0f172a", "#020617"], accent: "#fb923c", accent2: "#fde047" },
};
export const PALETTE_KEYS = ["hijau", "senja", "samudra", "ungu", "malam"];
export const TEMPLATES: { key: string; name: string }[] = [
  { key: "marka", name: "Marka" },
  { key: "sorot", name: "Sorot" },
  { key: "rute", name: "Rute" },
  { key: "momen", name: "Momen" },
  { key: "statistik", name: "Statistik" },
  { key: "ringkas", name: "Ringkas" },
];

// Nama family font display dari next/font (nama internalnya di-hash,
// jadi harus dibaca dari CSS variable, bukan ditulis "Barlow Condensed")
function displayFamily(): string {
  if (typeof document === "undefined") return "sans-serif";
  const v =
    getComputedStyle(document.body).getPropertyValue("--font-display").trim() ||
    getComputedStyle(document.documentElement).getPropertyValue("--font-display").trim();
  return v || "sans-serif";
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Muat foto dari data URL / URL menjadi HTMLImageElement (untuk latar kartu)
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Gagal memuat foto"));
    img.src = src;
  });
}

export type CardOptions = {
  template: string;
  palette: string;
  path: Pt[];
  distanceM: number;
  durationS: number;
  elevM: number;
  place: string;
  /** Foto perjalanan sebagai latar (opsional) */
  photo?: HTMLImageElement | null;
  /** Latar transparan (PNG alpha), cocok ditempel di story */
  transparent?: boolean;
  /** Tanggal aktivitas (riwayat memakai tanggal asli, bukan hari ini) */
  date?: Date;
};

// Menggambar kartu gowes ke canvas (1080x1080)
export function drawCard(canvas: HTMLCanvasElement, opts: CardOptions) {
  const { template, path, distanceM, durationS, elevM, place } = opts;
  // Bila nama daerah tidak terdeteksi, tulis "GOWES" saja (tanpa "DI ...")
  const placeLabel = place && place.trim() ? `GOWES DI ${place.trim().toUpperCase()}` : "GOWES";
  const hashtag = place && place.trim()
    ? `#GOWESERAMAN${place.replace(/\s+/g, "").toUpperCase()}  ·  DICATAT DENGAN BUG`
    : "DICATAT DENGAN BUG";
  const pal = PALETTES[opts.palette] || PALETTES.hijau;
  const transparent = Boolean(opts.transparent);
  const photo = !transparent ? opts.photo || null : null;
  // Teks putih dinaikkan opasitasnya di mode transparan/foto agar tetap terbaca
  const wText = (a: number) => `rgba(255,255,255,${transparent || photo ? Math.min(1, a + 0.28) : a})`;
  const W = 1080, H = 1080;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, W, H);

  const fam = displayFamily();
  const dFont = (size: number, weight = 800, italic = true) =>
    `${italic ? "italic " : ""}${weight} ${size}px ${fam}`;

  // ---------- Latar ----------
  if (photo) {
    // Foto perjalanan cover penuh (crop tengah)
    const s = Math.max(W / photo.width, H / photo.height);
    const dw = photo.width * s, dh = photo.height * s;
    ctx.drawImage(photo, (W - dw) / 2, (H - dh) / 2, dw, dh);
    // Overlay gelap atas & bawah supaya teks terbaca
    const top = ctx.createLinearGradient(0, 0, 0, H * 0.3);
    top.addColorStop(0, "rgba(0,0,0,0.55)");
    top.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = top;
    ctx.fillRect(0, 0, W, H * 0.3);
    const bot = ctx.createLinearGradient(0, H * 0.42, 0, H);
    bot.addColorStop(0, "rgba(0,0,0,0)");
    bot.addColorStop(1, "rgba(0,0,0,0.78)");
    ctx.fillStyle = bot;
    ctx.fillRect(0, 0, W, H);
  } else if (!transparent) {
    const g = ctx.createLinearGradient(0, 0, W * 0.4, H);
    g.addColorStop(0, pal.grad[0]);
    g.addColorStop(1, pal.grad[1]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // Garis kecepatan diagonal halus
    ctx.save();
    ctx.rotate((-55 * Math.PI) / 180);
    ctx.fillStyle = wText(0.035);
    for (let x = -W * 1.6; x < W * 1.2; x += 68) ctx.fillRect(x, -H, 22, H * 3);
    ctx.restore();

    // Strip aksen miring di tepi kanan (khas jersey balap)
    ctx.save();
    ctx.transform(1, 0, -0.28, 1, 0, 0);
    const stripeG = ctx.createLinearGradient(0, 0, 0, H);
    stripeG.addColorStop(0, pal.accent);
    stripeG.addColorStop(1, pal.accent2);
    ctx.fillStyle = stripeG;
    ctx.globalAlpha = 0.9;
    ctx.fillRect(W + 210, -60, 46, H + 120);
    ctx.globalAlpha = 0.45;
    ctx.fillRect(W + 172, -60, 12, H + 120);
    ctx.restore();
    ctx.globalAlpha = 1;

    // Vignette bawah agar teks kontras
    const vg = ctx.createLinearGradient(0, H * 0.55, 0, H);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, "rgba(0,0,0,0.35)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
  } else {
    // Mode transparan: tanpa latar; beri bayangan lembut pada semua elemen
    // agar tetap terbaca di atas foto/story apa pun.
    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 2;
  }

  // ---------- Elemen bersama ----------
  const setSpacing = (px: number) => {
    try { (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${px}px`; } catch { /* browser lama */ }
  };

  // Header: badge BUG + subjudul
  const header = (x: number, y: number) => {
    ctx.save();
    ctx.transform(1, 0, -0.18, 1, 0, 0);
    roundRectPath(ctx, x + y * 0.18, y - 52, 128, 68, 16);
    const bg = ctx.createLinearGradient(x, y - 52, x, y + 16);
    bg.addColorStop(0, pal.accent);
    bg.addColorStop(1, pal.accent2);
    ctx.fillStyle = bg;
    ctx.fill();
    ctx.restore();
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#0b1220";
    ctx.font = dFont(48, 800);
    ctx.fillText("BUG", x + 22, y);

    setSpacing(5);
    ctx.fillStyle = wText(0.75);
    ctx.font = dFont(25, 600, false);
    ctx.fillText("BULUNGAN UNTUK GOWESER", x + 156, y - 6);
    setSpacing(0);
  };

  const datePill = (rightX: number, y: number) => {
    const label = (opts.date || new Date()).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
    setSpacing(2);
    ctx.font = dFont(26, 600, false);
    const w = ctx.measureText(label.toUpperCase()).width + 44;
    roundRectPath(ctx, rightX - w, y - 36, w, 50, 25);
    ctx.fillStyle = transparent ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.10)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.22)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = wText(0.85);
    ctx.textAlign = "left";
    ctx.fillText(label.toUpperCase(), rightX - w + 22, y);
    setSpacing(0);
  };

  // Panel kaca (latar rute / statistik)
  const glassPanel = (x: number, y: number, w: number, h: number, r = 36) => {
    roundRectPath(ctx, x, y, w, h, r);
    ctx.fillStyle = transparent || photo ? "rgba(0,0,0,0.34)" : "rgba(255,255,255,0.06)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.14)";
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  // Rute dengan glow + titik start/finish bercincin
  const drawRoute = (bx: number, by: number, bw: number, bh: number, lw: number) => {
    if (path.length < 2) {
      ctx.textAlign = "center";
      ctx.fillStyle = wText(0.55);
      ctx.font = dFont(34, 600, false);
      ctx.fillText("Rute terlalu pendek", bx + bw / 2, by + bh / 2);
      return;
    }
    const lats = path.map((p) => p.lat);
    const lngs = path.map((p) => p.lng);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    const spanLat = maxLat - minLat || 1e-6;
    const spanLng = maxLng - minLng || 1e-6;
    const scale = Math.min(bw / spanLng, bh / spanLat);
    const offX = bx + (bw - spanLng * scale) / 2;
    const offY = by + (bh - spanLat * scale) / 2;
    const toXY = (p: Pt): [number, number] => [offX + (p.lng - minLng) * scale, offY + (maxLat - p.lat) * scale];

    // Bayangan garis (kedalaman)
    ctx.save();
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = lw + 6;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    path.forEach((p, i) => {
      const [x, y] = toXY(p);
      if (i === 0) ctx.moveTo(x, y + 5); else ctx.lineTo(x, y + 5);
    });
    ctx.stroke();
    ctx.restore();

    // Garis utama dengan glow aksen
    ctx.save();
    ctx.shadowColor = pal.accent;
    ctx.shadowBlur = 26;
    ctx.strokeStyle = pal.accent;
    ctx.lineWidth = lw;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    path.forEach((p, i) => {
      const [x, y] = toXY(p);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.restore();

    // Titik start (putih) & finish (aksen) bercincin
    const [sx, sy] = toXY(path[0]);
    const [ex, ey] = toXY(path[path.length - 1]);
    const dot = (x: number, y: number, fill: string) => {
      ctx.beginPath(); ctx.arc(x, y, lw * 1.6, 0, Math.PI * 2);
      ctx.fillStyle = wText(0.25); ctx.fill();
      ctx.beginPath(); ctx.arc(x, y, lw * 1.05, 0, Math.PI * 2);
      ctx.fillStyle = fill; ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = "#0b1220"; ctx.stroke();
    };
    dot(sx, sy, "#ffffff");
    dot(ex, ey, pal.accent);
  };

  // Chip statistik (label kecil di atas, angka display di bawah)
  const statChip = (x: number, y: number, w: number, label: string, value: string, unit?: string) => {
    const h = 128;
    glassPanel(x, y, w, h, 26);
    setSpacing(4);
    ctx.textAlign = "left";
    ctx.fillStyle = wText(0.6);
    ctx.font = dFont(23, 600, false);
    ctx.fillText(label.toUpperCase(), x + 24, y + 42);
    setSpacing(0);
    ctx.fillStyle = "#ffffff";
    ctx.font = dFont(56, 700);
    ctx.fillText(value, x + 24, y + 102);
    if (unit) {
      const vw = ctx.measureText(value).width;
      ctx.fillStyle = wText(0.65);
      ctx.font = dFont(28, 600, false);
      ctx.fillText(unit, x + 24 + vw + 10, y + 100);
    }
  };

  const footer = (y: number) => {
    ctx.textAlign = "center";
    setSpacing(3);
    ctx.fillStyle = wText(0.5);
    ctx.font = dFont(24, 600, false);
    ctx.fillText(hashtag, W / 2, y);
    setSpacing(0);
  };

  const km = (distanceM / 1000).toFixed(2);
  const dur = fmtDuration(durationS);
  const elevStr = `${Math.round(elevM)}`;
  const avg = durationS > 0 ? ((distanceM / 1000) / (durationS / 3600)).toFixed(1) : "0.0";

  // ---------- Template ----------
  if (template === "momen") {
    // Gaya Momen: minimalis, rute besar di tengah tanpa panel,
    // statistik raksasa berjajar di bawah, cocok dengan foto latar.
    header(80, 122);
    datePill(W - 100, 118);

    // Rute overlay (garis putih ber-glow aksen agar menyatu dengan foto)
    ctx.save();
    if (photo || transparent) {
      ctx.shadowColor = "rgba(0,0,0,0.6)";
      ctx.shadowBlur = 18;
    }
    drawRoute(140, 250, W - 280, 430, 12);
    ctx.restore();

    // Nama tempat
    setSpacing(5);
    ctx.textAlign = "left";
    ctx.fillStyle = wText(0.75);
    ctx.font = dFont(30, 600, false);
    ctx.fillText(placeLabel, 84, 776);
    setSpacing(0);

    // Tiga statistik raksasa berjajar (tanpa panel, bergaya story)
    const cols: [string, string, string][] = [
      ["JARAK", km, "km"],
      ["WAKTU", dur, ""],
      ["KEC. RATA", avg, "km/j"],
    ];
    const colW = (W - 168) / 3;
    cols.forEach(([label, value, unit], i) => {
      const x = 84 + i * colW;
      setSpacing(4);
      ctx.textAlign = "left";
      ctx.fillStyle = wText(0.55);
      ctx.font = dFont(26, 600, false);
      ctx.fillText(label, x, 846);
      setSpacing(0);
      ctx.fillStyle = "#ffffff";
      ctx.font = dFont(78, 800);
      ctx.fillText(value, x - 4, 934);
      if (unit) {
        const vw = ctx.measureText(value).width;
        ctx.fillStyle = pal.accent;
        ctx.font = dFont(34, 700);
        ctx.fillText(unit, x + vw + 8, 930);
      }
    });

    // Garis aksen pemisah + elevasi kecil
    ctx.fillStyle = pal.accent;
    ctx.save();
    ctx.transform(1, 0, -0.3, 1, 0, 0);
    ctx.fillRect(84 + 964 * 0.3, 964, 220, 10);
    ctx.restore();
    setSpacing(3);
    ctx.textAlign = "left";
    ctx.fillStyle = wText(0.55);
    ctx.font = dFont(25, 600, false);
    ctx.fillText(`ELEVASI ${elevStr} M`, 84, 1014);
    setSpacing(0);

    footer(1058);
  } else if (template === "statistik") {
    header(80, 122);
    datePill(W - 100, 118);

    setSpacing(3);
    ctx.textAlign = "left";
    ctx.fillStyle = wText(0.85);
    ctx.font = dFont(40, 600);
    ctx.fillText(placeLabel, 84, 212);
    setSpacing(0);

    // Statistik besar bertumpuk dengan bilah aksen
    const rows: [string, string, string][] = [
      ["JARAK", km, "km"],
      ["WAKTU", dur, ""],
      ["KEC. RATA-RATA", avg, "km/j"],
      ["ELEVASI", elevStr, "m"],
    ];
    let y = 300;
    for (const [label, value, unit] of rows) {
      ctx.save();
      ctx.transform(1, 0, -0.22, 1, 0, 0);
      ctx.fillStyle = pal.accent;
      ctx.fillRect(84 + y * 0.22, y - 24, 14, 108);
      ctx.restore();

      ctx.textAlign = "left";
      setSpacing(4);
      ctx.fillStyle = wText(0.55);
      ctx.font = dFont(27, 600, false);
      ctx.fillText(label, 130, y + 6);
      setSpacing(0);
      ctx.fillStyle = "#ffffff";
      ctx.font = dFont(96, 800);
      ctx.fillText(value, 126, y + 92);
      if (unit) {
        const vw = ctx.measureText(value).width;
        ctx.fillStyle = pal.accent;
        ctx.font = dFont(40, 700);
        ctx.fillText(unit, 126 + vw + 14, y + 88);
      }
      y += 158;
    }

    // Strip rute di bawah dalam panel kaca
    glassPanel(84, 918, W - 168, 130, 30);
    drawRoute(120, 936, W - 240, 94, 8);
  } else if (template === "ringkas") {
    header(80, 116);

    // Rute besar hampir penuh
    drawRoute(90, 210, W - 180, 600, 15);

    // Nama tempat kecil di atas angka
    setSpacing(4);
    ctx.textAlign = "left";
    ctx.fillStyle = wText(0.6);
    ctx.font = dFont(28, 600, false);
    ctx.fillText(placeLabel, 84, 866);
    setSpacing(0);

    // Angka km raksasa dengan garis aksen miring di bawahnya
    ctx.fillStyle = "#ffffff";
    ctx.font = dFont(168, 800);
    ctx.fillText(km, 78, 1006);
    const kmW = ctx.measureText(km).width;
    ctx.fillStyle = pal.accent;
    ctx.font = dFont(54, 700);
    ctx.fillText("km", 78 + kmW + 18, 1000);
    ctx.save();
    ctx.transform(1, 0, -0.3, 1, 0, 0);
    ctx.fillStyle = pal.accent;
    ctx.fillRect(78 + 1030 * 0.3, 1030, kmW * 0.55, 12);
    ctx.restore();

    // Waktu & elevasi di kanan
    ctx.textAlign = "right";
    ctx.fillStyle = wText(0.9);
    ctx.font = dFont(44, 700);
    ctx.fillText(dur, W - 84, 952);
    setSpacing(3);
    ctx.fillStyle = wText(0.55);
    ctx.font = dFont(25, 600, false);
    ctx.fillText(`ELEVASI ${elevStr} M`, W - 84, 998);
    setSpacing(0);
  } else if (template === "rute") {
    header(80, 122);
    datePill(W - 100, 118);

    setSpacing(3);
    ctx.textAlign = "left";
    ctx.fillStyle = wText(0.85);
    ctx.font = dFont(40, 600);
    ctx.fillText(placeLabel, 84, 212);
    setSpacing(0);

    glassPanel(84, 246, W - 168, 452, 40);
    drawRoute(140, 296, W - 280, 352, 13);

    ctx.textAlign = "left";
    ctx.fillStyle = "#ffffff";
    ctx.font = dFont(150, 800);
    ctx.fillText(km, 80, 866);
    const kmW = ctx.measureText(km).width;
    ctx.fillStyle = pal.accent;
    ctx.font = dFont(52, 700);
    ctx.fillText("km", 80 + kmW + 16, 860);

    const gap = 18;
    const cw = (W - 168 - gap * 2) / 3;
    statChip(84, 900, cw, "Waktu", dur);
    statChip(84 + cw + gap, 900, cw, "Kec. rata", avg, "km/j");
    statChip(84 + (cw + gap) * 2, 900, cw, "Elevasi", elevStr, "m");

    footer(1058);
  } else if (template === "sorot") {
    // ---------------- Template "sorot" ----------------
    // Susunannya dibangun dari satu gagasan: jarak tempuh adalah bintang
    // utamanya, jejak rute jadi latar raksasa di belakangnya, dan tiga angka
    // pendukung berbaris di bawah pita marka jalan. Tetap bekerja pada mode
    // transparan maupun berlatar foto karena semua teks memakai wText().
    header(80, 118);
    datePill(W - 100, 114);

    // Jejak rute besar sebagai latar, ditempatkan agak ke atas dan diredam
    // supaya tidak bersaing dengan angkanya.
    ctx.save();
    ctx.globalAlpha = photo ? 0.5 : 0.34;
    drawRoute(96, 206, W - 192, 396, 20);
    ctx.restore();

    // Nama tempat, ditulis kecil di atas angka
    setSpacing(4);
    ctx.textAlign = "left";
    ctx.fillStyle = wText(0.72);
    ctx.font = dFont(34, 600);
    ctx.fillText(placeLabel, 84, 668);
    setSpacing(0);

    // Angka jarak raksasa, dua bagian: bilangan bulat putih, desimal beraksen
    const [bulat, desimal] = km.split(".");
    ctx.textAlign = "left";
    ctx.font = dFont(232, 800);
    const wBulat = ctx.measureText(bulat).width;
    ctx.font = dFont(232, 800);
    const wKoma = ctx.measureText("." + (desimal ?? "00")).width;
    const mulai = 80;

    // Pendar lembut di belakang angka agar tetap terbaca di atas foto
    if (photo || transparent) {
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,.55)";
      ctx.shadowBlur = 36;
      ctx.fillStyle = "rgba(0,0,0,.01)";
      ctx.fillRect(mulai, 672, wBulat + wKoma, 200);
      ctx.restore();
    }

    ctx.save();
    if (photo || transparent) { ctx.shadowColor = "rgba(0,0,0,.5)"; ctx.shadowBlur = 24; }
    ctx.fillStyle = "#ffffff";
    ctx.font = dFont(232, 800);
    ctx.fillText(bulat, mulai, 834);
    ctx.fillStyle = pal.accent;
    ctx.fillText("." + (desimal ?? "00"), mulai + wBulat, 834);
    ctx.restore();

    ctx.fillStyle = wText(0.62);
    ctx.font = dFont(40, 700);
    ctx.fillText("KM", mulai + wBulat + wKoma + 20, 830);

    // Pita marka jalan sebagai pemisah
    ctx.save();
    ctx.fillStyle = pal.accent;
    ctx.globalAlpha = 0.85;
    for (let x = 84; x < W - 84; x += 46) ctx.fillRect(x, 878, 26, 7);
    ctx.restore();

    // Tiga angka pendukung, tanpa kotak, dipisah garis tipis
    const kolom = [
      { l: "WAKTU", v: dur, u: "" },
      { l: "KEC. RATA", v: avg, u: "km/j" },
      { l: "ELEVASI", v: elevStr, u: "m" },
    ];
    const lebarKolom = (W - 168) / 3;
    kolom.forEach((k, i) => {
      const x = 84 + lebarKolom * i;
      if (i > 0) {
        ctx.fillStyle = wText(0.16);
        ctx.fillRect(x - 1, 928, 2, 66);
      }
      setSpacing(4);
      ctx.textAlign = "left";
      ctx.fillStyle = wText(0.5);
      ctx.font = dFont(23, 600, false);
      ctx.fillText(k.l, x + 6, 948);
      setSpacing(0);
      ctx.fillStyle = "#ffffff";
      ctx.font = dFont(60, 800);
      ctx.fillText(k.v, x + 4, 1006);
      if (k.u) {
        const vw = ctx.measureText(k.v).width;
        ctx.fillStyle = pal.accent;
        ctx.font = dFont(26, 700, false);
        ctx.fillText(k.u, x + 8 + vw, 1004);
      }
    });

    footer(1054);
  } else {
    // ================= Template baku: "MARKA" =================
    // Gagasannya berbeda dari kartu gowes kebanyakan. Alih-alih menggambar
    // jejak rute sebagai garis tipis di dalam panel, rutenya digambar sebagai
    // JALAN sungguhan: bahu jalan terang di kedua sisi, badan aspal gelap, dan
    // marka putus-putus mengikuti lekuk lintasan. Jadi kartunya bercerita
    // "inilah jalan yang saya lalui", bukan sekadar grafik perjalanan, dan itu
    // sejalan dengan jati diri BUG yang berdiri di atas bahasa marka jalan.

    // ---- Sorot jeruji dari sudut kiri bawah ----
    if (!photo) {
      ctx.save();
      ctx.globalAlpha = transparent ? 0.16 : 0.09;
      ctx.strokeStyle = pal.accent;
      ctx.lineWidth = 2;
      const cx = 60, cy = 1150;
      for (let i = 0; i < 26; i++) {
        const a = -Math.PI / 2 + (i / 25) * (Math.PI / 2);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a) * 1500, cy + Math.sin(a) * 1500);
        ctx.stroke();
      }
      ctx.restore();
    }

    // ---- Pita bahaya di sudut kanan atas ----
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(W, 0); ctx.lineTo(W, 196); ctx.lineTo(W - 196, 0); ctx.closePath();
    ctx.clip();
    ctx.fillStyle = photo ? "rgba(0,0,0,.45)" : "rgba(0,0,0,.28)";
    ctx.fillRect(W - 206, -10, 216, 216);
    ctx.strokeStyle = "#FFB020";
    ctx.lineWidth = 11;
    ctx.globalAlpha = 0.85;
    for (let i = -200; i < 240; i += 34) {
      ctx.beginPath(); ctx.moveTo(W - 200 + i, -20); ctx.lineTo(W + 40 + i, 240); ctx.stroke();
    }
    ctx.restore();

    // ---- Jejak rute digambar sebagai jalan ----
    const drawJalan = (bx: number, by: number, bw: number, bh: number) => {
      if (path.length < 2) {
        ctx.textAlign = "center";
        ctx.fillStyle = wText(0.5);
        ctx.font = dFont(34, 600, false);
        ctx.fillText("Jejak rute tidak tersimpan", bx + bw / 2, by + bh / 2);
        return;
      }
      const lats = path.map((q) => q.lat), lngs = path.map((q) => q.lng);
      const minLat = Math.min(...lats), maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
      const spanLat = maxLat - minLat || 1e-6, spanLng = maxLng - minLng || 1e-6;
      const sc = Math.min(bw / spanLng, bh / spanLat);
      const ox = bx + (bw - spanLng * sc) / 2;
      const oy = by + (bh - spanLat * sc) / 2;
      const xy = path.map((q) => [ox + (q.lng - minLng) * sc, oy + (maxLat - q.lat) * sc] as [number, number]);

      const jalur = (lw: number, warna: string, dash: number[] = [], geser = 0) => {
        ctx.save();
        ctx.setLineDash(dash);
        ctx.lineWidth = lw;
        ctx.strokeStyle = warna;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.beginPath();
        xy.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y + geser) : ctx.lineTo(x, y + geser)));
        ctx.stroke();
        ctx.restore();
      };

      jalur(46, "rgba(0,0,0,0.42)", [], 9);              // bayangan jatuh
      jalur(40, "rgba(255,255,255,0.62)");               // bahu jalan (marka tepi)
      jalur(30, photo ? "rgba(6,18,13,0.92)" : "#0A1410"); // badan aspal
      ctx.save();
      ctx.shadowColor = pal.accent;
      ctx.shadowBlur = 22;
      jalur(4.6, pal.accent, [18, 22]);                  // marka tengah putus-putus
      ctx.restore();

      // Titik mulai dan selesai
      const [sx, sy] = xy[0], [ex, ey] = xy[xy.length - 1];
      ctx.save();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath(); ctx.arc(sx, sy, 15, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#0A1410";
      ctx.beginPath(); ctx.arc(sx, sy, 7, 0, Math.PI * 2); ctx.fill();
      ctx.shadowColor = pal.accent; ctx.shadowBlur = 26;
      ctx.fillStyle = pal.accent;
      ctx.beginPath(); ctx.arc(ex, ey, 18, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#0A1410";
      ctx.beginPath(); ctx.arc(ex, ey, 7.5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    };

    header(80, 116);

    setSpacing(5);
    ctx.textAlign = "left";
    ctx.fillStyle = pal.accent;
    ctx.font = dFont(24, 700, false);
    ctx.fillText((opts.date || new Date()).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }).toUpperCase(), 84, 186);
    setSpacing(4);
    ctx.fillStyle = wText(0.9);
    ctx.font = dFont(44, 700);
    ctx.fillText(placeLabel, 84, 240);
    setSpacing(0);

    drawJalan(70, 268, W - 140, 386);

    // ---- Angka jarak: sangat besar, desimal beraksen ----
    const [bl, ds] = km.split(".");
    ctx.save();
    if (photo || transparent) { ctx.shadowColor = "rgba(0,0,0,.6)"; ctx.shadowBlur = 30; }
    ctx.textAlign = "left";
    ctx.font = dFont(250, 800);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(bl, 76, 886);
    const wbl = ctx.measureText(bl).width;
    ctx.fillStyle = pal.accent;
    ctx.fillText("." + (ds ?? "00"), 76 + wbl, 886);
    const wds = ctx.measureText("." + (ds ?? "00")).width;
    ctx.restore();

    // Satuan ditulis tegak berdiri di samping angka
    ctx.save();
    ctx.translate(76 + wbl + wds + 30, 886);
    ctx.rotate(-Math.PI / 2);
    setSpacing(10);
    ctx.textAlign = "left";
    ctx.fillStyle = wText(0.6);
    ctx.font = dFont(38, 700, false);
    ctx.fillText("KM", 0, 0);
    setSpacing(0);
    ctx.restore();

    // ---- Tiga angka pendukung, dipisah tanda jeruji ----
    const isi = [
      { l: "WAKTU", v: dur, u: "" },
      { l: "KEC. RATA", v: avg, u: "km/j" },
      { l: "ELEVASI", v: elevStr, u: "m" },
    ];
    const lk = (W - 168) / 3;
    isi.forEach((k, i) => {
      const x = 84 + lk * i;
      if (i > 0) {
        // tanda jeruji: tiga garis pendek mengipas
        ctx.save();
        ctx.strokeStyle = wText(0.22);
        ctx.lineWidth = 3;
        for (let j = -1; j <= 1; j++) {
          ctx.beginPath();
          ctx.moveTo(x - 14 + j * 5, 936);
          ctx.lineTo(x - 4 + j * 5, 998);
          ctx.stroke();
        }
        ctx.restore();
      }
      setSpacing(5);
      ctx.textAlign = "left";
      ctx.fillStyle = wText(0.5);
      ctx.font = dFont(23, 600, false);
      ctx.fillText(k.l, x + 16, 952);
      setSpacing(0);
      ctx.fillStyle = "#ffffff";
      ctx.font = dFont(62, 800);
      ctx.fillText(k.v, x + 14, 1004);
      if (k.u) {
        const vw = ctx.measureText(k.v).width;
        ctx.fillStyle = pal.accent;
        ctx.font = dFont(26, 700, false);
        ctx.fillText(k.u, x + 18 + vw, 1002);
      }
    });

    footer(1056);
  }
}