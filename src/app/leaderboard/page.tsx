import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Flame, Trophy } from "lucide-react";

function witaDate(off = 0): string {
  return new Date(Date.now() + 8 * 3600 * 1000 + off * 86400000).toISOString().slice(0, 10);
}

export default async function LeaderboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: rows } = await supabase
    .from("user_streaks")
    .select("user_id,current_streak,last_activity_date,total_distance_m,total_rides,full_name,organization")
    .order("current_streak", { ascending: false })
    .limit(200);

  const today = witaDate(0);
  const yest = witaDate(-1);
  const board = (rows || [])
    .map((r) => ({
      ...r,
      streak: r.last_activity_date === today || r.last_activity_date === yest ? r.current_streak : 0,
    }))
    .sort((a, b) => b.streak - a.streak || Number(b.total_distance_m) - Number(a.total_distance_m));

  const medal = ["🥇", "🥈", "🥉"];

  return (
    <div className="px-4 pt-8 max-w-md mx-auto pb-8">
      <div className="flex items-center gap-2 mb-1">
        <Trophy className="text-yellow-500" size={24} />
        <h1 className="text-2xl font-bold text-gray-900">Papan Peringkat</h1>
      </div>
      <p className="text-sm text-gray-500 mb-6">Lomba streak bersepeda 🔥 - gowes ≥1 km tiap hari untuk menjaga streakmu.</p>

      {board.length === 0 ? (
        <p className="text-center text-gray-400 py-12">Belum ada peserta. Jadilah yang pertama - catat perjalananmu di tab Gowes!</p>
      ) : (
        <div className="space-y-2">
          {board.map((r, i) => {
            const me = r.user_id === user.id;
            return (
              <div
                key={r.user_id}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 shadow-sm ${me ? "bg-green-50 border border-green-300" : "bg-white border border-gray-100"}`}
              >
                <div className="w-7 text-center font-bold text-gray-500">{i < 3 ? medal[i] : i + 1}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">
                    {r.full_name || "Pesepeda"}{me ? " (kamu)" : ""}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {r.organization || "-"} · {(Number(r.total_distance_m) / 1000).toFixed(1)} km · {r.total_rides}x
                  </p>
                </div>
                <div className="flex items-center gap-1 text-orange-600 font-bold">
                  <Flame size={18} /> {r.streak}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}