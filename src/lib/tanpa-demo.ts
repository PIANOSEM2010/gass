// Menyaring perjalanan contoh, tanpa membuat halaman rusak bila kolomnya
// belum ada.
//
// Kolom `is_demo` baru ada setelah bug-data-contoh.sql dijalankan. Menyaringnya
// begitu saja membuat seluruh halaman gagal di basis data yang belum dipasang,
// dan galatnya muncul sebagai halaman kosong tanpa penjelasan. Fungsi ini
// mencoba menyaring lebih dulu; bila kolomnya memang tidak ada, kuerinya
// diulang tanpa penyaring itu.
type Hasil<T> = { data: T | null; error: { message: string } | null };

export async function tanpaDemo<T>(
  jalankan: (pakaiSaringan: boolean) => PromiseLike<Hasil<T>>,
): Promise<Hasil<T>> {
  const pertama = await jalankan(true);
  if (!pertama.error) return pertama;
  if (/is_demo/i.test(pertama.error.message)) return jalankan(false);
  return pertama;
}
