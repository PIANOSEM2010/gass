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

export default function PetaWrapper({
  initialMarkers,
  userId,
}: {
  initialMarkers: Marker[];
  userId: string | null;
}) {
  return <PetaClient initialMarkers={initialMarkers} userId={userId} />;
}