import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import KepalaHalaman from "@/components/kepala-halaman";
import { IkonProfil } from "@/components/bug-icons";
import KotakCari from "./kotak-cari";

export const dynamic = "force-dynamic";

export default async function HalamanCari({
  searchParams,
}: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/cari");

  const kunci = (q || "").trim();
  const { data: hasil } = kunci.length >= 2
    ? await supabase.from("profiles")
        .select("id,full_name,organization,avatar_url")
        .ilike("full_name", `%${kunci}%`)
        .neq("id", user.id)
        .limit(30)
    : { data: [] };

  return (
    <div className="min-h-screen bg-[var(--latar)] pb-10">
      <KepalaHalaman ikon={<IkonProfil size={22} />} judul="CARI GOWESER"
        keterangan="Temukan pesepeda lain, lihat pencapaiannya, lalu ikuti."
        warna="#38BDF8" />
      <div className="max-w-md mx-auto px-4 pt-5">
        <KotakCari awal={kunci} />
        <ul className="mt-4 space-y-2 jenjang">
          {kunci.length >= 2 && (hasil || []).length === 0 && (
            <p className="text-xs text-slate-500 text-center py-8">
              Tidak ada goweser bernama &ldquo;{kunci}&rdquo;.
            </p>
          )}
          {(hasil || []).map((p) => (
            <li key={String(p.id)}>
              <a href={`/goweser/${p.id}`} className="flex items-center gap-3 kartu-bug px-3.5 py-3">
                <span className="w-10 h-10 rounded-full bg-lime-400/15 text-lime-300 flex items-center justify-center display-title flex-shrink-0 overflow-hidden">
                  {p.avatar_url
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={String(p.avatar_url)} alt="" className="w-10 h-10 object-cover" />
                    : String(p.full_name || "?").charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-semibold text-white truncate">{String(p.full_name || "Goweser")}</p>
                  <p className="text-[11px] text-slate-500 truncate">{String(p.organization || "-")}</p>
                </div>
                <span className="text-slate-600">›</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
