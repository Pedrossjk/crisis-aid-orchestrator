import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Bell, CheckCircle2, MessageCircle, Sparkles, AlertTriangle, X, Trash2, Mail, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/volunteer/notifications")({
  head: () => ({ meta: [{ title: "Alertas — Voluntário · Orquestra" }, { name: "description", content: "Notificações e alertas em tempo real." }] }),
  component: Notifications,
});

const initialNotifs = [
  { id: 1, icon: AlertTriangle, color: "bg-urgent", title: "Crise ativa: Enchentes em Blumenau", desc: "Nova ação urgente a 2.4 km de você. Voluntários necessários para distribuição de cestas.", time: "agora", channel: "WhatsApp", unread: true },
  { id: 2, icon: Sparkles, color: "bg-ai", title: "IA encontrou um match perfeito!", desc: "Cozinheiros para refeições comunitárias combina 96% com seu perfil.", time: "há 1h", channel: "Push", unread: true },
  { id: 3, icon: CheckCircle2, color: "bg-success", title: "Sua candidatura foi aprovada", desc: "Mãos que Alimentam confirmou sua participação na ação de manhã.", time: "há 3h", channel: "Email", unread: false },
  { id: 4, icon: MessageCircle, color: "bg-primary", title: "Mensagem de Cruz Verde Brasil", desc: "Olá Vitória, podemos confirmar você para sábado às 9h?", time: "ontem", channel: "Chat", unread: false },
];

type DbNotif = {
  id: string;
  sender_name: string;
  type: string;
  title: string;
  body: string;
  unread: boolean;
  created_at: string;
};

type AcceptedApp = {
  id: string;
  action_title: string;
};

type ChatMessage = {
  id: string;
  sender_name: string;
  sender_id: string;
  content: string;
  created_at: string;
};

