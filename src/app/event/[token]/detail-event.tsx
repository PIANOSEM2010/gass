"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { gambarKartuEvent } from "@/lib/kartu-event";
import { shareImageDataUrl } from "@/lib/native-share";
import { type TitikEvent, cekPoint } from "@/lib/titik-event";
import Lapisan from "@/components/lapisan";
import { Avatar } from "@/components/umpan-kartu";
import {
  Share2, Download, Loader2, Users, MapPin, CalendarDays, X, ChevronRight,
  AlertTriangle, ShieldCheck, Play, Check,
} from "lucide-react";


export default function DetailEvent(p: {
  id: string; token: string; nama: string; logo: string | null; deskripsi: string | null;
  mulai: string | null; titikKumpul: string | null; titik: TitikEvent[]; distanceM: number;
  catatanRawan: string; catatanEtika: string; status: string; pengaju: string;
  jumlahPeserta: number; sudahIkut: boolean; masuk: boolean; selesai: boolean;
  peserta: {
    id: string; nama: string; asal: string; foto: string | null;
    selesai: boolean; gabung: string | null;
  }[];
}) {
  const router = useRouter();
  const [ikut, setIkut] = useState(p.sudahIkut);
  const [sibuk, setSibuk] = useState(false);
  const [pesan, setPesan] = useState("");
  const [lihatPeserta, setLihatPeserta] = useState(false);
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
    if (!k || sibuk) return;
    setSibuk(true); setPesan("");
    try {
      // Tautan ikut di dalam teks, supaya penerima bisa membuka halaman event
      // dan bergabung, bukan hanya melihat gambarnya.
      const teks =
        `${p.nama}\nGowes bareng ${(p.distanceM / 1000).toFixed(1).replace(".", ",")} km di Bulungan.\n` +
        `Gabung di sini: ${tautan}`;
      const r = await shareImageDataUrl(
        k.toDataURL("image/png"),
        `event-${p.nama.replace(/\s+/g, "-").toLowerCase()}.png`,
        teks,
      );
      if (r.status === "downloaded") {
        await navigator.clipboard.writeText(teks).catch(() => null);
        setPesan("Peranti ini belum bisa membuka pilihan berbagi. Gambar sudah diunduh dan tautannya disalin.");
      } else if (r.status === "failed") {
        setPesan(`Gagal membagikan: ${r.error || "tidak diketahui"}`);
      }
    } finally { setSibuk(false); }
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
              {p.selesai && (
                <span className="inline-block mt-1.5 rounded-full bg-white/8 px-2.5 py-0.5 eyebrow !text-[8px] text-slate-400">
                  Sudah selesai
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-5">
            {[
              { n: (p.distanceM / 1000).toFixed(1).replace(".", ","), l: "km jalur" },
              { n: String(cekPoint(p.titik).length), l: "cek point" },
            ].map((s) => (
              <div key={s.l}>
                <p className="display-num text-[22px] leading-none text-white">{s.n}</p>
                <p className="eyebrow !text-[8px] text-slate-500 mt-1.5">{s.l}</p>
              </div>
            ))}

            {/* Jumlah peserta sekaligus jadi tombol pembuka daftarnya. Angka
                tanpa nama tidak banyak artinya; orang ingin tahu siapa saja
                yang ikut sebelum memutuskan bergabung. */}
            <button onClick={() => setLihatPeserta(true)} disabled={p.jumlahPeserta === 0}
              className="text-left disabled:opacity-60">
              <p className="display-num text-[22px] leading-none text-white">{p.jumlahPeserta}</p>
              <p className="eyebrow !text-[8px] text-slate-500 mt-1.5 flex items-center gap-0.5">
                peserta
                {p.jumlahPeserta > 0 && (
                  <span className="inline-flex items-center text-lime-400 normal-case tracking-normal">
                    <ChevronRight size={11} />
                  </span>
                )}
              </p>
            </button>
          </div>

          {p.jumlahPeserta > 0 && (
            <button onClick={() => setLihatPeserta(true)}
              className="mt-4 w-full flex items-center gap-2.5 rounded-xl border border-white/12 px-3.5 py-2.5">
              <span className="flex -space-x-2 flex-shrink-0">
                {p.peserta.slice(0, 4).map((o) => (
                  <span key={o.id} className="rounded-full ring-2 ring-[var(--latar)]">
                    <Avatar nama={o.nama} foto={o.foto} ukuran={24} />
                  </span>
                ))}
              </span>
              <span className="text-[12px] text-slate-300 flex-1 text-left truncate">
                {p.peserta[0]?.nama.split(" ")[0]}
                {p.jumlahPeserta > 1 ? ` dan ${p.jumlahPeserta - 1} lainnya` : ""}
              </span>
              <span className="display-title text-[11px] text-lime-300 flex-shrink-0">LIHAT PESERTA</span>
            </button>
          )}
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
        {p.selesai ? (
          <div className="rounded-2xl border border-white/10 bg-[var(--kartu-2)] p-5 text-center">
            <p className="display-title text-[15px] text-slate-300">EVENT SUDAH SELESAI</p>
            <p className="text-[12px] text-slate-500 mt-1.5 leading-relaxed">
              Event ini berlangsung pada{" "}
              {p.mulai ? new Date(p.mulai).toLocaleDateString("id-ID", { dateStyle: "long" }) : "hari sebelumnya"}
              {" "}dan tidak menerima peserta baru. Halaman ini tetap bisa dibuka sebagai catatan
              jalur dan etika bersepedanya.
            </p>
            <Link href="/event"
              className="inline-block mt-4 rounded-xl border border-lime-400/30 text-lime-300 px-5 py-2.5 display-title text-sm">
              LIHAT EVENT LAIN
            </Link>
          </div>
        ) : p.masuk ? (
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
            <Link href={`/auth/login?next=${encodeURIComponent(`/event/${p.token}`)}`} className="text-lime-400">Masuk</Link> untuk bergabung ke event ini.
          </p>
        )}
      </div>

      {lihatPeserta && (
        <Lapisan>
          <div className="fixed inset-0 z-[4200] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center"
            onClick={() => setLihatPeserta(false)}>
            <div className="bg-[var(--kartu)] border border-lime-400/15 rounded-t-3xl sm:rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-4 pt-4 pb-3 flex-shrink-0">
                <div>
                  <p className="display-title text-base text-white">PESERTA EVENT</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {p.jumlahPeserta} bergabung ·{" "}
                    {p.peserta.filter((o) => o.selesai).length} sudah menyelesaikan
                  </p>
                </div>
                <button onClick={() => setLihatPeserta(false)} className="text-slate-500 p-1" aria-label="Tutup">
                  <X size={18} />
                </button>
              </div>

              <ul className="flex-1 overflow-y-auto overscroll-contain px-4 pb-4 space-y-2 min-h-0">
                {p.peserta.map((o) => (
                  <li key={o.id}>
                    <Link href={`/goweser/${o.id}`}
                      className="flex items-center gap-3 rounded-xl border border-white/8 bg-[var(--kartu-2)] px-3 py-2.5">
                      <Avatar nama={o.nama} foto={o.foto} ukuran={34} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-semibold text-white truncate">{o.nama}</span>
                        {o.asal && <span className="block text-[10.5px] text-slate-500 truncate">{o.asal}</span>}
                      </span>
                      {o.selesai ? (
                        <span className="rounded-full bg-lime-400/20 text-lime-300 px-2.5 py-0.5 eyebrow !text-[8px] flex-shrink-0">
                          Selesai
                        </span>
                      ) : (
                        <span className="rounded-full bg-white/8 text-slate-400 px-2.5 py-0.5 eyebrow !text-[8px] flex-shrink-0">
                          Terdaftar
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Lapisan>
      )}
    </div>
  );
}
