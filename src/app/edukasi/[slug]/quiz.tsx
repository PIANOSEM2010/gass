"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CheckCircle2, XCircle, Award, RotateCcw } from "lucide-react";

type Question = {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
};

const QUIZ_BANK: Record<string, Question[]> = {
  "pesepeda-pemula": [
    {
      question: "Apakah pesepeda boleh menggunakan jalan raya umum?",
      options: ["Tidak boleh, hanya kendaraan bermotor", "Boleh, ini hak yang diakui UU No. 22/2009", "Hanya boleh di hari Minggu", "Hanya pesepeda profesional"],
      correct: 1,
      explanation: "UU LLAJ mengakui sepeda sebagai bagian sistem transportasi. Hakmu sama dengan pengguna jalan lain.",
    },
    {
      question: "Di sisi mana pesepeda harus berjalan?",
      options: ["Sisi kanan, melawan arus", "Tengah jalan biar terlihat", "Sisi kiri, searah arus lalu lintas", "Tergantung mood"],
      correct: 2,
      explanation: "Pesepeda harus searah arus, sisi kiri. Ini aturan keselamatan dasar untuk semua jenis kendaraan di Indonesia.",
    },
    {
      question: "Apa prinsip utama saat menghadapi pengendara yang agresif?",
      options: ["Balas agresif", "Mengalah, keselamatan lebih penting dari gengsi", "Diam saja di tengah jalan", "Klakson balik"],
      correct: 1,
      explanation: "Sebagai pengguna jalan rentan, mengalah bukan kalah, itu strategi bertahan hidup.",
    },
  ],
  "etika-berbagi-jalan": [
    {
      question: "Berapa jarak aman menyalip pesepeda?",
      options: ["50 cm cukup", "Minimal 1,5 meter", "3 meter, sekalian banyak", "Tidak perlu jarak"],
      correct: 1,
      explanation: "1,5 meter adalah standar internasional. Cukup untuk antisipasi jika pesepeda harus menghindar mendadak.",
    },
    {
      question: "Di persimpangan, prinsip yang harus dipegang adalah?",
      options: ["Yang cepat duluan", "Sabar, 5 detik kesabaran cegah 5 minggu rumah sakit", "Klakson keras-keras", "Tutup mata, pasrah"],
      correct: 1,
      explanation: "Mayoritas kecelakaan terjadi di persimpangan. Berhenti sejenak, cek segala arah, baru maju.",
    },
    {
      question: "Apa yang harus dilakukan saat melihat teman ugal-ugalan di jalan?",
      options: ["Diamkan, urusan dia", "Ikut ugal-ugalan biar seru", "Tegur, budaya jalan dibangun bersama", "Foto buat lucu-lucuan"],
      correct: 2,
      explanation: "Membiarkan perilaku buruk = menormalkannya. Teguran ringan dari teman lebih efektif daripada aturan.",
    },
  ],
  "pengendara-motor-sadar-pesepeda": [
    {
      question: "Saat menyalip pesepeda, klakson seperti apa yang tepat?",
      options: ["Keras dan lama, biar dengar", "Pendek dan halus", "Tidak perlu klakson sama sekali", "Klakson 5 kali berturut-turut"],
      correct: 1,
      explanation: "Klakson keras bisa mengagetkan pesepeda hingga hilang keseimbangan. Pendek dan halus sudah cukup sebagai sinyal.",
    },
    {
      question: "Di zona sekolah pagi hari, apa yang harus dilakukan?",
      options: ["Ngebut biar cepat lewat", "Turunkan kecepatan, banyak pesepeda muda", "Klakson terus", "Tutup mata"],
      correct: 1,
      explanation: "Pelajar pesepeda umumnya kurang berpengalaman. Anggap setiap pesepeda muda seperti adikmu sendiri.",
    },
    {
      question: "Mengapa pesepeda kadang sulit terlihat di persimpangan?",
      options: ["Karena mereka transparan", "Karena ukurannya kecil, cek dua kali sebelum belok", "Karena kamera tertutup", "Karena mereka sengaja sembunyi"],
      correct: 1,
      explanation: "Sudut buta + ukuran kecil pesepeda bikin mereka mudah terlewat. Cek dua kali adalah kebiasaan yang menyelamatkan nyawa.",
    },
  ],
  "persiapan-bersepeda": [
    {
      question: "Yang HARUS dicek setiap pagi sebelum berangkat sekolah?",
      options: ["Hanya rem", "Rem, rantai, ban, stang & sadel", "Cukup ban saja", "Tidak perlu cek, langsung jalan"],
      correct: 1,
      explanation: "Empat hal: rem, rantai, ban, plus stang & sadel longgar/tidak. Cuma 1 menit, tapi cegah masalah serius.",
    },
    {
      question: "Apa penyebab utama kecelakaan pesepeda pelajar?",
      options: ["Sepeda kurang mahal", "Terburu-buru karena bangun kesiangan", "Cuaca dingin", "Tas terlalu warna-warni"],
      correct: 1,
      explanation: "Terburu-buru bikin konsentrasi turun dan keputusan jadi gegabah. Berangkat lebih awal solusi paling sederhana.",
    },
    {
      question: "Kalau sepeda rusak di tengah jalan, sebaiknya?",
      options: ["Paksa lanjut, lebih cepat sampai", "Berhenti di tempat aman, hubungi keluarga", "Tinggalkan sepeda begitu saja", "Coba perbaiki di tengah jalan"],
      correct: 1,
      explanation: "Lebih baik terlambat daripada celaka. Berhenti di tempat aman, minta tolong.",
    },
  ],
  "menghadapi-situasi-darurat": [
    {
      question: "Saat kamu mengalami kecelakaan, langkah pertama yang benar?",
      options: ["Langsung berdiri dan jalan", "Jangan panik, cek kondisi tubuh pelan-pelan", "Foto sepeda dulu untuk insurance", "Marah-marah ke yang nabrak"],
      correct: 1,
      explanation: "Panik bikin keputusan buruk. Cek tubuh dulu, jangan paksa bergerak jika nyeri di leher/punggung/kepala.",
    },
    {
      question: "Nomor panggilan darurat nasional di Indonesia?",
      options: ["911", "112", "1500", "Tidak ada"],
      correct: 1,
      explanation: "112 adalah nomor darurat nasional, gratis, terhubung ke polisi/pemadam/ambulans terdekat.",
    },
    {
      question: "Saat melihat pesepeda kecelakaan, apa yang TIDAK boleh dilakukan?",
      options: ["Berhenti dan mendekat", "Langsung mengangkat tubuh korban", "Telepon 112", "Tetap bersama korban sampai bantuan tiba"],
      correct: 1,
      explanation: "Mengangkat sembarangan bisa memperparah cedera leher/punggung. Tunggu petugas medis yang tahu cara menggerakkan korban dengan benar.",
    },
  ],  "malam-dan-cuaca": [
    {
      question: "Apa perlengkapan paling menentukan saat bersepeda selepas magrib?",
      options: ["Helm bermotif terang", "Lampu belakang merah yang menyala", "Sarung tangan", "Botol minum"],
      correct: 1,
      explanation: "Lampu belakang merah membuatmu terlihat dari jarak jauh oleh kendaraan yang datang dari belakang. Itu arah datangnya sebagian besar tabrakan pada pesepeda.",
    },
    {
      question: "Hujan baru turun setelah kemarau panjang. Kenapa jalan justru paling licin saat itu?",
      options: ["Air menutupi lubang", "Oli dan debu terangkat lalu bercampur air", "Ban memuai", "Rem menjadi panas"],
      correct: 1,
      explanation: "Sisa oli kendaraan yang mengendap selama kemarau terangkat ke permukaan saat hujan pertama. Lapisan itu jauh lebih licin daripada air biasa.",
    },
    {
      question: "Bagaimana cara mengerem yang benar di jalan basah?",
      options: ["Rem depan sekuatnya", "Rem lebih awal dan bertahap, dominan rem belakang", "Angkat kaki dari pedal", "Tidak usah mengerem, biarkan melambat sendiri"],
      correct: 1,
      explanation: "Jarak pengereman di jalan basah bisa dua kali lipat. Mengerem lebih awal dan bertahap mencegah roda terkunci lalu tergelincir.",
    },
  ],
  "anak-dan-rombongan": [
    {
      question: "Di mana posisi terbaik anak saat bersepeda rombongan bersama orang dewasa?",
      options: ["Paling depan agar terlihat", "Di tengah rombongan", "Paling belakang", "Bebas, sesuai keinginannya"],
      correct: 1,
      explanation: "Di tengah, anak terlindungi dari depan dan belakang. Orang dewasa di posisi paling belakang bertugas menjadi penahan terhadap kendaraan yang menyusul.",
    },
    {
      question: "Berapa jumlah maksimal pesepeda yang boleh berjajar di jalan umum?",
      options: ["Bebas asal rapi", "Dua orang, dan menyusut jadi satu bila ada kendaraan menyusul", "Empat orang", "Tidak boleh berjajar sama sekali"],
      correct: 1,
      explanation: "Berjajar dua masih dapat diterima, tetapi harus segera menyusut menjadi satu banjar ketika ada kendaraan hendak menyusul.",
    },
    {
      question: "Aba-aba apa yang wajib diteruskan dari depan ke belakang dalam rombongan?",
      options: ["Nama jalan yang dilewati", "Lubang, pasir, atau kendaraan berhenti di depan", "Kecepatan masing-masing", "Jumlah kalori terbakar"],
      correct: 1,
      explanation: "Pesepeda di belakang tidak bisa melihat permukaan jalan karena tertutup. Meneruskan aba-aba bahaya adalah kewajiban, bukan basa-basi.",
    },
  ],
  "hak-hukum-pesepeda": [
    {
      question: "Pasal berapa dalam UU No. 22 Tahun 2009 yang mewajibkan pengemudi mengutamakan pesepeda?",
      options: ["Pasal 106 ayat (2)", "Pasal 12", "Pasal 77", "Pasal 291"],
      correct: 0,
      explanation: "Pasal 106 ayat (2) mewajibkan pengemudi mengutamakan keselamatan pejalan kaki dan pesepeda. Ini dasar hukum yang bisa kamu sebut bila hakmu diabaikan.",
    },
    {
      question: "Apa yang harus dilakukan lebih dulu bila kamu menjadi korban tabrak lari?",
      options: ["Mengejar pelaku", "Menepi, minta bantuan, dan catat ciri kendaraan", "Langsung mengunggah ke media sosial", "Pulang dan melupakannya"],
      correct: 1,
      explanation: "Mengejar pelaku menambah risiko. Yang bernilai untuk penyelidikan adalah nomor polisi, warna, jenis kendaraan, waktu, dan saksi di lokasi.",
    },
    {
      question: "Apakah pesepeda wajib memiliki SIM dan STNK?",
      options: ["Wajib keduanya", "Wajib SIM saja", "Tidak wajib, tetapi tetap terikat aturan lalu lintas", "Wajib STNK saja"],
      correct: 2,
      explanation: "Sepeda tidak memerlukan SIM maupun STNK, tetapi pesepeda tetap terikat rambu, marka, dan lampu pengatur lalu lintas seperti pengguna jalan lain.",
    },
  ],
  "perawatan-sepeda": [
    {
      question: "Pemeriksaan apa yang paling penting dilakukan sebelum berangkat?",
      options: ["Kebersihan rantai", "Tekanan ban, rem, dan kekencangan roda", "Warna cat", "Posisi bel"],
      correct: 1,
      explanation: "Ban, rem, dan roda adalah tiga hal yang bila gagal langsung menimbulkan kecelakaan. Pemeriksaannya cukup sepuluh detik.",
    },
    {
      question: "Ban kurang angin membuat gowes berat. Apa bahaya lain yang lebih serius?",
      options: ["Cat cepat pudar", "Ban mudah pecah dan sepeda sulit dikendalikan saat berbelok", "Rantai berkarat", "Sadel cepat rusak",],
      correct: 1,
      explanation: "Ban kempis membuat dinding ban terjepit pelek saat melewati lubang, sehingga mudah pecah mendadak - biasanya justru ketika sedang berbelok.",
    },
    {
      question: "Seberapa sering rantai sebaiknya dilumasi di iklim Bulungan yang lembap dan sering hujan?",
      options: ["Setahun sekali", "Setiap satu sampai dua minggu, atau setelah kehujanan", "Tidak perlu sama sekali", "Hanya bila berbunyi"],
      correct: 1,
      explanation: "Kelembapan tinggi dan hujan mencuci pelumas rantai. Rantai kering mudah putus saat dikayuh kuat, misalnya ketika menghindari kendaraan.",
    },
  ],

};

