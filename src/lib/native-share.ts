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

export type ImageShareResult = { status: "shared" | "downloaded" | "failed"; error?: string };

// Bagikan gambar dari data URL (kartu share catat gowes / riwayat).
export async function shareImageDataUrl(
  dataUrl: string,
  filename: string,
  text?: string
): Promise<ImageShareResult> {
  // Aplikasi Android → tulis file sementara lalu share sheet native
  if (isNativeApp()) {
    try {
      const base64 = dataUrl.split(",")[1] || "";
      if (!base64) return { status: "failed", error: "gambar kosong" };
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
      return { status: "shared" };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // Menutup share sheet tanpa memilih juga masuk sini — itu bukan kegagalan
      if (/cancel/i.test(msg)) return { status: "shared" };
      return { status: "failed", error: msg };
    }
  }

  // Browser: coba Web Share API dengan file
  try {
    const blob = await (await fetch(dataUrl)).blob();
    const file = new File([blob], filename, { type: blob.type || "image/png" });
    if (typeof navigator !== "undefined" && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], text });
      return { status: "shared" };
    }
  } catch {
    /* dibatalkan / gagal → fallback unduh */
  }

  // Fallback: unduh file (via Blob — data URL besar bisa gagal diam-diam)
  try {
    const blob = await (await fetch(dataUrl)).blob();
    triggerBlobDownload(blob, filename);
    return { status: "downloaded" };
  } catch (e) {
    return { status: "failed", error: e instanceof Error ? e.message : String(e) };
  }
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// Unduh isi canvas sebagai PNG. Di aplikasi: lewat share sheet (pilih
// "Simpan"); di browser: unduhan Blob yang andal untuk file besar.
export async function downloadCanvasPng(
  canvas: HTMLCanvasElement,
  filename: string
): Promise<ImageShareResult> {
  if (isNativeApp()) {
    return shareImageDataUrl(canvas.toDataURL("image/png"), filename);
  }
  try {
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("canvas kosong"))), "image/png")
    );
    triggerBlobDownload(blob, filename);
    return { status: "downloaded" };
  } catch (e) {
    return { status: "failed", error: e instanceof Error ? e.message : String(e) };
  }
}
