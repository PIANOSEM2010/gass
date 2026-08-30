import KepalaHalaman from "@/components/kepala-halaman";
import { IkonDasbor } from "@/components/fitur-ikon";
import { BUILD_TAG } from "@/lib/version";
import PemeriksaAplikasi from "./pemeriksa-aplikasi";

export const dynamic = "force-dynamic";

// Halaman diagnosa.
//
// Menjawab satu pertanyaan yang selama ini hanya bisa ditebak: apakah APK yang
// terpasang sudah sama dengan kode terbaru. Dibuat terbuka tanpa perlu masuk,
// supaya bisa dibuka siapa pun yang sedang menguji di ponselnya.
export default function HalamanDiagnosa() {
  return (
    <div className="min-h-screen bg-[var(--latar)] pb-10">
      <KepalaHalaman ikon={<IkonDasbor size={22} />} judul="DIAGNOSA APLIKASI"
        keterangan="Memeriksa versi web dan kelengkapan aplikasi Android yang sedang kamu pakai."
        warna="#38BDF8" />
      <div className="max-w-md mx-auto px-4 pt-5">
        <PemeriksaAplikasi versiWeb={BUILD_TAG} />
      </div>
    </div>
  );
}
