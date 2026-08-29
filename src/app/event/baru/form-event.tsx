"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { kecilkanGambar } from "@/lib/kecilkan-gambar";
import { periksaJalurAman } from "@/lib/periksa-jalur";
import { panjangRute } from "@/lib/rute-tersimpan";
import PilihTitikPeta from "@/components/pilih-titik-peta";
import RuteDariNamaJalan from "@/components/rute-dari-nama-jalan";
import KepalaHalaman from "@/components/kepala-halaman";
import { IkonKampanyeJalan } from "@/components/fitur-ikon";
import { type TitikEvent, cekPoint } from "@/lib/titik-event";
import { susunEtikaEvent } from "@/lib/etika-event";
import { Loader2, ImagePlus, AlertTriangle, ShieldCheck, Send, Flag } from "lucide-react";

type Zona = { lat: number; lng: number; radius_m: number; name: string };

export default function FormEvent({ zona }: { zona: Zona[] }) {
  const router = useRouter();
  const [nama, setNama] = useState("");
  const [tanggal, setTanggal] = useState("");
  const [titikKumpul, setTitikKumpul] = useState("");
  const [deskripsi, setDeskripsi] = useState("");
  const [titik, setTitik] = useState<TitikEvent[]>([]);
  const [logo, setLogo] = useState<File | null>(null);
  const [pratinjau, setPratinjau] = useState<string | null>(null);
  // Dua cara menyusun jalur: ketik nama jalan, atau tandai sendiri di peta.
  const [caraJalur, setCaraJalur] = useState<"nama" | "peta">("nama");
  const [sibuk, setSibuk] = useState(false);
  const [pesan, setPesan] = useState("");

  // Jalur diperiksa langsung terhadap zona rawan yang sudah dipetakan.
  // Toleransi kecil saja: yang dilaporkan hanya zona yang benar-benar dilintasi.
  const periksa = periksaJalurAman(titik, zona);
  const jarak = panjangRute(titik);
  const cek = cekPoint(titik);
  // Etika disusun sistem dari sifat jalur: panjangnya, jam berangkat, jumlah
  // cek point, dan zona rawan yang dilewati. Pengaju tidak mengetiknya.
  const etikaOtomatis = susunEtikaEvent({
    titik, distanceM: jarak, mulai: tanggal || null,
    adaZonaRawan: !periksa.aman,
    namaZona: periksa.pelanggaran.map((v) => v.nama),
  });

  function pilihLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setLogo(f);
    setPratinjau(URL.createObjectURL(f));
  }

  async function kirim(e: React.FormEvent) {
    e.preventDefault();
    if (sibuk) return;
    if (nama.trim().length < 3) { setPesan("Nama event minimal 3 huruf."); return; }
    if (titik.length < 2) { setPesan("Tandai minimal dua titik: start dan finish."); return; }
    setSibuk(true); setPesan("");
    try {
      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) throw new Error("Kamu perlu masuk dulu.");

      let logoUrl: string | null = null;
      if (logo) {
        const kecil = await kecilkanGambar(logo, 512, 0.85);
        const berkas = `${user.id}/${Date.now()}.jpg`;
        const { error: e1 } = await sb.storage.from("event").upload(berkas, kecil, {
          contentType: "image/jpeg", cacheControl: "31536000",
        });
        if (e1) throw e1;
        logoUrl = sb.storage.from("event").getPublicUrl(berkas).data.publicUrl;
      }

      // Catatan zona rawan disusun otomatis dari hasil pemeriksaan, supaya
      // peserta tahu bagian mana yang perlu ekstra hati-hati.
      const catatanRawan = periksa.aman
        ? "Jalur ini tidak melewati zona rawan yang terpetakan di BUG."
        : periksa.pelanggaran
            .map((v) => `${v.nama} - jalur event melintasi zona ini. Turunkan kecepatan dan berbaris satu banjar di bagian ini.`)
            .join("\n");

      // Cegah pengajuan ganda: nama yang sama dari pengaju yang sama, selama
      // pengajuan sebelumnya belum ditolak, dianggap event yang sama.
      const { data: sudahAda } = await sb.from("events")
        .select("id,status")
        .eq("creator_id", user.id)
        .ilike("name", nama.trim())
        .neq("status", "ditolak")
        .maybeSingle();
      if (sudahAda) {
        throw new Error(
          sudahAda.status === "menunggu"
            ? "Kamu sudah mengajukan event dengan nama ini dan masih menunggu tinjauan admin."
            : "Event dengan nama ini sudah disetujui dan tayang. Pakai nama lain bila ini event berbeda.",
        );
      }

      const { error } = await sb.from("events").insert({
        creator_id: user.id,
        name: nama.trim(),
        logo_url: logoUrl,
        description: deskripsi.trim() || null,
        start_at: tanggal ? new Date(tanggal).toISOString() : null,
        meeting_point: titikKumpul.trim() || null,
        waypoints: titik,
        distance_m: jarak,
        catatan_rawan: catatanRawan,
        catatan_etika: etikaOtomatis.join("\n"),
        status: "menunggu",
      });
      if (error) {
        // 23505 = pelanggaran indeks unik, yaitu nama event yang sama.
        throw new Error(
          error.code === "23505"
            ? "Event dengan nama ini sudah pernah kamu ajukan."
            : error.message,
        );
      }

      router.push("/event?diajukan=1");
      router.refresh();
    } catch (err) {
      setPesan(err instanceof Error ? err.message : "Gagal mengajukan event.");
    } finally { setSibuk(false); }
  }

  return (
    <div className="min-h-screen bg-[var(--latar)] pb-10">
      <KepalaHalaman ikon={<IkonKampanyeJalan size={22} />} judul="AJUKAN EVENT GOWES"
        keterangan="Event akan tampil di halaman Event setelah disetujui admin."
        warna="#FB923C" />

      <form onSubmit={kirim} className="max-w-md mx-auto px-4 pt-5 space-y-4">
        {/* Nama & logo */}
        <div className="kartu-bug p-4">
          <label className="eyebrow !text-[9px] text-slate-500 block mb-1.5">Nama event</label>
          <input value={nama} onChange={(e) => setNama(e.target.value)} maxLength={90}
            placeholder="Gowes Bareng Kaltaride"
            className="w-full bg-[var(--isian)] border border-lime-400/15 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-lime-400/50" />

          <label className="eyebrow !text-[9px] text-slate-500 block mb-1.5 mt-4">Logo event</label>
          <label className="flex items-center gap-3 rounded-xl border border-dashed border-lime-400/30 px-4 py-3 cursor-pointer">
            {pratinjau ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={pratinjau} alt="" className="w-12 h-12 rounded-xl object-cover" />
            ) : (
              <span className="w-12 h-12 rounded-xl bg-lime-400/10 text-lime-300 flex items-center justify-center">
                <ImagePlus size={20} />
              </span>
            )}
            <span className="text-[12px] text-slate-400 flex-1">
              {logo ? "Ganti logo" : "Pilih logo dari galeri (boleh kosong)"}
            </span>
            <input type="file" accept="image/*" className="hidden" onChange={pilihLogo} />
          </label>
        </div>

        {/* Jalur */}
        <div className="kartu-bug p-4">
          <p className="display-title text-[14px] text-white mb-1">JALUR EVENT</p>
          <p className="text-[11.5px] text-slate-400 mb-3 leading-relaxed">
            Susun jalur dengan menuliskan nama jalannya, atau tandai sendiri di peta.
          </p>

          <div className="flex gap-2 mb-3">
            {([["nama", "Tulis nama jalan"], ["peta", "Tandai di peta"]] as const).map(([k, l]) => (
              <button key={k} type="button" onClick={() => setCaraJalur(k)}
                className={`flex-1 py-2 rounded-xl text-[11.5px] font-semibold border-2 transition-colors ${caraJalur === k
                  ? "border-lime-400/60 bg-lime-400/10 text-lime-300"
                  : "border-white/10 text-slate-400"}`}>
                {l}
              </button>
            ))}
          </div>

          {caraJalur === "nama" ? (
            <>
              <RuteDariNamaJalan zona={zona} selesai={(t) => setTitik(t)} />
              {titik.length > 0 && (
                <p className="text-[11px] text-slate-500 mt-3 leading-relaxed">
                  Rute tersusun dari {titik.length} titik mengikuti jalan sungguhan.
                  Ganti ke &ldquo;Tandai di peta&rdquo; bila ingin memeriksa atau menyesuaikan cek pointnya.
                </p>
              )}
            </>
          ) : (
            <PilihTitikPeta titik={titik} ubah={setTitik} />
          )}

          {titik.length >= 2 && (
            <>
              <p className="text-[11.5px] text-slate-400 mt-3 flex items-center gap-1.5">
                <Flag size={13} className="text-lime-400" /> {cek.length} cek point ditandai
              </p>
              <p className="display-num text-[20px] text-lime-300 mt-1">
                ± {(jarak / 1000).toFixed(2).replace(".", ",")} km
                <span className="display-title text-[11px] text-slate-500 ml-2">jarak antar titik</span>
              </p>
              {periksa.aman ? (
                <p className="mt-2 flex items-center gap-1.5 text-[11.5px] text-lime-300">
                  <ShieldCheck size={14} /> Jalur tidak melewati zona rawan yang terpetakan.
                </p>
              ) : (
                <div className="mt-2 rounded-xl border border-amber-400/35 bg-amber-400/10 px-3 py-2.5">
                  <p className="text-[11.5px] font-semibold text-amber-300 flex items-center gap-1.5">
                    <AlertTriangle size={13} /> Jalur melewati {periksa.pelanggaran.length} zona rawan
                  </p>
                  <ul className="mt-1 text-[10.5px] text-amber-200/85 list-disc list-inside leading-relaxed">
                    {periksa.pelanggaran.slice(0, 4).map((v) => <li key={v.nama}>{v.nama}</li>)}
                  </ul>
                  <p className="text-[10.5px] text-amber-200/70 mt-1">
                    Boleh tetap diajukan, tapi zona ini akan dicantumkan sebagai peringatan bagi peserta.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Waktu & keterangan */}
        <div className="kartu-bug p-4 space-y-3">
          <div>
            <label className="eyebrow !text-[9px] text-slate-500 block mb-1.5">Waktu mulai</label>
            <input type="datetime-local" value={tanggal} onChange={(e) => setTanggal(e.target.value)}
              className="w-full bg-[var(--isian)] border border-lime-400/15 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-lime-400/50" />
          </div>
          <div>
            <label className="eyebrow !text-[9px] text-slate-500 block mb-1.5">Titik kumpul</label>
            <input value={titikKumpul} onChange={(e) => setTitikKumpul(e.target.value)}
              placeholder="Depan Kantor Bupati Bulungan"
              className="w-full bg-[var(--isian)] border border-lime-400/15 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-lime-400/50" />
          </div>
          <div>
            <label className="eyebrow !text-[9px] text-slate-500 block mb-1.5">Keterangan</label>
            <textarea value={deskripsi} onChange={(e) => setDeskripsi(e.target.value)} rows={3} maxLength={600}
              placeholder="Siapa yang boleh ikut, apa yang perlu dibawa, dan seterusnya."
              className="w-full bg-[var(--isian)] border border-lime-400/15 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-lime-400/50 resize-none" />
          </div>
        </div>

        {/* Etika, disusun sistem */}
        <div className="kartu-bug p-4">
          <p className="display-title text-[14px] text-white mb-1">ETIKA BERSEPEDA SELAMA EVENT</p>
          <p className="text-[11.5px] text-slate-400 mb-3 leading-relaxed">
            Disusun sendiri oleh sistem dari panjang jalur, jam berangkat, jumlah cek point,
            dan zona rawan yang dilewati. Daftar ini ikut tampil di halaman event dan di kartu bagikan.
          </p>
          <ul className="space-y-2">
            {etikaOtomatis.map((b, i) => (
              <li key={i} className="flex gap-2.5 text-[12px] text-slate-300 leading-relaxed">
                <span className="w-5 h-5 rounded-md bg-lime-400/15 text-lime-300 display-title text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                {b}
              </li>
            ))}
          </ul>
          {titik.length < 2 && (
            <p className="text-[11px] text-slate-600 mt-3">
              Daftar ini akan bertambah setelah jalur dan waktu ditentukan.
            </p>
          )}
        </div>

        {pesan && <p className="text-[12px] text-red-400">{pesan}</p>}

        <button type="submit" disabled={sibuk}
          className="w-full bg-gradient-to-r from-lime-400 to-emerald-500 text-slate-950 py-4 rounded-2xl display-title text-base flex items-center justify-center gap-2 disabled:opacity-60">
          {sibuk ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />} AJUKAN KE ADMIN
        </button>
        <p className="text-[11px] text-slate-500 text-center pb-2">
          Event baru tampil untuk umum setelah admin menyetujuinya.
        </p>
      </form>
    </div>
  );
}
