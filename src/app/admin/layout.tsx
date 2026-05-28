import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, MapPin, MessageSquare, Siren, Users } from "lucide-react";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return (
      <div className="px-4 pt-12 max-w-md mx-auto text-center">
        <h1 className="text-2xl font-bold text-red-700 mb-2">Akses Ditolak</h1>
        <p className="text-gray-600 mb-6">Halaman ini khusus untuk admin GASS.</p>
        <Link href="/" className="inline-block bg-green-600 text-white px-5 py-2 rounded-lg font-medium">
          Kembali ke Beranda
        </Link>
      </div>
    );
  }

  const nav = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/peta", label: "Laporan Peta", icon: MapPin },
    { href: "/admin/forum", label: "Forum", icon: MessageSquare },
    { href: "/admin/sos", label: "SOS Logs", icon: Siren },
    { href: "/admin/users", label: "Pengguna", icon: Users },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-gray-900 text-white px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-xs opacity-70">Admin Panel</p>
          <p className="font-semibold">{profile?.full_name}</p>
        </div>
        <Link href="/" className="text-xs underline opacity-80">Keluar dari Admin</Link>
      </div>

      <div className="bg-white border-b border-gray-200 px-2 py-2 overflow-x-auto">
        <div className="flex gap-1">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-100 whitespace-nowrap"
            >
              <Icon size={14} />
              {label}
            </Link>
          ))}
        </div>
      </div>

      {children}
    </div>
  );
}