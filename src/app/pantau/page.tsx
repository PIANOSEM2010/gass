import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import PantauClient from "./pantau-client";

export default async function PantauPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  const meta = user.user_metadata || {};
  const fullName = String(meta.full_name || "Goweser");
  return <PantauClient userId={user.id} fullName={fullName} />;
}