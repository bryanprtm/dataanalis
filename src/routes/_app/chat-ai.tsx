import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { chatAssistant } from "@/lib/ai.functions";
import { PageHeader, Panel } from "@/components/ui-toc";
import { Send, Bot, User as UserIcon, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_app/chat-ai")({ component: ChatPage });

function ChatPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const chat = useServerFn(chatAssistant);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: messages } = useQuery({
    queryKey: ["chat", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("ai_chat_messages").select("*").eq("user_id", user!.id).order("created_at", { ascending: true });
      return data ?? [];
    },
  });

  const send = useMutation({
    mutationFn: (m: string) => chat({ data: { message: m } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chat", user?.id] }),
  });

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages, send.isPending]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || send.isPending) return;
    send.mutate(input);
    setInput("");
  }

  const suggestions = [
    "Apa isu menonjol hari ini?",
    "Wilayah mana paling rawan minggu ini?",
    "Buatkan ringkasan situasi nasional.",
    "Tampilkan 5 laporan cyber terbaru.",
  ];

  return (
    <div>
      <PageHeader code="12" title="AI Chat Assistant" subtitle="Tanya data, situasi wilayah, dan rekomendasi taktis" />

      <Panel className="flex flex-col h-[calc(100vh-220px)]">
        <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pr-2">
          {messages?.length === 0 && (
            <div className="text-center py-8">
              <Bot className="w-12 h-12 mx-auto mb-3 text-primary text-glow-cyan" />
              <p className="font-mono text-sm text-muted-foreground mb-4">[ TOC_AI READY — Tanyakan apa saja ]</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-w-2xl mx-auto">
                {suggestions.map(s => (
                  <button key={s} onClick={() => { setInput(s); }} className="p-2 text-left text-xs panel hover:border-primary transition">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages?.map(m => (
            <div key={m.id} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`w-8 h-8 rounded shrink-0 flex items-center justify-center ${m.role === "user" ? "bg-secondary" : "bg-primary/15 border border-primary/40"}`}>
                {m.role === "user" ? <UserIcon className="w-4 h-4" /> : <Bot className="w-4 h-4 text-primary" />}
              </div>
              <div className={`max-w-[80%] p-3 rounded-md text-sm ${m.role === "user" ? "bg-primary/15 text-foreground" : "bg-muted/40"}`}>
                <pre className="whitespace-pre-wrap font-sans leading-relaxed">{m.content}</pre>
              </div>
            </div>
          ))}
          {send.isPending && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded shrink-0 flex items-center justify-center bg-primary/15 border border-primary/40">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <div className="p-3 rounded-md bg-muted/40 text-sm font-mono"><Loader2 className="w-4 h-4 animate-spin inline mr-2" />AI memproses...</div>
            </div>
          )}
        </div>

        <form onSubmit={submit} className="mt-3 pt-3 border-t border-border flex gap-2">
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Tanyakan tentang data, situasi, atau rekomendasi..."
            className="flex-1 px-3 py-2 bg-input/40 border border-border rounded text-sm font-mono focus:outline-none focus:border-primary" />
          <button type="submit" disabled={send.isPending || !input.trim()}
            className="px-4 bg-primary text-primary-foreground rounded disabled:opacity-50"><Send className="w-4 h-4" /></button>
        </form>
      </Panel>
    </div>
  );
}
