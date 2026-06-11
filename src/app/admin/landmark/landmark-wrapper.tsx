"use client";
import dynamic from "next/dynamic";

const LandmarkManager = dynamic(() => import("./landmark-manager"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-64 text-gray-500">
      Memuat peta...
    </div>
  ),
});

type Landmark = {
  id: string;
  category: "belanja" | "kuliner" | "kantor" | "kesehatan" | "bengkel" | "lainnya";
  title: string;
  description: string | null;
  lat: number;
  lng: number;
  created_by: string | null;
  created_at: string;
  author_name: string;
};

export default function LandmarkWrapper({ initialLandmarks }: { initialLandmarks: Landmark[] }) {
  return <LandmarkManager initialLandmarks={initialLandmarks} />;
}