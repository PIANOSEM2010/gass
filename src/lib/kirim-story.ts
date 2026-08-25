import { createClient } from "@/lib/supabase/client";

// Mengunggah kartu gowes (kanvas) sebagai Story yang tayang 24 jam.
// Dipakai halaman Riwayat dan halaman Catat Gowes.
export async function kirimKartuKeStory(canvas: HTMLCanvasElement, caption: string, activityId?: string) {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("Kamu perlu masuk dulu untuk membuat story.");

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Kartu gagal dibuat."))), "image/png");
  });

  const nama = `${user.id}/${Date.now()}-kartu.png`;
  const { error: e1 } = await sb.storage.from("story").upload(nama, blob, { contentType: "image/png", upsert: false });
  if (e1) throw new Error(`Gagal mengunggah: ${e1.message}`);

  const { data: pub } = sb.storage.from("story").getPublicUrl(nama);
  const { error: e2 } = await sb.from("stories").insert({
    user_id: user.id, image_url: pub.publicUrl, caption, activity_id: activityId ?? null,
  });
  if (e2) throw new Error(`Gagal menyimpan story: ${e2.message}`);
}
