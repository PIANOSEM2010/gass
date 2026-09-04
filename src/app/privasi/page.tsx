import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export const metadata = {
  title: "Kebijakan Privasi - BUG",
  description: "Kebijakan privasi aplikasi BUG (Bulungan untuk Goweser).",
};

// Halaman kebijakan privasi.
//
// Sengaja tidak memerlukan masuk, karena Google Play mewajibkan alamatnya bisa
// dibuka siapa saja termasuk peninjau yang belum punya akun.
//
// PENTING: ganti dua nilai di bawah dengan alamat surel dan nama penanggung
// jawab yang sebenarnya sebelum alamat halaman ini dikirim ke Play Console.
// Kebijakan privasi tanpa jalur kontak yang benar-benar dijawab bukan hanya
// menyalahi kebijakan Google, tetapi juga menutup satu-satunya cara pengguna
// meminta datanya dihapus.
const SUREL = "semwibisono2@gmail.com";
const PENANGGUNG = "Sem Wibisono";
const DIPERBARUI = "3 September 2026";

function Bagian({ judul, children }: { judul: string; children: React.ReactNode }) {
  return (
    <section className="mt-7">
      <h2 className="display-title text-[15px] text-white mb-2">{judul}</h2>
      <div className="space-y-2.5 text-[13px] text-slate-300 leading-relaxed">{children}</div>
    </section>
  );
}

