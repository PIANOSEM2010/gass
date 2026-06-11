"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { createClient } from "@/lib/supabase/client";
import { Navigation, X, MapPin, Loader2, LocateFixed, Search, Layers, Store } from "lucide-react";

type RoadMarker = {
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

type SearchResult = {
  display_name: string;
  lat: string;
  lon: string;
};

const TYPE_CONFIG = {
  safe:    { color: "#16a34a", emoji: "✅", label: "Jalan Aman" },
  danger:  { color: "#dc2626", emoji: "⚠️", label: "Jalan Berbahaya" },
  parking: { color: "#2563eb", emoji: "🅿️", label: "Parkir Sepeda" },
  rest:    { color: "#ca8a04", emoji: "🌳", label: "Tempat Istirahat" },
};

const ZONE_CONFIG = {
  potensi:   { label: "Potensi Rawan", color: "#eab308" },
  rawan:     { label: "Rawan Kecelakaan", color: "#f97316" },
  berbahaya: { label: "Area Berbahaya", color: "#dc2626" },
};

const LANDMARK_CONFIG = {
  belanja:   { label: "Perbelanjaan", emoji: "🛒", color: "#2563eb" },
  kuliner:   { label: "Kafe & Kuliner", emoji: "☕", color: "#c2410c" },
  kantor:    { label: "Kantor & Layanan", emoji: "🏢", color: "#475569" },
  kesehatan: { label: "Kesehatan", emoji: "🏥", color: "#dc2626" },
  bengkel:   { label: "Bengkel Sepeda", emoji: "🔧", color: "#0d9488" },
  lainnya:   { label: "Lainnya", emoji: "📌", color: "#64748b" },
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

function makeLandmarkIcon(category: keyof typeof LANDMARK_CONFIG) {
  const { color, emoji } = LANDMARK_CONFIG[category];
  return L.divIcon({
    className: "landmark-marker",
    html: `<div style="background:${color};width:30px;height:30px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;"><span style="transform:rotate(45deg);font-size:14px;">${emoji}</span></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
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

const searchPinIcon = L.divIcon({
  className: "search-pin",
  html: `<div style="background:#db2777;width:34px;height:34px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 3px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;"><span style="transform:rotate(45deg);color:white;font-size:16px;">📍</span></div>`,
  iconSize: [34, 34],
  iconAnchor: [17, 34],
});

const userLocationIcon = L.divIcon({
  className: "user-location-marker",
  html: `<div style="width:18px;height:18px;background:#1d4ed8;border-radius:50%;border:3px solid white;box-shadow:0 0 0 2px rgba(29,78,216,0.35),0 1px 4px rgba(0,0,0,0.4);"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function getCurrentLocationOnce(): Promise<{ lat: number; lng: number; accuracy: number }> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Browser tidak mendukung GPS"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      (err) => reject(new Error(err.message || "Gagal mengambil lokasi")),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    );
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

function FlyToSearch({ target }: { target: { lat: number; lng: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lng], 16);
  }, [target, map]);
  return null;
}

function FitRoute({ coords }: { coords: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (coords.length > 1) {
      map.fitBounds(L.latLngBounds(coords), { padding: [60, 60] });
    }
  }, [coords, map]);
  return null;
}

function LocationLayer({
  tracking,
  follow,
  onPosition,
  onError,
  onUserDrag,
}: {
  tracking: boolean;
  follow: boolean;
  onPosition: (pos: { lat: number; lng: number; accuracy: number }) => void;
  onError: (msg: string) => void;
  onUserDrag: () => void;
}) {
  const map = useMapEvents({
    dragstart() {
      onUserDrag();
    },
  });
  const watchIdRef = useRef<number | null>(null);
  const firstFixRef = useRef(true);
  const lastPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const followRef = useRef(follow);
  followRef.current = follow;

  useEffect(() => {
    if (!tracking) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      firstFixRef.current = true;
      lastPosRef.current = null;
      return;
    }
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      onError("Browser tidak mendukung GPS");
      return;
    }
    firstFixRef.current = true;
    const id = navigator.geolocation.watchPosition(
      (p) => {
        const pos = {
          lat: p.coords.latitude,
          lng: p.coords.longitude,
          accuracy: p.coords.accuracy,
        };
        lastPosRef.current = { lat: pos.lat, lng: pos.lng };
        onPosition(pos);
        if (firstFixRef.current) {
          map.flyTo([pos.lat, pos.lng], 16);
          firstFixRef.current = false;
        } else if (followRef.current) {
          map.panTo([pos.lat, pos.lng], { animate: true });
        }
      },
      (err) => {
        onError(err.message || "Gagal mengambil lokasi");
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 }
    );
    watchIdRef.current = id;
    return () => {
      navigator.geolocation.clearWatch(id);
      watchIdRef.current = null;
    };
  }, [tracking, map, onPosition, onError]);

  useEffect(() => {
    if (follow && tracking && lastPosRef.current) {
      map.flyTo([lastPosRef.current.lat, lastPosRef.current.lng], 16);
    }
  }, [follow, tracking, map]);

  return null;
}

