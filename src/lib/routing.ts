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

export type MarkerLike = { type: string; lat: number; lng: number };

// Jarak titik P ke ruas garis A-B dalam meter (proyeksi equirectangular,
// cukup akurat untuk skala kabupaten)
function distToSegmentM(p: Pt, a: Pt, b: Pt): number {
  const latRef = ((a.lat + b.lat) / 2) * (Math.PI / 180);
  const mPerLat = 111320;
  const mPerLng = 111320 * Math.cos(latRef);
  const px = (p.lng - a.lng) * mPerLng, py = (p.lat - a.lat) * mPerLat;
  const bx = (b.lng - a.lng) * mPerLng, by = (b.lat - a.lat) * mPerLat;
  const len2 = bx * bx + by * by;
  let t = len2 === 0 ? 0 : (px * bx + py * by) / len2;
  t = Math.max(0, Math.min(1, t));
  const dx = px - t * bx, dy = py - t * by;
  return Math.sqrt(dx * dx + dy * dy);
}

// Radius hindar untuk marker "Jalan Berbahaya" (titik, bukan zona) dalam meter
const DANGER_MARKER_RADIUS = 40;
// Lebar koridor kiri-kanan garis A-B yang dianggap relevan dengan perjalanan
const ROUTE_CORRIDOR_M = 700;

// Versi pintar dari avoid: hanya zona rawan/berbahaya DAN marker "danger"
// yang berada di sekitar jalur A->B yang dihindari & dihitung.
// Jadi angkanya jujur ("menghindari 5 titik"), bukan total seluruh database.
export function buildAvoidNearRoute(
  zones: ZoneLike[],
  markers: MarkerLike[],
  a: Pt,
  b: Pt
): { geometry: AvoidGeometry | null; count: number } {
  const rings: number[][][][] = [];
  let count = 0;

  for (const z of zones) {
    if (!AVOID_CATEGORIES.includes(z.category) || z.radius <= 0) continue;
    if (distToSegmentM({ lat: z.lat, lng: z.lng }, a, b) <= z.radius + ROUTE_CORRIDOR_M) {
      rings.push([circleRing(z.lat, z.lng, z.radius)]);
      count++;
    }
  }
  for (const m of markers) {
    if (m.type !== "danger") continue;
    if (distToSegmentM({ lat: m.lat, lng: m.lng }, a, b) <= DANGER_MARKER_RADIUS + ROUTE_CORRIDOR_M) {
      rings.push([circleRing(m.lat, m.lng, DANGER_MARKER_RADIUS)]);
      count++;
    }
  }

  if (rings.length === 0) return { geometry: null, count: 0 };
  return { geometry: { type: "MultiPolygon", coordinates: rings }, count };
}

const ORS_TIMEOUT_MS = 15000;

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

  // Batas waktu: jangan biarkan satu permintaan menggantung bermenit-menit
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ORS_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`https://api.openrouteservice.org/v2/directions/${profile}/geojson`, {
      method: "POST",
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/json",
        Accept: "application/geo+json",
      },
      body: JSON.stringify(reqBody),
      signal: controller.signal,
    });
  } catch (e) {
    throw e instanceof DOMException && e.name === "AbortError"
      ? new Error("Server rute lambat merespons, coba lagi")
      : e;
  } finally {
    clearTimeout(timer);
  }
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

// Rute pesepeda: DUA profil diminta BERSAMAAN (bukan berurutan) dengan batas
// waktu, lalu diambil yang berhasil — prioritas cycling-road (jalan utama, cepat).
// Sebelumnya berurutan tanpa timeout, sehingga satu permintaan yang menggantung
// membuat pengguna menunggu bermenit-menit.
export async function fetchRoute(a: Pt, b: Pt, avoidPolygons?: AvoidGeometry | null): Promise<RouteResult> {
  const [road, regular] = await Promise.allSettled([
    requestORS("cycling-road", "fastest", a, b, avoidPolygons),
    requestORS("cycling-regular", "recommended", a, b, avoidPolygons),
  ]);
  if (road.status === "fulfilled") return road.value;
  if (regular.status === "fulfilled") return regular.value;
  const reason = road.reason;
  throw reason instanceof Error ? reason : new Error("Routing gagal");
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
