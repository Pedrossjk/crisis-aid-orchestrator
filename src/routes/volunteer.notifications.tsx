import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Bell, CheckCircle2, MessageCircle, Sparkles, AlertTriangle, X, Trash2, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
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

export function Notifications() {
  const { user } = useAuth();
  const [notifs, setNotifs] = useState(initialNotifs);
  const [dbNotifs, setDbNotifs] = useState<DbNotif[]>([]);

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
          <p className="mt-1 text-sm text-muted-foreground">Você recebe notificações por email, WhatsApp e push.</p>
        </div>
        {totalCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0 text-muted-foreground gap-1.5 hover:text-destructive"
            onClick={clearAll}
          >
            <Trash2 className="h-4 w-4" /> Limpar tudo
          </Button>
        )}
      </div>

      <div className="mt-6 space-y-3">
        {totalCount === 0 && (
          <div className="rounded-2xl border border-border/60 bg-card p-10 text-center shadow-soft">
            <Bell className="mx-auto h-8 w-8 text-muted-foreground/40" />
            <p className="mt-3 text-sm font-semibold text-muted-foreground">Nenhuma notificação</p>
            <p className="text-xs text-muted-foreground/70">Você está em dia por aqui.</p>
          </div>
        )}

        {/* Notificações reais do Supabase (convites de ONGs, etc.) */}
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
                  <button
                    onClick={() => removeDbNotif(n.id)}
                    className="rounded-lg p-1 hover:bg-muted transition"
                    aria-label="Apagar notificação"
                  >
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
                    <button
                      onClick={() => removeNotif(n.id)}
                      className="rounded-lg p-1 hover:bg-muted transition"
                      aria-label="Apagar notificação"
                    >
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
    </AppShell>
  );
}