export default function PetaClient({
  initialMarkers,
  initialZones,
  initialLandmarks,
  userId,
}: {
  initialMarkers: RoadMarker[];
  initialZones: Zone[];
  initialLandmarks: Landmark[];
  userId: string | null;
}) {
  const [markers] = useState<RoadMarker[]>(initialMarkers);
  const [zones] = useState<Zone[]>(initialZones);
  const [landmarks] = useState<Landmark[]>(initialLandmarks);
  const [showZones, setShowZones] = useState(true);
  const [showLandmarks, setShowLandmarks] = useState(true);
  const [filter, setFilter] = useState<keyof typeof TYPE_CONFIG | "all">("all");
  const [mode, setMode] = useState<Mode>("view");

  // Lokasi saat ini
  const [userPos, setUserPos] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [tracking, setTracking] = useState(false);
  const [follow, setFollow] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [searchTarget, setSearchTarget] = useState<{ lat: number; lng: number } | null>(null);
  const [searchLabel, setSearchLabel] = useState("");
  const searchDebounce = useRef<NodeJS.Timeout | null>(null);

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
  const [routeSource, setRouteSource] = useState<"manual" | "search">("manual");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleLocError = useCallback((msg: string) => {
    setError(msg);
    setTimeout(() => setError(""), 5000);
  }, []);

  function onSearchChange(value: string) {
    setSearchQuery(value);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    if (value.trim().length < 3) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    searchDebounce.current = setTimeout(() => runSearch(value), 500);
  }

  async function runSearch(query: string) {
    setSearching(true);
    setShowResults(true);
    try {
      const viewbox = "116.8,3.3,117.9,2.3";
      const url =
        `https://nominatim.openstreetmap.org/search?format=json&limit=6&accept-language=id` +
        `&viewbox=${viewbox}&bounded=0&q=${encodeURIComponent(query)}`;
      const res = await fetch(url, { headers: { "Accept-Language": "id" } });
      if (!res.ok) throw new Error("Pencarian gagal");
      const data: SearchResult[] = await res.json();
      setSearchResults(data);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }

  async function selectSearchResult(r: SearchResult) {
    const lat = parseFloat(r.lat);
    const lng = parseFloat(r.lon);
    const target = { lat, lng };
    setSearchTarget(target);
    setSearchLabel(r.display_name);
    setSearchQuery(r.display_name.split(",")[0]);
    setShowResults(false);
    setSearchResults([]);
    await routeFromCurrentLocation(target);
  }

  async function routeFromCurrentLocation(dest: { lat: number; lng: number }) {
    let origin = userPos ? { lat: userPos.lat, lng: userPos.lng } : null;

    if (!origin) {
      setRouting(true);
      setError("");
      try {
        const fix = await getCurrentLocationOnce();
        setUserPos(fix);
        origin = { lat: fix.lat, lng: fix.lng };
      } catch {
        setRouting(false);
        setError("Aktifkan izin lokasi untuk rute otomatis, atau pakai 'Cari Rute Pesepeda' untuk pilih titik manual.");
        setTimeout(() => setError(""), 6000);
        return;
      }
    }

    setRouteSource("search");
    setPointA(origin);
    setPointB(dest);
    await calculateRoute(origin, dest);
  }

  function clearSearch() {
    setSearchQuery("");
    setSearchResults([]);
    setShowResults(false);
    setSearchTarget(null);
    setSearchLabel("");
    if (routeSource === "search") {
      setPointA(null);
      setPointB(null);
      setRouteCoords([]);
      setRouteInfo(null);
    }
  }

  function handleLocateClick() {
    if (!tracking) {
      setUserPos(null);
      setTracking(true);
      setFollow(true);
    } else if (!follow) {
      setFollow(true);
    } else {
      setTracking(false);
      setFollow(false);
      setUserPos(null);
    }
  }

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
    if (routeSource === "search") {
      setSearchTarget(null);
      setSearchLabel("");
      setSearchQuery("");
    }
  }

  function startRouting() {
    clearRoute();
    setRouteSource("manual");
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
      {/* Search bar */}
      <div className="absolute top-2 left-2 right-2 z-[1100]">
        <div className="relative">
          <div className="flex items-center bg-white rounded-full shadow-lg px-3 py-2">
            <Search size={18} className="text-gray-400 flex-shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onFocus={() => { if (searchResults.length > 0) setShowResults(true); }}
              placeholder="Cari tempat tujuan..."
              className="flex-1 px-2 text-sm outline-none bg-transparent"
            />
            {searching && <Loader2 size={16} className="animate-spin text-gray-400 flex-shrink-0" />}
            {searchQuery && !searching && (
              <button onClick={clearSearch} className="text-gray-400 hover:text-gray-700 flex-shrink-0">
                <X size={18} />
              </button>
            )}
          </div>

          {showResults && (
            <div className="absolute top-full mt-1 left-0 right-0 bg-white rounded-xl shadow-xl overflow-hidden max-h-72 overflow-y-auto">
              {searching && searchResults.length === 0 && (
                <div className="px-4 py-3 text-sm text-gray-500">Mencari...</div>
              )}
              {!searching && searchResults.length === 0 && (
                <div className="px-4 py-3 text-sm text-gray-500">Tidak ada hasil ditemukan.</div>
              )}
              {searchResults.map((r, i) => (
                <button
                  key={`${r.lat}-${r.lon}-${i}`}
                  onClick={() => selectSearchResult(r)}
                  className="w-full text-left px-4 py-2.5 hover:bg-gray-50 border-b border-gray-100 last:border-0 flex items-start gap-2"
                >
                  <MapPin size={16} className="text-pink-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700 leading-snug">{r.display_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top filter chips */}
      <div className="absolute top-14 left-2 right-2 z-[1000] flex gap-2 overflow-x-auto pb-2">
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
        <div className="absolute top-[6.5rem] left-2 right-2 z-[1000] bg-purple-600 text-white px-3 py-2 rounded-lg shadow text-sm font-medium flex items-center justify-between">
          <span>📍 Tap titik <strong>ASAL</strong> di peta</span>
          <button onClick={() => setMode("view")}><X size={16} /></button>
        </div>
      )}
      {mode === "route-b" && (
        <div className="absolute top-[6.5rem] left-2 right-2 z-[1000] bg-sky-600 text-white px-3 py-2 rounded-lg shadow text-sm font-medium flex items-center justify-between">
          <span>📍 Tap titik <strong>TUJUAN</strong> di peta</span>
          <button onClick={() => setMode("view")}><X size={16} /></button>
        </div>
      )}
      {routing && (
        <div className="absolute top-[6.5rem] left-2 right-2 z-[1000] bg-white px-3 py-2 rounded-lg shadow text-sm flex items-center gap-2">
          <Loader2 size={16} className="animate-spin" />
          Menyiapkan rute pesepeda...
        </div>
      )}
      {error && (
        <div className="absolute top-[6.5rem] left-2 right-2 z-[1000] bg-red-600 text-white text-sm px-3 py-2 rounded-lg shadow">{error}</div>
      )}
      {success && (
        <div className="absolute top-[6.5rem] left-2 right-2 z-[1000] bg-green-600 text-white text-sm px-3 py-2 rounded-lg shadow">{success}</div>
      )}

      {/* Legenda zona rawan */}
      {showZones && mode === "view" && !routeInfo && zones.length > 0 && (
        <div className="absolute bottom-16 left-2 z-[1000] bg-white/95 rounded-lg shadow-lg px-3 py-2 text-xs">
          <p className="font-semibold text-gray-700 mb-1">Zona Rawan</p>
          {(Object.keys(ZONE_CONFIG) as Array<keyof typeof ZONE_CONFIG>).map((cat) => (
            <div key={cat} className="flex items-center gap-1.5 mb-0.5 last:mb-0">
              <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: ZONE_CONFIG[cat].color }} />
              <span className="text-gray-600">{ZONE_CONFIG[cat].label}</span>
            </div>
          ))}
        </div>
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
          {routeSource === "search" && searchLabel && (
            <p className="text-xs text-gray-500 mb-2 truncate">
              Dari lokasimu → <span className="font-medium text-gray-700">{searchLabel.split(",")[0]}</span>
            </p>
          )}
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
            ⚠️ Perhatikan zona rawan & marker merah di sepanjang rute.
          </p>
        </div>
      )}

      {/* Tombol kanan bawah: landmark + zona + lokasi */}
      <div className="absolute bottom-16 right-3 z-[1000] flex flex-col gap-2">
        <button
          onClick={() => setShowLandmarks((s) => !s)}
          className={`w-11 h-11 rounded-full shadow-lg flex items-center justify-center transition-colors ${
            showLandmarks ? "bg-indigo-600 text-white" : "bg-white text-gray-700"
          }`}
          aria-label="Tampilkan landmark"
          title="Landmark"
        >
          <Store size={20} />
        </button>
        <button
          onClick={() => setShowZones((s) => !s)}
          className={`w-11 h-11 rounded-full shadow-lg flex items-center justify-center transition-colors ${
            showZones ? "bg-orange-500 text-white" : "bg-white text-gray-700"
          }`}
          aria-label="Tampilkan zona rawan"
          title="Zona rawan"
        >
          <Layers size={20} />
        </button>
        <button
          onClick={handleLocateClick}
          className={`w-11 h-11 rounded-full shadow-lg flex items-center justify-center transition-colors ${
            tracking ? (follow ? "bg-blue-600 text-white" : "bg-white text-blue-600") : "bg-white text-gray-700"
          }`}
          aria-label="Lokasi saya"
          title="Lokasi saya"
        >
          <LocateFixed size={20} />
        </button>
      </div>

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
        <LocationLayer
          tracking={tracking}
          follow={follow}
          onPosition={setUserPos}
          onError={handleLocError}
          onUserDrag={() => setFollow(false)}
        />
        {routeCoords.length === 0 && <FlyToSearch target={searchTarget} />}
        <FitRoute coords={routeCoords} />

        {/* Zona rawan (di bawah marker & rute) */}
        {showZones && zones.map((z) => (
          <Circle
            key={z.id}
            center={[z.lat, z.lng]}
            radius={z.radius}
            pathOptions={{
              color: ZONE_CONFIG[z.category].color,
              fillColor: ZONE_CONFIG[z.category].color,
              fillOpacity: 0.2,
              weight: 2,
            }}
          >
            <Popup>
              <div className="text-sm max-w-[220px]">
                <p className="font-semibold mb-1">
                  <span style={{ color: ZONE_CONFIG[z.category].color }}>●</span> {z.title}
                </p>
                <p className="text-xs text-gray-500 mb-1">{ZONE_CONFIG[z.category].label}</p>
                {z.description && <p className="text-gray-600 text-xs">{z.description}</p>}
              </div>
            </Popup>
          </Circle>
        ))}

        {/* Landmark */}
        {showLandmarks && landmarks.map((lm) => (
          <Marker key={lm.id} position={[lm.lat, lm.lng]} icon={makeLandmarkIcon(lm.category)}>
            <Popup>
              <div className="text-sm max-w-[220px]">
                <p className="font-semibold mb-1">{LANDMARK_CONFIG[lm.category].emoji} {lm.title}</p>
                <p className="text-xs text-gray-500 mb-1">{LANDMARK_CONFIG[lm.category].label}</p>
                {lm.description && <p className="text-gray-600 text-xs">{lm.description}</p>}
              </div>
            </Popup>
          </Marker>
        ))}

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

        {routeSource === "manual" && pointA && <Marker position={[pointA.lat, pointA.lng]} icon={makeRouteIcon("A")} />}
        {routeSource === "manual" && pointB && <Marker position={[pointB.lat, pointB.lng]} icon={makeRouteIcon("B")} />}

        {routeCoords.length > 0 && (
          <Polyline positions={routeCoords} color="#7c3aed" weight={5} opacity={0.8} />
        )}

        {searchTarget && (
          <Marker position={[searchTarget.lat, searchTarget.lng]} icon={searchPinIcon}>
            <Popup>
              <div className="text-sm max-w-[200px]">
                <p className="font-semibold mb-1">📍 Tujuan</p>
                <p className="text-gray-600 text-xs">{searchLabel}</p>
              </div>
            </Popup>
          </Marker>
        )}

        {userPos && (
          <>
            <Circle
              center={[userPos.lat, userPos.lng]}
              radius={userPos.accuracy}
              pathOptions={{ color: "#1d4ed8", fillColor: "#3b82f6", fillOpacity: 0.12, weight: 1 }}
            />
            <Marker position={[userPos.lat, userPos.lng]} icon={userLocationIcon} zIndexOffset={1000} />
          </>
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