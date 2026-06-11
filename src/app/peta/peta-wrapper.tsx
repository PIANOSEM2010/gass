"use client";
import dynamic from "next/dynamic";

const PetaClient = dynamic(() => import("./peta-client"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[calc(100vh-9rem)] text-gray-500">
      Memuat peta...
    </div>
  ),
});

type Marker = {
  id: string;
  type: "safe" | "danger" | "parking" | "rest";
  lat: number;
  lng: number;
  title: string;
  description: string | null;
  approved: boolean;
};

type Zone = {
  id: string;
  category: "potensi" | "rawan" | "berbahaya";
  title: string;
  description: string | null;
  lat: number;
  lng: number;
  radius: number;
};

type Landmark = {
  id: string;
  category: "belanja" | "kuliner" | "kantor" | "kesehatan" | "bengkel" | "lainnya";
  title: string;
  description: string | null;
  lat: number;
  lng: number;
};

export default function PetaWrapper({
  initialMarkers,
  initialZones,
  initialLandmarks,
  userId,
}: {
  initialMarkers: Marker[];
  initialZones: Zone[];
  initialLandmarks: Landmark[];
  userId: string | null;
}) {
  return (
    <PetaClient
      initialMarkers={initialMarkers}
      initialZones={initialZones}
      initialLandmarks={initialLandmarks}
      userId={userId}
    />
  );
}