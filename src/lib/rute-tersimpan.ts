import { createClient } from "@/lib/supabase/client";
import type { Titik } from "@/components/jejak-rute";

export type RuteTersimpan = {
  id: string; name: string; note: string | null; path: Titik[];
  distance_m: number; elevation_m: number; duration_s: number | null;
  source: string; share_token: string; is_public: boolean; created_at: string;
  user_id: string;
};

// Menyimpan rute agar bisa dilihat, diputar ulang, dan dibagikan.
// Titik diringkas ke maksimal 500 supaya baris basis datanya tidak membengkak;
// bentuk rutenya tidak berubah pada tingkat zoom mana pun.
export async function simpanRute(opsi: {
  name: string; path: Titik[]; distanceM: number;
  elevM?: number; durationS?: number | null; source?: string; note?: string | null;
}) {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("Kamu perlu masuk dulu untuk menyimpan rute.");

  const bersih = (opsi.path || []).filter(
    (t) => t && Number.isFinite(t.lat) && Number.isFinite(t.lng),
  );
  if (bersih.length < 2) throw new Error("Rute ini tidak punya jejak yang bisa disimpan.");
  const langkah = Math.max(1, Math.ceil(bersih.length / 500));
  const ringkas = bersih.filter((_, i) => i % langkah === 0);
  if (ringkas[ringkas.length - 1] !== bersih[bersih.length - 1]) ringkas.push(bersih[bersih.length - 1]);

  const { data, error } = await sb.from("saved_routes").insert({
    user_id: user.id,
    name: opsi.name.trim().slice(0, 80) || "Rute tanpa nama",
    note: opsi.note ?? null,
    path: ringkas,
    distance_m: opsi.distanceM,
    elevation_m: opsi.elevM ?? 0,
    duration_s: opsi.durationS ?? null,
    source: opsi.source ?? "riwayat",
  }).select("id,share_token").single();
  if (error) throw new Error(error.message);
  return data as { id: string; share_token: string };
}

export function tautanRute(token: string) {
  const asal = typeof window !== "undefined" ? window.location.origin : "https://gass-bulungan.netlify.app";
  return `${asal}/rute/${token}`;
}

// Panjang rute dari daftar titik, dipakai bila jaraknya belum diketahui.
export function panjangRute(path: Titik[]): number {
  let m = 0;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i];
    const dLat = ((b.lat - a.lat) * Math.PI) / 180;
    const dLng = ((b.lng - a.lng) * Math.PI) / 180;
    const lat = ((a.lat + b.lat) / 2) * (Math.PI / 180);
    const x = dLng * Math.cos(lat);
    m += Math.sqrt(dLat * dLat + x * x) * 6371000;
  }
  return m;
}
