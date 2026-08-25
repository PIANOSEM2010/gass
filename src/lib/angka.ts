// Pembulatan angka untuk tampilan.
// Elevasi hasil hitungan GPS bisa keluar sebagai 2.3219071966; angka sepanjang
// itu tidak berarti apa-apa bagi pengguna dan merusak tata letak. Aturannya:
// paling banyak 4 angka penting, dan bila berkoma paling banyak 2 desimal.
export function angkaRingkas(n: number): string {
  if (!Number.isFinite(n)) return "0";
  const a = Math.abs(n);
  if (a >= 1000) return String(Math.round(n));
  if (a >= 100) return String(Math.round(n));
  if (a >= 10) return (Math.round(n * 10) / 10).toString().replace(".", ",");
  return (Math.round(n * 100) / 100).toString().replace(".", ",");
}

// Elevasi selalu bilangan bulat meter: pecahan meter tidak bermakna di sepeda.
export function meter(n: number): string {
  return String(Math.round(Number.isFinite(n) ? n : 0));
}
