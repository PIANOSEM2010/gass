import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import SosButton from "./sos-button";
import { Users, History } from "lucide-react";

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
    <div className="px-4 pt-8 pb-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Tombol Darurat</h1>
      <p className="text-sm text-gray-600 mb-6">
        Tekan tombol di bawah saat terjadi kecelakaan atau situasi darurat. Lokasimu otomatis dikirim ke kontak utama.
      </p>

      {(!contacts || contacts.length === 0) ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5 text-center">
          <p className="text-yellow-800 font-medium mb-3">
            Kamu belum punya kontak darurat
          </p>
          <p className="text-sm text-yellow-700 mb-4">
            Tambahkan minimal satu nomor WhatsApp sebelum fitur ini bisa digunakan.
          </p>
          <Link
            href="/sos/kontak"
            className="inline-block bg-yellow-600 text-white px-5 py-2 rounded-lg font-medium"
          >
            Atur Kontak Darurat
          </Link>
        </div>
      ) : (
        <SosButton
          userId={user.id}
          userName={profile?.full_name || "Pengguna BUG"}
          contacts={contacts}
        />
      )}

      <div className="mt-8 grid grid-cols-2 gap-3">
        <Link
          href="/sos/kontak"
          className="bg-white rounded-xl p-4 shadow-sm flex flex-col items-center text-center"
        >
          <Users size={24} className="text-green-600 mb-2" />
          <p className="text-sm font-medium">Kelola Kontak</p>
          <p className="text-xs text-gray-500 mt-1">{contacts?.length || 0} kontak</p>
        </Link>
        <Link
          href="/sos/riwayat"
          className="bg-white rounded-xl p-4 shadow-sm flex flex-col items-center text-center"
        >
          <History size={24} className="text-gray-600 mb-2" />
          <p className="text-sm font-medium">Riwayat</p>
          <p className="text-xs text-gray-500 mt-1">SOS sebelumnya</p>
        </Link>
      </div>

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-800">
        <p className="font-semibold mb-1">Cara kerja tombol SOS:</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Tekan tombol merah selama 2 detik</li>
          <li>BUG akan minta izin akses lokasi GPS</li>
          <li>WhatsApp terbuka otomatis ke kontak utama dengan pesan + koordinat</li>
          <li>Kejadian disimpan di riwayat SOS</li>
        </ol>
      </div>
    </div>
  );
}