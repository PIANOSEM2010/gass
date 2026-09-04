"use client";
import { useEffect, useState } from "react";
import { namaWilayahCepat, muatWilayahPengguna } from "@/lib/wilayah";

// Menampilkan nama wilayah pengguna.
//
// Nilai dari penyimpanan peranti ditampilkan lebih dulu supaya tidak ada
// kedipan teks kosong, lalu disegarkan dari profil di latar belakang.
export default function NamaWilayah({ awalan = "" }: { awalan?: string }) {
  const [nama, setNama] = useState(awalan);

  useEffect(() => {
    setNama(namaWilayahCepat());
    void muatWilayahPengguna().then((w) => setNama(w.nama));
  }, []);

  return <>{nama}</>;
}
