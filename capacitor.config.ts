import type { CapacitorConfig } from "@capacitor/cli";

// Aplikasi Android BUG = shell native yang memuat situs Netlify.
// Keuntungan: setiap deploy web otomatis terpakai di aplikasi tanpa build APK ulang.
// GPS latar belakang ditangani plugin native (lihat src/lib/native-geo.ts).
const config: CapacitorConfig = {
  appId: "id.bulungan.bug",
  appName: "BUG",
  webDir: "cap-www",
  server: {
    url: "https://gass-bulungann.netlify.app",
    cleartext: false,
  },
};

export default config;
