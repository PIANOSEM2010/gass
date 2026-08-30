// Penjaga latar untuk perekaman gowes di peramban.
//
// Android membekukan JavaScript begitu layar dikunci, sehingga GPS berhenti
// melapor. Namun ada satu pengecualian yang dibuat sengaja oleh Chrome: halaman
// yang sedang MEMUTAR MEDIA tidak dibekukan, karena orang memang mendengarkan
// musik dengan layar mati. Dengan memutar audio yang praktis tak terdengar
// secara berulang, halaman tetap hidup dan `watchPosition` terus berjalan.
//
// Ini cara yang jujur dipakai beberapa pencatat lari berbasis web, tetapi ia
// tetap siasat, bukan jaminan:
//   - Baterai lebih boros, karena prosesor tidak pernah benar-benar tidur.
//   - Muncul pemberitahuan pemutar media di bilah notifikasi. Bila pengguna
//     menutupnya, penjaga ini berhenti dan perekaman ikut terhenti.
//   - Ponsel dengan penghemat baterai agresif (Xiaomi, Oppo, Vivo, Realme -
//     yang justru banyak dipakai di Indonesia) tetap dapat membunuhnya.
//   - Di iPhone hampir selalu gagal: Safari menangguhkan halaman apa pun.
//
// Karena itu penjaga ini dipasang sebagai lapisan tambahan, bukan pengganti
// aplikasi Android yang memakai layanan lokasi latar belakang sungguhan.

let audio: HTMLAudioElement | null = null;
// Menandai bahwa penjaga memang diinginkan hidup, agar pemutaran yang
// dihentikan sistem bisa dipulihkan sendiri.
let ingin = false;

// Membuat berkas WAV satu detik berisi nada sangat pelan.
// Bukan hening total: Chrome dapat menganggap audio hening sebagai tidak ada
// pemutaran, lalu membekukan halamannya juga.
function buatNadaPelan(): string {
  const laju = 8000;      // 8 kHz sudah cukup, ukurannya kecil
  const detik = 1;
  const jumlah = laju * detik;
  const data = new Int16Array(jumlah);
  for (let i = 0; i < jumlah; i++) {
    // Gelombang 50 Hz beramplitudo cukup besar.
    //
    // Percobaan pertama memakai amplitudo sangat kecil dan ternyata gagal:
    // Chrome menilai tab tidak berbunyi, lalu tetap membekukannya saat layar
    // mati. Amplitudo sekarang jauh lebih besar agar tab benar-benar ditandai
    // "sedang berbunyi", sementara telinga tetap tidak mendengarnya karena
    // pengeras suara ponsel praktis tidak mampu menghasilkan nada 50 Hz.
    data[i] = Math.round(Math.sin((2 * Math.PI * 50 * i) / laju) * 6000);
  }

  const byteData = jumlah * 2;
  const buf = new ArrayBuffer(44 + byteData);
  const v = new DataView(buf);
  const tulis = (offset: number, teks: string) => {
    for (let i = 0; i < teks.length; i++) v.setUint8(offset + i, teks.charCodeAt(i));
  };
  tulis(0, "RIFF"); v.setUint32(4, 36 + byteData, true); tulis(8, "WAVE");
  tulis(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true);
  v.setUint16(22, 1, true); v.setUint32(24, laju, true);
  v.setUint32(28, laju * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  tulis(36, "data"); v.setUint32(40, byteData, true);
  for (let i = 0; i < jumlah; i++) v.setInt16(44 + i * 2, data[i], true);

  let biner = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i++) biner += String.fromCharCode(bytes[i]);
  return `data:audio/wav;base64,${btoa(biner)}`;
}

/**
 * Menyalakan penjaga latar. HARUS dipanggil dari dalam penanganan ketukan
 * pengguna (tombol Mulai Gowes), karena peramban melarang memulai audio
 * tanpa interaksi.
 *
 * @returns true bila pemutaran berhasil dimulai.
 */
