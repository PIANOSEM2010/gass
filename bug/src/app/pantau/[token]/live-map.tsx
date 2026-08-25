"use client";
import { MapContainer, TileLayer, Marker, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";

const liveIcon = L.divIcon({
  className: "",
  html: `<div style="width:18px;height:18px;background:#0d9488;border:3px solid white;border-radius:50%;box-shadow:0 0 0 6px rgba(13,148,136,0.25),0 1px 4px rgba(0,0,0,0.4)"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => { map.setView([lat, lng], map.getZoom() || 16, { animate: true }); }, [lat, lng, map]);
  return null;
}

export default function LiveMap({ lat, lng, accuracy }: { lat: number; lng: number; accuracy?: number | null }) {
  return (
    <MapContainer center={[lat, lng]} zoom={16} scrollWheelZoom={true} style={{ height: "100%", width: "100%" }}>
      <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {accuracy ? <Circle center={[lat, lng]} radius={accuracy} pathOptions={{ color: "#0d9488", fillColor: "#14b8a6", fillOpacity: 0.12, weight: 1 }} /> : null}
      <Marker position={[lat, lng]} icon={liveIcon} />
      <Recenter lat={lat} lng={lng} />
    </MapContainer>
  );
}