import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { MapPin, MessageSquare, Siren, Users, BookOpen, AlertCircle, Construction } from "lucide-react";

export default async function AdminDashboard() {
  const supabase = await createClient();

  const { count: totalUsers } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true });

  const { count: pendingMarkers } = await supabase
    .from("road_markers")
    .select("*", { count: "exact", head: true })
    .eq("approved", false);

  const { count: totalPosts } = await supabase
    .from("forum_posts")
    .select("*", { count: "exact", head: true });

  const { count: totalSos } = await supabase
    .from("sos_logs")
    .select("*", { count: "exact", head: true });

  const { count: totalApprovedMarkers } = await supabase
    .from("road_markers")
    .select("*", { count: "exact", head: true })
    .eq("approved", true);

  const { count: totalModules } = await supabase
    .from("modules")
    .select("*", { count: "exact", head: true });

  const { count: newInfraReports } = await supabase
    .from("infra_reports")
    .select("*", { count: "exact", head: true })
    .eq("status", "dilaporkan");

  const stats = [
    { label: "Total Pengguna", value: totalUsers || 0, icon: Users, color: "bg-blue-400/15 text-sky-300" },
    { label: "Laporan Pending", value: pendingMarkers || 0, icon: AlertCircle, color: "bg-yellow-400/15 text-yellow-700", href: "/admin/peta" },
    { label: "Laporan Jalan Baru", value: newInfraReports || 0, icon: Construction, color: "bg-orange-400/15 text-orange-300", href: "/admin/infra" },
    { label: "Marker Aktif", value: totalApprovedMarkers || 0, icon: MapPin, color: "bg-lime-400/15 text-lime-300" },
    { label: "Post Forum", value: totalPosts || 0, icon: MessageSquare, color: "bg-purple-400/15 text-purple-700", href: "/admin/forum" },
    { label: "Total SOS", value: totalSos || 0, icon: Siren, color: "bg-red-400/15 text-red-300", href: "/admin/sos" },
    { label: "Modul Edukasi", value: totalModules || 0, icon: BookOpen, color: "bg-indigo-400/15 text-indigo-700" },
  ];

  return (
    <div className="px-4 pt-6 pb-8">
      <h1 className="display-title text-2xl text-white mb-1">Dashboard</h1>
      <p className="text-sm text-slate-400 mb-6">Ringkasan aktivitas platform BUG.</p>

      <div className="grid grid-cols-2 gap-3 mb-6">
        {stats.map((s) => {
          const Icon = s.icon;
          const content = (
            <>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${s.color}`}>
                <Icon size={20} />
              </div>
              <p className="display-title text-2xl text-white">{s.value}</p>
              <p className="text-xs text-slate-400">{s.label}</p>
            </>
          );
          return s.href ? (
            <Link key={s.label} href={s.href} className="bg-[#0E1C17] rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
              {content}
            </Link>
          ) : (
            <div key={s.label} className="bg-[#0E1C17] rounded-xl p-4 shadow-sm">
              {content}
            </div>
          );
        })}
      </div>

      {(newInfraReports || 0) > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3 mb-3">
          <Construction size={20} className="text-orange-300 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-orange-900 text-sm">Ada {newInfraReports} laporan jalan rusak baru dari warga</p>
            <Link href="/admin/infra" className="text-xs text-orange-300 underline">
              Tinjau sekarang →
            </Link>
          </div>
        </div>
      )}

      {(pendingMarkers || 0) > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle size={20} className="text-yellow-700 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-yellow-900 text-sm">Ada {pendingMarkers} laporan peta menunggu verifikasi</p>
            <Link href="/admin/peta" className="text-xs text-yellow-700 underline">
              Tinjau sekarang →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}