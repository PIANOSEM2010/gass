// Abstraksi sumber GPS untuk BUG.
//
// - Di APLIKASI ANDROID (Capacitor): memakai plugin background-geolocation yang
//   menjalankan foreground service dengan notifikasi permanen, sehingga GPS
//   TETAP HIDUP walau layar mati / aplikasi di latar belakang.
// - Di BROWSER biasa: memakai navigator.geolocation seperti sebelumnya.
//
// Semua provider (gowes, pantau, navigasi) memakai startWatch() dari sini,
// jadi satu kode jalan di dua dunia.
import { Capacitor, registerPlugin } from "@capacitor/core";

export type GeoPos = {
  coords: {
    latitude: number;
    longitude: number;
    accuracy: number;
    altitude: number | null;
    speed: number | null;
  };
  timestamp: number;
};

export type WatchHandle = { stop: () => void };

export type WatchOpts = {
  // Judul & isi notifikasi permanen saat berjalan di latar belakang (khusus aplikasi)
  title: string;
  message: string;
  // Jarak minimal (meter) antar pembaruan posisi
  distanceFilter?: number;
};

type BgLocation = {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude: number | null;
  speed: number | null;
  time: number | null;
};
type BgError = { code?: string; message?: string };

interface BgGeoPlugin {
  addWatcher(
    options: {
      backgroundTitle?: string;
      backgroundMessage?: string;
      requestPermissions?: boolean;
      stale?: boolean;
      distanceFilter?: number;
    },
    callback: (position?: BgLocation, error?: BgError) => void
  ): Promise<string>;
  removeWatcher(options: { id: string }): Promise<void>;
  openSettings(): Promise<void>;
}

let bgGeoCache: BgGeoPlugin | null = null;
function getBgGeo(): BgGeoPlugin {
  if (!bgGeoCache) bgGeoCache = registerPlugin<BgGeoPlugin>("BackgroundGeolocation");
  return bgGeoCache;
}

// Apakah sedang berjalan sebagai aplikasi native (bukan browser)?
export function isNativeApp(): boolean {
  try {
    return typeof window !== "undefined" && Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

// Ubah GeolocationPosition browser menjadi bentuk GeoPos milik kita
export function toGeoPos(p: GeolocationPosition): GeoPos {
  return {
    coords: {
      latitude: p.coords.latitude,
      longitude: p.coords.longitude,
      accuracy: p.coords.accuracy,
      altitude: p.coords.altitude,
      speed: p.coords.speed,
    },
    timestamp: p.timestamp,
  };
}

// Mulai memantau posisi. Mengembalikan handle dengan .stop().
export function startWatch(
  onPos: (p: GeoPos) => void,
  onErr: (message: string) => void,
  opts: WatchOpts
): WatchHandle {
  // ----- Mode aplikasi Android: GPS native + foreground service -----
  if (isNativeApp()) {
    let watcherId: string | null = null;
    let stopped = false;

    getBgGeo()
      .addWatcher(
        {
          backgroundTitle: opts.title,
          backgroundMessage: opts.message,
          requestPermissions: true,
          stale: false,
          distanceFilter: opts.distanceFilter ?? 4,
        },
        (location, error) => {
          if (error) {
            if (error.code === "NOT_AUTHORIZED") {
              onErr("Izin lokasi ditolak. Buka pengaturan aplikasi dan izinkan akses lokasi.");
            } else {
              onErr(error.message || "Gagal mengambil lokasi GPS");
            }
            return;
          }
          if (!location) return;
          onPos({
            coords: {
              latitude: location.latitude,
              longitude: location.longitude,
              accuracy: location.accuracy,
              altitude: location.altitude,
              speed: location.speed,
            },
            timestamp: location.time ?? Date.now(),
          });
        }
      )
      .then((id) => {
        if (stopped) {
          // stop() sudah dipanggil sebelum watcher siap
          getBgGeo().removeWatcher({ id }).catch(() => { /* abaikan */ });
        } else {
          watcherId = id;
        }
      })
      .catch((e) => onErr(e instanceof Error ? e.message : "Gagal memulai GPS"));

    return {
      stop() {
        stopped = true;
        if (watcherId) {
          getBgGeo().removeWatcher({ id: watcherId }).catch(() => { /* abaikan */ });
          watcherId = null;
        }
      },
    };
  }

  // ----- Mode browser: navigator.geolocation seperti biasa -----
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    onErr("Browser tidak mendukung GPS");
    return { stop() { /* tidak ada yang perlu dihentikan */ } };
  }
  const wid = navigator.geolocation.watchPosition(
    (p) => onPos(toGeoPos(p)),
    (err) => onErr(err.message || "Gagal mengambil lokasi GPS"),
    { enableHighAccuracy: true, maximumAge: 1000, timeout: 20000 }
  );
  return {
    stop() {
      navigator.geolocation.clearWatch(wid);
    },
  };
}
