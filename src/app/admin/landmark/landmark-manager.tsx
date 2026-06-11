"use client";
import { useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { createClient } from "@/lib/supabase/client";
import { Trash2, MapPin, Landmark as LandmarkIcon } from "lucide-react";

type Category = "belanja" | "kuliner" | "kantor" | "kesehatan" | "bengkel" | "lainnya";

type Landmark = {
  id: string;
  category: Category;
  title: string;
  description: string | null;
  lat: number;
  lng: number;
  created_by: string | null;
  created_at: string;
  author_name: string;
};

const CATEGORY_CONFIG: Record<Category, { label: string; emoji: string; color: string; chip: string }> = {
  belanja:   { label: "Perbelanjaan",     emoji: "🛒", color: "#2563eb", chip: "bg-blue-100 text-blue-700" },
  kuliner:   { label: "Kafe & Kuliner",   emoji: "☕", color: "#c2410c", chip: "bg-orange-100 text-orange-700" },
  kantor:    { label: "Kantor & Layanan", emoji: "🏢", color: "#475569", chip: "bg-slate-100 text-slate-700" },
  kesehatan: { label: "Kesehatan",        emoji: "🏥", color: "#dc2626", chip: "bg-red-100 text-red-700" },
  bengkel:   { label: "Bengkel Sepeda",   emoji: "🔧", color: "#0d9488", chip: "bg-teal-100 text-teal-700" },
  lainnya:   { label: "Lainnya",          emoji: "📌", color: "#64748b", chip: "bg-gray-100 text-gray-700" },
};

function makePinIcon(category: Category) {
  const { color, emoji } = CATEGORY_CONFIG[category];
  return L.divIcon({
    className: "landmark-picker",
    html: `<div style="background:${color};width:32px;height:32px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 3px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;"><span style="transform:rotate(45deg);font-size:15px;">${emoji}</span></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });
}

function PickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function LandmarkManager({ initialLandmarks }: { initialLandmarks: Landmark[] }) {
  const [items, setItems] = useState<Landmark[]>(initialLandmarks);
  const [picked, setPicked] = useState<{ lat: number; lng: number } | null>(null);
  const [category, setCategory] = useState<Category>("belanja");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const supabase = createClient();

  async function handleSave() {
    if (!picked) {
      setError("Tap titik di peta dulu untuk menandai lokasi landmark.");
      setTimeout(() => setError(""), 4000);
      return;
    }
    if (!title.trim()) {
      setError("Isi nama landmark dulu.");
      setTimeout(() => setError(""), 4000);
      return;
    }
    setSaving(true);
    setError("");
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error: insErr } = await supabase
      .from("landmarks")
      .insert({
        category,
        title: title.trim(),
        description: desc.trim() || null,
        lat: picked.lat,
        lng: picked.lng,
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
      const newItem: Landmark = { ...data, author_name: "Kamu" };
      setItems([newItem, ...items]);
      setSuccess("Landmark ditambahkan dan langsung tampil di peta publik.");
      setTitle("");
      setDesc("");
      setPicked(null);
      setTimeout(() => setSuccess(""), 4000);
    }
  }

  async function remove(id: string) {
    if (!confirm("Hapus landmark ini permanen?")) return;
    const { error: delErr } = await supabase.from("landmarks").delete().eq("id", id);
    if (!delErr) setItems(items.filter((it) => it.id !== id));
  }

  return (
    <div className="space-y-6">
      {/* Form tambah landmark */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <LandmarkIcon size={18} className="text-blue-600" />
          <h2 className="font-semibold text-gray-900">Tambah Landmark Baru</h2>
        </div>

        <p className="text-xs text-gray-500 mb-2">
          {picked
            ? `📍 Titik dipilih: ${picked.lat.toFixed(5)}, ${picked.lng.toFixed(5)}`
            : "Tap titik di peta untuk menandai lokasi landmark."}
        </p>
        <div className="h-64 rounded-lg overflow-hidden border border-gray-200 mb-4">
          <MapContainer center={[2.8450, 117.3680]} zoom={13} style={{ height: "100%", width: "100%" }}>
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <PickHandler onPick={(lat, lng) => setPicked({ lat, lng })} />
            {picked && <Marker position={[picked.lat, picked.lng]} icon={makePinIcon(category)} />}
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
              className={`px-2 py-2 rounded-lg text-xs font-medium border-2 leading-tight ${
                category === cat ? "border-gray-900" : "border-gray-200"
              }`}
              style={category === cat ? { background: CATEGORY_CONFIG[cat].color + "22" } : {}}
            >
              <span className="mr-1">{CATEGORY_CONFIG[cat].emoji}</span>
              {CATEGORY_CONFIG[cat].label}
            </button>
          ))}
        </div>

        {/* Nama */}
        <label className="block text-sm font-medium text-gray-700 mb-1">Nama Landmark</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Contoh: Toko Sepeda Maju Jaya"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {/* Deskripsi */}
        <label className="block text-sm font-medium text-gray-700 mb-1">Keterangan (opsional)</label>
        <textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          rows={2}
          placeholder="Contoh: Buka 08.00-21.00, melayani servis sepeda."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {error && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg mb-3">{error}</div>}
        {success && <div className="bg-green-50 text-green-700 text-sm px-3 py-2 rounded-lg mb-3">{success}</div>}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium disabled:bg-gray-400"
        >
          {saving ? "Menyimpan..." : "Simpan Landmark"}
        </button>
      </div>

      {/* Daftar landmark */}
      <div>
        <h2 className="font-semibold text-gray-900 mb-3">Daftar Landmark ({items.length})</h2>
        {items.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center text-gray-500">Belum ada landmark.</div>
        ) : (
          <div className="space-y-3">
            {items.map((it) => {
              const cfg = CATEGORY_CONFIG[it.category];
              return (
                <div key={it.id} className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${cfg.chip}`}>{cfg.emoji} {cfg.label}</span>
                  </div>
                  <h3 className="font-semibold text-gray-900">{it.title}</h3>
                  {it.description && <p className="text-sm text-gray-600 mt-1">{it.description}</p>}
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-2 mb-3">
                    <MapPin size={12} />
                    <button
                      onClick={() => window.open(`https://www.google.com/maps?q=${it.lat},${it.lng}`, "_blank")}
                      className="text-blue-700 hover:underline"
                    >
                      {it.lat.toFixed(5)}, {it.lng.toFixed(5)}
                    </button>
                    <span>·</span>
                    <span>{it.author_name}</span>
                  </div>
                  <button
                    onClick={() => remove(it.id)}
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