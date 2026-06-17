import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import SosButton from "./sos-button";
import PushEnroll from "./push-enroll";
import { Users, History, Siren, AlertTriangle } from "lucide-react";

export default async function SosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: contacts } = await supabase
    .from("emergency_contacts")
    .select("*")
    .eq("user_id", user.id)
    .order("is_primary", { ascending: false });

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50 to-white pb-8">
      <div className="max-w-md mx-auto px-4 pt-6">
        {/* Header */}
        <div className="bg-gradient-to-br from-red-600 to-rose-700 text-white rounded-3xl p-5 shadow-lg mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0"><Siren size={26} /></div>
            <div className="min-w-0">
              <h1 className="text-xl font-extrabold leading-none">Tombol Darurat</h1>
              <p className="text-xs opacity-90 mt-1">Kirim lokasimu otomatis saat darurat</p>
            </div>
          </div>
        </div>

        {(!contacts || contacts.length === 0) ? (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
            <AlertTriangle size={32} className="text-amber-500 mx-auto mb-2" />
            <p className="text-amber-800 font-bold mb-1">Belum ada kontak darurat</p>
            <p className="text-sm text-amber-700 mb-4">Tambahkan minimal satu nomor WhatsApp sebelum fitur ini bisa digunakan.</p>
            <Link href="/sos/kontak" className="inline-block bg-amber-600 text-white px-5 py-2.5 rounded-xl font-semibold">Atur Kontak Darurat</Link>
          </div>
        ) : (
          <>
            <div className="mb-6"><PushEnroll /></div>
            <SosButton
              userId={user.id}
              userName={profile?.full_name || "Pengguna BUG"}
              contacts={contacts}
            />
          </>
        )}

        {/* Pintasan */}
        <div className="grid grid-cols-2 gap-3 mt-8">
          <Link href="/sos/kontak" className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col items-center text-center active:scale-[0.98] transition-transform">
            <div className="w-11 h-11 rounded-xl bg-green-100 text-green-600 flex items-center justify-center mb-2"><Users size={22} /></div>
            <p className="text-sm font-bold text-gray-900">Kelola Kontak</p>
            <p className="text-xs text-gray-500 mt-0.5">{contacts?.length || 0} kontak</p>
          </Link>
          <Link href="/sos/riwayat" className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col items-center text-center active:scale-[0.98] transition-transform">
            <div className="w-11 h-11 rounded-xl bg-gray-100 text-gray-600 flex items-center justify-center mb-2"><History size={22} /></div>
            <p className="text-sm font-bold text-gray-900">Riwayat</p>
            <p className="text-xs text-gray-500 mt-0.5">SOS sebelumnya</p>
          </Link>
        </div>

        {/* Cara kerja */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-2xl p-4 text-xs text-blue-800">
          <p className="font-bold mb-2">Cara kerja tombol SOS</p>
          <ol className="list-decimal list-inside space-y-1.5">
            <li>Tekan tombol merah selama 2 detik</li>
            <li>BUG meminta izin akses lokasi GPS</li>
            <li>WhatsApp & notifikasi terkirim otomatis ke kontak darurat dan admin beserta koordinat</li>
            <li>Kejadian tersimpan di riwayat SOS</li>
          </ol>
        </div>
      </div>
    </div>
  );
}