export default function KebijakanPrivasi() {
  return (
    <div className="min-h-screen bg-[var(--latar)] pb-16">
      <div className="max-w-2xl mx-auto px-5 pt-8">
        <div className="flex items-center gap-3">
          <span className="w-11 h-11 rounded-xl bg-lime-400/15 text-lime-300 flex items-center justify-center flex-shrink-0">
            <ShieldCheck size={22} />
          </span>
          <div>
            <h1 className="display-title text-[22px] text-white leading-tight">KEBIJAKAN PRIVASI</h1>
            <p className="text-[11.5px] text-slate-500 mt-0.5">
              BUG - Bulungan untuk Goweser · Diperbarui {DIPERBARUI}
            </p>
          </div>
        </div>

        <p className="mt-6 text-[13px] text-slate-300 leading-relaxed">
          BUG adalah aplikasi keselamatan pesepeda. Halaman ini menjelaskan data apa
          yang kami kumpulkan, untuk apa dipakai, siapa yang bisa melihatnya, dan
          bagaimana kamu bisa menghapusnya. Ditulis dengan bahasa sehari-hari supaya
          benar-benar bisa dibaca, bukan hanya ada.
        </p>

        <Bagian judul="DATA YANG KAMI KUMPULKAN">
          <p><strong className="text-white">Data akun.</strong> Alamat surel, kata sandi,
          nama, jenis anggota (pelajar atau pekerja), asal sekolah atau instansi, wilayah
          kabupaten/kota, dan foto profil bila kamu mengunggahnya. Kata sandi disimpan
          dalam bentuk teracak dan tidak pernah bisa dibaca oleh kami maupun siapa pun.</p>

          <p><strong className="text-white">Data perjalanan.</strong> Jejak lokasi GPS,
          jarak, durasi, perubahan ketinggian, waktu mulai, dan catatan yang kamu tulis
          sendiri. Lokasi hanya direkam selama kamu menekan Mulai Gowes, dan berhenti
          begitu kamu menekan Selesai.</p>

          <p><strong className="text-white">Lokasi saat layar mati.</strong> Bila kamu
          memakai aplikasi Android dan memberi izin, lokasi tetap direkam selama sesi
          perekaman berjalan meski layar dimatikan. Ini diperlukan karena pesepeda tidak
          dapat memegang ponsel selama bersepeda. Selama itu berlangsung, ada notifikasi
          permanen dari BUG di bilah pemberitahuanmu.</p>

          <p><strong className="text-white">Data darurat.</strong> Saat kamu menekan tombol
          SOS, lokasi dan waktunya dikirim ke kontak darurat yang kamu daftarkan sendiri dan
          ke admin BUG, lalu panggilan ke nomor darurat kepolisian dibuka. Nama dan nomor
          WhatsApp kontak daruratmu disimpan agar bisa dihubungi.</p>

          <p><strong className="text-white">Data sosial.</strong> Story berupa foto atau
          teks, komentar, tanda semangat, daftar orang yang kamu ikuti, kiriman forum, dan
          keikutsertaan event.</p>

          <p><strong className="text-white">Laporan jalan.</strong> Titik lokasi, keterangan,
          dan foto bila kamu melaporkan jalan berbahaya atau fasilitas pesepeda.</p>

          <p><strong className="text-white">Penanda pemberitahuan.</strong> Sebuah kode
          peranti dari layanan pemberitahuan Google, dipakai untuk mengirim peringatan
          keselamatan dan kabar event.</p>
        </Bagian>

        <Bagian judul="YANG TIDAK KAMI LAKUKAN">
          <p>Kami tidak menjual data siapa pun kepada pihak ketiga. Kami tidak memasang
          iklan. Kami tidak melacak lokasimu di luar sesi perekaman yang kamu mulai sendiri.
          Kami tidak membaca isi kontak, pesan, atau berkas lain di ponselmu.</p>
        </Bagian>

        <Bagian judul="SIAPA YANG BISA MELIHAT DATAMU">
          <p><strong className="text-white">Terbuka untuk pengguna BUG lain:</strong> nama,
          foto profil, asal sekolah atau instansi, wilayah, jarak total, jumlah perjalanan,
          rentetan hari, lencana pencapaian, jejak rute perjalananmu, story, komentar, dan
          kiriman forum.</p>

          <p><strong className="text-white">Hanya kamu dan admin BUG:</strong> alamat surel,
          kontak darurat, dan riwayat penggunaan tombol SOS.</p>

          <p><strong className="text-white">Kontak darurat pilihanmu:</strong> lokasi dan
          waktu saat kamu menekan SOS.</p>

          <p>Rute yang kamu simpan bersifat pribadi sampai kamu membagikan tautannya.
          Siapa pun yang punya tautan itu bisa melihat rutenya.</p>
        </Bagian>

        <Bagian judul="LAYANAN PIHAK KETIGA">
          <p>Agar aplikasi ini bisa bekerja, sebagian data dititipkan ke layanan berikut,
          masing-masing dengan kebijakan privasinya sendiri:</p>
          <ul className="list-disc list-inside space-y-1 text-[12.5px]">
            <li><strong className="text-white">Supabase</strong> - menyimpan akun, data
            perjalanan, dan berkas foto.</li>
            <li><strong className="text-white">Netlify</strong> - tempat aplikasi web ini
            dijalankan.</li>
            <li><strong className="text-white">Google</strong> - pilihan masuk dengan akun
            Google, dan layanan pengiriman pemberitahuan.</li>
            <li><strong className="text-white">OpenStreetMap</strong> - gambar peta dan
            penamaan lokasi. Koordinat dikirim untuk mendapat nama jalan, tanpa disertai
            identitasmu.</li>
            <li><strong className="text-white">OpenRouteService</strong> - penyusunan jalur
            dan panduan arah.</li>
          </ul>
        </Bagian>

        <Bagian judul="BERAPA LAMA DISIMPAN">
          <p>Data akun dan perjalanan disimpan selama akunmu masih ada. Story berhenti
          tampil setelah 24 jam. Riwayat SOS disimpan sebagai catatan keselamatan.
          Bila kamu meminta akunmu dihapus, seluruh data di atas dihapus dalam 14 hari
          kerja.</p>
        </Bagian>

        <Bagian judul="HAKMU ATAS DATAMU">
          <p>Kamu berhak melihat, mengoreksi, dan menghapus datamu. Nama, asal, wilayah, dan
          foto profil bisa kamu ubah sendiri kapan saja lewat halaman Profil. Perjalanan,
          story, dan rute tersimpan bisa kamu hapus sendiri.</p>
          <p>Untuk menghapus seluruh akun beserta datanya, kirim surel dari alamat yang kamu
          pakai mendaftar ke <a href={`mailto:${SUREL}`} className="text-lime-400 underline">{SUREL}</a>{" "}
          dengan subjek &ldquo;Hapus akun BUG&rdquo;.</p>
        </Bagian>

        <Bagian judul="KEAMANAN">
          <p>Seluruh pertukaran data berlangsung terenkripsi. Akses ke data dibatasi aturan
          per baris di basis data, sehingga satu pengguna tidak dapat membaca data pribadi
          pengguna lain meski mencoba secara langsung.</p>
          <p>Kami tidak dapat menjamin keamanan yang mutlak. Bila terjadi kebocoran yang
          memengaruhi datamu, kami akan memberitahu lewat aplikasi dan surel.</p>
        </Bagian>

        <Bagian judul="PENGGUNA ANAK DAN REMAJA">
          <p>BUG ditujukan bagi pengguna berusia 13 tahun ke atas. Bila kamu di bawah 18
          tahun, mintalah izin orang tua atau wali sebelum memakai fitur yang membagikan
          lokasi, dan sebaiknya daftarkan orang tua sebagai kontak darurat.</p>
        </Bagian>

        <Bagian judul="PERUBAHAN KEBIJAKAN">
          <p>Bila kebijakan ini berubah, tanggal pembaruan di atas ikut berubah dan
          perubahan penting akan diberitahukan di dalam aplikasi.</p>
        </Bagian>

        <Bagian judul="KONTAK">
          <p>Penanggung jawab: {PENANGGUNG}<br />
          Surel: <a href={`mailto:${SUREL}`} className="text-lime-400 underline">{SUREL}</a></p>
        </Bagian>

        <div className="mt-10 pt-6 border-t border-white/8">
          <Link href="/" className="text-[12.5px] text-lime-400">← Kembali ke BUG</Link>
        </div>
      </div>
    </div>
  );
}
