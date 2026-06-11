"use client";
import { useState } from "react";
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { createClient } from "@/lib/supabase/client";
import { Trash2, MapPin, TriangleAlert } from "lucide-react";

type Category = "potensi" | "rawan" | "berbahaya";

type Zone = {
  id: string;
  category: Category;
  title: string;
  description: string | null;
  lat: number;
  lng: number;
  radius: number;
  created_by: string | null;
  created_at: string;
  author_name: string;
};

const CATEGORY_CONFIG: Record<Category, { label: string; color: string; chip: string }> = {
  potensi:   { label: "Potensi Rawan",  color: "#eab308", chip: "bg-yellow-100 text-yellow-700" },
  rawan:     { label: "Rawan Kecelakaan", color: "#f97316", chip: "bg-orange-100 text-orange-700" },
  berbahaya: { label: "Area Berbahaya", color: "#dc2626", chip: "bg-red-100 text-red-700" },
};

const pickerIcon = L.divIcon({
  className: "zona-picker",
  html: `<div style="background:#111827;width:30px;height:30px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 3px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;"><span style="transform:rotate(45deg);color:white;font-size:14px;">📍</span></div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 30],
});

function PickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function ZonaManager({ initialZones }: { initialZones: Zone[] }) {
  const [zones, setZones] = useState<Zone[]>(initialZones);
  const [picked, setPicked] = useState<{ lat: number; lng: number } | null>(null);
  const [category, setCategory] = useState<Category>("rawan");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [radius, setRadius] = useState(150);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const supabase = createClient();

  async function handleSave() {
    if (!picked) {
      setError("Tap titik di peta dulu untuk menentukan pusat zona.");
      setTimeout(() => setError(""), 4000);
      return;
    }
    if (!title.trim()) {
      setError("Isi judul zona dulu.");
      setTimeout(() => setError(""), 4000);
      return;
    }
    setSaving(true);
    setError("");
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error: insErr } = await supabase
      .from("danger_zones")
      .insert({
        category,
        title: title.trim(),
        description: desc.trim() || null,
        lat: picked.lat,
        lng: picked.lng,
        radius,
        created_by: user?.id || null,
      })
      .select()
      .single();
    setSaving(false);

    if (insErr) {
      setError(insErr.message);
      setTimeout(() => setError(""), 5000);
      return;
    }
    if (data) {
      const newZone: Zone = { ...data, author_name: "Kamu" };
      setZones([newZone, ...zones]);
      setSuccess("Zona ditambahkan dan langsung tampil di peta publik.");
      setTitle("");
      setDesc("");
      setRadius(150);
      setPicked(null);
      setTimeout(() => setSuccess(""), 4000);
    }
  }

  async function remove(id: string) {
    if (!confirm("Hapus zona ini permanen?")) return;
    const { error: delErr } = await supabase.from("danger_zones").delete().eq("id", id);
    if (!delErr) setZones(zones.filter((z) => z.id !== id));
  }

  return (
    <div className="space-y-6">
      {/* Form tambah zona */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <TriangleAlert size={18} className="text-orange-500" />
          <h2 className="font-semibold text-gray-900">Tambah Zona Baru</h2>
        </div>

        {/* Peta pemilih */}
        <p className="text-xs text-gray-500 mb-2">
          {picked
            ? `📍 Titik dipilih: ${picked.lat.toFixed(5)}, ${picked.lng.toFixed(5)}`
            : "Tap titik di peta untuk menentukan pusat zona."}
        </p>
        <div className="h-64 rounded-lg overflow-hidden border border-gray-200 mb-4">
          <MapContainer center={[2.8450, 117.3680]} zoom={13} style={{ height: "100%", width: "100%" }}>
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <PickHandler onPick={(lat, lng) => setPicked({ lat, lng })} />
            {picked && (
              <>
                <Marker position={[picked.lat, picked.lng]} icon={pickerIcon} />
                <Circle
                  center={[picked.lat, picked.lng]}
                  radius={radius}
                  pathOptions={{
                    color: CATEGORY_CONFIG[category].color,
                    fillColor: CATEGORY_CONFIG[category].color,
                    fillOpacity: 0.25,
                    weight: 2,
                  }}
                />
              </>
            )}
          </MapContainer>
        </div>

        {/* Kategori */}
        <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {(Object.keys(CATEGORY_CONFIG) as Category[]).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`px-2 py-2 rounded-lg text-xs font-medium border-2 ${
                category === cat ? "border-gray-900" : "border-gray-200"
              }`}
              style={category === cat ? { background: CATEGORY_CONFIG[cat].color + "22" } : {}}
            >
              <span
                className="inline-block w-2.5 h-2.5 rounded-full mr-1 align-middle"
                style={{ background: CATEGORY_CONFIG[cat].color }}
              />
              {CATEGORY_CONFIG[cat].label}
            </button>
          ))}
        </div>

        {/* Judul */}
        <label className="block text-sm font-medium text-gray-700 mb-1">Judul / Nama Lokasi</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Contoh: Simpang Tiga Jalan Jelarai"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-orange-500"
        />

        {/* Deskripsi */}
        <label className="block text-sm font-medium text-gray-700 mb-1">Keterangan (opsional)</label>
        <textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          rows={2}
          placeholder="Contoh: Tikungan tajam, sering terjadi kecelakaan saat hujan."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-orange-500"
        />

        {/* Radius */}
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Radius area: <span className="font-semibold">{radius} meter</span>
        </label>
        <input
          type="range"
          min={50}
          max={500}
          step={25}
          value={radius}
          onChange={(e) => setRadius(Number(e.target.value))}
          className="w-full mb-4 accent-orange-500"
        />

        {error && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg mb-3">{error}</div>}
        {success && <div className="bg-green-50 text-green-700 text-sm px-3 py-2 rounded-lg mb-3">{success}</div>}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-orange-500 text-white py-2.5 rounded-lg font-medium disabled:bg-gray-400"
        >
          {saving ? "Menyimpan..." : "Simpan Zona"}
        </button>
      </div>

      {/* Daftar zona */}
      <div>
        <h2 className="font-semibold text-gray-900 mb-3">Daftar Zona ({zones.length})</h2>
        {zones.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center text-gray-500">Belum ada zona.</div>
        ) : (
          <div className="space-y-3">
            {zones.map((z) => {
              const cfg = CATEGORY_CONFIG[z.category];
              return (
                <div key={z.id} className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${cfg.chip}`}>{cfg.label}</span>
                    <span className="text-xs text-gray-400">radius {z.radius} m</span>
                  </div>
                  <h3 className="font-semibold text-gray-900">{z.title}</h3>
                  {z.description && <p className="text-sm text-gray-600 mt-1">{z.description}</p>}
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-2 mb-3">
                    <MapPin size={12} />
                    <button
                      onClick={() => window.open(`https://www.google.com/maps?q=${z.lat},${z.lng}`, "_blank")}
                      className="text-orange-700 hover:underline"
                    >
                      {z.lat.toFixed(5)}, {z.lng.toFixed(5)}
                    </button>
                    <span>·</span>
                    <span>{z.author_name}</span>
                  </div>
                  <button
                    onClick={() => remove(z.id)}
                    className="px-3 bg-white border border-red-300 text-red-600 py-1.5 rounded-lg text-sm flex items-center gap-1"
                  >
                    <Trash2 size={14} /> Hapus
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}