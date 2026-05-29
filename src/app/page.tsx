import Link from "next/link";
import { Map, BookOpen, Siren, Megaphone, Users } from "lucide-react";

const features = [
  { href: "/peta", label: "Peta Jalur", desc: "Jalur ramah sepeda Bulungan", icon: Map, color: "bg-blue-100 text-blue-700" },
  { href: "/edukasi", label: "Modul Edukasi", desc: "Etika berbagi jalan", icon: BookOpen, color: "bg-green-100 text-green-700" },
  { href: "/sos", label: "Tombol Darurat", desc: "SOS satu sentuhan", icon: Siren, color: "bg-red-100 text-red-700" },
  { href: "/kampanye", label: "Kampanye", desc: "Berbagi jalan untuk pesepeda", icon: Megaphone, color: "bg-orange-100 text-orange-700" },
  { href: "/forum", label: "Forum", desc: "Pelajar pesepeda Bulungan", icon: Users, color: "bg-purple-100 text-purple-700" },
];

export default function Home() {
  return (
    <div className="px-4 pt-8 max-w-md mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-green-700">BUG</h1>
        <p className="text-sm text-gray-600 mt-1">Bulungan untuk Goweser</p>
        <p className="text-xs text-gray-500 mt-3 italic">&quot;Berbagi jalan, berbagi tanggung jawab&quot;</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {features.map(({ href, label, desc, icon: Icon, color }) => (
          <Link key={href} href={href} className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-3 ${color}`}>
              <Icon size={24} />
            </div>
            <h2 className="font-semibold text-sm text-gray-900">{label}</h2>
            <p className="text-xs text-gray-500 mt-1">{desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}