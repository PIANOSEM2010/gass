// Utilitas routing bersama untuk Peta & Navigasi latar belakang.
// Rute memakai OpenRouteService dengan urutan percobaan:
//   1) profil "cycling-road" preferensi "fastest"  -> jalan utama beraspal, rute cepat & modern
//   2) profil "cycling-regular" preferensi "recommended" -> cadangan bila cycling-road gagal
// Keduanya tetap menghormati avoid_polygons (zona rawan) bila diberikan.

export type Pt = { lat: number; lng: number };

export type NavStep = {
  type: number;
  name: string;
  distance: number;
  instruction: string;
  lat: number;
  lng: number;
};

export type RouteResult = {
  coords: [number, number][];
  info: { distance: number; duration: number };
  steps: NavStep[];
  profile: string;
};

export type AvoidGeometry = { type: "MultiPolygon"; coordinates: number[][][][] };

export type ZoneLike = { category: "potensi" | "rawan" | "berbahaya"; lat: number; lng: number; radius: number };

// Zona yang dihindari rute: hanya kategori serius (kuning "potensi" tidak dihindari)
const AVOID_CATEGORIES: ZoneLike["category"][] = ["rawan", "berbahaya"];

export const MANEUVER_TEXT: Record<number, string> = {
  0: "Belok kiri", 1: "Belok kanan", 2: "Belok tajam ke kiri", 3: "Belok tajam ke kanan",
  4: "Serong kiri", 5: "Serong kanan", 6: "Lurus terus", 7: "Masuk bundaran",
  8: "Keluar bundaran", 9: "Putar balik", 10: "Tiba di tujuan", 11: "Mulai perjalanan",
  12: "Tetap di kiri", 13: "Tetap di kanan",
};

export function buildInstruction(type: number, name: string): string {
  if (type === 10) return "Tiba di tujuan";
  if (type === 11) return "Mulai perjalanan";
  const hasRoad = name && name !== "-";
  if (type === 6) return hasRoad ? `Lurus di ${name}` : "Lurus terus";
  const base = MANEUVER_TEXT[type] || "Lanjutkan";
  return hasRoad ? `${base} ke ${name}` : base;
}

export function haversineM(a: Pt, b: Pt): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export function formatDist(m: number): string {
  if (m >= 1000) return `${(m / 1000).toFixed(1)} km`;
  if (m > 30) return `${Math.round(m / 10) * 10} m`;
  return `${Math.round(m)} m`;
}

// Ubah lingkaran zona (lat,lng,radius meter) jadi cincin poligon GeoJSON [lng,lat]
function circleRing(lat: number, lng: number, radiusM: number, points = 16): number[][] {
  const ring: number[][] = [];
  const dLat = radiusM / 111320;
  const dLng = radiusM / (111320 * Math.cos((lat * Math.PI) / 180));
  for (let i = 0; i <= points; i++) {
    const t = (i / points) * 2 * Math.PI;
    ring.push([lng + dLng * Math.cos(t), lat + dLat * Math.sin(t)]);
  }
  return ring;
}

// Gabungkan zona berbahaya jadi satu MultiPolygon untuk avoid_polygons ORS
export function buildAvoidMultiPolygon(zones: ZoneLike[]): AvoidGeometry | null {
  const toAvoid = zones.filter((z) => AVOID_CATEGORIES.includes(z.category) && z.radius > 0);
  if (toAvoid.length === 0) return null;
  return { type: "MultiPolygon", coordinates: toAvoid.map((z) => [circleRing(z.lat, z.lng, z.radius)]) };
}

async function requestORS(
  profile: string,
  preference: string,
  a: Pt,
  b: Pt,
  avoidPolygons?: AvoidGeometry | null
): Promise<RouteResult> {
  const apiKey = process.env.NEXT_PUBLIC_ORS_API_KEY;
  if (!apiKey) throw new Error("API key OpenRouteService belum di-setup");

  const reqBody: Record<string, unknown> = {
    coordinates: [[a.lng, a.lat], [b.lng, b.lat]],
    preference,
  };
  if (avoidPolygons) reqBody.options = { avoid_polygons: avoidPolygons };

  const res = await fetch(`https://api.openrouteservice.org/v2/directions/${profile}/geojson`, {
    method: "POST",
    headers: {
      Authorization: apiKey,
      "Content-Type": "application/json",
      Accept: "application/geo+json",
    },
    body: JSON.stringify(reqBody),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => null);
    throw new Error(errData?.error?.message || "Routing gagal");
  }
  const data = await res.json();
  const raw = data.features[0].geometry.coordinates as [number, number][];
  const coords: [number, number][] = raw.map(([lng, lat]) => [lat, lng]);
  const summary = data.features[0].properties.summary;

  const steps: NavStep[] = [];
  const segments = data.features[0].properties.segments || [];
  for (const seg of segments) {
    for (const st of seg.steps || []) {
      const idx = st.way_points?.[0] ?? 0;
      const pt = coords[idx] || coords[0];
      steps.push({
        type: st.type,
        name: st.name && st.name !== "-" ? st.name : "",
        distance: st.distance,
        instruction: buildInstruction(st.type, st.name),
        lat: pt[0],
        lng: pt[1],
      });
    }
  }
  return { coords, info: { distance: summary.distance, duration: summary.duration }, steps, profile };
}

// Rute pesepeda: coba profil jalan raya (cepat & mengikuti jalan utama beraspal) dulu,
// baru jatuh ke profil sepeda biasa bila gagal (mis. titik jauh dari jaringan jalan raya).
export async function fetchRoute(a: Pt, b: Pt, avoidPolygons?: AvoidGeometry | null): Promise<RouteResult> {
  try {
    return await requestORS("cycling-road", "fastest", a, b, avoidPolygons);
  } catch {
    return await requestORS("cycling-regular", "recommended", a, b, avoidPolygons);
  }
}

function pickIndonesianVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => /google/i.test(v.name) && /^id/i.test(v.lang)) ||
    voices.find((v) => v.lang === "id-ID") ||
    voices.find((v) => v.lang && v.lang.toLowerCase().startsWith("id")) ||
    voices.find((v) => /indonesia/i.test(v.name)) ||
    null
  );
}

export function speak(text: string) {
  try {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;
    const run = () => {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "id-ID";
      const v = pickIndonesianVoice();
      if (v) u.voice = v;
      u.rate = 1.02;
      synth.cancel();
      synth.speak(u);
    };
    if (synth.getVoices().length === 0) {
      synth.onvoiceschanged = () => { synth.onvoiceschanged = null; run(); };
      synth.getVoices();
    } else {
      run();
    }
  } catch {
    /* ignore */
  }
}