"use client";
import { MapContainer, TileLayer, Marker, Polyline, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { type Titik } from "@/components/jejak-rute";

const HURUF = "ABCDEFGHIJ";

function ikon(huruf: string, akhir: boolean) {
  return L.divIcon({
    className: "",
    html: `<div style="width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;
      background:${akhir ? "#B4FF3A" : "#ffffff"};color:#0A1410;font-weight:800;font-size:13px;
      border:3px solid #0A1410;box-shadow:0 2px 6px rgba(0,0,0,.4)">${huruf}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

function Ketukan({ onTambah }: { onTambah: (lat: number, lng: number) => void }) {
  useMapEvents({ click(e) { onTambah(e.latlng.lat, e.latlng.lng); } });
  return null;
}

export default function PetaTitik({
  titik, onTambah,
}: { titik: Titik[]; onTambah: (lat: number, lng: number) => void }) {
  const pusat: [number, number] = titik.length
    ? [titik[0].lat, titik[0].lng]
    : [2.8450, 117.3680];

  return (
    <div className="h-64 rounded-2xl overflow-hidden border border-white/10">
      <MapContainer center={pusat} zoom={14} style={{ height: "100%", width: "100%" }}>
        <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Ketukan onTambah={onTambah} />
        {titik.length > 1 && (
          <Polyline positions={titik.map((t) => [t.lat, t.lng] as [number, number])}
            pathOptions={{ color: "#B4FF3A", weight: 5, opacity: 0.9 }} />
        )}
        {titik.map((t, i) => (
          <Marker key={i} position={[t.lat, t.lng]}
            icon={ikon(HURUF[i], i === titik.length - 1 && titik.length > 1)} />
        ))}
      </MapContainer>
    </div>
  );
}
