import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import LogoutButton from "./logout-button";

export default async function ProfilPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  // member_type & organization dibaca dari metadata akun (diisi saat pendaftaran).
  // organization fallback ke profile.school untuk pengguna lama.
  const meta = user.user_metadata || {};
  const memberType: string | undefined = meta.member_type;
  const isPekerja = memberType === "pekerja";
  const statusLabel = memberType === "pekerja" ? "Pekerja" : memberType === "pelajar" ? "Pelajar" : "-";
  const orgLabel = isPekerja ? "Asal Instansi" : "Asal Sekolah";
  const organization = meta.organization || profile?.school || "-";

  return (
    <div className="px-4 pt-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Profil Saya</h1>
      <div className="bg-white rounded-xl p-6 shadow-sm space-y-4">
        <div><p className="text-xs text-gray-500">Nama Lengkap</p><p className="font-medium">{profile?.full_name || "-"}</p></div>
        <div><p className="text-xs text-gray-500">Email</p><p className="font-medium">{user.email}</p></div>
        <div><p className="text-xs text-gray-500">Status</p><p className="font-medium">{statusLabel}</p></div>
        <div><p className="text-xs text-gray-500">{orgLabel}</p><p className="font-medium">{organization}</p></div>
        <div><p className="text-xs text-gray-500">Bergabung sejak</p><p className="font-medium">{new Date(profile?.created_at || user.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p></div>
      </div>
      {profile?.role === "admin" && (
        <a href="/admin" className="block w-full mt-6 bg-purple-600 text-white py-2 rounded-lg font-medium text-center">Buka Admin Panel</a>
      )}
      <LogoutButton />
    </div>
  );
}