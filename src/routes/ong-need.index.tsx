import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { actions, matchedVolunteers, helpTypeLabels, urgencyLabels, type Urgency } from "@/lib/mock-data";
import { Plus, Sparkles, Users, CheckCircle2, Clock, AlertCircle, Star, MapPin, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/ong-need/")({
  head: () => ({ meta: [{ title: "Painel ONG — Orquestra" }, { name: "description", content: "Painel de gestão de ações para ONGs que precisam de ajuda." }] }),
  component: OngNeedDashboard,
});

const urgencyStyles: Record<Urgency, string> = {
  high: "bg-urgent text-urgent-foreground",
  medium: "bg-warning text-warning-foreground",
  low: "bg-success text-success-foreground",
};

function OngNeedDashboard() {
  const open = actions.filter((a) => a.status === "open");
  const inProgress = actions.filter((a) => a.status === "in_progress");

  return (
    <AppShell role="ong-need">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Painel · Cruz Verde Brasil</h1>
          <p className="mt-1 text-muted-foreground">Gerencie suas ações e voluntários em um só lugar.</p>
        </div>
        <Button className="bg-gradient-hero shadow-elegant"><Plus className="mr-1 h-4 w-4" /> Nova ação</Button>
      </div>

      {/* KPIs */}
      <div className="mt-6 grid gap-3 md:grid-cols-4">
        {[
          { icon: AlertCircle, label: "Ações abertas", value: open.length, color: "text-urgent", bg: "bg-urgent/10" },
          { icon: Clock, label: "Em andamento", value: inProgress.length, color: "text-warning", bg: "bg-warning/10" },
          { icon: CheckCircle2, label: "Concluídas (mês)", value: 47, color: "text-success", bg: "bg-success/10" },
          { icon: Users, label: "Voluntários ativos", value: 312, color: "text-primary", bg: "bg-primary/10" },
        ].map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="rounded-2xl border border-border/60 bg-card p-4 shadow-soft">
              <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl", k.bg)}>
                <Icon className={cn("h-5 w-5", k.color)} />
              </div>
              <p className="mt-3 text-2xl font-bold">{k.value}</p>
              <p className="text-xs text-muted-foreground">{k.label}</p>
            </div>
          );
        })}
      </div>

      {/* AI suggestions */}
      <div className="mt-6 rounded-2xl bg-gradient-ai p-5 text-ai-foreground shadow-elegant">
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">A IA encontrou 4 voluntários ideais para sua ação “Distribuição de cestas”</p>
            <p className="mt-1 text-sm opacity-90">Match score médio: 92% · Localização próxima · Disponíveis hoje</p>
          </div>
          <Button size="sm" variant="secondary" className="shrink-0">Ver matches <ArrowRight className="ml-1 h-3 w-3" /></Button>
        </div>
      </div>

      {/* Open actions */}
      <section className="mt-8">
        <h2 className="text-lg font-bold">Ações abertas</h2>
        <div className="mt-3 space-y-3">
          {open.map((a) => {
            const pct = (a.volunteersJoined / a.volunteersNeeded) * 100;
            return (
              <div key={a.id} className="rounded-2xl border border-border/60 bg-card p-5 shadow-soft">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase", urgencyStyles[a.urgency])}>
                        {urgencyLabels[a.urgency]}
                      </span>
                      <span className="text-xs text-muted-foreground">{a.postedAgo} · {a.location}</span>
                    </div>
                    <p className="mt-1.5 font-bold">{a.title}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {a.helpTypes.map((t) => (
                        <span key={t} className="rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{helpTypeLabels[t]}</span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">{a.volunteersJoined}/{a.volunteersNeeded}</p>
                    <p className="text-xs text-muted-foreground">voluntários</p>
                  </div>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-gradient-hero" style={{ width: `${pct}%` }} />
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Button size="sm" variant="outline" className="flex-1">Ver candidatos</Button>
                  <Button size="sm" className="flex-1 bg-primary">Gerenciar</Button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* AI matched volunteers preview */}
      <section className="mt-8">
        <h2 className="text-lg font-bold flex items-center gap-2"><Sparkles className="h-5 w-5 text-ai" /><span className="text-gradient-ai">Voluntários sugeridos pela IA</span></h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {matchedVolunteers.map((v) => (
            <div key={v.id} className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-4 shadow-soft">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-hero text-primary-foreground font-bold">
                {v.initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{v.name}</p>
                  <span className="rounded-full bg-ai/10 px-2 py-0.5 text-[10px] font-bold text-ai">{v.matchScore}% match</span>
                </div>
                <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" /> {v.distanceKm}km</span>
                  <span className="flex items-center gap-0.5"><Star className="h-3 w-3 fill-warning text-warning" /> {v.rating}</span>
                  <span>{v.completedActions} ações</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {v.skills.map((s) => (
                    <span key={s} className="rounded-md bg-muted px-1.5 py-0.5 text-[10px]">{s}</span>
                  ))}
                </div>
              </div>
              <Button size="sm" variant="outline">Convidar</Button>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
