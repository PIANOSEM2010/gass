"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { createClient } from "@/lib/supabase/client";
import {
  Navigation, X, MapPin, Loader2, LocateFixed, Search, Layers, Store, TriangleAlert,
  Sparkles, RefreshCw, Route as RouteIcon,
  Play, Square, Volume2, ShieldCheck,
} from "lucide-react";
import { useNav, maneuverIcon } from "../nav-provider";
import {
  type NavStep, type AvoidGeometry, type LoopRoute,
  fetchRoute, fetchLoopRoute, buildAvoidNearRoute, formatDist,
} from "@/lib/routing";

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
  category: "belanja" | "kuliner" | "kantor" | "kesehatan" | "bengkel" | "lainnya" | "sekolah";
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
  sekolah:   { label: "Sekolah", emoji: "🎓", color: "#7c3aed" },
};

const TRAFFIC_LEGEND = [
  { color: "#FFCE43", label: "Gangguan ringan" },
  { color: "#FF8939", label: "Gangguan sedang" },
  { color: "#F40000", label: "Gangguan berat" },
  { color: "#C1272D", label: "Penutupan jalan" },
];

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

// Cluster group dari leaflet.markercluster (vanilla, hanya butuh Leaflet)
type ClusterGroup = L.FeatureGroup & { addLayers: (layers: L.Layer[]) => void };