export async function nyalakanPenjagaLatar(judul = "Mencatat gowes"): Promise<boolean> {
  if (typeof window === "undefined") return false;
  ingin = true;
  try {
    if (!audio) {
      audio = new Audio(buatNadaPelan());
      audio.loop = true;
      audio.volume = 0.35;
      // Supaya tetap diputar lewat pengeras suara meski headset dicabut.
      audio.setAttribute("playsinline", "true");
      // Android kadang menghentikan pemutaran saat berpindah keluaran suara
      // atau saat aplikasi lain memutar bunyi. Bila itu terjadi sementara
      // perekaman masih berjalan, penjaga dinyalakan lagi sendiri.
      audio.addEventListener("pause", () => {
        if (!ingin) return;
        catatAudioBerhenti();
        void audio?.play().catch(() => null);
      });
      audio.addEventListener("ended", () => {
        if (ingin) void audio?.play().catch(() => null);
      });
    }
    await audio.play();

    // Keterangan pada pemberitahuan pemutar media, agar pengguna paham kenapa
    // ada pemutar aktif dan tidak menutupnya karena mengira itu iklan.
    const nav = navigator as unknown as {
      mediaSession?: {
        metadata: unknown;
        setActionHandler: (a: string, h: (() => void) | null) => void;
      };
    };
    const MM = (window as unknown as { MediaMetadata?: new (i: object) => unknown }).MediaMetadata;
    if (nav.mediaSession && MM) {
      nav.mediaSession.metadata = new MM({
        title: judul,
        artist: "BUG - Bulungan untuk Goweser",
        album: "Jangan tutup agar jarak tetap tercatat",
      });
      // Tombol jeda pada pemberitahuan tidak diberi fungsi: menjedanya akan
      // menghentikan pencatatan, dan itu bukan yang diharapkan pengguna.
      nav.mediaSession.setActionHandler("pause", () => { void audio?.play(); });
    }
    return !audio.paused;
  } catch {
    return false;
  }
}

/** Mematikan penjaga latar. */
export function matikanPenjagaLatar() {
  ingin = false;
  try {
    audio?.pause();
    if (audio) audio.currentTime = 0;
    const nav = navigator as unknown as { mediaSession?: { metadata: unknown } };
    if (nav.mediaSession) nav.mediaSession.metadata = null;
  } catch { /* abaikan */ }
}

/** Apakah penjaga latar sedang berjalan. */
export function penjagaLatarAktif(): boolean {
  return Boolean(audio && !audio.paused);
}


// ---------------------------------------------------------------------------
// Catatan diagnosa.
//
// Perilaku layar terkunci berbeda-beda antar merek ponsel, dan tidak bisa
// diuji dari sini. Catatan ini merekam apa yang benar-benar terjadi selama
// perekaman, supaya bila pencatatan berhenti, penyebabnya bisa diketahui
// alih-alih ditebak.
export type Diagnosa = {
  mulai: number;
  fix: number;          // jumlah laporan GPS yang diterima
  fixTerakhir: number;  // waktu laporan GPS terakhir
  celahTerlama: number; // celah terlama antar laporan, dalam detik
  audioBerhenti: number; // berapa kali pemutaran sempat berhenti
};

let diag: Diagnosa = { mulai: 0, fix: 0, fixTerakhir: 0, celahTerlama: 0, audioBerhenti: 0 };

export function mulaiDiagnosa() {
  diag = { mulai: Date.now(), fix: 0, fixTerakhir: Date.now(), celahTerlama: 0, audioBerhenti: 0 };
}

export function catatFix() {
  const now = Date.now();
  if (diag.fixTerakhir) {
    const celah = (now - diag.fixTerakhir) / 1000;
    if (celah > diag.celahTerlama) diag.celahTerlama = celah;
  }
  diag.fix += 1;
  diag.fixTerakhir = now;
}

export function catatAudioBerhenti() { diag.audioBerhenti += 1; }
export function bacaDiagnosa(): Diagnosa { return { ...diag }; }
