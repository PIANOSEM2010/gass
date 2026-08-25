"use client";
import { MapContainer, TileLayer, Polyline, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";

type Pt = { lat: number; lng: number };

const startIcon = L.divIcon({
  className: "",
  html: `<div style="width:16px;height:16px;background:#ffffff;border:3px solid #16a34a;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});
const endIcon = L.divIcon({
  className: "",
  html: `<div style="width:16px;height:16px;background:#fde047;border:3px solid #ca8a04;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

function FitBounds({ path }: { path: Pt[] }) {
  const map = useMap();
  useEffect(() => {
    if (path.length > 1) {
      map.fitBounds(L.latLngBounds(path.map((p) => [p.lat, p.lng] as [number, number])), { padding: [25, 25] });
    } else if (path.length === 1) {
      map.setView([path[0].lat, path[0].lng], 15);
    }
  }, [path, map]);
  return null;
}

export default function RouteMap({ path }: { path: Pt[] }) {
  const center: [number, number] = path.length ? [path[0].lat, path[0].lng] : [2.845, 117.368];
  const line = path.map((p) => [p.lat, p.lng] as [number, number]);
  return (
    <MapContainer center={center} zoom={14} scrollWheelZoom={false} style={{ height: "100%", width: "100%" }}>
      <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {line.length > 1 && <Polyline positions={line} pathOptions={{ color: "#fb923c", weight: 5, opacity: 0.9 }} />}
      {line.length > 0 && <Marker position={line[0]} icon={startIcon} />}
      {line.length > 1 && <Marker position={line[line.length - 1]} icon={endIcon} />}
      <FitBounds path={path} />
    </MapContainer>
  );
}