export default function ModuleQuiz({
  moduleId,
  moduleSlug,
  userId,
  existingProgress,
}: {
  moduleId: string;
  moduleSlug: string;
  userId: string;
  existingProgress: { completed: boolean; score: number | null } | null;
}) {
  const questions = QUIZ_BANK[moduleSlug] || [];
  const [started, setStarted] = useState(false);
  const [answers, setAnswers] = useState<(number | null)[]>(new Array(questions.length).fill(null));
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  // Kuis interaktif: satu soal per layar, umpan balik langsung setelah
  // menjawab, dan hitungan jawaban benar beruntun (sesuai rancangan).
  const [ke, setKe] = useState(0);
  const [terkunci, setTerkunci] = useState(false);
  const [beruntun, setBeruntun] = useState(0);
  const [goyang, setGoyang] = useState<"benar" | "salah" | null>(null);

  if (questions.length === 0) return null;

  function selectAnswer(qIdx: number, optIdx: number) {
    if (submitted) return;
    const next = [...answers];
    next[qIdx] = optIdx;
    setAnswers(next);
  }

  async function handleSubmit() {
    if (answers.some((a) => a === null)) return;
    setSaving(true);
    const score = answers.reduce((acc: number, a, i) => (a === questions[i].correct ? acc + 1 : acc), 0);
    const supabase = createClient();
    await supabase.from("module_progress").upsert({
      user_id: userId,
      module_id: moduleId,
      completed: true,
      score,
      completed_at: new Date().toISOString(),
    }, { onConflict: "user_id,module_id" });
    setSubmitted(true);
    setSaving(false);
  }

  function reset() {
    setAnswers(new Array(questions.length).fill(null));
    setSubmitted(false);
    setStarted(true);
    setKe(0); setTerkunci(false); setBeruntun(0);
  }

  const score = submitted ? answers.reduce((acc: number, a, i) => (a === questions[i].correct ? acc + 1 : acc), 0) : 0;
  const answered = answers.filter((a) => a !== null).length;

  if (!started && !submitted) {
    return (
      <div className="mt-6 rounded-2xl p-6 text-center border border-lime-400/20 bg-[var(--kartu)]">
        <Award size={38} className="mx-auto mb-2 text-lime-400" />
        <h3 className="display-title text-lg text-white mb-1">UJI PEMAHAMANMU</h3>
        <p className="text-[13px] text-slate-400 mb-4">
          {questions.length} pertanyaan singkat untuk memastikan kamu memahami modul ini.
        </p>
        {existingProgress?.completed && (
          <p className="text-[11px] border border-white/10 text-slate-400 rounded-full px-3 py-1 inline-block mb-4">
            Skor terakhir: <strong>{existingProgress.score}/{questions.length}</strong>
          </p>
        )}
        <button
          onClick={() => setStarted(true)}
          className="block w-full bg-gradient-to-r from-lime-400 to-emerald-500 text-slate-950 px-6 py-3 rounded-xl display-title text-base active:scale-95 transition-transform"
        >
          {existingProgress?.completed ? "Coba Lagi" : "Mulai Kuis"}
        </button>
      </div>
    );
  }

  if (submitted) {
    const passed = score === questions.length;
    return (
      <div className="mt-6 space-y-4">
        <div className={`rounded-2xl p-6 text-center ${passed ? "border border-lime-400/30 bg-lime-400/8" : "border border-amber-400/30 bg-amber-400/8"}`}>
          <Award size={44} className="mx-auto mb-2 text-lime-400" />
          <p className="eyebrow !text-[9px] text-slate-500">Skor kamu</p>
          <h3 className="display-num text-5xl my-1 text-white">{score}/{questions.length}</h3>
          <p className="text-[13px] text-slate-300">
            {passed ? "Sempurna! Kamu menguasai modul ini." : "Lumayan! Baca ulang bagian yang kamu salah."}
          </p>
        </div>

        {questions.map((q, qIdx) => {
          const userAns = answers[qIdx];
          const isCorrect = userAns === q.correct;
          return (
            <div key={qIdx} className={`bg-[var(--kartu)] rounded-2xl p-4 border ${isCorrect ? "border-lime-400/25" : "border-red-400/25"}`}>
              <div className="flex items-start gap-2 mb-2">
                {isCorrect ? <CheckCircle2 size={20} className="text-lime-400 flex-shrink-0 mt-0.5" /> : <XCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />}
                <p className="text-sm font-semibold text-white">{qIdx + 1}. {q.question}</p>
              </div>
              <div className="ml-7 space-y-1">
                <p className="text-xs">
                  Jawabanmu: <span className={isCorrect ? "text-lime-300 font-medium" : "text-red-600 font-medium"}>{q.options[userAns!]}</span>
                </p>
                {!isCorrect && (
                  <p className="text-xs text-lime-300">Jawaban benar: <strong>{q.options[q.correct]}</strong></p>
                )}
                <p className="text-xs text-slate-400 italic pt-1">{q.explanation}</p>
              </div>
            </div>
          );
        })}

        <button
          onClick={reset}
          className="w-full border-2 border-white/15 text-slate-200 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 active:scale-95 transition-transform"
        >
          <RotateCcw size={16} /> Coba Lagi
        </button>
      </div>
    );
  }

  // ---- Tampilan pengerjaan: satu soal per layar ----
  const soal = questions[ke];
  const jawab = answers[ke];
  const benar = jawab === soal.correct;
  const persen = Math.round(((ke + (terkunci ? 1 : 0)) / questions.length) * 100);
  const soalTerakhir = ke === questions.length - 1;

  function pilih(idx: number) {
    if (terkunci) return;
    setGoyang(idx === soal.correct ? "benar" : "salah");
    setTimeout(() => setGoyang(null), 700);
    const salinan = [...answers];
    salinan[ke] = idx;
    setAnswers(salinan);
    setTerkunci(true);
    setBeruntun((b) => (idx === soal.correct ? b + 1 : 0));
  }

  function lanjut() {
    if (soalTerakhir) { handleSubmit(); return; }
    setKe((v) => v + 1);
    setTerkunci(false);
  }

  return (
    <div className="mt-6">
      {/* Kepala: cincin kemajuan + hitungan beruntun */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative w-11 h-11 flex-shrink-0">
          <svg viewBox="0 0 44 44" className="w-11 h-11 -rotate-90">
            <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(255,255,255,.10)" strokeWidth="4" />
            <circle cx="22" cy="22" r="18" fill="none" stroke="#B4FF3A" strokeWidth="4" strokeLinecap="round"
              strokeDasharray={`${(persen / 100) * 113} 113`}
              style={{ transition: "stroke-dasharray .45s cubic-bezier(.22,1,.36,1)" }} />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center display-num text-sm text-white">{ke + 1}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="eyebrow !text-[9px] text-slate-500 truncate">Kuis modul</p>
          <p className="display-title text-[15px] text-white">SOAL {ke + 1} DARI {questions.length}</p>
        </div>
        <div className="text-right">
          <p className={`display-num text-2xl leading-none text-lime-400 ${goyang === "benar" ? "kuis-benar" : ""}`}>{beruntun}</p>
          <p className="eyebrow !text-[8px] text-slate-500 mt-1">beruntun</p>
        </div>
      </div>

      <div className="h-1 rounded-full bg-white/8 overflow-hidden mb-4">
        <div className="h-full bg-gradient-to-r from-lime-400 to-emerald-500"
          style={{ width: `${persen}%`, transition: "width .45s cubic-bezier(.22,1,.36,1)" }} />
      </div>

      {/* Situasi di jalan */}
      <div className={`rounded-2xl border border-lime-400/12 bg-[var(--kartu)] p-4 ${goyang === "benar" ? "kuis-benar" : goyang === "salah" ? "kuis-salah" : ""}`}>
        <p className="eyebrow !text-[9px] text-slate-500 mb-2">Situasi di jalan</p>
        <p className="text-[14px] leading-relaxed text-slate-100">{soal.question}</p>
        <div className="mt-3 rounded-xl bg-[var(--relung)] border border-white/5 py-3">
          <IlustrasiJalan />
        </div>
      </div>

      {/* Pilihan jawaban */}
      <div className="space-y-2 mt-3">
        {soal.options.map((opt, idx) => {
          const dipilih = jawab === idx;
          const iniKunci = idx === soal.correct;
          let gaya = "border-white/10 bg-[var(--kartu)] text-slate-200";
          if (terkunci && iniKunci) gaya = "border-lime-400/60 bg-lime-400/12 text-lime-200 shadow-[0_0_22px_rgba(180,255,58,.18)]";
          else if (terkunci && dipilih) gaya = "border-red-400/50 bg-red-500/10 text-red-200";
          else if (terkunci) gaya = "border-white/5 bg-[var(--kartu-2)] text-slate-500";
          return (
            <button key={idx} onClick={() => pilih(idx)} disabled={terkunci}
              className={`w-full text-left px-3.5 py-3 rounded-xl text-[13px] border transition-colors flex items-center gap-2.5 ${gaya}`}>
              <span className={`w-6 h-6 rounded-full border flex-shrink-0 flex items-center justify-center text-[11px] display-title ${terkunci && iniKunci ? "border-lime-400 bg-lime-400 text-slate-950" : terkunci && dipilih ? "border-red-400 text-red-300" : "border-white/20 text-slate-400"}`}>
                {String.fromCharCode(65 + idx)}
              </span>
              <span className="flex-1">{opt}</span>
              {terkunci && iniKunci && (
                <span className="relative display-title text-[11px] text-lime-400">
                  +10
                  {goyang === "benar" && (
                    <span className="absolute -top-1 left-0 display-title text-[15px] text-lime-300 kuis-poin whitespace-nowrap">+10</span>
                  )}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {terkunci && (
        <>
          <button onClick={lanjut} disabled={saving}
            className="w-full mt-3 bg-gradient-to-r from-lime-400 to-emerald-500 text-slate-950 py-3.5 rounded-xl display-title text-base tracking-wide active:scale-[.98] transition-transform disabled:opacity-60">
            {saving ? "MENYIMPAN…" : soalTerakhir ? "LIHAT HASIL" : `LANJUT KE SOAL ${ke + 2}`}
          </button>
          <div className={`mt-2.5 rounded-xl border px-3.5 py-3 text-[12px] leading-relaxed ${benar ? "border-lime-400/25 bg-lime-400/8 text-lime-100" : "border-amber-400/25 bg-amber-400/8 text-amber-100"}`}>
            <span className="display-title text-[11px] mr-1.5">{benar ? "TEPAT!" : "BELUM TEPAT."}</span>
            {soal.explanation}
          </div>
        </>
      )}
    </div>
  );
}

// Ilustrasi marka jalan sederhana: truk, titik buta, dan posisi pesepeda.
// Digambar sendiri agar sejalan dengan bahasa visual marka jalan BUG.
function IlustrasiJalan() {
  return (
    <svg viewBox="0 0 280 62" className="w-full h-[62px]" aria-hidden="true">
      <rect x="0" y="24" width="280" height="20" fill="rgba(255,255,255,.03)" />
      <line x1="0" y1="24" x2="280" y2="24" stroke="rgba(255,255,255,.12)" strokeWidth="1" />
      <line x1="0" y1="44" x2="280" y2="44" stroke="rgba(255,255,255,.12)" strokeWidth="1" />
      <line x1="0" y1="34" x2="280" y2="34" stroke="#FFB020" strokeWidth="1.5" strokeDasharray="12 10" opacity=".7" />
      {/* zona titik buta */}
      <rect x="150" y="16" width="70" height="36" fill="rgba(248,113,113,.10)" stroke="rgba(248,113,113,.35)" strokeDasharray="4 4" />
      <text x="185" y="12" textAnchor="middle" fontSize="7" fill="rgba(248,113,113,.8)" letterSpacing="1">TITIK BUTA</text>
      {/* truk */}
      <rect x="196" y="22" width="34" height="16" rx="2" fill="rgba(255,255,255,.22)" />
      <rect x="230" y="26" width="12" height="12" rx="2" fill="rgba(255,255,255,.14)" />
      {/* pesepeda */}
      <g stroke="#B4FF3A" strokeWidth="1.8" fill="none">
        <circle cx="96" cy="38" r="6" />
        <circle cx="114" cy="38" r="6" />
        <path d="M96 38 L106 30 L114 38 M106 30 L104 38" />
        <circle cx="108" cy="25" r="2.6" />
      </g>
    </svg>
  );
}
