import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Bell, CheckCircle2, MessageCircle, Sparkles, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/volunteer/notifications")({
  head: () => ({ meta: [{ title: "Alertas — Voluntário · Orquestra" }, { name: "description", content: "Notificações e alertas em tempo real." }] }),
  component: Notifications,
});

const notifs = [
  { icon: AlertTriangle, color: "bg-urgent", title: "Crise ativa: Enchentes em Blumenau", desc: "Nova ação urgente a 2.4 km de você. Voluntários necessários para distribuição de cestas.", time: "agora", channel: "WhatsApp", unread: true },
  { icon: Sparkles, color: "bg-ai", title: "IA encontrou um match perfeito!", desc: "“Cozinheiros para refeições comunitárias” combina 96% com seu perfil.", time: "há 1h", channel: "Push", unread: true },
  { icon: CheckCircle2, color: "bg-success", title: "Sua candidatura foi aprovada", desc: "Mãos que Alimentam confirmou sua participação na ação de manhã.", time: "há 3h", channel: "Email", unread: false },
  { icon: MessageCircle, color: "bg-primary", title: "Mensagem de Cruz Verde Brasil", desc: "Olá Vitória, podemos confirmar você para sábado às 9h?", time: "ontem", channel: "Chat", unread: false },
];

export function Notifications() {
  return (
    <AppShell role="volunteer">
      <h1 className="text-2xl font-bold flex items-center gap-2"><Bell className="h-6 w-6" /> Alertas</h1>
      <p className="mt-1 text-sm text-muted-foreground">Você recebe notificações por email, WhatsApp e push.</p>

      <div className="mt-6 space-y-3">
        {notifs.map((n, i) => {
          const Icon = n.icon;
          return (
            <div key={i} className={cn("flex gap-3 border p-4 shadow-soft transition", n.unread ? "border-primary/30 bg-primary/5" : "border-border/60 bg-card")}>
              <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white", n.color)}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-bold leading-tight">{n.title}</p>
                  {n.unread && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />}
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
