import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import JejakRute, { type Titik } from "@/components/jejak-rute";
import { Avatar } from "@/components/umpan-kartu";
import FormKomentar from "./form-komentar";

export const dynamic = "force-dynamic";

export default async function DetailAktivitas({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: a } = await supabase
    .from("activities")
    .select("id,user_id,distance_m,duration_s,elevation_gain_m,path,started_at,note")
    .eq("id", id).maybeSingle();
  if (!a) notFound();

  const { data: komentar } = await supabase
    .from("activity_comments").select("id,user_id,body,created_at")
    .eq("activity_id", id).order("created_at", { ascending: true });

  const idOrang = [...new Set([String(a.user_id), ...(komentar || []).map((k) => String(k.user_id))])];
  const { data: profil } = await supabase.from("profiles").select("id,full_name").in("id", idOrang);
  const nama = (uid: string) =>
    (profil || []).find((p) => String(p.id) === uid)?.full_name || "Goweser";

  return (
    <div className="min-h-screen bg-[var(--latar)] pb-24">
      <div className="max-w-md mx-auto px-4 pt-5">
        <Link href="/" className="text-xs text-slate-400">← Kembali ke umpan</Link>

        <div className="mt-4 rounded-2xl border border-lime-400/12 bg-[var(--kartu)] p-4">
          <div className="flex items-center gap-3">
            <Avatar nama={nama(String(a.user_id))} />
            <div>
              <p className="display-title text-[15px] text-white">{nama(String(a.user_id))}</p>
              <p className="text-[11px] text-slate-500">
                {a.started_at ? new Date(String(a.started_at)).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : ""}
              </p>
            </div>
          </div>
          {a.note && <p className="mt-3 text-[13px] text-slate-300 leading-relaxed">{String(a.note)}</p>}
          <div className="mt-3 rounded-xl bg-[var(--relung)] border border-lime-400/8 py-3 flex justify-center">
            <JejakRute path={Array.isArray(a.path) ? (a.path as Titik[]) : null} width={280} height={110} />
          </div>
          <div className="flex gap-6 mt-3">
            <div><p className="display-num text-xl text-white">{(Number(a.distance_m) / 1000).toFixed(2).replace(".", ",")}</p><p className="eyebrow !text-[9px] text-slate-500">km</p></div>
            <div><p className="display-num text-xl text-white">{Math.round(Number(a.duration_s) / 60)}</p><p className="eyebrow !text-[9px] text-slate-500">menit</p></div>
            <div><p className="display-num text-xl text-white">{Math.round(Number(a.elevation_gain_m))}</p><p className="eyebrow !text-[9px] text-slate-500">m elevasi</p></div>
          </div>
        </div>

        <h2 className="eyebrow text-slate-500 mt-6 mb-2 !text-[10px]">Komentar</h2>
        <div className="space-y-2">
          {(komentar || []).length === 0 && <p className="text-xs text-slate-600">Belum ada komentar.</p>}
          {(komentar || []).map((k) => (
            <div key={String(k.id)} className="flex gap-2.5 rounded-xl bg-[var(--kartu)] border border-white/5 p-3">
              <Avatar nama={nama(String(k.user_id))} ukuran={28} />
              <div className="min-w-0">
                <p className="text-[12px] text-slate-200 font-semibold">{nama(String(k.user_id))}</p>
                <p className="text-[12px] text-slate-400 break-words">{String(k.body)}</p>
              </div>
            </div>
          ))}
        </div>

        {user
          ? <FormKomentar activityId={id} />
          : <p className="mt-4 text-xs text-slate-500"><Link href="/auth/login" className="text-lime-400">Masuk</Link> untuk ikut berkomentar.</p>}
      </div>
    </div>
  );
}
