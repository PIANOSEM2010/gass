import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import CatatClient from "./catat-client";

export default async function CatatPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, school")
    .eq("id", user.id)
    .single();

  const meta = user.user_metadata || {};
  const fullName: string = profile?.full_name || meta.full_name || "Pesepeda";
  const organization: string = meta.organization || profile?.school || "";

  return <CatatClient userId={user.id} fullName={fullName} organization={organization} />;
}