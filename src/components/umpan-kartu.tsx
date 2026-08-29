"use client";
import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import JejakRute, { type Titik } from "@/components/jejak-rute";
import { IkonStreak, IkonForum, IkonKartu } from "@/components/bug-icons";
import { meter } from "@/lib/angka";

export type Aktivitas = {
  id: string;
  nama: string;
  asal: string;
  catatan: string | null;
  distance_m: number;
  duration_s: number;
  elevation_gain_m: number;
  path: Titik[] | null;
  waktu: string | null;
  kudos: number;
  sudahKudos: boolean;
  komentar: number;
  komentarTeratas: { nama: string; body: string } | null;
  foto: string | null;
};

const CINCIN = ["#B4FF3A", "#4ADE80", "#FBBF24", "#A78BFA", "#38BDF8", "#FB7185"];
export function warnaDari(teks: string) {
  let n = 0;
  for (let i = 0; i < teks.length; i++) n = (n + teks.charCodeAt(i)) % 997;
  return CINCIN[n % CINCIN.length];
}

export function Avatar({ nama, ukuran = 40, foto = null }: { nama: string; ukuran?: number; foto?: string | null }) {
  const w = warnaDari(nama || "?");
  if (foto) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={foto} alt={nama} width={ukuran} height={ukuran} loading="lazy" decoding="async"
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: ukuran, height: ukuran, border: `2px solid ${w}` }} />
    );
  }
  return (
    <span className="inline-flex items-center justify-center rounded-full flex-shrink-0 display-title"
      style={{
        width: ukuran, height: ukuran, fontSize: ukuran * 0.4,
        background: `${w}22`, color: w, border: `2px solid ${w}`,
      }}>
      {(nama || "?").trim().charAt(0).toUpperCase()}
    </span>
  );
}

function jam(detik: number) {
  const m = Math.floor(detik / 60), s = detik % 60;
  const h = Math.floor(m / 60);
  return h > 0 ? `${h}:${String(m % 60).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

function selisihWaktu(iso: string | null) {
  if (!iso) return "";
  const menit = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (menit < 1) return "baru saja";
  if (menit < 60) return `${menit} menit lalu`;
  const j = Math.floor(menit / 60);
  if (j < 24) return `${j} jam lalu`;
  const h = Math.floor(j / 24);
  return h < 7 ? `${h} hari lalu` : new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

export default function KartuAktivitas({ a, masuk }: { a: Aktivitas; masuk: boolean }) {
  const [kudos, setKudos] = useState(a.kudos);
  const [sudah, setSudah] = useState(a.sudahKudos);
  const [sibuk, setSibuk] = useState(false);

  async function tekanKudos() {
    if (!masuk || sibuk) return;
    setSibuk(true);
    const berikutnya = !sudah;
    setSudah(berikutnya);
    setKudos((k) => k + (berikutnya ? 1 : -1));
    try {
      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) throw new Error("belum masuk");
      if (berikutnya) await sb.from("activity_kudos").insert({ activity_id: a.id, user_id: user.id });
      else await sb.from("activity_kudos").delete().eq("activity_id", a.id).eq("user_id", user.id);
    } catch {
      // Kembalikan tampilan bila gagal, supaya angkanya tidak berbohong.
      setSudah(!berikutnya);
      setKudos((k) => k + (berikutnya ? -1 : 1));
    } finally { setSibuk(false); }
  }

  return (
    <article className="kartu-bug cahaya-sudut">
      <header className="flex items-center gap-3 px-4 pt-4">
        <Avatar nama={a.nama} foto={a.foto} />
        <div className="min-w-0 flex-1">
          <p className="display-title text-[15px] text-white truncate">{a.nama}</p>
          <p className="text-[11px] text-slate-500 truncate">
            {a.asal}{a.asal && a.waktu ? " · " : ""}{selisihWaktu(a.waktu)}
          </p>
        </div>
      </header>

      {a.catatan && <p className="px-4 pt-3 text-[13px] leading-relaxed text-slate-300">{a.catatan}</p>}

      <div className="mt-3 px-2">
        <div className="relative rounded-xl border border-lime-400/10 py-3 flex justify-center overflow-hidden" style={{ background: "radial-gradient(120% 100% at 50% 0%, rgba(180,255,58,.07) 0%, var(--relung) 62%)" }}>
          <JejakRute path={a.path} width={280} height={92} />
        </div>
      </div>

      <div className="flex items-end gap-6 px-4 pt-3">
        <div>
          <p className="display-num text-[24px] leading-none text-lime-300">
            {(a.distance_m / 1000).toFixed(2).replace(".", ",")}
          </p>
          <p className="eyebrow !text-[9px] text-slate-500 mt-1">km</p>
        </div>
        <div>
          <p className="display-num text-[22px] leading-none text-white">{jam(a.duration_s)}</p>
          <p className="eyebrow !text-[9px] text-slate-500 mt-1">waktu</p>
        </div>
        <div>
          <p className="display-num text-[22px] leading-none text-white">{meter(a.elevation_gain_m)} m</p>
          <p className="eyebrow !text-[9px] text-slate-500 mt-1">elevasi</p>
        </div>
      </div>

      <div className="flex items-center gap-4 px-4 py-3 mt-2 border-t border-white/5">
        <button onClick={tekanKudos} disabled={!masuk}
          aria-pressed={sudah}
          aria-label={sudah ? "Batalkan semangat" : "Beri semangat"}
          className={`flex items-center gap-1.5 text-xs transition-colors ${sudah ? "text-amber-400" : "text-slate-400"} disabled:opacity-50`}>
          <IkonStreak size={17} />
          <span className="display-num">{kudos}</span>
          <span className="text-[11px]">Semangat</span>
        </button>
        <Link href={`/umpan/${a.id}`} className="flex items-center gap-1.5 text-xs text-slate-400">
          <IkonForum size={17} /> {a.komentar}
        </Link>
        <Link href="/catat/riwayat" className="ml-auto text-slate-500" aria-label="Buat kartu gowes">
          <IkonKartu size={17} />
        </Link>
      </div>

      {a.komentarTeratas && (
        <div className="flex items-center gap-2 px-4 pb-4">
          <Avatar nama={a.komentarTeratas.nama} ukuran={22} />
          <p className="text-[11px] text-slate-400 truncate">
            <span className="text-slate-200 font-semibold">{a.komentarTeratas.nama.split(" ")[0]}</span>{" "}
            {a.komentarTeratas.body}
          </p>
        </div>
      )}
    </article>
  );
}
