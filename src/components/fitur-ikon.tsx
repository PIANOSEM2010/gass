// Ikon khas per fitur. Semuanya digambar di kisi 24 px dengan ketebalan garis
// seragam 1,9 px, dan tiap ikon memuat satu unsur marka jalan atau jeruji roda
// berwarna aksen, itulah benang merah yang membedakannya dari ikon pustaka umum.
type P = { size?: number; aksen?: string };
const G = { fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

function Bingkai({ size = 22, children }: { size?: number; children: React.ReactNode }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...G}>{children}</svg>;
}

// Peta Jalur: peta terlipat dengan jalur bersepeda putus-putus melintas
export const IkonPetaJalur = ({ size, aksen = "#38BDF8" }: P) => (
  <Bingkai size={size}>
    <path d="M9 3.5 3.5 5.6v14.9L9 18.4l6 2.1 5.5-2.1V3.5L15 5.6z" />
    <path d="M9 3.5v14.9M15 5.6v14.9" opacity=".45" />
    <path d="M6.4 15.6c2.2-1.4 2.4-4.6 5.1-5.4 2.7-.8 3.4 2.6 6.1 1.4"
      stroke={aksen} strokeWidth="2.1" strokeDasharray="2.6 2.4" />
  </Bingkai>
);

// Edukasi: buku terbuka, halamannya bergaris marka jalan
export const IkonModul = ({ size, aksen = "#B4FF3A" }: P) => (
  <Bingkai size={size}>
    <path d="M12 6.4C10.3 5 8.2 4.3 5 4.3v13.4c3.2 0 5.3.7 7 2.1 1.7-1.4 3.8-2.1 7-2.1V4.3c-3.2 0-5.3.7-7 2.1z" />
    <path d="M12 6.4v13.4" opacity=".45" />
    <path d="M7.4 9.2h2.4M14.2 9.2h2.4M7.4 13.4h2.4M14.2 13.4h2.4"
      stroke={aksen} strokeWidth="2.1" />
  </Bingkai>
);

// Teman Pantau: penanda lokasi dengan gelombang pantauan
export const IkonTemanPantau = ({ size, aksen = "#2DD4BF" }: P) => (
  <Bingkai size={size}>
    <path d="M12 21.2c3.4-4 5.4-6.9 5.4-9.6A5.4 5.4 0 0 0 6.6 11.6c0 2.7 2 5.6 5.4 9.6z" />
    <circle cx="12" cy="11.4" r="2.1" fill={aksen} stroke="none" />
    <path d="M4.6 6.2a10.4 10.4 0 0 1 14.8 0" stroke={aksen} strokeWidth="1.8" strokeDasharray="2.4 2.6" />
  </Bingkai>
);

// Rekomendasi Rute: lintasan melingkar yang menutup kembali ke titik awal
export const IkonRuteLingkar = ({ size, aksen = "#A78BFA" }: P) => (
  <Bingkai size={size}>
    <path d="M8.4 5.4a7.6 7.6 0 1 1-3 6.1" />
    <path d="M5.4 15.9V11h4.9" />
    <circle cx="8.4" cy="5.4" r="2" fill={aksen} stroke="none" />
    <path d="M13.6 11.8h4.2" stroke={aksen} strokeWidth="2.1" strokeDasharray="2.2 2.2" />
  </Bingkai>
);

// Lapor Jalan: permukaan jalan berlubang dengan tanda seru
export const IkonLaporJalan = ({ size, aksen = "#FBBF24" }: P) => (
  <Bingkai size={size}>
    <path d="M3.2 18.6 7.4 6.4h9.2l4.2 12.2z" />
    <path d="M12 8.4v3.2M12 14.6v.1" stroke={aksen} strokeWidth="2.3" />
    <path d="M6.6 18.6c1.6-1.5 3.4-1.5 5 0" stroke={aksen} strokeWidth="1.8" />
  </Bingkai>
);

// Papan Peringkat: tiga podium dengan roda di puncak
export const IkonPapanPeringkat = ({ size, aksen = "#FB7185" }: P) => (
  <Bingkai size={size}>
    <path d="M3.6 20.4h4.2v-6H3.6zM9.9 20.4h4.2V8.6H9.9zM16.2 20.4h4.2v-8.6h-4.2z" />
    <circle cx="12" cy="4.6" r="2.4" fill={aksen} stroke="none" />
    <path d="M12 2.2v4.8M9.6 4.6h4.8" stroke="#0B1F18" strokeWidth="1" opacity=".55" />
  </Bingkai>
);

// Kampanye: pengeras suara dengan gelombang berbentuk marka jalan
export const IkonKampanyeJalan = ({ size, aksen = "#FB923C" }: P) => (
  <Bingkai size={size}>
    <path d="M4.2 10.2v3.6h3l4.6 3.4V6.8L7.2 10.2z" />
    <path d="M11.8 6.8v10.4" opacity=".4" />
    <path d="M15.4 8.6h4M15.4 12h4M15.4 15.4h4" stroke={aksen} strokeWidth="2.1" />
  </Bingkai>
);

// Forum: dua gelembung bicara, salah satunya beroda
export const IkonForumGowes = ({ size, aksen = "#60A5FA" }: P) => (
  <Bingkai size={size}>
    <path d="M3.4 5.4h11.2v7.2H8.2L5 15.4v-2.8H3.4z" />
    <path d="M9.4 15.6h11.2v-6" opacity=".5" />
    <path d="M20.6 9.6v8.6l-2.8-2.6h-4.2" opacity=".5" />
    <circle cx="6.6" cy="9" r="1.5" fill={aksen} stroke="none" />
    <path d="M10 9h2.4" stroke={aksen} strokeWidth="2.1" />
  </Bingkai>
);

// Catat Gowes: sepeda dengan jejak lintasan di belakangnya
export const IkonCatatGowes = ({ size, aksen = "#B4FF3A" }: P) => (
  <Bingkai size={size}>
    <circle cx="6.4" cy="16.4" r="3.4" />
    <circle cx="17.6" cy="16.4" r="3.4" />
    <path d="M6.4 16.4 11 9.4h4.2l2.4 7" />
    <path d="M11 9.4 9.6 16.4" />
    <circle cx="15.8" cy="5.8" r="1.7" fill={aksen} stroke="none" />
    <path d="M2.4 11.8h3.4" stroke={aksen} strokeWidth="2.1" strokeDasharray="2 2" />
  </Bingkai>
);

// Darurat SOS: perisai dengan tanda seru, sejalan dengan lambang aplikasi
export const IkonDaruratSos = ({ size, aksen = "#F87171" }: P) => (
  <Bingkai size={size}>
    <path d="M12 2.8 20 5.9v6c0 5-3.6 8.4-8 9.9-4.4-1.5-8-4.9-8-9.9v-6z" />
    <path d="M12 8.4v3.8M12 15.6v.1" stroke={aksen} strokeWidth="2.4" />
  </Bingkai>
);
