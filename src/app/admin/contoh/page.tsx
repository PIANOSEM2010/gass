import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import KepalaHalaman from "@/components/kepala-halaman";
import { IkonDasbor } from "@/components/fitur-ikon";
import PengelolaContoh from "./pengelola-contoh";
import { type TitikEvent } from "@/lib/titik-event";

export const dynamic = "force-dynamic";

export default async function AdminDataContoh() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/admin/contoh");

  const { data: profil } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profil?.role !== "admin") redirect("/");

  const [{ data: eventDb }, { count: jumlahContoh }] = await Promise.all([
    supabase.from("events")
      .select("id,name,waypoints,start_at,status")
      .eq("status", "disetujui")
      .order("start_at", { ascending: false }),
    supabase.from("activities").select("id", { count: "exact", head: true }).eq("is_demo", true)
      .then((r) => (r.error ? { count: 0 } : r)),
  ]);

  const daftar = (eventDb || []).map((e) => ({
    id: String(e.id),
    nama: String(e.name),
    mulai: (e.start_at as string) || null,
    jalur: Array.isArray(e.waypoints) ? (e.waypoints as TitikEvent[]) : [],
  }));

  return (
    <div className="min-h-screen bg-[var(--latar)] pb-10">
      <KepalaHalaman ikon={<IkonDasbor size={22} />} judul="DATA CONTOH"
        keterangan="Perjalanan contoh untuk peragaan aplikasi. Ditandai permanen di basis data dan tidak pernah ikut dihitung sebagai data sungguhan."
        warna="#FB7185" />
      <div className="max-w-md mx-auto px-4 pt-5">
        <PengelolaContoh events={daftar} userId={user.id} jumlahAda={jumlahContoh || 0} />
      </div>
    </div>
  );
}
