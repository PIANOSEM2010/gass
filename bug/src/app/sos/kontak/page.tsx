import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import KontakManager from "./kontak-manager";

export default async function KontakPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: contacts } = await supabase
    .from("emergency_contacts")
    .select("*")
    .eq("user_id", user.id)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true });

  return (
    <div className="px-4 pt-8 max-w-md mx-auto">
      <h1 className="display-title text-2xl text-white mb-2">Kontak Darurat</h1>
      <p className="text-sm text-slate-400 mb-6">
        Nomor WhatsApp yang akan dihubungi saat tombol SOS ditekan. Tandai satu sebagai utama.
      </p>
      <KontakManager initialContacts={contacts || []} userId={user.id} />
    </div>
  );
}