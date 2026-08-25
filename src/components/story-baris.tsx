"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Avatar, warnaDari } from "@/components/umpan-kartu";
import { kecilkanGambar } from "@/lib/kecilkan-gambar";

export type Story = { id: string; user_id: string; nama: string; image_url: string; caption: string | null; created_at: string; foto?: string | null };
type Grup = { user_id: string; nama: string; foto: string | null; items: Story[] };

export default function BarisStory({ stories, masuk, namaSaya, idSaya }: {
  stories: Story[]; masuk: boolean; namaSaya: string; idSaya: string | null;
}) {
  const router = useRouter();
  const berkasRef = useRef<HTMLInputElement>(null);
  const [unggah, setUnggah] = useState(false);
  const [pesan, setPesan] = useState("");
  const [buka, setBuka] = useState<number | null>(null);

  // Kelompokkan per pengguna; story milik sendiri diletakkan paling depan.
  const grup: Grup[] = [];
  for (const s of stories) {
    const g = grup.find((x) => x.user_id === s.user_id);
    if (g) g.items.push(s);
    else grup.push({ user_id: s.user_id, nama: s.nama, foto: s.foto || null, items: [s] });
  }
  grup.sort((a, b) => (a.user_id === idSaya ? -1 : b.user_id === idSaya ? 1 : 0));

  async function pilihBerkas(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (f.size > 15 * 1024 * 1024) { setPesan("Foto terlalu besar (maksimal 15 MB)."); return; }
    setUnggah(true); setPesan("");
    try {
      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) throw new Error("Kamu perlu masuk dulu.");
      // Dikecilkan lebih dulu supaya story cepat terbuka di ponsel.
      const kecil = await kecilkanGambar(f, 1280, 0.82);
      const nama = `${user.id}/${Date.now()}.jpg`;
      const { error: e1 } = await sb.storage.from("story").upload(nama, kecil, {
        upsert: false, contentType: "image/jpeg", cacheControl: "31536000",
      });
      if (e1) throw e1;
      const { data: pub } = sb.storage.from("story").getPublicUrl(nama);
      const { error: e2 } = await sb.from("stories").insert({ user_id: user.id, image_url: pub.publicUrl });
      if (e2) throw e2;
      router.refresh();
    } catch (err) {
      setPesan(err instanceof Error ? err.message : "Gagal mengunggah story.");
    } finally { setUnggah(false); }
  }

  return (
    <>
      <div className="flex gap-4 overflow-x-auto px-5 py-3 no-scrollbar">
        <button onClick={() => (masuk ? berkasRef.current?.click() : router.push("/auth/login"))}
          disabled={unggah} className="flex flex-col items-center gap-1.5 flex-shrink-0">
          <span className="relative w-14 h-14 rounded-full border-2 border-dashed border-lime-400/50 bg-lime-400/10 flex items-center justify-center text-lime-300">
            {unggah
              ? <span className="w-4 h-4 rounded-full border-2 border-lime-300 border-t-transparent animate-spin" />
              : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>}
          </span>
          <span className="eyebrow !text-[9px] text-slate-500">Kamu</span>
        </button>
        <input ref={berkasRef} type="file" accept="image/*" className="hidden" onChange={pilihBerkas} />

        {grup.map((g, i) => (
          <button key={g.user_id} onClick={() => setBuka(i)} className="flex flex-col items-center gap-1.5 flex-shrink-0">
            <span className="rounded-full p-[2px]" style={{ background: `linear-gradient(135deg, ${warnaDari(g.nama)}, #4ADE80)` }}>
              <span className="block rounded-full p-[2px] bg-[var(--latar)]"><Avatar nama={g.nama} ukuran={48} foto={g.foto} /></span>
            </span>
            <span className="eyebrow !text-[9px] text-slate-500 max-w-14 truncate">{g.nama.split(" ")[0]}</span>
          </button>
        ))}
        {grup.length === 0 && (
          <p className="self-center text-[11px] text-slate-600">Belum ada story hari ini, bagikan momen gowesmu.</p>
        )}
      </div>
      {pesan && <p className="px-5 pb-2 text-[11px] text-red-400">{pesan}</p>}
      {buka !== null && grup[buka] && (
        <PenampilStory grup={grup[buka]} tutup={() => setBuka(null)}
          lanjut={() => setBuka((v) => (v !== null && v + 1 < grup.length ? v + 1 : null))} />
      )}
      {!masuk && namaSaya === "" && null}
    </>
  );
}

// Penampil story: satu foto per ketukan, batang kemajuan 5 detik per foto.
function PenampilStory({ grup, tutup, lanjut }: { grup: Grup; tutup: () => void; lanjut: () => void }) {
  const [ke, setKe] = useState(0);
  const [maju, setMaju] = useState(0);
  // Batang kemajuan hanya berjalan setelah fotonya benar-benar tampil.
  const [siap, setSiap] = useState(false);
  useEffect(() => { setSiap(false); }, [ke]);

  const berikutnya = useCallback(() => {
    setKe((v) => { if (v + 1 < grup.items.length) { setMaju(0); return v + 1; } lanjut(); return v; });
  }, [grup.items.length, lanjut]);

  useEffect(() => {
    if (!siap) return;
    const t = setInterval(() => {
      setMaju((m) => { if (m >= 100) { berikutnya(); return 0; } return m + 2; });
    }, 100);
    return () => clearInterval(t);
  }, [berikutnya, siap]);

  const s = grup.items[ke];
  return (
    <div className="fixed inset-0 z-[2000] bg-black flex flex-col" onClick={berikutnya}>
      <div className="flex gap-1 p-3">
        {grup.items.map((_, i) => (
          <span key={i} className="flex-1 h-[3px] rounded-full bg-white/25 overflow-hidden">
            <span className="block h-full bg-lime-400"
              style={{ width: i < ke ? "100%" : i === ke ? `${maju}%` : "0%" }} />
          </span>
        ))}
      </div>
      <div className="flex items-center gap-2 px-4 pb-2">
        <Avatar nama={grup.nama} ukuran={30} foto={grup.foto} />
        <p className="display-title text-sm text-white">{grup.nama}</p>
        <button onClick={(e) => { e.stopPropagation(); tutup(); }} className="ml-auto text-white/70 text-xl leading-none px-2" aria-label="Tutup">×</button>
      </div>
      <div className="relative flex-1 flex items-center justify-center px-2 pb-6">
        {!siap && (
          <span className="absolute w-8 h-8 rounded-full border-2 border-lime-300 border-t-transparent animate-spin" />
        )}
        {/* Foto berikutnya dimuat lebih dulu di latar agar perpindahan mulus */}
        {grup.items[ke + 1] && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={grup.items[ke + 1].image_url} alt="" className="hidden" />
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={s.image_url} alt={s.caption || "Story"} loading="eager" decoding="async"
          onLoad={() => setSiap(true)} onError={() => setSiap(true)}
          className="max-h-full max-w-full rounded-xl object-contain transition-opacity duration-300"
          style={{ opacity: siap ? 1 : 0 }} />
      </div>
      {s.caption && <p className="px-5 pb-8 text-center text-sm text-white/90">{s.caption}</p>}
    </div>
  );
}
