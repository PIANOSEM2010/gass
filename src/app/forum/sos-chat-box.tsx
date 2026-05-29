"use client";
import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Send } from "lucide-react";

type ChatMessage = {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
  author_name?: string;
};

export default function SosChatBox({ sosLogId }: { sosLogId: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;

    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (mounted) setCurrentUserId(user?.id || null);

      // Load chat history
      const { data: chats } = await supabase
        .from("sos_chats")
        .select("id, user_id, message, created_at")
        .eq("sos_log_id", sosLogId)
        .order("created_at", { ascending: true });

      if (!mounted || !chats) return;

      // Enrich dengan nama pengirim
      const userIds = [...new Set(chats.map((c) => c.user_id))];
      const { data: profiles } = userIds.length
        ? await supabase.from("profiles").select("id, full_name").in("id", userIds)
        : { data: [] };

      const nameMap = new Map<string, string>();
      profiles?.forEach((p) => nameMap.set(p.id, p.full_name));

      const enriched = chats.map((c) => ({
        ...c,
        author_name: nameMap.get(c.user_id) || "Pengguna",
      }));

      if (mounted) setMessages(enriched);
    }

    init();

    // Subscribe ke chat baru di SOS ini
    const channel = supabase
      .channel(`sos-chat-${sosLogId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "sos_chats",
          filter: `sos_log_id=eq.${sosLogId}`,
        },
        async (payload) => {
          const newChat = payload.new as ChatMessage;
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", newChat.user_id)
            .single();

          if (mounted) {
            setMessages((prev) => [
              ...prev,
              { ...newChat, author_name: profile?.full_name || "Pengguna" },
            ]);
          }
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [sosLogId]);

  // Auto-scroll ke bawah saat ada pesan baru
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    const trimmed = input.trim();
    if (!trimmed || !currentUserId || sending) return;
    if (trimmed.length > 500) return;

    setSending(true);
    const supabase = createClient();
    const { error } = await supabase.from("sos_chats").insert({
      sos_log_id: sosLogId,
      user_id: currentUserId,
      message: trimmed,
    });

    if (!error) setInput("");
    setSending(false);
  }

  if (!currentUserId) {
    return (
      <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 text-center">
        Login untuk ikut koordinasi bantuan
      </div>
    );
  }

  return (
    <div className="border-t border-gray-200 pt-3 mt-2">
      <p className="text-xs font-semibold text-gray-700 mb-2">Koordinasi Bantuan</p>

      <div
        ref={scrollRef}
        className="bg-gray-50 rounded-lg p-2 mb-2 max-h-40 overflow-y-auto space-y-1.5"
      >
        {messages.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-2">
            Belum ada pesan. Mulai koordinasi di sini.
          </p>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`text-xs ${m.user_id === currentUserId ? "text-right" : ""}`}
            >
              <span className="font-semibold text-gray-700">{m.author_name}: </span>
              <span className="text-gray-900">{m.message}</span>
            </div>
          ))
        )}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          maxLength={500}
          placeholder="Ketik pesan koordinasi..."
          className="flex-1 px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-red-500"
          disabled={sending}
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || sending}
          className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-red-700 disabled:opacity-50 flex items-center gap-1"
        >
          <Send size={12} />
        </button>
      </div>
    </div>
  );
}