// Helper berbagi (share) untuk BUG.
//
// Masalah: navigator.share TIDAK ADA di WebView aplikasi Android, jadi tombol
// "Bagikan" diam saja di aplikasi. Solusi: di aplikasi pakai plugin native
// @capacitor/share (share sheet Android asli), di browser pakai
// navigator.share, dan kalau keduanya tak ada → salin ke clipboard / unduh.
import { registerPlugin } from "@capacitor/core";
import { isNativeApp } from "@/lib/native-geo";

interface SharePlugin {
  share(options: { title?: string; text?: string; url?: string; files?: string[]; dialogTitle?: string }): Promise<unknown>;
}
interface FilesystemPlugin {
  writeFile(options: { path: string; data: string; directory: string }): Promise<{ uri: string }>;
}

let shareCache: SharePlugin | null = null;
let fsCache: FilesystemPlugin | null = null;
function getShare(): SharePlugin {
  if (!shareCache) shareCache = registerPlugin<SharePlugin>("Share");
  return shareCache;
}
function getFs(): FilesystemPlugin {
  if (!fsCache) fsCache = registerPlugin<FilesystemPlugin>("Filesystem");
  return fsCache;
}

// Bagikan teks + link. Return: "shared" | "copied" | "failed"
export async function shareText(opts: { title?: string; text?: string; url?: string }): Promise<"shared" | "copied" | "failed"> {
  // Aplikasi Android → share sheet native
  if (isNativeApp()) {
    try {
      await getShare().share({
        title: opts.title,
        text: opts.text,
        url: opts.url,
        dialogTitle: opts.title || "Bagikan",
      });
      return "shared";
    } catch {
      // user membatalkan share sheet juga masuk sini — coba fallback copy
    }
  } else if (typeof navigator !== "undefined" && navigator.share) {
    // Browser modern → Web Share API
    try {
      await navigator.share({ title: opts.title, text: opts.text, url: opts.url });
      return "shared";
    } catch {
      /* dibatalkan / tak didukung → fallback */
    }
  }

  // Fallback: salin ke clipboard
  const toCopy = [opts.text, opts.url].filter(Boolean).join("\n");
  if (toCopy && typeof navigator !== "undefined" && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(toCopy);
      return "copied";
    } catch {
      /* ignore */
    }
  }
  return "failed";
}

// Bagikan gambar dari data URL (kartu share catat gowes).
// Return: "shared" | "downloaded" | "failed"
export async function shareImageDataUrl(
  dataUrl: string,
  filename: string,
  text?: string
): Promise<"shared" | "downloaded" | "failed"> {
  // Aplikasi Android → tulis file sementara lalu share sheet native
  if (isNativeApp()) {
    try {
      const base64 = dataUrl.split(",")[1] || "";
      const { uri } = await getFs().writeFile({
        path: filename,
        data: base64,
        directory: "CACHE",
      });
      await getShare().share({
        title: text || "Bagikan",
        text,
        files: [uri],
        dialogTitle: "Bagikan kartu gowes",
      });
      return "shared";
    } catch {
      return "failed";
    }
  }

  // Browser: coba Web Share API dengan file
  try {
    const blob = await (await fetch(dataUrl)).blob();
    const file = new File([blob], filename, { type: blob.type || "image/png" });
    if (typeof navigator !== "undefined" && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], text });
      return "shared";
    }
  } catch {
    /* dibatalkan / gagal → fallback unduh */
  }

  // Fallback: unduh file
  try {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    return "downloaded";
  } catch {
    return "failed";
  }
}
