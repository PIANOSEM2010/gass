import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import LogoutButton from "./logout-button";

export default async function ProfilPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (
    <div className="px-4 pt-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Profil Saya</h1>

      <div className="bg-white rounded-xl p-6 shadow-sm space-y-4">
        <div>
          <p className="text-xs text-gray-500">Nama Lengkap</p>
          <p className="font-medium">{profile?.full_name || "—"}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Email</p>
          <p className="font-medium">{user.email}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Asal Sekolah</p>
          <p className="font-medium">{profile?.school || "—"}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Bergabung sejak</p>
          <p className="font-medium">
            {new Date(profile?.created_at || user.created_at).toLocaleDateString("id-ID", {
              day: "numeric", month: "long", year: "numeric"
            })}
          </p>
        </div>
      </div>

      <LogoutButton />
    </div>
  );
}