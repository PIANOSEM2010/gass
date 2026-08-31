"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import JejakRute from "@/components/jejak-rute";
import { type TitikEvent } from "@/lib/titik-event";
import { Loader2, Check, Bookmark } from "lucide-react";

type Rute = {
  id: string; nama: string; jarakM: number; titik: TitikEvent[]; dibuat: string;
};

// Memilih jalur event dari rute yang sudah tersimpan di akun.
//
// Rute tersimpan biasanya berasal dari perjalanan sungguhan atau dari
// rekomendasi yang sudah diperiksa, jadi bentuknya sudah mengikuti jalan.
// Titik-titiknya diringkas saat dipakai sebagai jalur event: sebuah rekaman
// GPS bisa berisi ratusan titik, dan yang dibutuhkan event hanyalah bentuk
// jalurnya, bukan setiap goyangan sinyal.
export default function PilihRuteTersimpan({
  pilih,
}: { pilih: (titik: TitikEvent[], jarakM: number, nama: string) => void }) {
  const [daftar, setDaftar] = useState<Rute[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState("");
  const [terpilih, setTerpilih] = useState<string | null>(null);

  useEffect(() => {
    let hidup = true;
    (async () => {
      try {
        const sb = createClient();
        const { data: { user } } = await sb.auth.getUser();
        if (!user) throw new Error("Kamu perlu masuk dulu.");
        const { data, error } = await sb
          .from("saved_routes")
          .select("id,name,path,distance_m,created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });
        if (error) throw error;
        if (!hidup) return;
        setDaftar((data || []).map((r) => ({
          id: String(r.id),
          nama: String(r.name),
          jarakM: Number(r.distance_m) || 0,
          titik: Array.isArray(r.path) ? (r.path as TitikEvent[]) : [],
          dibuat: String(r.created_at),
        })));
      } catch (e) {
        if (hidup) setGalat(e instanceof Error ? e.message : "Gagal memuat rute tersimpan.");
      } finally {
        if (hidup) setMemuat(false);
      }
    })();
    return () => { hidup = false; };
  }, []);

  function pakai(r: Rute) {
    if (r.titik.length < 2) { setGalat("Rute ini tidak punya jejak yang bisa dipakai."); return; }
    setGalat("");
    setTerpilih(r.id);

    // Diringkas ke paling banyak 60 titik. Rekaman GPS bisa berisi ratusan
    // titik, dan itu membuat daftar penanda di formulir tidak terbaca.
    const langkah = Math.max(1, Math.ceil(r.titik.length / 60));
    const ringkas = r.titik.filter((_, i) => i % langkah === 0);
    const akhir = r.titik[r.titik.length - 1];
    if (ringkas[ringkas.length - 1] !== akhir) ringkas.push(akhir);

    // Titik awal dan akhir langsung dijadikan cek point, karena rute tersimpan
    // memang punya titik mulai dan selesai yang jelas.
    const jalur: TitikEvent[] = ringkas.map((t, i) => ({
      lat: t.lat, lng: t.lng,
      ...(i === 0 || i === ringkas.length - 1 ? { cek: true } : {}),
    }));

    pilih(jalur, r.jarakM, r.nama);
  }

  if (memuat) {
    return (
      <p className="flex items-center gap-2 text-[12px] text-slate-400 py-6 justify-center">
        <Loader2 size={15} className="animate-spin" /> Memuat rute tersimpan…
      </p>
    );
  }

  if (galat && daftar.length === 0) {
    return <p className="text-[12px] text-amber-300 py-4 leading-relaxed">{galat}</p>;
  }

  if (daftar.length === 0) {
    return (
      <div className="rounded-2xl border border-white/8 bg-[var(--kartu-2)] p-6 text-center">
        <Bookmark size={22} className="mx-auto text-slate-500 mb-2" />
        <p className="display-title text-[13px] text-slate-300">BELUM ADA RUTE TERSIMPAN</p>
        <p className="text-[11.5px] text-slate-500 mt-1.5 leading-relaxed">
          Simpan rute lebih dulu dari Riwayat Perjalanan atau Rekomendasi Rute,
          lalu rute itu bisa dipakai di sini.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-[11.5px] text-slate-500 mb-2.5 leading-relaxed">
        Pilih salah satu rute yang sudah kamu simpan. Titik awal dan akhirnya
        otomatis menjadi cek point, dan bisa kamu sesuaikan lewat pilihan
        &ldquo;Tandai di peta&rdquo;.
      </p>

      <ul className="space-y-2 max-h-80 overflow-y-auto pr-1">
        {daftar.map((r) => (
          <li key={r.id}>
            <button type="button" onClick={() => pakai(r)}
              className={`w-full flex items-center gap-3 rounded-xl border p-2.5 text-left transition-colors ${terpilih === r.id
                ? "border-lime-400/60 bg-lime-400/10"
                : "border-white/8 bg-[var(--kartu)]"}`}>
              <div className="rounded-lg bg-[var(--relung)] border border-white/8 p-1 flex-shrink-0">
                <JejakRute path={r.titik} width={58} height={42} tebal={2} titikUjung={false} />
              </div>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-semibold text-white truncate">{r.nama}</span>
                <span className="block text-[10.5px] text-slate-500">
                  {(r.jarakM / 1000).toFixed(2).replace(".", ",")} km · {r.titik.length} titik
                </span>
              </span>
              {terpilih === r.id && (
                <span className="w-6 h-6 rounded-full bg-lime-400 text-slate-950 flex items-center justify-center flex-shrink-0">
                  <Check size={13} strokeWidth={3} />
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>

      {galat && <p className="text-[11.5px] text-amber-300 mt-2">{galat}</p>}
    </div>
  );
}
