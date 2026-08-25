import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import SosButton from "./sos-button";
import PushEnroll from "./push-enroll";
import { Users, History, AlertTriangle, ChevronRight } from "lucide-react";
import KepalaHalaman from "@/components/kepala-halaman";
import { IkonSos, IkonPantau } from "@/components/bug-icons";

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
    <div className="min-h-screen bg-[var(--latar)] pb-8">
      <KepalaHalaman
        ikon={<IkonSos size={22} />}
        judul="TOMBOL DARURAT"
        keterangan="Kirim lokasimu otomatis ke kontak darurat dan admin"
        warna="#F87171"
      />

      <div className="max-w-md mx-auto px-4 pt-6">
        {(!contacts || contacts.length === 0) ? (
          <div className="bg-amber-400/10 border border-amber-400/25 rounded-2xl p-6 text-center">
            <AlertTriangle size={32} className="text-amber-500 mx-auto mb-2" />
            <p className="display-title text-amber-300 mb-1">BELUM ADA KONTAK DARURAT</p>
            <p className="text-[12.5px] text-amber-200/80 mb-4 leading-relaxed">Tambahkan minimal satu nomor WhatsApp sebelum fitur ini bisa digunakan.</p>
            <Link href="/sos/kontak" className="inline-block bg-amber-400 text-slate-950 px-5 py-2.5 rounded-xl display-title text-sm">ATUR KONTAK DARURAT</Link>
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
        <div className="grid grid-cols-2 gap-3 mt-8 jenjang">
          <Link href="/sos/kontak" className="bg-[var(--kartu)] rounded-2xl p-4 shadow-sm border border-white/5 flex flex-col items-center text-center active:scale-[0.98] transition-transform">
            <div className="w-11 h-11 rounded-xl bg-lime-400/15 text-green-600 flex items-center justify-center mb-2"><Users size={22} /></div>
            <p className="text-sm font-bold text-white">Kelola Kontak</p>
            <p className="text-xs text-slate-400 mt-0.5">{contacts?.length || 0} kontak</p>
          </Link>
          <Link href="/sos/riwayat" className="bg-[var(--kartu)] rounded-2xl p-4 shadow-sm border border-white/5 flex flex-col items-center text-center active:scale-[0.98] transition-transform">
            <div className="w-11 h-11 rounded-xl bg-[var(--kartu-2)] text-slate-400 flex items-center justify-center mb-2"><History size={22} /></div>
            <p className="text-sm font-bold text-white">Riwayat</p>
            <p className="text-xs text-slate-400 mt-0.5">SOS sebelumnya</p>
          </Link>
        </div>

        {/* Teman Pantau */}
        <Link href="/pantau" className="mt-3 flex items-center gap-3 rounded-2xl border border-teal-400/25 bg-teal-400/8 text-white p-4 active:scale-[0.98] transition-transform">
          <span className="w-11 h-11 rounded-xl bg-teal-400/15 text-teal-300 flex items-center justify-center flex-shrink-0"><IkonPantau size={22} /></span>
          <div className="flex-1 min-w-0">
            <h2 className="display-title text-[14px] text-white">TEMAN PANTAU</h2>
            <p className="text-[11.5px] text-slate-400 mt-0.5">Bagikan lokasi langsung ke keluarga saat berkendara</p>
          </div>
          <ChevronRight size={20} className="flex-shrink-0" />
        </Link>

        {/* Cara kerja */}
        <div className="mt-6 bg-sky-400/10 border border-sky-400/25 rounded-2xl p-4 text-xs text-sky-200">
          <p className="eyebrow !text-[9px] text-slate-500 mb-2.5">Cara kerja tombol SOS</p>
          <ol className="list-decimal list-inside space-y-1.5 leading-relaxed">
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