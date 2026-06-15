"use client";
import { useState, useEffect } from "react";
import { Siren, MapPin, Loader2, CheckCircle2, WifiOff, Phone, MessageSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Contact = {
  id: string;
  name: string;
  whatsapp: string;
  is_primary: boolean;
};

type Status = "idle" | "getting-location" | "sending" | "sent" | "offline-ready" | "error";

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
  const [sosMessage, setSosMessage] = useState("");
  const [online, setOnline] = useState(true);

  const primaryContact = contacts.find((c) => c.is_primary) || contacts[0];
  const telNumber = primaryContact ? "+" + primaryContact.whatsapp.replace(/[^\d]/g, "") : "";

  useEffect(() => {
    function update() {
      setOnline(navigator.onLine);
    }
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

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

  function buildMessage(location: { lat: number; lng: number }) {
    const mapsUrl = `https://www.google.com/maps?q=${location.lat},${location.lng}`;
    return (
      `🚨 *SOS DARURAT - Platform BUG*\n\n` +
      `${userName} membutuhkan bantuan segera.\n\n` +
      `📍 Lokasi: ${mapsUrl}\n` +
      `Koordinat: ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}\n\n` +
      `Waktu: ${new Date().toLocaleString("id-ID")}\n\n` +
      `Pesan otomatis dari BUG (Bulungan untuk Goweser).`
    );
  }

  async function triggerSos() {
    setStatus("getting-location");
    setErrorMsg("");
    try {
      const location = await getLocation();
      setCoords(location);

      const message = buildMessage(location);
      setSosMessage(message);

      // OFFLINE: tidak bisa ke server. Alihkan ke SMS / telepon (jaringan seluler).
      if (!navigator.onLine) {
        setStatus("offline-ready");
        return;
      }

      setStatus("sending");

      const supabase = createClient();
      const { data: inserted, error: insertError } = await supabase
        .from("sos_logs")
        .insert({
          user_id: userId,
          lat: location.lat,
          lng: location.lng,
          message,
        })
        .select()
        .single();

      if (insertError) throw new Error(insertError.message);

      // Broadcast realtime via HTTP API (fire-and-forget)
      if (inserted) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (supabaseUrl && supabaseKey) {
          fetch(`${supabaseUrl}/realtime/v1/api/broadcast`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({
              messages: [
                {
                  topic: "sos-broadcast",
                  event: "new-sos",
                  payload: {
                    id: inserted.id,
                    user_id: userId,
                    lat: location.lat,
                    lng: location.lng,
                    created_at: inserted.created_at,
                    author_name: userName,
                  },
                  private: false,
                },
              ],
            }),
          }).catch((e) => console.warn("Broadcast SOS gagal:", e));
        }
      }

      // Email backup ke admin (fire-and-forget)
      const { data: { user } } = await supabase.auth.getUser();
      // Kirim Web Push ke pengguna lain yang berlangganan (fire-and-forget)
      if (inserted) {
        fetch("/api/sos-push", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: inserted.id,
            author_name: userName,
            lat: location.lat,
            lng: location.lng,
          }),
        }).catch((e) => console.warn("Push SOS gagal:", e));
      }

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

      // Kirim WhatsApp OTOMATIS via Fonnte ke semua kontak darurat + admin (fire-and-forget)
      fetch("/api/sos-whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          contacts: contacts.map((c) => c.whatsapp),
        }),
      }).catch((e) => console.warn("WhatsApp SOS gagal terkirim:", e));

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
    if (status !== "idle" && status !== "error" && status !== "sent" && status !== "offline-ready") return;
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

  function reset() {
    setStatus("idle");
    setCoords(null);
    setHoldProgress(0);
    setSosMessage("");
  }

  // Layar OFFLINE
  if (status === "offline-ready") {
    const smsUrl = `sms:${telNumber}?body=${encodeURIComponent(sosMessage)}`;
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
        <WifiOff size={44} className="text-amber-600 mx-auto mb-3" />
        <h2 className="font-bold text-amber-800 text-lg mb-1">Mode Offline</h2>
        <p className="text-sm text-amber-700 mb-4">
          Tidak ada koneksi internet. Lokasimu sudah didapat — kirim lewat SMS atau telepon langsung lewat jaringan seluler.
        </p>
        {coords && (
          <div className="bg-white rounded-lg p-3 text-xs text-gray-600 inline-flex items-center gap-2 mb-4">
            <MapPin size={14} />
            {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
          </div>
        )}
        <div className="space-y-2">
          <button
            onClick={() => { window.location.href = smsUrl; }}
            className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
          >
            <MessageSquare size={18} /> Kirim SMS Lokasi ke {primaryContact?.name}
          </button>
          <button
            onClick={() => { window.location.href = "tel:110"; }}
            className="w-full bg-red-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
          >
            <Phone size={18} /> Telepon 110 (Polisi)
          </button>
          <button
            onClick={() => { window.location.href = `tel:${telNumber}`; }}
            className="w-full bg-white border border-gray-300 text-gray-700 py-3 rounded-xl font-medium flex items-center justify-center gap-2"
          >
            <Phone size={18} /> Telepon {primaryContact?.name}
          </button>
        </div>
        <button onClick={reset} className="block w-full mt-4 text-sm text-amber-700 underline">
          Kembali ke tombol SOS
        </button>
      </div>
    );
  }

  // Layar TERKIRIM (online)
if (status === "sent") {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
        <CheckCircle2 size={48} className="text-green-600 mx-auto mb-3" />
        <h2 className="font-bold text-green-800 text-lg mb-2">SOS Terkirim</h2>
        <p className="text-sm text-green-700 mb-3">
          Pesan SOS otomatis telah dikirim ke kontak daruratmu & admin. WhatsApp juga terbuka ke kontak utama — kamu bisa menekan kirim untuk mengirim dari nomormu sendiri.
        </p>
        {coords && (
          <div className="bg-white rounded-lg p-3 text-xs text-gray-600 inline-flex items-center gap-2 mb-4">
            <MapPin size={14} />
            {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
          </div>
        )}
        <button
          onClick={() => { window.location.href = "tel:110"; }}
          className="w-full bg-red-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 animate-pulse"
        >
          <Phone size={18} /> Telepon 110 Sekarang
        </button>
        <button
          onClick={reset}
          className="block w-full mt-3 text-sm text-green-700 underline"
        >
          Kembali ke tombol SOS
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      {!online && (
        <div className="mb-4 w-full max-w-xs bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg px-3 py-2 flex items-center justify-center gap-2 text-center">
          <WifiOff size={14} /> Mode offline — SOS akan dikirim via SMS / telepon
        </div>
      )}

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

      <button
        onClick={() => { window.location.href = "tel:110"; }}
        className="mt-4 text-sm font-semibold text-red-600 underline underline-offset-2 flex items-center gap-1.5"
      >
        <Phone size={14} /> Hubungkan dengan 110
      </button>

      <p className="text-xs text-gray-500 mt-3 text-center">
        Akan menghubungi: <span className="font-medium text-gray-700">{primaryContact?.name}</span>
        <br />
        <span className="text-gray-400">{telNumber}</span>
      </p>

      {status === "error" && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 max-w-xs text-center">
          {errorMsg}
        </div>
      )}
    </div>
  );
}