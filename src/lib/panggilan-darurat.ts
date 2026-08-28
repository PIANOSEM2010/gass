import { registerPlugin, Capacitor } from "@capacitor/core";

// Jembatan ke plugin Android "PanggilanDarurat".
//
// Di dalam APK, panggilan ke 110 benar-benar berangkat sendiri lewat izin
// CALL_PHONE. Di peramban, izin itu tidak ada artinya: aturan sistem operasi
// tidak mengizinkan halaman web memulai panggilan, jadi yang bisa dilakukan
// hanyalah membuka aplikasi telepon dengan nomor sudah terisi. Karena itu
// fungsi di bawah selalu menyampaikan apa yang sebenarnya terjadi, supaya
// tampilan tidak menjanjikan sesuatu yang tidak dilakukan.
type PluginPanggilan = {
  status(): Promise<{ didukung: boolean; diizinkan: boolean }>;
  mintaIzin(): Promise<{ diizinkan: boolean }>;
  telepon(opsi: { nomor: string }): Promise<{ langsung: boolean }>;
};

const Plugin = registerPlugin<PluginPanggilan>("PanggilanDarurat");

export function diAplikasi(): boolean {
  try { return Capacitor.isNativePlatform(); } catch { return false; }
}

export async function statusPanggilan(): Promise<{ didukung: boolean; diizinkan: boolean }> {
  if (!diAplikasi()) return { didukung: false, diizinkan: false };
  try { return await Plugin.status(); } catch { return { didukung: false, diizinkan: false }; }
}

export async function mintaIzinPanggilan(): Promise<boolean> {
  if (!diAplikasi()) return false;
  try { return (await Plugin.mintaIzin()).diizinkan; } catch { return false; }
}

// Mengembalikan true bila panggilan benar-benar berangkat sendiri.
export async function teleponDarurat(nomor = "110"): Promise<boolean> {
  if (diAplikasi()) {
    try {
      const { langsung } = await Plugin.telepon({ nomor });
      return langsung;
    } catch { /* jatuh ke cara peramban di bawah */ }
  }
  window.location.href = `tel:${nomor}`;
  return false;
}
