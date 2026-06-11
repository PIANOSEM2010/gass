"use client";
import dynamic from "next/dynamic";

const ZonaManager = dynamic(() => import("./zona-manager"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-64 text-gray-500">
      Memuat peta...
    </div>
  ),
});

type Zone = {
  id: string;
  category: "potensi" | "rawan" | "berbahaya";
  title: string;
  description: string | null;
  lat: number;
  lng: number;
  radius: number;
  created_by: string | null;
  created_at: string;
  author_name: string;
};

export default function ZonaWrapper({ initialZones }: { initialZones: Zone[] }) {
  return <ZonaManager initialZones={initialZones} />;
}