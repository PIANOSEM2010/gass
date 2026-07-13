// ============================================================
// KARTU GOWES BUG — modul bersama (dipakai halaman Catat & Riwayat)
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
  /** Latar transparan (PNG alpha) — cocok ditempel di story */
  transparent?: boolean;
  /** Tanggal aktivitas (riwayat memakai tanggal asli, bukan hari ini) */
  date?: Date;
};

// Menggambar kartu gowes ke canvas (1080x1080)
export function drawCard(canvas: HTMLCanvasElement, opts: CardOptions) {
  const { template, path, distanceM, durationS, elevM, place } = opts;
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
    ctx.fillText(`#GOWESERAMAN${place.replace(/\s+/g, "").toUpperCase()}  ·  DICATAT DENGAN BUG`, W / 2, y);
    setSpacing(0);
  };

  const km = (distanceM / 1000).toFixed(2);
  const dur = fmtDuration(durationS);
  const elevStr = `${Math.round(elevM)}`;
  const avg = durationS > 0 ? ((distanceM / 1000) / (durationS / 3600)).toFixed(1) : "0.0";

  // ---------- Template ----------
  if (template === "momen") {
    // Gaya Momen: minimalis — rute besar di tengah tanpa panel,
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
    ctx.fillText(`GOWES DI ${place.toUpperCase()}`, 84, 776);
    setSpacing(0);

    // Tiga statistik raksasa berjajar (tanpa panel — bergaya story)
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
    ctx.fillText(`GOWES DI ${place.toUpperCase()}`, 84, 212);
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
    ctx.fillText(`GOWES DI ${place.toUpperCase()}`, 84, 866);
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
  } else {
    // Template default: "rute"
    header(80, 122);
    datePill(W - 100, 118);

    setSpacing(3);
    ctx.textAlign = "left";
    ctx.fillStyle = wText(0.85);
    ctx.font = dFont(40, 600);
    ctx.fillText(`GOWES DI ${place.toUpperCase()}`, 84, 212);
    setSpacing(0);

    // Panel kaca berisi rute
    glassPanel(84, 246, W - 168, 452, 40);
    drawRoute(140, 296, W - 280, 352, 13);

    // Angka km besar
    ctx.textAlign = "left";
    ctx.fillStyle = "#ffffff";
    ctx.font = dFont(150, 800);
    ctx.fillText(km, 80, 866);
    const kmW = ctx.measureText(km).width;
    ctx.fillStyle = pal.accent;
    ctx.font = dFont(52, 700);
    ctx.fillText("km", 80 + kmW + 16, 860);

    // Tiga chip statistik
    const gap = 18;
    const cw = (W - 168 - gap * 2) / 3;
    statChip(84, 900, cw, "Waktu", dur);
    statChip(84 + cw + gap, 900, cw, "Kec. rata", avg, "km/j");
    statChip(84 + (cw + gap) * 2, 900, cw, "Elevasi", elevStr, "m");

    footer(1058);
  }
}
