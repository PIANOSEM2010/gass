"use client";
import { useState } from "react";
import { Siren, MapPin, Loader2, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Contact = {
  id: string;
  name: string;
  whatsapp: string;
  is_primary: boolean;
};

type Status = "idle" | "getting-location" | "sending" | "sent" | "error";

export default function SosButton({
  userId,
  userName,
  contacts,
}: {
  userId: string;
  userName: string;
  contacts: Contact[];
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [holdProgress, setHoldProgress] = useState(0);

  const primaryContact = contacts.find((c) => c.is_primary) || contacts[0];

  function getLocation(): Promise<{ lat: number; lng: number }> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Browser tidak mendukung GPS"));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => reject(new Error(err.message || "Gagal mengambil lokasi")),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    });
  }

  async function triggerSos() {
    setStatus("getting-location");
    setErrorMsg("");
    try {
      const location = await getLocation();
      setCoords(location);
      setStatus("sending");

      const mapsUrl = `https://www.google.com/maps?q=${location.lat},${location.lng}`;
      const message =
        `🚨 *SOS DARURAT — Platform BUG*\n\n` +
        `${userName} membutuhkan bantuan segera.\n\n` +
        `📍 Lokasi: ${mapsUrl}\n` +
        `Koordinat: ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}\n\n` +
        `Waktu: ${new Date().toLocaleString("id-ID")}\n\n` +
        `Pesan otomatis dari BUG (Bulungan untuk Goweser).`;

     const supabase = createClient();
      await supabase.from("sos_logs").insert({
        user_id: userId,
        lat: location.lat,
        lng: location.lng,
        message,
      });

      // Fire-and-forget: kirim email backup ke admin
      const { data: { user } } = await supabase.auth.getUser();
      fetch("/api/sos-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: location.lat,
          lng: location.lng,
          userName,
          userEmail: user?.email || null,
        }),
      }).catch((e) => console.warn("Email SOS gagal terkirim:", e));

      const waUrl = `https://wa.me/${primaryContact.whatsapp}?text=${encodeURIComponent(message)}`;
      window.open(waUrl, "_blank");

      setStatus("sent");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Terjadi kesalahan");
    }
  }

  let pressTimer: NodeJS.Timeout | null = null;
  let progressInterval: NodeJS.Timeout | null = null;

  function startHold() {
    if (status !== "idle" && status !== "error" && status !== "sent") return;
    setHoldProgress(0);
    progressInterval = setInterval(() => {
      setHoldProgress((p) => Math.min(100, p + 5));
    }, 100);
    pressTimer = setTimeout(() => {
      triggerSos();
      if (progressInterval) clearInterval(progressInterval);
    }, 2000);
  }

  function cancelHold() {
    if (pressTimer) clearTimeout(pressTimer);
    if (progressInterval) clearInterval(progressInterval);
    if (status === "idle" || status === "error") setHoldProgress(0);
  }

  if (status === "sent") {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
        <CheckCircle2 size={48} className="text-green-600 mx-auto mb-3" />
        <h2 className="font-bold text-green-800 text-lg mb-2">SOS Terkirim</h2>
        <p className="text-sm text-green-700 mb-3">
          WhatsApp telah dibuka ke kontak utama. Pastikan kamu menekan tombol kirim di WhatsApp.
        </p>
        {coords && (
          <div className="bg-white rounded-lg p-3 text-xs text-gray-600 inline-flex items-center gap-2">
            <MapPin size={14} />
            {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
          </div>
        )}
        <button
          onClick={() => { setStatus("idle"); setCoords(null); setHoldProgress(0); }}
          className="block w-full mt-4 text-sm text-green-700 underline"
        >
          Kembali ke tombol SOS
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <button
        onMouseDown={startHold}
        onMouseUp={cancelHold}
        onMouseLeave={cancelHold}
        onTouchStart={startHold}
        onTouchEnd={cancelHold}
        disabled={status === "getting-location" || status === "sending"}
        className="relative w-56 h-56 rounded-full bg-red-600 text-white shadow-2xl flex flex-col items-center justify-center select-none disabled:opacity-70 active:scale-95 transition-transform"
        style={{
          boxShadow: holdProgress > 0
            ? `0 0 0 ${holdProgress / 5}px rgba(220, 38, 38, 0.2)`
            : "0 10px 30px rgba(220, 38, 38, 0.3)",
        }}
      >
        {status === "getting-location" || status === "sending" ? (
          <>
            <Loader2 size={56} className="animate-spin mb-2" />
            <p className="text-sm font-medium">
              {status === "getting-location" ? "Mengambil lokasi..." : "Mengirim..."}
            </p>
          </>
        ) : (
          <>
            <Siren size={64} className="mb-2" />
            <p className="font-bold text-lg">SOS</p>
            <p className="text-xs mt-1 opacity-90">Tahan 2 detik</p>
          </>
        )}
      </button>

      <p className="text-xs text-gray-500 mt-6 text-center">
        Akan menghubungi: <span className="font-medium text-gray-700">{primaryContact.name}</span>
        <br />
        <span className="text-gray-400">+{primaryContact.whatsapp}</span>
      </p>

      {status === "error" && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 max-w-xs text-center">
          {errorMsg}
        </div>
      )}
    </div>
  );
}