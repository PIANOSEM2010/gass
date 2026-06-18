import Link from "next/link";
import {
  ShieldCheck, FileWarning, CheckCircle2, TriangleAlert, MapPin, Bike, Siren, ArrowLeft,
} from "lucide-react";

export const dynamic = "force-dynamic";

function witaDateStr(offDays = 0): string {
  return new Date(Date.now() + 8 * 3600 * 1000 + offDays * 86400000).toISOString().slice(0, 10);
}

async function q(url: string, key: string, path: string): Promise<{ rows: Record<string, unknown>[]; total: number | null }> {
  try {
    const res = await fetch(`${url}/rest/v1/${path}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: "count=exact" },
      cache: "no-store",
    });
    let total: number | null = null;
    const cr = res.headers.get("content-range");
    if (cr && cr.includes("/")) {
      const t = cr.split("/")[1];
      total = t === "*" ? null : Number(t);
    }
    const rows = await res.json().catch(() => []);
    return { rows: Array.isArray(rows) ? rows : [], total };
  } catch {
    return { rows: [], total: null };
  }
}

function countBy(rows: Record<string, unknown>[], key: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) {
    const k = String(r[key] ?? "");
    if (!k) continue;
    out[k] = (out[k] || 0) + 1;
  }
  return out;
}

function dayLabel(ds: string): string {
  try {
    return new Intl.DateTimeFormat("id-ID", { weekday: "short", timeZone: "Asia/Makassar" }).format(new Date(ds + "T00:00:00+08:00"));
  } catch {
    return ds.slice(5);
  }
}

const INFRA_CAT: Record<string, string> = {
  lubang: "Berlubang", lampu: "Lampu mati", marka: "Marka pudar", rambu: "Rambu rusak", genangan: "Genangan", lainnya: "Lainnya",
};
const STATUS_FLOW: { key: string; label: string; color: string }[] = [
  { key: "dilaporkan", label: "Dilaporkan", color: "#f59e0b" },
  { key: "diverifikasi", label: "Diverifikasi", color: "#2563eb" },
  { key: "diteruskan", label: "Diteruskan ke Dinas", color: "#7c3aed" },
  { key: "ditangani", label: "Ditangani", color: "#16a34a" },
];
const ZONE_CAT: { key: string; label: string; color: string }[] = [
  { key: "potensi", label: "Potensi rawan", color: "#eab308" },
  { key: "rawan", label: "Rawan kecelakaan", color: "#f97316" },
  { key: "berbahaya", label: "Area berbahaya", color: "#dc2626" },
];

function Bars({ items }: { items: { label: string; value: number; color: string }[] }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="space-y-2.5">
      {items.map((it) => (
        <div key={it.label}>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-600">{it.label}</span>
            <span className="font-semibold text-gray-800">{it.value}</span>
          </div>
          <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${Math.max(it.value > 0 ? 4 : 0, (it.value / max) * 100)}%`, background: it.color }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function DashboardPage() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  const d6 = witaDateStr(-6);
  const iso30 = new Date(Date.now() - 30 * 86400000).toISOString();

  const [infra, zones, markers, streaks, sos, acts] = await Promise.all([
    q(url, key, "infra_reports?select=category,status&limit=2000"),
    q(url, key, "danger_zones?select=category&limit=2000"),
    q(url, key, "road_markers?select=type,approved&limit=2000"),
    q(url, key, "user_streaks?select=total_distance_m,total_rides,last_activity_date&limit=5000"),
    q(url, key, "sos_logs?select=created_at&limit=5000"),
    q(url, key, `activities?select=activity_date&activity_date=gte.${d6}&limit=5000`),
  ]);

  const infraTotal = infra.total ?? infra.rows.length;
  const infraByStatus = countBy(infra.rows, "status");
  const infraByCat = countBy(infra.rows, "category");
  const handled = infraByStatus["ditangani"] || 0;
  const handledPct = infraTotal > 0 ? Math.round((handled / infraTotal) * 100) : 0;

  const zonesTotal = zones.total ?? zones.rows.length;
  const zonesByCat = countBy(zones.rows, "category");

  const approvedMarkers = markers.rows.filter((m) => m.approved === true).length;

  const totalKm = streaks.rows.reduce((s, r) => s + (Number(r.total_distance_m) || 0), 0) / 1000;
  const activeCyclists = streaks.rows.filter((r) => String(r.last_activity_date || "") >= d6).length;

  const sosTotal = sos.total ?? sos.rows.length;
  const sos30 = sos.rows.filter((r) => String(r.created_at || "") >= iso30).length;

  const dayCounts = countBy(acts.rows, "activity_date");
  const days = Array.from({ length: 7 }, (_, i) => {
    const ds = witaDateStr(-(6 - i));
    return { date: ds, label: dayLabel(ds), count: dayCounts[ds] || 0 };
  });
  const maxDay = Math.max(1, ...days.map((d) => d.count));

  const cards = [
    { label: "Laporan masuk", value: infraTotal, icon: FileWarning, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Sudah ditangani", value: handled, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50" },
    { label: "Zona rawan dipetakan", value: zonesTotal, icon: TriangleAlert, color: "text-red-600", bg: "bg-red-50" },
    { label: "Penanda jalan", value: approvedMarkers, icon: MapPin, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Pesepeda aktif (7 hari)", value: activeCyclists, icon: Bike, color: "text-orange-600", bg: "bg-orange-50" },
    { label: "SOS tercatat", value: sosTotal, icon: Siren, color: "text-rose-600", bg: "bg-rose-50" },
  ];

  const statusBars = STATUS_FLOW.map((s) => ({ label: s.label, value: infraByStatus[s.key] || 0, color: s.color }));
  const catBars = Object.entries(infraByCat)
    .map(([k, v]) => ({ label: INFRA_CAT[k] || k, value: v, color: "#f59e0b" }))
    .sort((a, b) => b.value - a.value);
  const zoneBars = ZONE_CAT.map((z) => ({ label: z.label, value: zonesByCat[z.key] || 0, color: z.color }));

  const lastUpdated = new Intl.DateTimeFormat("id-ID", {
    day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Makassar",
  }).format(new Date());

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-white">
      <div className="px-4 pt-6 pb-10 max-w-md mx-auto">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-slate-600 mb-4"><ArrowLeft size={16} /> Beranda</Link>

        <div className="rounded-3xl p-5 bg-gradient-to-br from-slate-700 to-slate-900 text-white shadow-lg mb-4">
          <div className="flex items-center gap-3">
            <ShieldCheck size={28} />
            <div>
              <h1 className="text-xl font-extrabold leading-tight">Dashboard Keselamatan</h1>
              <p className="text-xs opacity-80">Kabupaten Bulungan</p>
            </div>
          </div>
          <div className="mt-4 bg-white/10 rounded-2xl p-4">
            <p className="text-xs opacity-80">Total jarak bersepeda komunitas</p>
            <p className="text-4xl font-extrabold leading-none mt-1">{totalKm.toFixed(1)}<span className="text-lg font-bold ml-1">km</span></p>
            <p className="text-xs opacity-80 mt-1">{sos30} panggilan darurat dalam 30 hari terakhir</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-5">
          {cards.map((c) => {
            const Icon = c.icon;
            return (
              <div key={c.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className={`w-10 h-10 rounded-xl ${c.bg} ${c.color} flex items-center justify-center mb-2`}><Icon size={20} /></div>
                <p className="text-2xl font-extrabold text-gray-900 leading-none">{c.value}</p>
                <p className="text-xs text-gray-500 mt-1">{c.label}</p>
              </div>
            );
          })}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-3">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-800 text-sm">Tindak lanjut laporan</h2>
            <span className="text-xs font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">{handledPct}% ditangani</span>
          </div>
          {infraTotal > 0 ? <Bars items={statusBars} /> : <p className="text-xs text-gray-400 py-4 text-center">Belum ada laporan masuk.</p>}
        </div>

        {catBars.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-3">
            <h2 className="font-bold text-gray-800 text-sm mb-3">Jenis laporan jalan</h2>
            <Bars items={catBars} />
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-3">
          <h2 className="font-bold text-gray-800 text-sm mb-3">Sebaran zona rawan</h2>
          {zonesTotal > 0 ? <Bars items={zoneBars} /> : <p className="text-xs text-gray-400 py-4 text-center">Belum ada zona dipetakan.</p>}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
          <h2 className="font-bold text-gray-800 text-sm mb-3">Aktivitas gowes 7 hari terakhir</h2>
          <div className="flex items-end justify-between gap-1.5">
            {days.map((d) => (
              <div key={d.date} className="flex-1 flex flex-col items-center">
                <span className="text-[10px] font-semibold text-gray-600 mb-1">{d.count}</span>
                <div className="w-full bg-green-100 rounded-md flex items-end" style={{ height: 80 }}>
                  <div className="w-full bg-gradient-to-t from-green-600 to-emerald-400 rounded-md" style={{ height: `${Math.max(4, (d.count / maxDay) * 100)}%` }} />
                </div>
                <span className="text-[10px] text-gray-400 mt-1">{d.label}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-[11px] text-gray-400">Data langsung dari komunitas BUG. Diperbarui {lastUpdated} WITA.</p>
      </div>
    </div>
  );
}