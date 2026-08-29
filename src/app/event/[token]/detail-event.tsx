"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { gambarKartuEvent } from "@/lib/kartu-event";
import { type TitikEvent, cekPoint } from "@/lib/titik-event";
import {
  Share2, Download, Loader2, Users, MapPin, CalendarDays,
  AlertTriangle, ShieldCheck, Play, Check,
} from "lucide-react";


export default function DetailEvent(p: {
  id: string; token: string; nama: string; logo: string | null; deskripsi: string | null;
  mulai: string | null; titikKumpul: string | null; titik: TitikEvent[]; distanceM: number;
  catatanRawan: string; catatanEtika: string; status: string; pengaju: string;
  jumlahPeserta: number; sudahIkut: boolean; masuk: boolean;
}) {
  const router = useRouter();
  const [ikut, setIkut] = useState(p.sudahIkut);
  const [sibuk, setSibuk] = useState(false);
  const [pesan, setPesan] = useState("");
  const kanvasRef = useRef<HTMLCanvasElement>(null);

  const tautan = typeof window !== "undefined"
    ? `${window.location.origin}/event/${p.token}`
    : `https://gass-bulungan.netlify.app/event/${p.token}`;

  useEffect(() => {
    if (!kanvasRef.current) return;
    gambarKartuEvent(kanvasRef.current, {
      nama: p.nama, titik: p.titik, distanceM: p.distanceM,
      mulai: p.mulai, titikKumpul: p.titikKumpul,
      etika: p.catatanEtika, rawan: p.catatanRawan, tautan,
    }).catch(() => setPesan("Kartu event gagal digambar."));
  }, [p.nama, p.titik, p.distanceM, p.mulai, p.titikKumpul, p.catatanEtika, p.catatanRawan, tautan]);

  async function gabung() {
    if (sibuk || !p.masuk) return;
    setSibuk(true); setPesan("");
    try {
      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) throw new Error("Kamu perlu masuk dulu.");
      if (ikut) {
        await sb.from("event_participants").delete().eq("event_id", p.id).eq("user_id", user.id);
        setIkut(false);
      } else {
        const { error } = await sb.from("event_participants").insert({ event_id: p.id, user_id: user.id });
        if (error) throw error;
        setIkut(true);
      }
      router.refresh();
    } catch (e) {
      setPesan(e instanceof Error ? e.message : "Gagal memperbarui keikutsertaan.");
    } finally { setSibuk(false); }
  }

  async function bagikan() {
    const k = kanvasRef.current;
    const teks = `${p.nama} - gowes bareng ${(p.distanceM / 1000).toFixed(1).replace(".", ",")} km di Bulungan`;
    try {
      if (k && navigator.canShare) {
        const blob: Blob = await new Promise((res, rej) =>
          k.toBlob((b) => (b ? res(b) : rej(new Error("gagal"))), "image/png"));
        const berkas = new File([blob], "event-bug.png", { type: "image/png" });
        if (navigator.canShare({ files: [berkas] })) {
          await navigator.share({ files: [berkas], title: p.nama, text: `${teks}\n${tautan}` });
          return;
        }
      }
      if (navigator.share) { await navigator.share({ title: p.nama, text: teks, url: tautan }); return; }
      await navigator.clipboard.writeText(`${teks}\n${tautan}`);
      setPesan("Tautan event disalin.");
    } catch { /* dibatalkan pengguna */ }
  }

  function unduh() {
    const k = kanvasRef.current;
    if (!k) return;
    const a = document.createElement("a");
    a.href = k.toDataURL("image/png");
    a.download = `event-${p.nama.replace(/\s+/g, "-").toLowerCase()}.png`;
    a.click();
  }

  const barisRawan = p.catatanRawan.split("\n").filter(Boolean);
  const barisEtika = p.catatanEtika.split("\n").filter(Boolean);
  const aman = /tidak melewati zona rawan/i.test(p.catatanRawan);

  return (
    <div className="min-h-screen bg-[var(--latar)] pb-10">
      {/* Kepala event */}
      <div className="relative overflow-hidden border-b border-white/8 butiran">
        <div className="absolute -top-24 -right-20 w-[300px] h-[300px] opacity-40 pointer-events-none"
          style={{ background: "radial-gradient(circle at center, rgba(251,146,60,.20) 0%, transparent 62%)" }} />
        <div className="relative max-w-md mx-auto px-5 pt-6 pb-5">
          <Link href="/event" className="text-xs text-slate-400">← Semua event</Link>
          <div className="flex items-center gap-3.5 mt-4">
            {p.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.logo} alt="" className="w-16 h-16 rounded-2xl object-cover flex-shrink-0" />
            ) : (
              <span className="w-16 h-16 rounded-2xl bg-orange-400/15 text-orange-300 flex items-center justify-center display-title text-2xl flex-shrink-0">
                {p.nama.charAt(0).toUpperCase()}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="display-title text-[19px] text-white leading-tight">{p.nama}</h1>
              <p className="text-[11px] text-slate-500 mt-1">Diajukan oleh {p.pengaju}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-5">
            {[
              { n: (p.distanceM / 1000).toFixed(1).replace(".", ","), l: "km jalur" },
              { n: String(cekPoint(p.titik).length), l: "cek point" },
              { n: String(p.jumlahPeserta), l: "peserta" },
            ].map((s) => (
              <div key={s.l}>
                <p className="display-num text-[22px] leading-none text-white">{s.n}</p>
                <p className="eyebrow !text-[8px] text-slate-500 mt-1.5">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pt-5 space-y-4">
        {(p.mulai || p.titikKumpul) && (
          <div className="kartu-bug p-4 space-y-2.5">
            {p.mulai && (
              <p className="flex items-start gap-2.5 text-[12.5px] text-slate-300">
                <CalendarDays size={15} className="text-lime-400 flex-shrink-0 mt-0.5" />
                {new Date(p.mulai).toLocaleString("id-ID", { dateStyle: "full", timeStyle: "short" })}
              </p>
            )}
            {p.titikKumpul && (
              <p className="flex items-start gap-2.5 text-[12.5px] text-slate-300">
                <MapPin size={15} className="text-lime-400 flex-shrink-0 mt-0.5" />
                Titik kumpul: {p.titikKumpul}
              </p>
            )}
          </div>
        )}

        {p.deskripsi && (
          <div className="kartu-bug p-4">
            <p className="text-[13px] text-slate-300 leading-relaxed whitespace-pre-line">{p.deskripsi}</p>
          </div>
        )}

        {/* Informasi rute */}
        <div className="kartu-bug p-4">
          <p className="display-title text-[14px] text-white mb-3">INFORMASI RUTE</p>
          <p className="text-[11.5px] text-slate-500 mb-2.5">
            Jalur dibentuk dari {p.titik.length} titik. Yang tercantum di bawah adalah cek point,
            tempat rombongan berkumpul kembali sebelum melanjutkan.
          </p>
          <ol className="space-y-1.5">
            {cekPoint(p.titik).map((cp, i, arr) => (
              <li key={cp.indeks} className="flex items-center gap-2.5">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center display-title text-[11px] flex-shrink-0 ${i === arr.length - 1 ? "bg-lime-400 text-slate-950" : "bg-white text-slate-950"}`}>
                  {cp.huruf}
                </span>
                <span className="text-[12px] text-slate-300 flex-1 truncate">
                  {cp.titik.nama || `${cp.titik.lat.toFixed(5)}, ${cp.titik.lng.toFixed(5)}`}
                </span>
                <span className="text-[10px] text-slate-600 flex-shrink-0">
                  {i === 0 ? "Start" : i === arr.length - 1 ? "Finish" : "Cek point"}
                </span>
              </li>
            ))}
          </ol>
        </div>

        {/* Catatan zona rawan */}
        <div className={`rounded-2xl border p-4 ${aman ? "border-lime-400/25 bg-lime-400/8" : "border-amber-400/35 bg-amber-400/10"}`}>
          <p className={`display-title text-[13px] flex items-center gap-2 ${aman ? "text-lime-300" : "text-amber-300"}`}>
            {aman ? <ShieldCheck size={16} /> : <AlertTriangle size={16} />} DAERAH RAWAN DI JALUR INI
          </p>
          <ul className="mt-2 space-y-1">
            {barisRawan.map((b, i) => (
              <li key={i} className={`text-[12px] leading-relaxed ${aman ? "text-lime-100" : "text-amber-100"}`}>{b}</li>
            ))}
          </ul>
        </div>

        {/* Etika bersepeda */}
        {barisEtika.length > 0 && (
          <div className="kartu-bug p-4">
            <p className="display-title text-[14px] text-white mb-2.5">ETIKA BERSEPEDA SELAMA EVENT</p>
            <ul className="space-y-2">
              {barisEtika.map((b, i) => (
                <li key={i} className="flex gap-2.5 text-[12.5px] text-slate-300 leading-relaxed">
                  <span className="w-5 h-5 rounded-md bg-lime-400/15 text-lime-300 display-title text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  {b}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Kartu bagikan */}
        <div>
          <p className="eyebrow text-slate-500 !text-[10px] mb-2">Bagikan event</p>
          <canvas ref={kanvasRef} className="w-full h-auto rounded-2xl border border-white/10" />
          <div className="grid grid-cols-2 gap-2 mt-2.5">
            <button onClick={bagikan}
              className="rounded-xl bg-gradient-to-r from-lime-400 to-emerald-500 text-slate-950 py-3 display-title text-sm flex items-center justify-center gap-2">
              <Share2 size={16} /> Bagikan
            </button>
            <button onClick={unduh}
              className="rounded-xl border border-white/15 text-slate-200 py-3 display-title text-sm flex items-center justify-center gap-2">
              <Download size={16} /> Unduh
            </button>
          </div>
        </div>

        {pesan && <p className="text-[12px] text-slate-400">{pesan}</p>}

        {/* Gabung & mulai */}
        {p.masuk ? (
          <div className="space-y-2.5 pt-1">
            <button onClick={gabung} disabled={sibuk}
              className={`w-full py-4 rounded-2xl display-title text-base flex items-center justify-center gap-2 disabled:opacity-60 ${ikut
                ? "border border-white/15 text-slate-300"
                : "bg-gradient-to-r from-lime-400 to-emerald-500 text-slate-950"}`}>
              {sibuk ? <Loader2 size={17} className="animate-spin" /> : ikut ? <Check size={17} /> : <Users size={17} />}
              {ikut ? "SUDAH BERGABUNG" : "GABUNG EVENT"}
            </button>

            {ikut && (
              <Link href={`/catat?event=${p.id}&mulai=1`}
                className="w-full bg-red-600 text-white py-4 rounded-2xl display-title text-base flex items-center justify-center gap-2 teks-terang">
                <Play size={18} /> MULAI EVENT
              </Link>
            )}
            {ikut && (
              <p className="text-[11px] text-slate-500 text-center leading-relaxed">
                Menekan Mulai akan langsung memulai pencatatan gowes. Perjalananmu tersimpan
                sendiri dan tercatat sebagai bagian dari event ini begitu kamu menekan Selesai.
              </p>
            )}
          </div>
        ) : (
          <p className="text-center text-xs text-slate-500 pt-2">
            <Link href="/auth/login" className="text-lime-400">Masuk</Link> untuk bergabung ke event ini.
          </p>
        )}
      </div>
    </div>
  );
}
