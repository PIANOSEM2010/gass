import { createClient } from "@/lib/supabase/server";
import PanggilanTerpandu from "./panggilan-terpandu";

export const dynamic = "force-dynamic";

export default async function HalamanPanggil() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const nama = String(user?.user_metadata?.full_name || "").split(" ")[0] || "";
  return <PanggilanTerpandu namaDepan={nama} />;
}
