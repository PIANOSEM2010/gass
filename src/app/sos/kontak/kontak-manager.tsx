"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Star, Trash2, Plus } from "lucide-react";

type Contact = {
  id: string;
  name: string;
  whatsapp: string;
  relation: string | null;
  is_primary: boolean;
};

export default function KontakManager({
  initialContacts,
  userId,
}: {
  initialContacts: Contact[];
  userId: string;
}) {
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [relation, setRelation] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  function normalizeWhatsapp(input: string) {
    const digits = input.replace(/\D/g, "");
    if (digits.startsWith("62")) return digits;
    if (digits.startsWith("0")) return "62" + digits.slice(1);
    if (digits.startsWith("8")) return "62" + digits;
    return digits;
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const wa = normalizeWhatsapp(whatsapp);
    if (wa.length < 10) {
      setError("Nomor WhatsApp tidak valid");
      setSaving(false);
      return;
    }
    const { data, error } = await supabase
      .from("emergency_contacts")
      .insert({
        user_id: userId,
        name,
        whatsapp: wa,
        relation,
        is_primary: contacts.length === 0,
      })
      .select()
      .single();

    if (error) {
      setError(error.message);
    } else if (data) {
      setContacts([...contacts, data]);
      setName("");
      setWhatsapp("");
      setRelation("");
      setShowForm(false);
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus kontak ini?")) return;
    const { error } = await supabase.from("emergency_contacts").delete().eq("id", id);
    if (!error) setContacts(contacts.filter((c) => c.id !== id));
  }

  async function handleSetPrimary(id: string) {
    await supabase
      .from("emergency_contacts")
      .update({ is_primary: false })
      .eq("user_id", userId);
    await supabase.from("emergency_contacts").update({ is_primary: true }).eq("id", id);
    setContacts(contacts.map((c) => ({ ...c, is_primary: c.id === id })));
  }

  return (
    <div className="space-y-3">
      {contacts.length === 0 && !showForm && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
          Belum ada kontak darurat. Tambahkan minimal satu sebelum menggunakan tombol SOS.
        </div>
      )}

      {contacts.map((c) => (
        <div key={c.id} className="bg-white rounded-xl p-4 shadow-sm flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="font-semibold">{c.name}</p>
              {c.is_primary && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                  Utama
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600">+{c.whatsapp}</p>
            {c.relation && <p className="text-xs text-gray-500 mt-1">{c.relation}</p>}
          </div>
          <div className="flex gap-2">
            {!c.is_primary && (
              <button
                onClick={() => handleSetPrimary(c.id)}
                className="p-2 text-gray-400 hover:text-yellow-500"
                title="Jadikan utama"
              >
                <Star size={18} />
              </button>
            )}
            <button
              onClick={() => handleDelete(c.id)}
              className="p-2 text-gray-400 hover:text-red-600"
              title="Hapus"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>
      ))}

      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full bg-green-600 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2"
        >
          <Plus size={18} />
          Tambah Kontak
        </button>
      )}

      {showForm && (
        <form onSubmit={handleAdd} className="bg-white rounded-xl p-5 shadow-sm space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Misal: Ayah, Ibu, Wali Kelas"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nomor WhatsApp</label>
            <input
              type="tel"
              required
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="08xx atau 628xx"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hubungan (opsional)</label>
            <input
              type="text"
              value={relation}
              onChange={(e) => setRelation(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Orang tua, saudara, dll"
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setShowForm(false); setError(""); }}
              className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg font-medium"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-green-600 text-white py-2 rounded-lg font-medium disabled:bg-gray-400"
            >
              {saving ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}