// Layer landmark dengan clustering: titik berdekatan digabung jadi lingkaran
// berangka, memisah saat di-zoom. Bikin peta tetap ringan walau ratusan titik.
function LandmarkClusterLayer({
  landmarks,
  onNavigate,
}: {
  landmarks: Landmark[];
  onNavigate: (lm: Landmark) => void;
}) {
  const map = useMap();
  const onNavRef = useRef(onNavigate);
  onNavRef.current = onNavigate;

  useEffect(() => {
    const group = (L as unknown as {
      markerClusterGroup: (opts?: Record<string, unknown>) => ClusterGroup;
    }).markerClusterGroup({
      maxClusterRadius: 55,
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      chunkedLoading: true,
    });

    const built = landmarks.map((lm) => {
      const cfg = LANDMARK_CONFIG[lm.category];
      const marker = L.marker([lm.lat, lm.lng], { icon: makeLandmarkIcon(lm.category) });

      const container = document.createElement("div");
      container.style.maxWidth = "220px";
      container.style.fontSize = "14px";

      const title = document.createElement("p");
      title.style.cssText = "font-weight:600;margin:0 0 2px;";
      title.textContent = `${cfg.emoji} ${lm.title}`;
      container.appendChild(title);

      const label = document.createElement("p");
      label.style.cssText = "font-size:12px;color:#6b7280;margin:0 0 4px;";
      label.textContent = cfg.label;
      container.appendChild(label);

      if (lm.description) {
        const desc = document.createElement("p");
        desc.style.cssText = "font-size:12px;color:#4b5563;margin:0 0 8px;";
        desc.textContent = lm.description;
        container.appendChild(desc);
      }

      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = "🧭 Arahkan ke Lokasi Ini";
      btn.style.cssText =
        "width:100%;background:#7c3aed;color:#fff;padding:8px 10px;border-radius:8px;font-weight:600;font-size:12px;border:none;cursor:pointer;";
      btn.addEventListener("click", () => {
        map.closePopup();
        onNavRef.current(lm);
      });
      container.appendChild(btn);

      marker.bindPopup(container);
      return marker;
    });

    group.addLayers(built);
    map.addLayer(group);

    return () => {
      map.removeLayer(group);
    };
  }, [landmarks, map]);

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

// Ikuti posisi pengguna di peta saat navigasi aktif.
// Logika navigasi (GPS, langkah, suara, reroute) kini berjalan global di NavProvider,
// sehingga tetap hidup walau pengguna membuka fitur lain.
function NavFollow({ pos }: { pos: { lat: number; lng: number } | null }) {
  const map = useMap();
  const firstRef = useRef(true);
  useEffect(() => {
    if (!pos) return;
    if (firstRef.current) {
      map.setView([pos.lat, pos.lng], 17, { animate: true });
      firstRef.current = false;
    } else {
      map.panTo([pos.lat, pos.lng], { animate: true });
    }
  }, [pos, map]);
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
  const [showTraffic, setShowTraffic] = useState(false);
  const [filter, setFilter] = useState<keyof typeof TYPE_CONFIG | "all">("all");
  const [mode, setMode] = useState<Mode>("view");

  const tomtomKey = process.env.NEXT_PUBLIC_TOMTOM_API_KEY;

  // Otomatis nyalakan GPS saat halaman peta dibuka (langsung minta izin lokasi)
  useEffect(() => {
    setTracking(true);
    setFollow(true);
  }, []);

  const [userPos, setUserPos] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [tracking, setTracking] = useState(false);
  const [follow, setFollow] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [searchTarget, setSearchTarget] = useState<{ lat: number; lng: number } | null>(null);
  const [searchLabel, setSearchLabel] = useState("");
  const searchDebounce = useRef<NodeJS.Timeout | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [pickedCoords, setPickedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [formType, setFormType] = useState<keyof typeof TYPE_CONFIG>("safe");
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [saving, setSaving] = useState(false);

  const [pointA, setPointA] = useState<{ lat: number; lng: number } | null>(null);
  const [pointB, setPointB] = useState<{ lat: number; lng: number } | null>(null);
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [routeInfo, setRouteInfo] = useState<{ distance: number; duration: number } | null>(null);
  const [routeSteps, setRouteSteps] = useState<NavStep[]>([]);
  const [routing, setRouting] = useState(false);
  const [routeSource, setRouteSource] = useState<"manual" | "search">("manual");

  // --- Fitur Rekomendasi Rute Gowes (round trip) ---
  const [showRecommend, setShowRecommend] = useState(false);
  const [recoTargetKm, setRecoTargetKm] = useState(10);
  const [recoLoading, setRecoLoading] = useState(false);
  const [recoRoute, setRecoRoute] = useState<LoopRoute | null>(null);
  const [recoError, setRecoError] = useState("");
  const recoSeedRef = useRef(0);

  // Navigasi kini global (NavProvider di root layout): tetap jalan saat buka fitur lain
  const nav = useNav();
  const navigating = nav.navigating;
  const navInfo = nav.navInfo;

  const [avoidDanger, setAvoidDanger] = useState(true);
  const [avoidGeom, setAvoidGeom] = useState<AvoidGeometry | null>(null);
  const [routeNote, setRouteNote] = useState<{ type: "safe" | "fallback"; count: number } | null>(null);
  // Cache hasil rute per (asal, tujuan, mode aman) — bikin toggle Rute Aman instan
  const routeCacheRef = useRef<Map<string, {
    coords: [number, number][];
    info: { distance: number; duration: number };
    steps: NavStep[];
    note: { type: "safe" | "fallback"; count: number } | null;
    avoid: AvoidGeometry | null;
  }>>(new Map());

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleLocError = useCallback((msg: string) => {
    setError(msg);
    setTimeout(() => setError(""), 5000);
  }, []);

  // Saat halaman peta dibuka lagi ketika navigasi masih berjalan:
  // ambil kembali rute dari provider agar tampilan tersambung
  useEffect(() => {
    if (nav.navigating && nav.route && routeCoords.length === 0) {
      setRouteCoords(nav.route.coords);
      setRouteSteps(nav.route.steps);
      setRouteInfo(nav.route.info);
      setPointB(nav.route.dest);
      if (nav.route.label) {
        setSearchLabel(nav.route.label);
        setRouteSource("search");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nav.navigating]);

  // Toast "tiba di tujuan" dari provider
  const lastArriveRef = useRef(nav.arrivedAt);
  useEffect(() => {
    if (nav.arrivedAt && nav.arrivedAt !== lastArriveRef.current) {
      lastArriveRef.current = nav.arrivedAt;
      setSuccess("Kamu telah tiba di tujuan 🎉");
      setTimeout(() => setSuccess(""), 6000);
    }
  }, [nav.arrivedAt]);

  // Saat provider melakukan reroute, perbarui juga rute yang tampil di peta
  useEffect(() => {
    if (nav.navigating && nav.route) {
      setRouteCoords(nav.route.coords);
      setRouteSteps(nav.route.steps);
      setRouteInfo(nav.route.info);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nav.route]);

  // Marker posisi pengguna di peta mengikuti GPS milik provider saat navigasi
  useEffect(() => {
    if (nav.navigating && nav.userPos) setUserPos(nav.userPos);
  }, [nav.navigating, nav.userPos]);


  // Buat rute rekomendasi melingkar dari lokasi pengguna
  async function generateRecommendation(newSeed: boolean) {
    setRecoError("");
    let origin = userPos ? { lat: userPos.lat, lng: userPos.lng } : null;
    if (!origin) {
      setRecoLoading(true);
      try {
        const fix = await getCurrentLocationOnce();
        setUserPos(fix);
        origin = { lat: fix.lat, lng: fix.lng };
      } catch {
        setRecoLoading(false);
        setRecoError("Aktifkan GPS dulu untuk membuat rute dari lokasimu.");
        return;
      }
    }
    if (newSeed || recoSeedRef.current === 0) {
      recoSeedRef.current = Math.floor(Math.random() * 100000);
    }
    setRecoLoading(true);
    try {
      // Hormati zona berbahaya seperti rute biasa (mode aman)
      const avoid = avoidDanger
        ? buildAvoidNearRoute(zones, markers, origin, origin).geometry
        : null;
      const loop = await fetchLoopRoute(origin, recoTargetKm, recoSeedRef.current, avoid);
      setRecoRoute(loop);
    } catch (e) {
      setRecoRoute(null);
      setRecoError(e instanceof Error ? e.message : "Gagal membuat rute");
    } finally {
      setRecoLoading(false);
    }
  }

  // Mulai navigasi mengikuti rute rekomendasi (loop kembali ke titik awal)
  function navigateRecommendation() {
    if (!recoRoute || !userPos) return;
    const dest = { lat: userPos.lat, lng: userPos.lng };
    nav.begin(
      { coords: recoRoute.coords, info: { distance: recoRoute.distance, duration: recoRoute.duration }, steps: [], dest, label: `Rute Gowes ${(recoRoute.distance / 1000).toFixed(1)} km` },
      avoidDanger ? buildAvoidNearRoute(zones, markers, dest, dest).geometry : null
    );
    setShowRecommend(false);
  }

  function toggleTraffic() {
    if (!showTraffic && !tomtomKey) {
      setError("TomTom API key belum di-setup. Tambahkan NEXT_PUBLIC_TOMTOM_API_KEY di .env.local lalu restart server.");
      setTimeout(() => setError(""), 6000);
      return;
    }
    setShowTraffic((s) => !s);
  }

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
      const viewbox = "115.4,4.6,118.1,2.4";
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

  // Dipanggil dari tombol "Arahkan ke Lokasi Ini" pada popup landmark
  function navigateToLandmark(lm: Landmark) {
    routeFromCurrentLocation({ lat: lm.lat, lng: lm.lng });
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
      setRouteSteps([]);
      if (nav.navigating) nav.stop();
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

  async function calculateRoute(
    a: { lat: number; lng: number },
    b: { lat: number; lng: number },
    avoidEnabled: boolean = avoidDanger
  ) {
    // Cek cache dulu: kalau pasangan titik + mode ini pernah dihitung, pakai langsung
    const cacheKey = `${a.lat.toFixed(6)},${a.lng.toFixed(6)}|${b.lat.toFixed(6)},${b.lng.toFixed(6)}|${avoidEnabled ? 1 : 0}`;
    const cached = routeCacheRef.current.get(cacheKey);
    if (cached) {
      setRouteCoords(cached.coords);
      setRouteInfo(cached.info);
      setRouteSteps(cached.steps);
      setRouteNote(cached.note);
      setAvoidGeom(cached.avoid);
      setError("");
      return;
    }

    setRouting(true);
    setError("");
    setRouteNote(null);
    // Hanya zona rawan/berbahaya & marker "Jalan Berbahaya" DI SEKITAR jalur A->B
    // yang dihindari — jadi jumlah yang ditampilkan sesuai kenyataan di lapangan
    const { geometry: avoid, count } = avoidEnabled
      ? buildAvoidNearRoute(zones, markers, a, b)
      : { geometry: null, count: 0 };
    setAvoidGeom(avoid);
    try {
      if (avoid) {
        try {
          const { coords, info, steps } = await fetchRoute(a, b, avoid);
          setRouteCoords(coords);
          setRouteInfo(info);
          setRouteSteps(steps);
          const note = { type: "safe" as const, count };
          setRouteNote(note);
          routeCacheRef.current.set(cacheKey, { coords, info, steps, note, avoid });
          return;
        } catch {
          /* gagal dengan avoidance, lanjut coba rute biasa */
        }
      }
      const { coords, info, steps } = await fetchRoute(a, b, null);
      setRouteCoords(coords);
      setRouteInfo(info);
      setRouteSteps(steps);
      let note: { type: "safe" | "fallback"; count: number } | null = null;
      if (avoid) note = { type: "fallback", count };
      else if (avoidEnabled) note = { type: "safe", count: 0 };
      setRouteNote(note);
      routeCacheRef.current.set(cacheKey, { coords, info, steps, note, avoid });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Routing gagal");
      setTimeout(() => setError(""), 5000);
    } finally {
      setRouting(false);
    }
  }

  function toggleAvoid() {
    const next = !avoidDanger;
    setAvoidDanger(next);
    if (!pointA || !pointB) return;
    // Kalau mode aman DIMATIKAN padahal tidak ada apa pun yang dihindari,
    // rutenya pasti sama — tidak perlu memanggil server lagi
    if (!next && !avoidGeom) {
      setRouteNote(null);
      return;
    }
    calculateRoute(pointA, pointB, next);
  }

  function clearRoute() {
    setPointA(null);
    setPointB(null);
    setRouteCoords([]);
    setRouteInfo(null);
    setRouteSteps([]);
    if (nav.navigating) nav.stop();
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

  function startNavigation() {
    if (!pointB || routeSteps.length === 0 || !routeInfo) return;
    setTracking(false);
    setFollow(false);
    // Serahkan rute ke provider global: GPS + suara + reroute jalan terus
    // walau pengguna membuka fitur lain (pop-up mini akan tampil di sana)
    nav.begin(
      {
        coords: routeCoords,
        steps: routeSteps,
        info: routeInfo,
        dest: pointB,
        label: routeSource === "search" ? searchLabel : "",
      },
      avoidDanger ? avoidGeom : null
    );
  }

  function stopNavigation() {
    nav.stop();
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
  const showLegend = mode === "view" && !routeInfo && !navigating && ((showTraffic && !!tomtomKey) || (showZones && zones.length > 0));

  return (
    <div className="relative h-[calc(100vh-9rem)] w-full">
      {/* Banner navigasi */}
      {navigating && navInfo && (
        <div className="absolute top-2 left-2 right-2 z-[1100] bg-gradient-to-r from-purple-600 to-violet-700 text-white rounded-2xl shadow-lg px-4 py-3 flex items-center gap-3">
          <div className="flex-shrink-0">{maneuverIcon(navInfo.type, 32)}</div>
          <div className="flex-1 min-w-0">
            <p className="font-bold leading-tight">{navInfo.instruction}</p>
            {navInfo.distanceToNext >= 0 && (
              <p className="text-sm opacity-90">{formatDist(navInfo.distanceToNext)} lagi</p>
            )}
          </div>
          <Volume2 size={18} className="opacity-80 flex-shrink-0" />
        </div>
      )}

      {/* Search bar */}
      {!navigating && (
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
      )}

      {/* Top filter chips */}
      {!navigating && (
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
      )}

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
        <div className="absolute top-[6.5rem] left-2 right-2 z-[1200] bg-red-600 text-white text-sm px-3 py-2 rounded-lg shadow">{error}</div>
      )}
      {success && (
        <div className="absolute top-[6.5rem] left-2 right-2 z-[1200] bg-green-600 text-white text-sm px-3 py-2 rounded-lg shadow">{success}</div>
      )}

      {/* Legenda gabungan (lalu lintas + zona) */}
      {showLegend && (
        <div className="absolute bottom-16 left-2 z-[1000] flex flex-col gap-2 max-w-[60%]">
          {showTraffic && tomtomKey && (
            <div className="bg-white/95 rounded-lg shadow-lg px-3 py-2 text-xs">
              <p className="font-semibold text-gray-700 mb-1">Insiden Jalan</p>
              {TRAFFIC_LEGEND.map((t) => (
                <div key={t.label} className="flex items-center gap-1.5 mb-0.5 last:mb-0">
                  <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: t.color }} />
                  <span className="text-gray-600">{t.label}</span>
                </div>
              ))}
            </div>
          )}
          {showZones && zones.length > 0 && (
            <div className="bg-white/95 rounded-lg shadow-lg px-3 py-2 text-xs">
              <p className="font-semibold text-gray-700 mb-1">Zona Rawan</p>
              {(Object.keys(ZONE_CONFIG) as Array<keyof typeof ZONE_CONFIG>).map((cat) => (
                <div key={cat} className="flex items-center gap-1.5 mb-0.5 last:mb-0">
                  <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: ZONE_CONFIG[cat].color }} />
                  <span className="text-gray-600">{ZONE_CONFIG[cat].label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Route info card */}
      {routeInfo && !navigating && (
        <div className="absolute bottom-24 left-2 right-2 z-[1000] bg-white rounded-2xl p-4 shadow-xl border border-gray-100">
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
          <button
            type="button"
            onClick={toggleAvoid}
            className="w-full mt-3 flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-gray-200"
          >
            <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <ShieldCheck size={16} className={avoidDanger ? "text-green-600" : "text-gray-400"} />
              Rute Aman (hindari titik & zona rawan)
            </span>
            <span className={`relative w-10 h-6 rounded-full transition-colors flex-shrink-0 ${avoidDanger ? "bg-green-600" : "bg-gray-300"}`}>
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${avoidDanger ? "translate-x-4" : ""}`} />
            </span>
          </button>
          {routeNote && (
            <p className={`text-xs mt-2 ${routeNote.type === "safe" ? "text-green-700" : "text-amber-600"}`}>
              {routeNote.type === "safe"
                ? routeNote.count > 0
                  ? `Rute menghindari ${routeNote.count} titik & zona berbahaya di sekitar jalur.`
                  : "Tidak ada titik atau zona berbahaya di sekitar jalur ini."
                : `Rute aman penuh tidak ditemukan (${routeNote.count} titik/zona di sekitar jalur), ditampilkan rute terbaik yang tersedia.`}
            </p>
          )}
          {routeSteps.length > 0 && (
            <button
              onClick={startNavigation}
              className="w-full mt-3 bg-green-600 text-white py-2.5 rounded-lg font-semibold flex items-center justify-center gap-2"
            >
              <Play size={18} /> Mulai Navigasi
            </button>
          )}
          <p className="text-xs text-gray-500 mt-2">
            ⚠️ Perhatikan zona rawan & marker merah di sepanjang rute.
          </p>
        </div>
      )}

      {/* Panel Rekomendasi Rute Gowes */}
      {showRecommend && !navigating && (
        <div className="absolute inset-0 z-[1400] flex items-end" onClick={() => setShowRecommend(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative w-full bg-white rounded-t-3xl p-4 pb-6 shadow-2xl max-h-[80%] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-lime-500 to-emerald-600 text-white flex items-center justify-center">
                  <Sparkles size={18} />
                </span>
                <div>
                  <p className="font-bold text-gray-900 leading-tight">Rekomendasi Rute Gowes</p>
                  <p className="text-xs text-gray-500 leading-tight">Rute melingkar, kembali ke titik awalmu</p>
                </div>
              </div>
              <button onClick={() => setShowRecommend(false)} className="p-1.5 rounded-lg text-gray-400 active:bg-gray-100" aria-label="Tutup">
                <X size={18} />
              </button>
            </div>

            {/* Slider jarak */}
            <div className="mt-4">
              <div className="flex items-baseline justify-between mb-1.5">
                <span className="text-sm font-medium text-gray-600">Target jarak</span>
                <span className="display-title text-3xl text-emerald-600 leading-none">{recoTargetKm} <span className="text-lg">km</span></span>
              </div>
              <input
                type="range" min={2} max={50} step={1} value={recoTargetKm}
                onChange={(e) => setRecoTargetKm(Number(e.target.value))}
                className="w-full accent-emerald-600"
              />
              <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                <span>2 km</span><span>25 km</span><span>50 km</span>
              </div>
              {/* Preset cepat */}
              <div className="flex gap-2 mt-3">
                {[5, 10, 20, 30].map((v) => (
                  <button key={v} onClick={() => setRecoTargetKm(v)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border-2 transition-colors ${recoTargetKm === v ? "border-emerald-600 bg-emerald-50 text-emerald-700" : "border-gray-200 text-gray-600"}`}>
                    {v} km
                  </button>
                ))}
              </div>
            </div>

            {/* Hasil */}
            <div className="mt-4">
              {recoLoading ? (
                <div className="flex items-center justify-center gap-2 py-8 text-gray-500 text-sm">
                  <Loader2 size={18} className="animate-spin" /> Merancang rute {recoTargetKm} km…
                </div>
              ) : recoError ? (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3 text-center">{recoError}</div>
              ) : recoRoute ? (
                <div className="bg-gradient-to-br from-emerald-50 to-lime-50 border border-emerald-100 rounded-2xl p-4">
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-emerald-700/70 font-semibold">Jarak rute</p>
                      <p className="display-title text-3xl text-emerald-700 leading-tight">{(recoRoute.distance / 1000).toFixed(1)}<span className="text-base"> km</span></p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-emerald-700/70 font-semibold">Estimasi waktu</p>
                      <p className="display-title text-3xl text-emerald-700 leading-tight">{Math.round(recoRoute.duration / 60)}<span className="text-base"> mnt</span></p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-sm text-gray-400 py-6">Atur jarak lalu buat rute</div>
              )}
            </div>

            {/* Aksi */}
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => generateRecommendation(true)}
                disabled={recoLoading}
                className="flex-1 bg-white border-2 border-emerald-600 text-emerald-700 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 transition"
              >
                <RefreshCw size={16} /> {recoRoute ? "Cari Lagi" : "Buat Rute"}
              </button>
              {recoRoute && (
                <button
                  onClick={navigateRecommendation}
                  className="flex-1 bg-gradient-to-r from-emerald-600 to-lime-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 active:scale-95 transition"
                >
                  <Navigation size={16} /> Mulai
                </button>
              )}
            </div>
            <p className="text-[11px] text-gray-400 text-center mt-3">
              Rute mengikuti jalan pesepeda dan menghindari zona rawan bila mode aman aktif.
            </p>
          </div>
        </div>
      )}

      {/* Tombol kanan bawah */}
      {!navigating && !routeInfo && (
        <div className="absolute bottom-16 right-3 z-[1000] flex flex-col gap-2">
          <button
            onClick={() => { setShowRecommend(true); if (!recoRoute) generateRecommendation(false); }}
            className="w-11 h-11 rounded-full shadow-lg flex items-center justify-center bg-gradient-to-br from-lime-500 to-emerald-600 text-white active:scale-90 transition"
            aria-label="Rekomendasi rute gowes"
            title="Rekomendasi rute gowes"
          >
            <Sparkles size={20} />
          </button>
          <button
            onClick={toggleTraffic}
            className={`w-11 h-11 rounded-full shadow-lg flex items-center justify-center transition-colors ${
              showTraffic && tomtomKey ? "bg-rose-600 text-white" : "bg-white text-gray-700"
            }`}
            aria-label="Tampilkan insiden jalan"
            title="Insiden & bahaya jalan"
          >
            <TriangleAlert size={20} />
          </button>
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
      )}

      {/* Bottom action bar */}
      {navigating ? (
        <div className="absolute bottom-2 left-2 right-2 z-[1000]">
          <button
            onClick={stopNavigation}
            className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 shadow-lg"
          >
            <Square size={18} /> Akhiri Navigasi
          </button>
        </div>
      ) : (
        <div className="absolute bottom-2 left-2 right-2 z-[1000] flex gap-2">
          {mode === "view" && !routeInfo && (
            <>
              <button
                onClick={startRouting}
                className="flex-1 bg-gradient-to-r from-purple-600 to-violet-600 text-white py-2.5 rounded-xl font-semibold shadow-md text-sm flex items-center justify-center gap-2"
              >
                <Navigation size={16} />
                Cari Rute Pesepeda
              </button>
              {userId && (
                <button
                  onClick={() => setMode("report")}
                  className="flex-1 bg-white border border-gray-200 text-gray-700 py-2.5 rounded-xl font-semibold shadow-md text-sm flex items-center justify-center gap-2"
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
      )}

      {/* Map */}
      <MapContainer center={[2.8450, 117.3680]} zoom={14} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {showTraffic && tomtomKey && (
          <TileLayer
            key="tomtom-incidents"
            attribution='Insiden &copy; TomTom'
            url={`https://api.tomtom.com/traffic/map/4/tile/incidents/s0/{z}/{x}/{y}.png?key=${tomtomKey}&t=-1`}
            zIndex={2}
            opacity={0.9}
          />
        )}
        <ClickHandler
          mode={mode}
          onPickReport={handlePickReport}
          onPickRouteA={handlePickRouteA}
          onPickRouteB={handlePickRouteB}
        />
        {!navigating && (
          <LocationLayer
            tracking={tracking}
            follow={follow}
            onPosition={setUserPos}
            onError={handleLocError}
            onUserDrag={() => setFollow(false)}
          />
        )}
        {showRecommend && recoRoute && recoRoute.coords.length > 1 && (
          <>
            <Polyline positions={recoRoute.coords} pathOptions={{ color: "#65a30d", weight: 6, opacity: 0.9 }} />
            <FitRoute coords={recoRoute.coords} />
          </>
        )}
        {navigating && <NavFollow pos={nav.userPos} />}
        {!navigating && routeCoords.length === 0 && <FlyToSearch target={searchTarget} />}
        {!navigating && <FitRoute coords={routeCoords} />}

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

        {showLandmarks && (
          <LandmarkClusterLayer landmarks={landmarks} onNavigate={navigateToLandmark} />
        )}

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