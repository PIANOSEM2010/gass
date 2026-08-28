"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Phone, MapPin, Copy, Check, Loader2 } from "lucide-react";
import { getPositionOnce } from "@/lib/native-geo";
import { reverseGeocodePlace } from "@/lib/place-name";
import { teleponDarurat } from "@/lib/panggilan-darurat";

// Panggilan terpandu ke 110.
//
// Catatan penting: aplikasi TIDAK bisa berbicara mewakili pengguna kepada
// operator. Yang bisa dilakukan - dan yang paling menolong saat panik - adalah
// menyiapkan kalimat yang harus diucapkan beserta lokasi yang tepat, lalu
// menyambungkan panggilannya. Itulah yang dikerjakan halaman ini.

type Lokasi = { lat: number; lng: number; nama: string };

export default function PanggilanTerpandu({ namaDepan }: { namaDepan: string }) {
  const [lokasi, setLokasi] = useState<Lokasi | null>(null);
  const [galat, setGalat] = useState("");
  const [disalin, setDisalin] = useState(false);
  const [langkah, setLangkah] = useState<boolean[]>([false, false, false, false]);

  useEffect(() => {
    let hidup = true;
    (async () => {
      try {
        const p = await getPositionOnce(12000);
        if (!hidup) return;
        const lat = p.coords.latitude, lng = p.coords.longitude;
        setLokasi({ lat, lng, nama: "mencari nama tempat…" });
        const nama = await reverseGeocodePlace(lat, lng).catch(() => "");
        if (!hidup) return;
        setLokasi({ lat, lng, nama: nama || "" });
      } catch {
        if (hidup) setGalat("Lokasi belum bisa diambil. Sebutkan patokan jalan terdekat kepada operator.");
      }
    })();
    return () => { hidup = false; };
  }, []);

  const koordinat = lokasi ? `${lokasi.lat.toFixed(5)}, ${lokasi.lng.toFixed(5)}` : "";
  const tempat = lokasi?.nama && lokasi.nama !== "mencari nama tempat…" ? lokasi.nama : "";

  const naskah = [
    `Halo, saya ${namaDepan || "pesepeda"}. Saya melaporkan kecelakaan sepeda.`,
    tempat
      ? `Lokasinya di ${tempat}, Kabupaten Bulungan. Titik koordinatnya ${koordinat}.`
      : koordinat
        ? `Titik koordinat lokasinya ${koordinat}, Kabupaten Bulungan.`
        : `Lokasinya di Kabupaten Bulungan, saya sebutkan patokan jalan terdekat.`,
    `Ada korban pesepeda. Kondisinya: (sebutkan sadar atau tidak sadar, berdarah atau tidak).`,
    `Tolong kirimkan bantuan. Nomor saya bisa dihubungi kembali di nomor ini.`,
  ];

  async function salin() {
    try {
      await navigator.clipboard.writeText(naskah.join(" "));
      setDisalin(true);
      setTimeout(() => setDisalin(false), 2200);
    } catch { /* peramban lama: abaikan */ }
  }

  function tandai(i: number) {
    setLangkah((l) => l.map((v, k) => (k === i ? !v : v)));
  }

  const daftarPeriksa = [
    "Pastikan diri sendiri aman dulu, menepi dari jalur kendaraan.",
    "Jangan pindahkan korban bila ia mengeluh sakit leher atau punggung.",
    "Nyalakan lampu sepeda atau senter agar lokasi mudah terlihat.",
    "Tetap di lokasi sampai bantuan datang, dan angkat telepon bila dihubungi balik.",
  ];

  return (
    <div className="min-h-screen bg-[var(--latar)] pb-10">
      <div className="max-w-md mx-auto px-5 pt-6">
        <Link href="/sos" className="text-xs text-slate-400">← Kembali ke tombol SOS</Link>

        <h1 className="display-title text-2xl text-white mt-4">PANGGILAN TERPANDU 110</h1>
        <p className="text-[13px] text-slate-400 mt-2 leading-relaxed">
          110 adalah nomor darurat Polri. Bacakan kalimat di bawah ini apa adanya -
          operator butuh lokasi yang jelas lebih dulu, baru kondisi korban.
        </p>

        {/* Lokasi */}
        <div className="mt-5 rounded-2xl border border-lime-400/15 bg-[var(--kartu)] p-4">
          <div className="flex items-center gap-2 mb-2">
            <MapPin size={15} className="text-lime-400" />
            <p className="eyebrow !text-[9px] text-slate-500">Lokasimu sekarang</p>
          </div>
          {galat ? (
            <p className="text-[13px] text-amber-300 leading-relaxed">{galat}</p>
          ) : !lokasi ? (
            <p className="text-[13px] text-slate-400 flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" /> Mengambil lokasi…
            </p>
          ) : (
            <>
              {tempat && <p className="text-[14px] text-white leading-snug">{tempat}</p>}
              <p className="display-num text-lg text-lime-300 mt-1">{koordinat}</p>
            </>
          )}
        </div>

        {/* Naskah */}
        <h2 className="eyebrow text-slate-500 !text-[10px] mt-6 mb-2">Yang perlu kamu ucapkan</h2>
        <div className="rounded-2xl border border-white/8 bg-[var(--kartu)] divide-y divide-white/5">
          {naskah.map((baris, i) => (
            <p key={i} className="px-4 py-3 text-[13px] leading-relaxed text-slate-200">
              <span className="display-title text-[11px] text-lime-400 mr-2">{i + 1}</span>{baris}
            </p>
          ))}
        </div>

        <button onClick={salin}
          className="w-full mt-2 border border-white/12 text-slate-300 py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 active:scale-[.98] transition-transform">
          {disalin ? <><Check size={15} className="text-lime-400" /> Naskah disalin</> : <><Copy size={15} /> Salin naskah</>}
        </button>

        {/* Tombol panggil */}
        <button onClick={() => { void teleponDarurat("110"); }}
          className="mt-4 w-full bg-red-600 text-white py-4 rounded-2xl display-title text-lg flex items-center justify-center gap-2.5 shadow-[0_0_26px_rgba(220,38,38,.35)] active:scale-[.98] transition-transform teks-terang">
          <Phone size={20} /> TELEPON 110 SEKARANG
        </button>
        <p className="text-[11px] text-slate-500 text-center mt-2">
          Panggilan dilakukan dari nomormu sendiri. Aplikasi tidak bisa berbicara mewakilimu.
        </p>

        {/* Daftar periksa */}
        <h2 className="eyebrow text-slate-500 !text-[10px] mt-7 mb-2">Sambil menunggu bantuan</h2>
        <div className="space-y-2">
          {daftarPeriksa.map((t, i) => (
            <button key={i} onClick={() => tandai(i)}
              className={`w-full flex items-start gap-2.5 text-left rounded-xl border px-3.5 py-3 transition-colors ${langkah[i] ? "border-lime-400/35 bg-lime-400/8" : "border-white/8 bg-[var(--kartu)]"}`}>
              <span className={`mt-0.5 w-[18px] h-[18px] rounded-md border flex-shrink-0 flex items-center justify-center ${langkah[i] ? "border-lime-400 bg-lime-400 text-slate-950" : "border-white/20"}`}>
                {langkah[i] && <Check size={12} strokeWidth={3.5} />}
              </span>
              <span className={`text-[12.5px] leading-relaxed ${langkah[i] ? "text-lime-100" : "text-slate-300"}`}>{t}</span>
            </button>
          ))}
        </div>

        <div className="mt-6 rounded-xl border border-white/8 bg-[var(--kartu-2)] p-4">
          <p className="eyebrow !text-[9px] text-slate-500 mb-1.5">Nomor darurat lain</p>
          <div className="flex gap-2">
            <a href="tel:119" className="flex-1 text-center border border-white/12 text-slate-200 rounded-lg py-2 text-sm">119 · Ambulans</a>
            <a href="tel:113" className="flex-1 text-center border border-white/12 text-slate-200 rounded-lg py-2 text-sm">113 · Damkar</a>
          </div>
        </div>
      </div>
    </div>
  );
}
