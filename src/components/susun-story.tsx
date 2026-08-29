"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { kecilkanGambar } from "@/lib/kecilkan-gambar";
import { ImagePlus, Type, Loader2, X, Check } from "lucide-react";
import Lapisan from "@/components/lapisan";

// Penyusun story. Dua jenis: teks saja di atas latar berwarna, atau foto
// dengan tulisan di bawahnya. Story teks tetap disimpan sebagai gambar hasil
// kanvas, jadi penampil story yang sudah ada tidak perlu diubah dan story bisa
// dibagikan ke luar aplikasi apa adanya.
const LATAR = [
  { nama: "Hijau jalan", dari: "#123024", ke: "#2E7D32", teks: "#EAFBD8" },
  { nama: "Terakota", dari: "#9E4A1C", ke: "#C0632C", teks: "#FDF6E8" },
  { nama: "Malam", dari: "#0B1220", ke: "#243B55", teks: "#E6EEF8" },
  { nama: "Senja", dari: "#7A2E4A", ke: "#D96C3F", teks: "#FFF1E6" },
  { nama: "Arang", dari: "#141210", ke: "#2E2A26", teks: "#F0E7DA" },
];

export default function SusunStory({ tutup }: { tutup: () => void }) {
  const router = useRouter();
  const [jenis, setJenis] = useState<"teks" | "foto">("teks");
  const [teks, setTeks] = useState("");
  const [latar, setLatar] = useState(0);
  const [foto, setFoto] = useState<File | null>(null);
  const [pratinjau, setPratinjau] = useState<string | null>(null);
  const [sibuk, setSibuk] = useState(false);
  const [pesan, setPesan] = useState("");
  const berkasRef = useRef<HTMLInputElement>(null);

  function pilihFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (f.size > 15 * 1024 * 1024) { setPesan("Foto terlalu besar (maksimal 15 MB)."); return; }
    setFoto(f);
    setPratinjau(URL.createObjectURL(f));
    setJenis("foto");
    setPesan("");
  }

  // Menggambar story teks pada kanvas 1080x1920, ukuran baku story.
  async function gambarTeks(): Promise<Blob> {
    const k = document.createElement("canvas");
    k.width = 1080; k.height = 1920;
    const c = k.getContext("2d");
    if (!c) throw new Error("Kanvas tidak tersedia.");
    const p = LATAR[latar];
    const g = c.createLinearGradient(0, 0, 1080, 1920);
    g.addColorStop(0, p.dari); g.addColorStop(1, p.ke);
    c.fillStyle = g; c.fillRect(0, 0, 1080, 1920);

    // Butiran halus supaya bidang warnanya tidak terasa datar
    c.save(); c.globalAlpha = 0.05;
    for (let i = 0; i < 3000; i++) {
      c.fillStyle = i % 2 ? "#000" : "#fff";
      c.fillRect(Math.random() * 1080, Math.random() * 1920, 2, 2);
    }
    c.restore();

    // Pita marka jalan sebagai penanda BUG
    c.fillStyle = p.teks;
    c.globalAlpha = 0.55;
    for (let x = 90; x < 990; x += 52) c.fillRect(x, 300, 30, 8);
    c.globalAlpha = 1;

    // Tulisan dipecah per baris agar muat di lebar kartu
    const isi = teks.trim() || "…";
    const ukuran = isi.length > 180 ? 54 : isi.length > 90 ? 66 : isi.length > 40 ? 82 : 100;
    c.font = `800 ${ukuran}px "Barlow Condensed", "Arial Narrow", sans-serif`;
    c.fillStyle = p.teks;
    c.textAlign = "left";
    const kata = isi.split(/\s+/);
    const baris: string[] = [];
    let sekarang = "";
    for (const w of kata) {
      const coba = sekarang ? `${sekarang} ${w}` : w;
      if (c.measureText(coba).width > 900) { if (sekarang) baris.push(sekarang); sekarang = w; }
      else sekarang = coba;
    }
    if (sekarang) baris.push(sekarang);
    const tinggiBaris = ukuran * 1.16;
    let y = 960 - ((baris.length - 1) * tinggiBaris) / 2;
    for (const b of baris.slice(0, 12)) { c.fillText(b, 90, y); y += tinggiBaris; }

    // Kaki: penanda aplikasi
    c.globalAlpha = 0.7;
    c.font = '700 34px "Barlow Condensed", sans-serif';
    try { c.letterSpacing = "6px"; } catch { /* peramban lama */ }
    c.fillText("DICATAT DENGAN BUG", 90, 1810);
    c.globalAlpha = 1;

    return new Promise((res, rej) =>
      k.toBlob((b) => (b ? res(b) : rej(new Error("Story gagal dibuat."))), "image/jpeg", 0.9));
  }

  async function kirim() {
    if (sibuk) return;
    if (jenis === "teks" && teks.trim().length === 0) { setPesan("Tulis dulu sesuatu."); return; }
    if (jenis === "foto" && !foto) { setPesan("Pilih fotonya dulu."); return; }
    setSibuk(true); setPesan("");
    try {
      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) throw new Error("Kamu perlu masuk dulu.");

      const isi: Blob = jenis === "teks" ? await gambarTeks() : await kecilkanGambar(foto!, 1280, 0.82);
      const nama = `${user.id}/${Date.now()}.jpg`;
      const { error: e1 } = await sb.storage.from("story").upload(nama, isi, {
        upsert: false, contentType: "image/jpeg", cacheControl: "31536000",
      });
      if (e1) throw e1;
      const { data: pub } = sb.storage.from("story").getPublicUrl(nama);
      const { error: e2 } = await sb.from("stories").insert({
        user_id: user.id, image_url: pub.publicUrl,
        caption: jenis === "foto" ? (teks.trim() || null) : null,
      });
      if (e2) throw e2;
      router.refresh();
      tutup();
    } catch (e) {
      setPesan(e instanceof Error ? e.message : "Gagal mengunggah story.");
    } finally { setSibuk(false); }
  }

  const p = LATAR[latar];

  return (
    <Lapisan>
    <div className="fixed inset-0 z-[4500] bg-black/85 backdrop-blur-sm flex flex-col" onClick={tutup}>
      <div className="flex-1 flex flex-col max-w-md w-full mx-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <p className="display-title text-base text-white">STORY BARU</p>
          <button onClick={tutup} className="text-white/70 p-1" aria-label="Tutup"><X size={20} /></button>
        </div>

        {/* Pilihan jenis */}
        <div className="flex gap-2 px-4">
          {([["teks", "Teks", Type], ["foto", "Foto", ImagePlus]] as const).map(([k, l, Ikon]) => (
            <button key={k}
              onClick={() => (k === "foto" ? berkasRef.current?.click() : setJenis("teks"))}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 flex items-center justify-center gap-2 ${jenis === k ? "border-lime-400/60 bg-lime-400/12 text-lime-300" : "border-white/12 text-slate-400"}`}>
              <Ikon size={16} /> {l}
            </button>
          ))}
        </div>
        <input ref={berkasRef} type="file" accept="image/*" className="hidden" onChange={pilihFoto} />

        {/* Pratinjau */}
        {/* Tinggi pratinjau dibatasi supaya kolom keterangan dan tombol
            Bagikan tetap terlihat di layar ponsel yang pendek. */}
        <div className="flex-1 min-h-0 px-4 py-3 overflow-hidden">
          <div className="h-full max-h-[46vh] rounded-2xl overflow-hidden border border-white/12 flex items-center justify-center"
            style={jenis === "teks" ? { background: `linear-gradient(135deg, ${p.dari}, ${p.ke})` } : { background: "#000" }}>
            {jenis === "teks" ? (
              <p className="display-title px-6 text-center leading-tight break-words"
                style={{ color: p.teks, fontSize: teks.length > 90 ? 20 : teks.length > 40 ? 26 : 32 }}>
                {teks.trim() || "Tulis sesuatu…"}
              </p>
            ) : pratinjau ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={pratinjau} alt="" className="max-h-full max-w-full object-contain" />
            ) : (
              <p className="text-sm text-slate-500">Pilih foto dari galeri</p>
            )}
          </div>
        </div>

        {jenis === "teks" && (
          <div className="flex gap-2.5 px-4 pb-2 justify-center">
            {LATAR.map((w, i) => (
              <button key={w.nama} onClick={() => setLatar(i)} title={w.nama} aria-label={w.nama}
                className={`w-9 h-9 rounded-full ${latar === i ? "ring-2 ring-offset-2 ring-offset-black ring-lime-400" : "ring-1 ring-white/20"}`}
                style={{ background: `linear-gradient(135deg, ${w.dari}, ${w.ke})` }} />
            ))}
          </div>
        )}

        <div className="px-4 pb-5">
          <textarea value={teks} onChange={(e) => setTeks(e.target.value)} rows={2} maxLength={280}
            placeholder={jenis === "teks" ? "Tulis ceritamu…" : "Tambahkan keterangan (boleh kosong)…"}
            className="w-full bg-white/8 border border-white/15 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-lime-400/50 resize-none" />
          {pesan && <p className="text-[11.5px] text-red-400 mt-1.5">{pesan}</p>}
          <button onClick={kirim} disabled={sibuk}
            className="w-full mt-2.5 bg-gradient-to-r from-lime-400 to-emerald-500 text-slate-950 py-3.5 rounded-xl display-title text-base flex items-center justify-center gap-2 disabled:opacity-60">
            {sibuk ? <Loader2 size={17} className="animate-spin" /> : <Check size={17} />} BAGIKAN STORY
          </button>
        </div>
      </div>
    </div>
    </Lapisan>
  );
}
