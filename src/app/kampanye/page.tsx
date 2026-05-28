import Link from "next/link";
import { Megaphone, Camera, Music, Hash, Share2, ExternalLink } from "lucide-react";

const CAMPAIGNS = [
  {
    title: "#BerbagiJalanUntukPesepeda",
    description: "Tag video atau postingan kamu yang menunjukkan momen positif berbagi jalan dengan pesepeda di Bulungan.",
    platforms: [
      { name: "TikTok", icon: Music, url: "https://www.tiktok.com/tag/berbagijalanuntukpesepeda", color: "bg-black text-white" },
      { name: "Instagram", icon: Camera, url: "https://www.instagram.com/explore/tags/berbagijalanuntukpesepeda/", color: "bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 text-white" },
    ],
  },
  {
    title: "#GoweserAmanBulungan",
    description: "Bagikan tips, foto rute aman, atau cerita selamat sebagai pesepeda Bulungan. Inspirasi untuk teman pesepeda lain.",
    platforms: [
      { name: "TikTok", icon: Music, url: "https://www.tiktok.com/tag/goweseramanbulungan", color: "bg-black text-white" },
      { name: "Instagram", icon: Camera, url: "https://www.instagram.com/explore/tags/goweseramanbulungan/", color: "bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 text-white" },
    ],
  },
];

const TIPS = [
  { emoji: "🎥", text: "Bikin video 15-30 detik yang menunjukkan satu prinsip etika berbagi jalan" },
  { emoji: "📸", text: "Foto rute ramah pesepeda di Bulungan dengan caption yang mengajak" },
  { emoji: "💬", text: "Cerita pengalaman pribadi - dilindungi pengendara baik, atau dapat bantuan saat darurat" },
  { emoji: "🤝", text: "Tag teman pesepeda atau pengendara motor untuk menyebarkan kesadaran" },
];

export default function KampanyePage() {
  return (
    <div className="px-4 pt-8 pb-8 max-w-md mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <Megaphone size={28} className="text-orange-600" />
        <h1 className="text-2xl font-bold text-gray-900">Kampanye</h1>
      </div>
      <p className="text-sm text-gray-600 mb-6">Sebarkan kesadaran berbagi jalan lewat media sosial. Setiap unggahan adalah edukasi.</p>

      <div className="bg-gradient-to-br from-orange-500 to-pink-500 rounded-2xl p-6 mb-6 text-white shadow-lg">
        <div className="flex items-center gap-2 mb-2">
          <Hash size={20} />
          <p className="text-sm font-medium opacity-90">Gerakan Bersama</p>
        </div>
        <h2 className="text-2xl font-bold leading-tight mb-2">Berbagi Jalan untuk Pesepeda</h2>
        <p className="text-sm opacity-95 leading-relaxed">Jalan Bulungan jadi lebih aman saat kita semua sadar - pengendara motor, mobil, dan pesepeda. Mulai dari unggahanmu hari ini.</p>
      </div>

      <div className="space-y-4 mb-8">
        {CAMPAIGNS.map((c, i) => (
          <div key={i} className="bg-white rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Hash size={18} className="text-orange-600" />
              <h3 className="font-bold text-gray-900">{c.title.replace("#", "")}</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4 leading-relaxed">{c.description}</p>
            <div className="grid grid-cols-2 gap-2">
              {c.platforms.map((p) => {
                const Icon = p.icon;
                return (
                  <a key={p.name} href={p.url} target="_blank" rel="noopener noreferrer" className={`${p.color} rounded-lg py-2 px-3 text-sm font-medium flex items-center justify-center gap-1.5`}>
                    <Icon size={16} />
                    {p.name}
                    <ExternalLink size={12} className="opacity-70" />
                  </a>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
        <Share2 size={18} />
        Ide Konten yang Berdampak
      </h3>
      <div className="space-y-2 mb-6">
        {TIPS.map((t, i) => (
          <div key={i} className="bg-white rounded-xl p-4 shadow-sm flex items-start gap-3">
            <span className="text-2xl flex-shrink-0">{t.emoji}</span>
            <p className="text-sm text-gray-700 leading-relaxed">{t.text}</p>
          </div>
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 text-center">
        <p className="text-sm text-blue-900 leading-relaxed mb-3">Ada cerita atau ide kampanye sendiri?</p>
        <Link href="/forum/baru" className="inline-block bg-blue-600 text-white px-5 py-2 rounded-lg font-medium text-sm">Bagikan di Forum</Link>
      </div>
    </div>
  );
}
