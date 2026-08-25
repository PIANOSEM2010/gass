"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Camera, Loader2, Check, X } from "lucide-react";
import { Avatar } from "@/components/umpan-kartu";

// Ubah foto profil dan informasi akun. Foto disimpan di wadah berkas
// "avatar"; nama serta asal sekolah/instansi disimpan di tabel profiles
// sekaligus di metadata pengguna agar tampil konsisten di seluruh aplikasi.
export default function EditProfil({ nama, asal, jenis, fotoUrl }: {
  nama: string; asal: string; jenis: "pelajar" | "pekerja"; fotoUrl: string | null;
}) {
  const router = useRouter();
  const [buka, setBuka] = useState(false);
  const [namaBaru, setNamaBaru] = useState(nama);
  const [asalBaru, setAsalBaru] = useState(asal);
  const [jenisBaru, setJenisBaru] = useState(jenis);
  const [sibuk, setSibuk] = useState(false);
  const [pesan, setPesan] = useState("");
  const [foto, setFoto] = useState(fotoUrl);
  const berkasRef = useRef<HTMLInputElement>(null);

  async function unggahFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (f.size > 3 * 1024 * 1024) { setPesan("Foto terlalu besar (maksimal 3 MB)."); return; }
    setSibuk(true); setPesan("");
    try {
      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) throw new Error("Sesi berakhir. Masuk ulang.");
      const ext = (f.name.split(".").pop() || "jpg").toLowerCase();
      const berkas = `${user.id}/foto.${ext}`;
      const { error: e1 } = await sb.storage.from("avatar").upload(berkas, f, { upsert: true });
      if (e1) throw e1;
      const { data: pub } = sb.storage.from("avatar").getPublicUrl(berkas);
      const url = `${pub.publicUrl}?v=${Date.now()}`;
      const { error: e2 } = await sb.from("profiles").update({ avatar_url: url }).eq("id", user.id);
      if (e2) throw e2;
      await sb.auth.updateUser({ data: { avatar_url: url } });
      setFoto(url);
      setPesan("Foto profil diperbarui.");
      router.refresh();
    } catch (err) {
      setPesan(err instanceof Error ? err.message : "Gagal mengunggah foto.");
    } finally { setSibuk(false); }
  }

  async function simpan() {
    if (namaBaru.trim().length < 3) { setPesan("Nama minimal 3 huruf."); return; }
    setSibuk(true); setPesan("");
    try {
      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) throw new Error("Sesi berakhir. Masuk ulang.");
      const { error } = await sb.from("profiles")
        .update({ full_name: namaBaru.trim(), organization: asalBaru.trim(), member_type: jenisBaru })
        .eq("id", user.id);
      if (error) throw error;
      await sb.auth.updateUser({
        data: { full_name: namaBaru.trim(), organization: asalBaru.trim(), member_type: jenisBaru },
      });
      setPesan("Perubahan disimpan.");
      setBuka(false);
      router.refresh();
    } catch (err) {
      setPesan(err instanceof Error ? err.message : "Gagal menyimpan.");
    } finally { setSibuk(false); }
  }

  return (
    <>
      {/* Foto profil dengan tombol kamera kecil di sudut */}
      <button onClick={() => berkasRef.current?.click()} disabled={sibuk}
        className="relative flex-shrink-0" aria-label="Ganti foto profil">
        {foto
          ? <img src={foto} alt="" width={62} height={62}
              className="w-[62px] h-[62px] rounded-full object-cover border-2 border-lime-400/60" />
          : <Avatar nama={nama} ukuran={62} />}
        <span className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-lime-400 text-slate-950 flex items-center justify-center border-2 border-[var(--latar)]">
          {sibuk ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
        </span>
      </button>
      <input ref={berkasRef} type="file" accept="image/*" className="hidden" onChange={unggahFoto} />

      <button onClick={() => setBuka(true)}
        className="rounded-full border border-lime-400/40 text-lime-300 text-[11px] px-3.5 py-1.5 display-title flex-shrink-0">
        UBAH
      </button>

      {pesan && !buka && <p className="absolute left-5 -bottom-1 text-[10.5px] text-slate-400">{pesan}</p>}

      {buka && (
        <div className="fixed inset-0 z-[2000] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-3">
          <div className="kartu-bug cahaya-sudut w-full max-w-md p-5 muncul">
            <div className="flex items-center justify-between mb-4">
              <p className="display-title text-base text-white">UBAH INFORMASI AKUN</p>
              <button onClick={() => setBuka(false)} className="text-slate-400" aria-label="Tutup"><X size={18} /></button>
            </div>

            <label className="eyebrow !text-[9px] text-slate-500 block mb-1.5">Nama lengkap</label>
            <input value={namaBaru} onChange={(e) => setNamaBaru(e.target.value)}
              className="w-full bg-[var(--isian)] border border-lime-400/15 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-lime-400/50" />

            <label className="eyebrow !text-[9px] text-slate-500 block mb-1.5 mt-3.5">Status</label>
            <div className="grid grid-cols-2 gap-2.5">
              {(["pelajar", "pekerja"] as const).map((m) => (
                <button key={m} onClick={() => setJenisBaru(m)}
                  className={`rounded-xl py-2.5 text-sm font-semibold border transition-colors ${jenisBaru === m
                    ? "border-lime-400/60 bg-lime-400/15 text-lime-300"
                    : "border-white/10 bg-[var(--kartu-2)] text-slate-400"}`}>
                  {m === "pelajar" ? "Pelajar" : "Pekerja"}
                </button>
              ))}
            </div>

            <label className="eyebrow !text-[9px] text-slate-500 block mb-1.5 mt-3.5">
              {jenisBaru === "pelajar" ? "Asal sekolah" : "Asal instansi"}
            </label>
            <input value={asalBaru} onChange={(e) => setAsalBaru(e.target.value)}
              className="w-full bg-[var(--isian)] border border-lime-400/15 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-lime-400/50" />

            {pesan && <p className="text-[11.5px] text-slate-400 mt-3">{pesan}</p>}

            <button onClick={simpan} disabled={sibuk}
              className="w-full mt-4 bg-gradient-to-r from-lime-400 to-emerald-500 text-slate-950 py-3.5 rounded-xl display-title text-base tracking-wide flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[.98] transition-transform">
              {sibuk ? <Loader2 size={17} className="animate-spin" /> : <Check size={17} />} SIMPAN
            </button>
          </div>
        </div>
      )}
    </>
  );
}
