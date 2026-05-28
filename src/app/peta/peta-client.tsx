"use client";
import { useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { createClient } from "@/lib/supabase/client";
import { Navigation, X, MapPin, Loader2 } from "lucide-react";

type RoadMarker = {
  id: string;
  type: "safe" | "danger" | "parking" | "rest";
  lat: number;
  lng: number;
  title: string;
  description: string | null;
  approved: boolean;
};

const TYPE_CONFIG = {
  safe:    { color: "#16a34a", emoji: "✅", label: "Jalan Aman" },
  danger:  { color: "#dc2626", emoji: "⚠️", label: "Jalan Berbahaya" },
  parking: { color: "#2563eb", emoji: "🅿️", label: "Parkir Sepeda" },
  rest:    { color: "#ca8a04", emoji: "🌳", label: "Tempat Istirahat" },
};

function makeIcon(type: keyof typeof TYPE_CONFIG) {
  const { color, emoji } = TYPE_CONFIG[type];
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="background:${color};width:32px;height:32px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:16px;">${emoji}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

function makeRouteIcon(letter: "A" | "B") {
  const color = letter === "A" ? "#7c3aed" : "#0ea5e9";
  return L.divIcon({
    className: "route-marker",
    html: `<div style="background:${color};width:36px;height:36px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 3px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;"><span style="transform:rotate(45deg);color:white;font-weight:bold;font-size:14px;">${letter}</span></div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
  });
}

type Mode = "view" | "report" | "route-a" | "route-b";

function ClickHandler({
  mode,
  onPickReport,
  onPickRouteA,
  onPickRouteB,
}: {
  mode: Mode;
  onPickReport: (lat: number, lng: number) => void;
  onPickRouteA: (lat: number, lng: number) => void;
  onPickRouteB: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      if (mode === "report") onPickReport(lat, lng);
      else if (mode === "route-a") onPickRouteA(lat, lng);
      else if (mode === "route-b") onPickRouteB(lat, lng);
    },
  });
  return null;
}

export default function PetaClient({
  initialMarkers,
  userId,
}: {
  initialMarkers: RoadMarker[];
  userId: string | null;
}) {
  const [markers] = useState<RoadMarker[]>(initialMarkers);
  const [filter, setFilter] = useState<keyof typeof TYPE_CONFIG | "all">("all");
  const [mode, setMode] = useState<Mode>("view");

  // Report state
  const [showForm, setShowForm] = useState(false);
  const [pickedCoords, setPickedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [formType, setFormType] = useState<keyof typeof TYPE_CONFIG>("safe");
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [saving, setSaving] = useState(false);

  // Route state
  const [pointA, setPointA] = useState<{ lat: number; lng: number } | null>(null);
  const [pointB, setPointB] = useState<{ lat: number; lng: number } | null>(null);
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [routeInfo, setRouteInfo] = useState<{ distance: number; duration: number } | null>(null);
  const [routing, setRouting] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function handlePickReport(lat: number, lng: number) {
    if (!userId) {
      setError("Login dulu untuk menambah penanda.");
      setTimeout(() => setError(""), 3000);
      return;
    }
    setPickedCoords({ lat, lng });
    setShowForm(true);
  }

  function handlePickRouteA(lat: number, lng: number) {
    setPointA({ lat, lng });
    setMode("route-b");
  }

  function handlePickRouteB(lat: number, lng: number) {
    setPointB({ lat, lng });
    setMode("view");
    if (pointA) calculateRoute(pointA, { lat, lng });
  }

  async function calculateRoute(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
    setRouting(true);
    setError("");
    try {
      const apiKey = process.env.NEXT_PUBLIC_ORS_API_KEY;
      if (!apiKey) throw new Error("API key OpenRouteService belum di-setup");

      const url = `https://api.openrouteservice.org/v2/directions/cycling-regular?api_key=${apiKey}&start=${a.lng},${a.lat}&end=${b.lng},${b.lat}`;
      const res = await fetch(url);
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error?.message || "Routing gagal");
      }
      const data = await res.json();
      const coords = data.features[0].geometry.coordinates as [number, number][];
      // ORS returns [lng, lat], Leaflet wants [lat, lng]
      const flipped: [number, number][] = coords.map(([lng, lat]) => [lat, lng]);
      setRouteCoords(flipped);
      const summary = data.features[0].properties.summary;
      setRouteInfo({ distance: summary.distance, duration: summary.duration });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Routing gagal");
      setTimeout(() => setError(""), 5000);
    } finally {
      setRouting(false);
    }
  }

  function clearRoute() {
    setPointA(null);
    setPointB(null);
    setRouteCoords([]);
    setRouteInfo(null);
    setMode("view");
  }

  function startRouting() {
    clearRoute();
    setMode("route-a");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pickedCoords || !userId) return;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("road_markers").insert({
      user_id: userId,
      type: formType,
      lat: pickedCoords.lat,
      lng: pickedCoords.lng,
      title: formTitle,
      description: formDesc,
      approved: false,
    });
    setSaving(false);
    if (error) {
      setError(error.message);
    } else {
      setSuccess("Laporan terkirim! Menunggu verifikasi admin.");
      setShowForm(false);
      setFormTitle("");
      setFormDesc("");
      setPickedCoords(null);
      setMode("view");
      setTimeout(() => setSuccess(""), 4000);
    }
  }

  const filteredMarkers = filter === "all" ? markers : markers.filter((m) => m.type === filter);

  return (
    <div className="relative h-[calc(100vh-9rem)] w-full">
      {/* Top filter chips */}
      <div className="absolute top-2 left-2 right-2 z-[1000] flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setFilter("all")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap shadow ${filter === "all" ? "bg-gray-900 text-white" : "bg-white text-gray-700"}`}
        >
          Semua ({markers.length})
        </button>
        {(Object.keys(TYPE_CONFIG) as Array<keyof typeof TYPE_CONFIG>).map((type) => {
          const count = markers.filter((m) => m.type === type).length;
          return (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap shadow ${filter === type ? "text-white" : "bg-white text-gray-700"}`}
              style={filter === type ? { background: TYPE_CONFIG[type].color } : {}}
            >
              {TYPE_CONFIG[type].emoji} {TYPE_CONFIG[type].label} ({count})
            </button>
          );
        })}
      </div>

      {/* Mode indicator banner */}
      {mode === "route-a" && (
        <div className="absolute top-14 left-2 right-2 z-[1000] bg-purple-600 text-white px-3 py-2 rounded-lg shadow text-sm font-medium flex items-center justify-between">
          <span>📍 Tap titik <strong>ASAL</strong> di peta</span>
          <button onClick={() => setMode("view")}><X size={16} /></button>
        </div>
      )}
      {mode === "route-b" && (
        <div className="absolute top-14 left-2 right-2 z-[1000] bg-sky-600 text-white px-3 py-2 rounded-lg shadow text-sm font-medium flex items-center justify-between">
          <span>📍 Tap titik <strong>TUJUAN</strong> di peta</span>
          <button onClick={() => setMode("view")}><X size={16} /></button>
        </div>
      )}
      {routing && (
        <div className="absolute top-14 left-2 right-2 z-[1000] bg-white px-3 py-2 rounded-lg shadow text-sm flex items-center gap-2">
          <Loader2 size={16} className="animate-spin" />
          Menghitung rute pesepeda...
        </div>
      )}
      {error && (
        <div className="absolute top-14 left-2 right-2 z-[1000] bg-red-600 text-white text-sm px-3 py-2 rounded-lg shadow">{error}</div>
      )}
      {success && (
        <div className="absolute top-14 left-2 right-2 z-[1000] bg-green-600 text-white text-sm px-3 py-2 rounded-lg shadow">{success}</div>
      )}

      {/* Route info card */}
      {routeInfo && (
        <div className="absolute bottom-24 left-2 right-2 z-[1000] bg-white rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Navigation size={18} className="text-purple-600" />
              <span className="font-semibold text-sm">Rute Pesepeda</span>
            </div>
            <button onClick={clearRoute} className="text-gray-400 hover:text-red-600">
              <X size={18} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-500">Jarak</p>
              <p className="font-semibold">{(routeInfo.distance / 1000).toFixed(2)} km</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Estimasi waktu</p>
              <p className="font-semibold">{Math.round(routeInfo.duration / 60)} menit</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            ⚠️ Perhatikan marker merah (jalan berbahaya) di sepanjang rute.
          </p>
        </div>
      )}

      {/* Bottom action bar */}
      <div className="absolute bottom-2 left-2 right-2 z-[1000] flex gap-2">
        {mode === "view" && !routeInfo && (
          <>
            <button
              onClick={startRouting}
              className="flex-1 bg-purple-600 text-white py-2.5 rounded-lg font-medium shadow text-sm flex items-center justify-center gap-2"
            >
              <Navigation size={16} />
              Cari Rute Pesepeda
            </button>
            {userId && (
              <button
                onClick={() => setMode("report")}
                className="flex-1 bg-white border border-gray-300 text-gray-700 py-2.5 rounded-lg font-medium shadow text-sm flex items-center justify-center gap-2"
              >
                <MapPin size={16} />
                Lapor Jalur
              </button>
            )}
          </>
        )}
        {mode === "report" && (
          <div className="flex-1 bg-white rounded-lg p-3 shadow text-xs text-gray-700 text-center flex items-center justify-between">
            <span>💡 Tap titik di peta untuk lapor</span>
            <button onClick={() => setMode("view")} className="text-red-600 font-medium">Batal</button>
          </div>
        )}
      </div>

      {/* Map */}
      <MapContainer center={[2.8450, 117.3680]} zoom={14} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler
          mode={mode}
          onPickReport={handlePickReport}
          onPickRouteA={handlePickRouteA}
          onPickRouteB={handlePickRouteB}
        />

        {filteredMarkers.map((m) => (
          <Marker key={m.id} position={[m.lat, m.lng]} icon={makeIcon(m.type)}>
            <Popup>
              <div className="text-sm">
                <p className="font-semibold mb-1">{TYPE_CONFIG[m.type].emoji} {m.title}</p>
                {m.description && <p className="text-gray-600 text-xs">{m.description}</p>}
              </div>
            </Popup>
          </Marker>
        ))}

        {pointA && <Marker position={[pointA.lat, pointA.lng]} icon={makeRouteIcon("A")} />}
        {pointB && <Marker position={[pointB.lat, pointB.lng]} icon={makeRouteIcon("B")} />}

        {routeCoords.length > 0 && (
          <Polyline positions={routeCoords} color="#7c3aed" weight={5} opacity={0.8} />
        )}
      </MapContainer>

      {/* Report form modal */}
      {showForm && pickedCoords && (
        <div className="absolute inset-0 z-[1001] bg-black/50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-md max-h-[80vh] overflow-y-auto">
            <h2 className="font-bold text-lg mb-1">Lapor Jalur Baru</h2>
            <p className="text-xs text-gray-500 mb-4">📍 {pickedCoords.lat.toFixed(5)}, {pickedCoords.lng.toFixed(5)}</p>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Jenis</label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(TYPE_CONFIG) as Array<keyof typeof TYPE_CONFIG>).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFormType(type)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium border-2 ${formType === type ? "border-gray-900 bg-gray-50" : "border-gray-200"}`}
                    >
                      {TYPE_CONFIG[type].emoji} {TYPE_CONFIG[type].label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Judul</label>
                <input
                  type="text" required value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Catatan (opsional)</label>
                <textarea
                  value={formDesc} onChange={(e) => setFormDesc(e.target.value)} rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setPickedCoords(null); setMode("view"); }}
                  className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit" disabled={saving}
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg font-medium disabled:bg-gray-400"
                >
                  {saving ? "Mengirim..." : "Kirim"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}