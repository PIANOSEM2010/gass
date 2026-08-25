"use client";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";

type Report = {
  id: string; category: string; description: string;
  lat: number; lng: number; photo_url: string | null; status: string;
};

const CAT_EMOJI: Record<string, string> = {
  lubang: "🕳️", lampu: "💡", marka: "🛣️", rambu: "🚸", genangan: "💧", lainnya: "⚠️",
};
const CAT_LABEL: Record<string, string> = {
  lubang: "Jalan Berlubang", lampu: "Lampu Mati", marka: "Marka Pudar",
  rambu: "Rambu Rusak", genangan: "Genangan Air", lainnya: "Lainnya",
};
const STATUS_COLOR: Record<string, string> = {
  dilaporkan: "#f59e0b", diverifikasi: "#2563eb", diteruskan: "#7c3aed", ditangani: "#16a34a",
};
const STATUS_LABEL: Record<string, string> = {
  dilaporkan: "Dilaporkan", diverifikasi: "Diverifikasi", diteruskan: "Diteruskan ke Dinas", ditangani: "Ditangani",
};

function makeIcon(status: string, emoji: string) {
  const color = STATUS_COLOR[status] || "#6b7280";
  return L.divIcon({
    className: "",
    html: `<div style="background:${color};width:32px;height:32px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center"><span style="transform:rotate(45deg);font-size:15px">${emoji}</span></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });
}

function Fit({ reports }: { reports: Report[] }) {
  const map = useMap();
  useEffect(() => {
    if (reports.length > 1) {
      map.fitBounds(L.latLngBounds(reports.map((r) => [r.lat, r.lng] as [number, number])), { padding: [30, 30] });
    } else if (reports.length === 1) {
      map.setView([reports[0].lat, reports[0].lng], 15);
    }
  }, [reports, map]);
  return null;
}

export default function InfraMap({ reports }: { reports: Report[] }) {
  const center: [number, number] = reports.length ? [reports[0].lat, reports[0].lng] : [2.845, 117.368];
  return (
    <MapContainer center={center} zoom={13} scrollWheelZoom={false} style={{ height: "100%", width: "100%" }}>
      <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {reports.map((r) => (
        <Marker key={r.id} position={[r.lat, r.lng]} icon={makeIcon(r.status, CAT_EMOJI[r.category] || "⚠️")}>
          <Popup>
            <div style={{ maxWidth: 200 }}>
              {r.photo_url ? (
                <img src={r.photo_url} alt={r.category} style={{ width: "100%", borderRadius: 8, marginBottom: 6 }} />
              ) : null}
              <p style={{ fontWeight: 600, margin: "0 0 2px" }}>{CAT_LABEL[r.category] || "Laporan"}</p>
              <p style={{ fontSize: 12, color: STATUS_COLOR[r.status] || "#6b7280", fontWeight: 600, margin: "0 0 4px" }}>{STATUS_LABEL[r.status] || r.status}</p>
              {r.description ? <p style={{ fontSize: 12, color: "#4b5563", margin: 0 }}>{r.description}</p> : null}
            </div>
          </Popup>
        </Marker>
      ))}
      <Fit reports={reports} />
    </MapContainer>
  );
}