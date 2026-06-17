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
  }

  const score = submitted ? answers.reduce((acc: number, a, i) => (a === questions[i].correct ? acc + 1 : acc), 0) : 0;
  const answered = answers.filter((a) => a !== null).length;

  if (!started && !submitted) {
    return (
      <div className="mt-6 rounded-2xl p-6 text-center bg-gradient-to-br from-green-600 to-emerald-700 text-white shadow-lg">
        <Award size={38} className="mx-auto mb-2 opacity-90" />
        <h3 className="font-bold text-lg mb-1">Uji Pemahamanmu</h3>
        <p className="text-sm opacity-90 mb-4">
          {questions.length} pertanyaan singkat untuk memastikan kamu memahami modul ini.
        </p>
        {existingProgress?.completed && (
          <p className="text-xs bg-white/20 rounded-full px-3 py-1 inline-block mb-4">
            Skor terakhir: <strong>{existingProgress.score}/{questions.length}</strong>
          </p>
        )}
        <button
          onClick={() => setStarted(true)}
          className="block w-full bg-white text-green-700 px-6 py-3 rounded-xl font-bold active:scale-95 transition-transform"
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
        <div className={`rounded-2xl p-6 text-center text-white shadow-lg ${passed ? "bg-gradient-to-br from-green-600 to-emerald-700" : "bg-gradient-to-br from-amber-500 to-orange-600"}`}>
          <Award size={44} className="mx-auto mb-2" />
          <p className="text-sm opacity-90">Skor kamu</p>
          <h3 className="font-extrabold text-4xl my-1">{score}/{questions.length}</h3>
          <p className="text-sm opacity-95">
            {passed ? "Sempurna! Kamu menguasai modul ini." : "Lumayan! Baca ulang bagian yang kamu salah."}
          </p>
        </div>

        {questions.map((q, qIdx) => {
          const userAns = answers[qIdx];
          const isCorrect = userAns === q.correct;
          return (
            <div key={qIdx} className={`bg-white rounded-2xl p-4 shadow-sm border ${isCorrect ? "border-green-200" : "border-red-200"}`}>
              <div className="flex items-start gap-2 mb-2">
                {isCorrect ? <CheckCircle2 size={20} className="text-green-600 flex-shrink-0 mt-0.5" /> : <XCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />}
                <p className="text-sm font-semibold text-gray-900">{qIdx + 1}. {q.question}</p>
              </div>
              <div className="ml-7 space-y-1">
                <p className="text-xs">
                  Jawabanmu: <span className={isCorrect ? "text-green-700 font-medium" : "text-red-600 font-medium"}>{q.options[userAns!]}</span>
                </p>
                {!isCorrect && (
                  <p className="text-xs text-green-700">Jawaban benar: <strong>{q.options[q.correct]}</strong></p>
                )}
                <p className="text-xs text-gray-600 italic pt-1">{q.explanation}</p>
              </div>
            </div>
          );
        })}

        <button
          onClick={reset}
          className="w-full border-2 border-gray-300 text-gray-700 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 active:scale-95 transition-transform"
        >
          <RotateCcw size={16} /> Coba Lagi
        </button>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-center justify-between px-1">
        <h3 className="font-bold text-gray-800">Kuis</h3>
        <span className="text-xs text-gray-500">{answered}/{questions.length} terjawab</span>
      </div>

      {questions.map((q, qIdx) => (
        <div key={qIdx} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="font-semibold text-gray-900 mb-3"><span className="text-green-600">{qIdx + 1}.</span> {q.question}</p>
          <div className="space-y-2">
            {q.options.map((opt, optIdx) => {
              const sel = answers[qIdx] === optIdx;
              return (
                <button
                  key={optIdx}
                  onClick={() => selectAnswer(qIdx, optIdx)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-sm border-2 transition-colors flex items-center gap-2 ${sel ? "border-green-600 bg-green-50 text-green-800 font-medium" : "border-gray-200 text-gray-700"}`}
                >
                  <span className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center text-[10px] ${sel ? "border-green-600 bg-green-600 text-white" : "border-gray-300"}`}>
                    {sel ? "✓" : ""}
                  </span>
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <button
        onClick={handleSubmit}
        disabled={answers.some((a) => a === null) || saving}
        className="w-full bg-green-600 text-white py-3.5 rounded-xl font-bold disabled:bg-gray-300 disabled:text-gray-500 active:scale-95 transition-transform"
      >
        {saving ? "Menyimpan..." : "Kumpulkan Jawaban"}
      </button>
    </div>
  );
}