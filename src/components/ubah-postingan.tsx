"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Lapisan from "@/components/lapisan";
import { Avatar } from "@/components/umpan-kartu";
import { Loader2, Pencil, Users, Search, X, Check, Trash2 } from "lucide-react";

type Orang = { id: string; nama: string; asal: string; foto: string | null };

// Menyunting catatan perjalanan dan mengundang kolaborator.
//
// Kolaborator mendapat catatan perjalanannya sendiri, bukan namanya ditempel di
// postingan orang lain. Itu pilihan yang disengaja: mereka memang ikut gowes,
// jadi perjalanan itu wajar muncul di beranda dan profilnya, dan ikut terhitung
// sebagai gowesnya. Postingannya tetap terpisah sehingga masing-masing bisa
// menulis catatan dan menerima semangat sendiri.
export default function UbahPostingan({
  aktivitasId, catatanAwal, tutup,
}: { aktivitasId: string; catatanAwal: string; tutup: () => void }) {
  const router = useRouter();
  const [tab, setTab] = useState<"catatan" | "kolab">("catatan");

  const [catatan, setCatatan] = useState(catatanAwal);
  const [simpanSibuk, setSimpanSibuk] = useState(false);

  const [kata, setKata] = useState("");
  const [hasil, setHasil] = useState<Orang[]>([]);
  const [mencari, setMencari] = useState(false);
  const [kolaborator, setKolaborator] = useState<Orang[]>([]);
  const [sibukId, setSibukId] = useState<string | null>(null);
  const [pesan, setPesan] = useState("");

  // Kolaborator yang sudah ada dimuat lebih dulu, supaya tidak diundang dua kali.
  useEffect(() => {
    let hidup = true;
    (async () => {
      try {
        const sb = createClient();
        const { data } = await sb.from("activities")
          .select("user_id")
          .eq("collab_from", aktivitasId);
        const ids = (data || []).map((r) => String(r.user_id));
        if (ids.length === 0 || !hidup) return;
        const { data: profil } = await sb.from("profiles")
          .select("id,full_name,organization,avatar_url").in("id", ids);
        if (!hidup) return;
        setKolaborator((profil || []).map((p) => ({
          id: String(p.id),
          nama: String(p.full_name || "Goweser"),
          asal: String(p.organization || ""),
          foto: (p.avatar_url as string) || null,
        })));
      } catch { /* tabel kolaborasi belum dipasang */ }
    })();
    return () => { hidup = false; };
  }, [aktivitasId]);

  async function simpanCatatan() {
    if (simpanSibuk) return;
    setSimpanSibuk(true); setPesan("");
    try {
      const sb = createClient();
      const { error } = await sb.from("activities")
        .update({ note: catatan.trim() || null })
        .eq("id", aktivitasId);
      if (error) throw error;
      router.refresh();
      tutup();
    } catch (e) {
      setPesan(e instanceof Error ? e.message : "Gagal menyimpan catatan.");
    } finally { setSimpanSibuk(false); }
  }

  async function cari() {
    const q = kata.trim();
    if (q.length < 2) { setPesan("Ketik minimal 2 huruf."); return; }
    setMencari(true); setPesan(""); setHasil([]);
    try {
      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();
      const { data, error } = await sb.from("profiles")
        .select("id,full_name,organization,avatar_url")
        .ilike("full_name", `%${q}%`)
        .neq("id", user?.id || "")
        .limit(20);
      if (error) throw error;
      setHasil((data || []).map((p) => ({
        id: String(p.id),
        nama: String(p.full_name || "Goweser"),
        asal: String(p.organization || ""),
        foto: (p.avatar_url as string) || null,
      })));
      if ((data || []).length === 0) setPesan(`Tidak ada goweser bernama "${q}".`);
    } catch (e) {
      setPesan(e instanceof Error ? e.message : "Pencarian gagal.");
    } finally { setMencari(false); }
  }

  async function tambah(o: Orang) {
    if (sibukId) return;
    setSibukId(o.id); setPesan("");
    try {
      const sb = createClient();
      const { error } = await sb.rpc("tambah_kolaborator", {
        p_activity_id: aktivitasId,
        p_user_id: o.id,
      });
      if (error) throw error;
      setKolaborator((k) => [...k, o]);
      setHasil((h) => h.filter((x) => x.id !== o.id));
      router.refresh();
    } catch (e) {
      setPesan(e instanceof Error ? e.message : "Gagal menambahkan kolaborator.");
    } finally { setSibukId(null); }
  }

  async function buang(o: Orang) {
    if (sibukId) return;
    setSibukId(o.id); setPesan("");
    try {
      const sb = createClient();
      const { error } = await sb.rpc("hapus_kolaborator", {
        p_activity_id: aktivitasId,
        p_user_id: o.id,
      });
      if (error) throw error;
      setKolaborator((k) => k.filter((x) => x.id !== o.id));
      router.refresh();
    } catch (e) {
      setPesan(e instanceof Error ? e.message : "Gagal membatalkan kolaborasi.");
    } finally { setSibukId(null); }
  }

  return (
    <Lapisan>
      <div className="fixed inset-0 z-[4200] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center"
        onClick={tutup}>
        <div className="bg-[var(--kartu)] border border-lime-400/15 rounded-t-3xl sm:rounded-2xl w-full max-w-md max-h-[92vh] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}>

          <div className="flex items-center justify-between px-4 pt-4 pb-3 flex-shrink-0">
            <p className="display-title text-base text-white">UBAH POSTINGAN</p>
            <button onClick={tutup} className="text-slate-500 p-1" aria-label="Tutup"><X size={18} /></button>
          </div>

          <div className="flex gap-2 px-4 flex-shrink-0">
            {([["catatan", "Catatan", Pencil], ["kolab", "Kolaborasi", Users]] as const).map(([k, l, Ikon]) => (
              <button key={k} onClick={() => setTab(k)}
                className={`flex-1 py-2 rounded-xl text-[12.5px] font-semibold border-2 flex items-center justify-center gap-1.5 ${tab === k
                  ? "border-lime-400/60 bg-lime-400/10 text-lime-300"
                  : "border-white/10 text-slate-400"}`}>
                <Ikon size={14} /> {l}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 min-h-0">
            {tab === "catatan" ? (
              <>
                <label className="eyebrow !text-[9px] text-slate-500 block mb-1.5">
                  Catatan perjalanan
                </label>
                <textarea value={catatan} onChange={(e) => setCatatan(e.target.value)}
                  rows={4} maxLength={280}
                  placeholder="Ceritakan gowesmu: cuaca, jalur, atau siapa saja yang ikut."
                  className="w-full bg-[var(--isian)] border border-lime-400/15 rounded-xl px-4 py-3 text-[13px] text-white placeholder:text-slate-500 focus:outline-none focus:border-lime-400/50 resize-none" />
                <p className="text-[10.5px] text-slate-600 mt-1.5">
                  Jarak, waktu, dan jejak rute tidak bisa diubah, karena itu hasil rekaman GPS.
                </p>
              </>
            ) : (
              <>
                <p className="text-[11.5px] text-slate-400 mb-3 leading-relaxed">
                  Undang orang yang gowes bersamamu. Mereka akan mendapat catatan
                  perjalanannya sendiri di beranda dan profilnya, dengan jarak dan
                  jejak yang sama, dan rentetan harinya ikut hidup hari itu.
                </p>

                {kolaborator.length > 0 && (
                  <>
                    <p className="eyebrow !text-[9px] text-slate-500 mb-1.5">
                      Sudah diundang ({kolaborator.length})
                    </p>
                    <ul className="space-y-1.5 mb-4">
                      {kolaborator.map((o) => (
                        <li key={o.id} className="flex items-center gap-2.5 rounded-xl border border-lime-400/25 bg-lime-400/8 px-3 py-2">
                          <Avatar nama={o.nama} foto={o.foto} ukuran={30} />
                          <span className="min-w-0 flex-1">
                            <span className="block text-[12.5px] text-white truncate">{o.nama}</span>
                            {o.asal && <span className="block text-[10px] text-slate-500 truncate">{o.asal}</span>}
                          </span>
                          <button onClick={() => buang(o)} disabled={sibukId === o.id}
                            className="text-red-400 p-1" aria-label={`Batalkan ${o.nama}`}>
                            {sibukId === o.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input value={kata} onChange={(e) => setKata(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void cari(); } }}
                      placeholder="Cari nama goweser…"
                      className="w-full bg-[var(--isian)] border border-lime-400/15 rounded-xl pl-10 pr-3 py-2.5 text-[13px] text-white placeholder:text-slate-500 focus:outline-none focus:border-lime-400/50" />
                  </div>
                  <button type="button" onClick={() => void cari()} disabled={mencari}
                    className="rounded-xl bg-lime-400/15 text-lime-300 px-4 display-title text-[13px] disabled:opacity-50">
                    {mencari ? <Loader2 size={15} className="animate-spin" /> : "Cari"}
                  </button>
                </div>

                {hasil.length > 0 && (
                  <ul className="mt-2 rounded-xl border border-white/10 bg-[var(--kartu-2)] divide-y divide-white/5 overflow-hidden">
                    {hasil.map((o) => (
                      <li key={o.id}>
                        <button onClick={() => tambah(o)} disabled={sibukId === o.id}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left">
                          <Avatar nama={o.nama} foto={o.foto} ukuran={30} />
                          <span className="min-w-0 flex-1">
                            <span className="block text-[12.5px] text-white truncate">{o.nama}</span>
                            {o.asal && <span className="block text-[10px] text-slate-500 truncate">{o.asal}</span>}
                          </span>
                          {sibukId === o.id
                            ? <Loader2 size={15} className="animate-spin text-lime-300" />
                            : <Check size={15} className="text-lime-400" />}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}

            {pesan && <p className="text-[11.5px] text-amber-300 mt-2 leading-relaxed">{pesan}</p>}
          </div>

          {tab === "catatan" && (
            <div className="flex-shrink-0 border-t border-white/8 px-4 pt-3 pb-4">
              <button onClick={simpanCatatan} disabled={simpanSibuk}
                className="w-full bg-gradient-to-r from-lime-400 to-emerald-500 text-slate-950 py-3.5 rounded-xl display-title text-base flex items-center justify-center gap-2 disabled:opacity-60">
                {simpanSibuk ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                SIMPAN CATATAN
              </button>
            </div>
          )}
        </div>
      </div>
    </Lapisan>
  );
}
