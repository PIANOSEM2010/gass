"use client";
import { MapContainer, TileLayer, Polyline, CircleMarker, Circle, useMap } from "react-leaflet";
import { useEffect, useState } from "react";
import "leaflet/dist/leaflet.css";
import { createClient } from "@/lib/supabase/client";
import type { Titik } from "@/components/jejak-rute";

type Zona = { id: string; lat: number; lng: number; radius: number; category: string };

const WARNA_ZONA: Record<string, string> = {
  berbahaya: "#dc2626",
  rawan: "#f59e0b",
  potensi: "#eab308",
};

// Menjaga peta tetap mengikuti posisi pesepeda.
function Ikuti({ posisi, ikut }: { posisi: Titik | null; ikut: boolean }) {
  const peta = useMap();
  useEffect(() => {
    if (posisi && ikut) peta.setView([posisi.lat, posisi.lng], peta.getZoom(), { animate: true });
  }, [posisi, ikut, peta]);
  return null;
}

// Peta langsung di halaman Catat Gowes.
//
// Sebelumnya menekan Mulai Gowes hanya menjalankan pencatatan, dan pesepeda
// harus berpindah sendiri ke halaman Peta Jalur untuk melihat posisinya.
// Sekarang keduanya berjalan bersamaan dalam satu layar: angka jarak di atas,
// peta yang mengikuti di bawahnya, lengkap dengan zona rawan di sekitarnya.
export default function PetaLangsung({
  jejak, aktif,
}: { jejak: Titik[] | null; aktif: boolean }) {
  const [zona, setZona] = useState<Zona[]>([]);
  const [ikut, setIkut] = useState(true);

  // Zona rawan diambil sekali saja; datanya jarang berubah.
  useEffect(() => {
    let hidup = true;
    (async () => {
      try {
        const sb = createClient();
        const { data } = await sb.from("danger_zones").select("id,lat,lng,radius,category");
        if (hidup && data) {
          setZona(data.map((z) => ({
            id: String(z.id), lat: Number(z.lat), lng: Number(z.lng),
            radius: Number(z.radius) || 60, category: String(z.category || "rawan"),
          })));
        }
      } catch { /* peta tetap berguna tanpa zona */ }
    })();
    return () => { hidup = false; };
  }, []);

  const titik = jejak && jejak.length ? jejak : null;
  const kini = titik ? titik[titik.length - 1] : null;
  const pusat: [number, number] = kini ? [kini.lat, kini.lng] : [2.8450, 117.3680];
  const malam = new Date().getHours() < 6 || new Date().getHours() >= 18;

  return (
    <div className="relative rounded-3xl overflow-hidden border border-white/8" style={{ height: 260 }}>
      <MapContainer center={pusat} zoom={16} style={{ height: "100%", width: "100%" }}
        zoomControl={false} attributionControl={false}>
        <TileLayer
          key={malam ? "gelap" : "terang"}
          url={malam
            ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"} />
        <Ikuti posisi={kini} ikut={ikut} />

        {zona.map((z) => (
          <Circle key={z.id} center={[z.lat, z.lng]} radius={z.radius}
            pathOptions={{
              color: WARNA_ZONA[z.category] || "#f59e0b",
              fillColor: WARNA_ZONA[z.category] || "#f59e0b",
              fillOpacity: 0.14, weight: 1.5,
            }} />
        ))}

        {titik && titik.length > 1 && (
          <Polyline positions={titik.map((t) => [t.lat, t.lng] as [number, number])}
            pathOptions={{ color: "#B4FF3A", weight: 6, opacity: 0.95 }} />
        )}

        {kini && (
          <>
            <CircleMarker center={[kini.lat, kini.lng]} radius={13}
              pathOptions={{ color: "#B4FF3A", fillColor: "#B4FF3A", fillOpacity: 0.2, weight: 1 }} />
            <CircleMarker center={[kini.lat, kini.lng]} radius={7}
              pathOptions={{ color: "#0A1410", fillColor: "#B4FF3A", fillOpacity: 1, weight: 3 }} />
          </>
        )}
      </MapContainer>

      {/* Penanda status di sudut */}
      <div className="absolute top-3 left-3 z-[500] flex items-center gap-1.5 rounded-full bg-black/55 backdrop-blur px-2.5 py-1 teks-terang">
        <span className={`w-1.5 h-1.5 rounded-full ${aktif ? "bg-lime-400 animate-pulse" : "bg-slate-500"}`} />
        <span className="eyebrow !text-[8px] text-white">{aktif ? "Peta mengikuti" : "Dijeda"}</span>
      </div>

      <button onClick={() => setIkut((v) => !v)}
        className="absolute top-3 right-3 z-[500] rounded-full bg-black/55 backdrop-blur px-3 py-1.5 eyebrow !text-[8px] text-white teks-terang">
        {ikut ? "Kunci: aktif" : "Kunci: mati"}
      </button>

      {!kini && (
        <div className="absolute inset-0 z-[400] flex items-center justify-center bg-black/45 pointer-events-none teks-terang">
          <p className="text-[12px] text-white/85">Menunggu sinyal GPS…</p>
        </div>
      )}
    </div>
  );
}
