-- ============================================================
-- BUG - empat modul edukasi tambahan
-- Jalankan di Supabase: SQL Editor -> New query -> Run.
-- Aman diulang: memakai ON CONFLICT pada kolom slug.
--
-- Catatan: soal kuis untuk keempat modul ini sudah tertanam di kode
-- (src/app/edukasi/[slug]/quiz.tsx), dicocokkan lewat slug. Jadi slug di
-- bawah TIDAK BOLEH diubah, atau kuisnya tidak akan muncul.
-- ============================================================

insert into public.modules (slug, title, summary, content, target_audience, order_index)
values
(
  'malam-dan-cuaca',
  'Gowes Malam & Cuaca Bulungan',
  'Terlihat saat gelap, dan membaca jalan ketika hujan turun.',
  'Bulungan punya dua musuh yang jarang dibicarakan pesepeda: gelap yang datang cepat setelah magrib, dan hujan yang bisa turun tanpa aba-aba.

Soal gelap, kesalahan paling umum adalah mengira pakaian terang sudah cukup. Tidak. Pakaian terang hanya bekerja bila ada cahaya yang memantulinya. Yang benar-benar menentukan adalah lampu belakang merah yang menyala. Sebagian besar tabrakan pada pesepeda datang dari arah belakang, dan pengemudi di belakangmu tidak akan pernah melihat warna jerseymu sebelum lampunya menyala.

Gunakan lampu depan putih untuk melihat jalan, dan lampu belakang merah untuk dilihat. Mode berkedip lebih menarik perhatian daripada nyala tetap, tetapi menyulitkan pengemudi memperkirakan jarak. Jalan tengahnya: nyala tetap di jalan ramai berlampu, berkedip di jalan gelap dan sepi.

Soal hujan, ada satu hal yang perlu kamu ingat baik-baik. Jalan paling licin bukan saat hujan deras, melainkan pada sepuluh sampai lima belas menit pertama hujan setelah kemarau panjang. Oli dan debu yang mengendap berminggu-minggu terangkat ke permukaan lalu bercampur air, membentuk lapisan yang jauh lebih licin daripada air biasa.

Karena itu, ubah cara mengeremmu. Mulai mengerem jauh lebih awal, bertahap, dan jangan mengandalkan rem depan sekuatnya. Jarak pengereman di jalan basah bisa dua kali lipat dari jalan kering. Melebar sedikit saat berbelok juga membantu - sudut belok yang landai memberi ban kesempatan mencengkeram.

Terakhir, marka jalan yang dicat dan tutup gorong-gorong dari besi berubah menjadi hampir sehalus es ketika basah. Lewati keduanya dengan sepeda tegak dan tanpa mengerem.',
  'pesepeda',
  6
),
(
  'anak-dan-rombongan',
  'Mengajak Anak & Gowes Rombongan',
  'Menyusun barisan yang melindungi anggota paling rentan.',
  'Bersepeda beramai-ramai memang lebih aman daripada sendirian - inilah yang disebut safety in numbers. Tetapi rombongan yang tidak tertata justru menciptakan bahayanya sendiri.

Bila ada anak dalam rombongan, tempatkan ia di tengah. Bukan di depan meskipun ia ingin, dan bukan di belakang meskipun ia lambat. Di tengah, ia terlindungi dari dua arah. Orang dewasa yang paling berpengalaman sebaiknya berada di posisi paling belakang, karena dari sanalah kendaraan menyusul, dan dari sana pula seluruh rombongan bisa diawasi.

Aturan berjajar sering disalahpahami. Berjajar dua orang masih dapat diterima dan bahkan membuat rombongan lebih terlihat. Tetapi begitu ada kendaraan hendak menyusul, barisan wajib segera menyusut menjadi satu banjar. Berjajar tiga atau lebih di jalan umum bukan lagi soal kenyamanan, melainkan menghalangi hak pengguna jalan lain.

Yang paling sering dilupakan adalah aba-aba. Pesepeda di belakang tidak bisa melihat permukaan jalan karena pandangannya tertutup punggung orang di depan. Maka siapa pun yang berada di depan wajib meneruskan tanda ketika melihat lubang, tumpahan pasir, kendaraan berhenti, atau anjing di pinggir jalan. Tunjuk ke bawah untuk lubang, lambaikan tangan ke belakang untuk rintangan yang harus dihindari, dan angkat tangan untuk berhenti.

Sepakati juga satu hal sebelum berangkat: rombongan berjalan sesuai kecepatan anggota paling lambat, bukan paling cepat. Rombongan yang tercerai-berai kehilangan seluruh keuntungan keselamatannya.',
  'semua',
  7
),
(
  'hak-hukum-pesepeda',
  'Hak Hukum Pesepeda di Jalan',
  'Dasar hukum yang bisa kamu sebut ketika hakmu diabaikan.',
  'Banyak pesepeda mengalah bukan karena memahami risiko, melainkan karena mengira dirinya memang tidak berhak berada di jalan. Anggapan itu keliru, dan meluruskannya penting.

Undang-Undang Nomor 22 Tahun 2009 tentang Lalu Lintas dan Angkutan Jalan mengakui sepeda sebagai kendaraan tidak bermotor yang berhak menggunakan jalan. Pasal 106 ayat (2) menyatakan bahwa setiap orang yang mengemudikan kendaraan bermotor wajib mengutamakan keselamatan pejalan kaki dan pesepeda. Ini bukan imbauan sopan santun, melainkan kewajiban hukum.

Pasal 62 mengatur bahwa pemerintah wajib menyediakan lajur khusus bagi sepeda. Bila lajur itu belum ada di daerahmu, kamu tetap berhak memakai badan jalan.

Sebaliknya, hak itu datang bersama kewajiban. Sepeda tidak memerlukan SIM maupun STNK, tetapi pesepeda tetap terikat rambu, marka, dan lampu pengatur lalu lintas. Pasal 61 juga mengatur perlengkapan sepeda: rem yang berfungsi, bel, serta pemantul cahaya di belakang dan pedal.

Bila kamu menjadi korban, urutannya begini. Utamakan keselamatan lebih dulu - menepi dan minta bantuan. Jangan mengejar pelaku, karena itu hanya menambah risiko dan tidak menambah bukti. Catat nomor polisi, warna, dan jenis kendaraan; cari saksi di lokasi dan minta nomor kontaknya; potret posisi sepeda, luka, dan kerusakan sebelum apa pun dipindahkan. Laporkan ke kepolisian - laporan yang tercatat adalah dasar untuk klaim maupun tuntutan.

Mengalah di jalan tetap merupakan pilihan yang bijak saat itu juga. Tetapi mengalah karena merasa tidak punya hak adalah hal yang berbeda, dan itulah yang perlu diubah.',
  'semua',
  8
),
(
  'perawatan-sepeda',
  'Perawatan Sepeda 10 Detik',
  'Tiga pemeriksaan sebelum berangkat yang mencegah celaka.',
  'Sebagian kecelakaan pesepeda tidak disebabkan oleh kendaraan lain, melainkan oleh sepeda yang gagal berfungsi pada saat yang paling genting - ketika sedang menghindar.

Ada pemeriksaan sederhana yang hanya memakan sepuluh detik dan sebaiknya menjadi kebiasaan sebelum berangkat. Urutannya mudah diingat: ban, rem, roda.

Ban. Tekan ban dengan ibu jari. Bila terasa lunak, pompa. Ban kurang angin bukan sekadar membuat gowes terasa berat. Dinding bannya mudah terjepit pelek ketika melewati lubang, sehingga pecah mendadak - dan itu biasanya terjadi justru saat sedang berbelok, ketika sepeda paling sulit dikendalikan.

Rem. Tekan kedua tuas rem sambil mendorong sepeda ke depan. Sepeda harus berhenti, dan tuas tidak boleh menyentuh setang. Bila kampas rem sudah tipis atau kabelnya kendur, perbaiki sebelum berangkat, bukan setelah pulang.

Roda. Angkat sedikit bagian depan lalu goyangkan roda ke kiri dan kanan. Bila ada goyangan, mur atau quick release-nya longgar. Kencangkan.

Untuk perawatan berkala di iklim Bulungan yang lembap dan sering hujan, rantai perlu perhatian lebih. Hujan mencuci pelumas rantai, dan rantai yang kering bisa putus saat dikayuh kuat. Bersihkan dan lumasi setiap satu sampai dua minggu, atau segera setelah kehujanan. Lap kelebihan pelumasnya, karena pelumas berlebih justru menempelkan debu.

Periksa juga kekencangan baut sadel dan setang sebulan sekali, serta ganti kampas rem sebelum alurnya hilang sama sekali.',
  'pesepeda',
  9
)
on conflict (slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  content = excluded.content,
  target_audience = excluded.target_audience,
  order_index = excluded.order_index;
