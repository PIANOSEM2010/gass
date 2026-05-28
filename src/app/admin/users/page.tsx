import { createClient } from "@/lib/supabase/server";
import { Users as UsersIcon, Shield, User } from "lucide-react";

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="px-4 pt-6 pb-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Pengguna</h1>
      <p className="text-sm text-gray-600 mb-6">Total {profiles?.length || 0} pengguna terdaftar.</p>

      <div className="space-y-2">
        {profiles?.map((p) => (
          <div key={p.id} className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${p.role === "admin" ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-600"}`}>
              {p.role === "admin" ? <Shield size={18} /> : <User size={18} />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-gray-900 truncate">{p.full_name || "—"}</p>
                {p.role === "admin" && (
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Admin</span>
                )}
              </div>
              {p.school && <p className="text-xs text-gray-500 truncate">{p.school}</p>}
              <p className="text-xs text-gray-400">
                Bergabung {new Date(p.created_at).toLocaleDateString("id-ID")}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}