export function Notifications() {
  const { user } = useAuth();
  const [notifs, setNotifs] = useState(initialNotifs);
  const [dbNotifs, setDbNotifs] = useState<DbNotif[]>([]);

  // Chat state
  const [acceptedApps, setAcceptedApps] = useState<AcceptedApp[]>([]);
  const [activeApp, setActiveApp] = useState<AcceptedApp | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Carrega candidaturas aceitas do voluntário
  useEffect(() => {
    if (!user) return;
    supabase
      .from("action_applications")
      .select("id, action_title")
      .eq("volunteer_id", user.id)
      .eq("status", "accepted")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setAcceptedApps(data as AcceptedApp[]);
      });
  }, [user]);

  // Carrega mensagens da candidatura selecionada
  useEffect(() => {
    if (!activeApp) return;
    setMessages([]);
    supabase
      .from("chat_messages")
      .select("id, sender_id, sender_name, content, created_at")
      .eq("application_id", activeApp.id)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (data) setMessages(data as ChatMessage[]);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      });
  }, [activeApp]);

  const sendMessage = async () => {
    if (!activeApp || !user || !chatInput.trim() || sending) return;
    setSending(true);
    const name = (user.user_metadata?.full_name as string | undefined) ?? "Voluntário";
    const { data: msg } = await supabase
      .from("chat_messages")
      .insert({ application_id: activeApp.id, sender_id: user.id, sender_name: name, content: chatInput.trim() })
      .select("id, sender_id, sender_name, content, created_at")
      .single();
    if (msg) {
      setMessages((prev) => [...prev, msg as ChatMessage]);
      setChatInput("");
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
    setSending(false);
  };

  useEffect(() => {
    if (!user) return;
    supabase
      .from("notifications")
      .select("id, sender_name, type, title, body, unread, created_at")
      .eq("recipient_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setDbNotifs(data as DbNotif[]);
      });
  }, [user]);

  const removeDbNotif = async (id: string) => {
    await supabase.from("notifications").delete().eq("id", id);
    setDbNotifs((prev) => prev.filter((n) => n.id !== id));
  };

  const clearAllDb = async () => {
    if (!user) return;
    await supabase.from("notifications").delete().eq("recipient_id", user.id);
    setDbNotifs([]);
  };

  function removeNotif(id: number) {
    setNotifs((prev) => prev.filter((n) => n.id !== id));
  }

  function clearAll() {
    setNotifs([]);
    clearAllDb();
  }

  const totalCount = dbNotifs.length + notifs.length;

  return (
    <AppShell role="volunteer">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Bell className="h-6 w-6" /> Alertas</h1>
          <p className="mt-1 text-sm text-muted-foreground">Notificações e mensagens das ONGs.</p>
        </div>
      </div>

      <Tabs defaultValue="notifications" className="mt-6">
        <TabsList>
          <TabsTrigger value="notifications" className="gap-1.5">
            <Bell className="h-3.5 w-3.5" /> Notificações
            {(dbNotifs.length + notifs.length) > 0 && (
              <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                {dbNotifs.length + notifs.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="messages" className="gap-1.5">
            <MessageCircle className="h-3.5 w-3.5" /> Mensagens
            {acceptedApps.length > 0 && (
              <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                {acceptedApps.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Aba Notificações ── */}
        <TabsContent value="notifications" className="mt-5">
          <div className="flex justify-end mb-3">
            {(dbNotifs.length + notifs.length) > 0 && (
              <Button variant="ghost" size="sm" className="text-muted-foreground gap-1.5 hover:text-destructive" onClick={() => { setNotifs([]); clearAllDb(); }}>
                <Trash2 className="h-4 w-4" /> Limpar tudo
              </Button>
            )}
          </div>
          <div className="space-y-3">
            {(dbNotifs.length + notifs.length) === 0 && (
              <div className="rounded-2xl border border-border/60 bg-card p-10 text-center shadow-soft">
                <Bell className="mx-auto h-8 w-8 text-muted-foreground/40" />
                <p className="mt-3 text-sm font-semibold text-muted-foreground">Nenhuma notificação</p>
                <p className="text-xs text-muted-foreground/70">Você está em dia por aqui.</p>
              </div>
            )}

            {/* Notificações reais do Supabase */}
            {dbNotifs.map((n) => (
              <div key={n.id} className={cn("flex gap-3 border p-4 shadow-soft transition", n.unread ? "border-primary/30 bg-primary/5" : "border-border/60 bg-card")}>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white">
                  <Mail className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-bold leading-tight">{n.title}</p>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {n.unread && <span className="mt-1 h-2 w-2 rounded-full bg-primary" />}
                      <button onClick={() => removeDbNotif(n.id)} className="rounded-lg p-1 hover:bg-muted transition" aria-label="Apagar">
                        <X className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </div>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground whitespace-pre-line">{n.body}</p>
                  <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span>{new Date(n.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                    <span>·</span>
                    <span className="rounded-md bg-muted px-1.5 py-0.5 font-medium capitalize">{n.sender_name}</span>
                  </div>
                </div>
              </div>
            ))}

            {/* Notificações mock */}
            {notifs.map((n) => {
              const Icon = n.icon;
              return (
                <div key={n.id} className={cn("flex gap-3 border p-4 shadow-soft transition", n.unread ? "border-primary/30 bg-primary/5" : "border-border/60 bg-card")}>
                  <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white", n.color)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-bold leading-tight">{n.title}</p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {n.unread && <span className="mt-1 h-2 w-2 rounded-full bg-primary" />}
                        <button onClick={() => removeNotif(n.id)} className="rounded-lg p-1 hover:bg-muted transition" aria-label="Apagar">
                          <X className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                      </div>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{n.desc}</p>
                    <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span>{n.time}</span>
                      <span>·</span>
                      <span className="rounded-md bg-muted px-1.5 py-0.5 font-medium">{n.channel}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* ── Aba Mensagens ── */}
        <TabsContent value="messages" className="mt-5">
          {acceptedApps.length === 0 ? (
            <div className="rounded-2xl border border-border/60 bg-card p-10 text-center shadow-soft">
              <MessageCircle className="mx-auto h-8 w-8 text-muted-foreground/40" />
              <p className="mt-3 text-sm font-semibold text-muted-foreground">Nenhuma conversa ainda</p>
              <p className="text-xs text-muted-foreground/70">Mensagens aparecem quando uma ONG aceitar sua candidatura.</p>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-3">
              {/* Lista de conversas */}
              <div className="space-y-2">
                {acceptedApps.map((app) => (
                  <button
                    key={app.id}
                    onClick={() => setActiveApp(app)}
                    className={cn(
                      "w-full text-left rounded-xl border p-3 transition-colors",
                      activeApp?.id === app.id
                        ? "border-primary bg-primary/5"
                        : "border-border/60 bg-card hover:border-primary/40"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <CheckCircle2 className="h-4 w-4" />
                      </div>
                      <p className="text-sm font-semibold leading-tight line-clamp-2">{app.action_title}</p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Janela de chat */}
              <div className="lg:col-span-2 flex flex-col border border-border/60 bg-card rounded-2xl shadow-soft overflow-hidden" style={{ minHeight: "420px" }}>
                {!activeApp ? (
                  <div className="flex flex-1 items-center justify-center text-center p-8 text-muted-foreground">
                    <div>
                      <MessageCircle className="mx-auto h-8 w-8 opacity-40" />
                      <p className="mt-2 text-sm">Selecione uma conversa</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="border-b border-border/60 px-4 py-3">
                      <p className="text-sm font-semibold truncate">{activeApp.action_title}</p>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ maxHeight: "320px" }}>
                      {messages.length === 0 && (
                        <p className="text-center text-xs text-muted-foreground py-8">Nenhuma mensagem ainda. Diga olá!</p>
                      )}
                      {messages.map((m) => {
                        const isMe = m.sender_id === user?.id;
                        return (
                          <div key={m.id} className={cn("flex gap-2", isMe ? "justify-end" : "justify-start")}>
                            {!isMe && (
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                                {m.sender_name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className={cn("max-w-[75%] rounded-2xl px-3 py-2 text-sm", isMe ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted rounded-bl-sm")}>
                              {!isMe && <p className="text-[10px] font-semibold opacity-70 mb-0.5">{m.sender_name}</p>}
                              <p className="leading-snug">{m.content}</p>
                              <p className={cn("mt-0.5 text-[10px] text-right", isMe ? "opacity-70" : "text-muted-foreground")}>
                                {new Date(m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                    <div className="border-t border-border/60 p-3 flex gap-2">
                      <Textarea
                        rows={1}
                        placeholder="Mensagem…"
                        className="resize-none"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                      />
                      <Button size="icon" className="shrink-0 bg-primary" onClick={sendMessage} disabled={sending || !chatInput.trim()}>
                        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
