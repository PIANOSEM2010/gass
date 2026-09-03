import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DetailEvent from "./detail-event";
import { type TitikEvent } from "@/lib/titik-event";
import { eventSelesai } from "@/lib/status-event";

export const dynamic = "force-dynamic";

export default async function HalamanDetailEvent({
  params,
}: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: e } = await supabase
    .from("events")
    .select("id,name,logo_url,description,start_at,meeting_point,waypoints,distance_m,catatan_rawan,catatan_etika,status,share_token,creator_id")
    .eq("share_token", token).maybeSingle();
  if (!e) notFound();

  const [{ data: peserta }, { data: sudahIkut }, { data: pengaju }] = await Promise.all([
    supabase.from("event_participants").select("user_id,joined_at,finished_at").eq("event_id", String(e.id)),
    user
      ? supabase.from("event_participants").select("user_id,activity_id")
          .eq("event_id", String(e.id)).eq("user_id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("profiles").select("full_name").eq("id", String(e.creator_id)).maybeSingle(),
  ]);

  // Nama dan foto peserta diambil terpisah, karena tabel keikutsertaan hanya
  // menyimpan id penggunanya.
  const idPeserta = (peserta || []).map((x) => String(x.user_id));
  const { data: profilPeserta } = idPeserta.length
    ? await supabase.from("profiles").select("id,full_name,organization,avatar_url").in("id", idPeserta)
    : { data: [] };

  const daftarPeserta = (peserta || []).map((x) => {
    const pr = (profilPeserta || []).find((q) => String(q.id) === String(x.user_id));
    return {
      id: String(x.user_id),
      nama: String(pr?.full_name || "Goweser"),
      asal: String(pr?.organization || ""),
      foto: (pr?.avatar_url as string) || null,
      selesai: Boolean(x.finished_at),
      gabung: (x.joined_at as string) || null,
    };
  }).sort((a, b) => Number(b.selesai) - Number(a.selesai) || a.nama.localeCompare(b.nama));

  return (
    <DetailEvent
      peserta={daftarPeserta}
      id={String(e.id)}
      token={String(e.share_token)}
      nama={String(e.name)}
      logo={(e.logo_url as string) || null}
      deskripsi={(e.description as string) || null}
      mulai={(e.start_at as string) || null}
      titikKumpul={(e.meeting_point as string) || null}
      titik={Array.isArray(e.waypoints) ? (e.waypoints as TitikEvent[]) : []}
      distanceM={Number(e.distance_m) || 0}
      catatanRawan={(e.catatan_rawan as string) || ""}
      catatanEtika={(e.catatan_etika as string) || ""}
      status={String(e.status)}
      pengaju={(pengaju?.full_name as string) || "Goweser"}
      jumlahPeserta={(peserta || []).length}
      sudahIkut={Boolean(sudahIkut)}
      masuk={Boolean(user)}
      selesai={eventSelesai((e.start_at as string) || null)}
    />
  );
}
