import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { actions, matchedVolunteers, ngoConnections, helpTypeLabels, urgencyLabels, type Urgency } from "@/lib/mock-data";
import { Plus, Sparkles, Users, CheckCircle2, Clock, AlertCircle, Star, MapPin, ArrowRight, Package, Network, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/ong/")({
  head: () => ({
    meta: [
      { title: "Painel ONG — Orquestra" },
      { name: "description", content: "Painel unificado da ONG: ações, recursos, voluntários e conexões com outras instituições." },
    ],
  }),
  component: OngDashboard,
});

const urgencyStyles: Record<Urgency, string> = {
  high: "bg-urgent text-urgent-foreground",
  medium: "bg-warning text-warning-foreground",
  low: "bg-success text-success-foreground",
};

function OngDashboard() {
  const open = actions.filter((a) => a.status === "open");
  const inProgress = actions.filter((a) => a.status === "in_progress");
  const activeConnections = ngoConnections.filter((n) => n.status === "active");

  return (
    <AppShell role="ong">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Painel · Cruz Verde Brasil</h1>
          <p className="mt-1 text-muted-foreground">Tudo que sua ONG precisa orquestrar em um só lugar.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" className="hidden sm:inline-flex">
            <Link to="/ong/resources"><Package className="mr-1 h-4 w-4" /> Recurso</Link>
          </Button>
          <Button asChild className="bg-gradient-hero shadow-elegant">
            <Link to="/ong/actions"><Plus className="mr-1 h-4 w-4" /> Nova ação</Link>
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="mt-6 grid gap-3 grid-cols-2 lg:grid-cols-5">
        {[
          { icon: AlertCircle, label: "Ações abertas", value: open.length, color: "text-urgent", bg: "bg-urgent/10" },
          { icon: Clock, label: "Em andamento", value: inProgress.length, color: "text-warning", bg: "bg-warning/10" },
          { icon: CheckCircle2, label: "Concluídas/mês", value: 47, color: "text-success", bg: "bg-success/10" },
          { icon: Users, label: "Voluntários ativos", value: 312, color: "text-primary", bg: "bg-primary/10" },
          { icon: Network, label: "Conexões ONG", value: activeConnections.length, color: "text-ai", bg: "bg-ai/10" },
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

      {/* AI orchestration banner */}
      <div className="mt-6 rounded-2xl bg-gradient-ai p-5 text-ai-foreground shadow-elegant">
        <div className="flex flex-wrap items-start gap-3">
          <Sparkles className="h-5 w-5 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-[200px]">
            <p className="font-bold">A IA orquestrou 3 movimentos hoje</p>
            <p className="mt-1 text-sm opacity-90">4 voluntários ideais para "Cestas básicas" · 2 ONGs com recursos compatíveis · 1 caso urgente sugerido</p>
          </div>
          <Button asChild size="sm" variant="secondary" className="shrink-0">
            <Link to="/ong/network">Ver conexões <ArrowRight className="ml-1 h-3 w-3" /></Link>
          </Button>
        </div>
      </div>

      {/* Quick sections grid */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Open actions */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold flex items-center gap-2"><ListChecks className="h-5 w-5 text-primary" /> Ações abertas</h2>
            <Button asChild variant="ghost" size="sm"><Link to="/ong/actions">Ver todas <ArrowRight className="ml-1 h-3 w-3" /></Link></Button>
          </div>
          <div className="space-y-3">
            {open.slice(0, 3).map((a) => {
              const pct = (a.volunteersJoined / a.volunteersNeeded) * 100;
              return (
                <div key={a.id} className="rounded-2xl border border-border/60 bg-card p-4 shadow-soft">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase", urgencyStyles[a.urgency])}>
                          {urgencyLabels[a.urgency]}
                        </span>
                        <span className="text-xs text-muted-foreground">{a.postedAgo}</span>
                      </div>
                      <p className="mt-1.5 font-semibold leading-tight">{a.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> {a.location}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold">{a.volunteersJoined}/{a.volunteersNeeded}</p>
                      <p className="text-[10px] text-muted-foreground">voluntários</p>
                    </div>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-gradient-hero" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {a.helpTypes.map((t) => (
                      <span key={t} className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{helpTypeLabels[t]}</span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* AI matched volunteers */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold flex items-center gap-2"><Sparkles className="h-5 w-5 text-ai" /><span className="text-gradient-ai">Voluntários sugeridos</span></h2>
            <Button asChild variant="ghost" size="sm"><Link to="/ong/volunteers">Ver todos <ArrowRight className="ml-1 h-3 w-3" /></Link></Button>
          </div>
          <div className="space-y-3">
            {matchedVolunteers.slice(0, 3).map((v) => (
              <div key={v.id} className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-4 shadow-soft">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-hero text-primary-foreground font-bold">
                  {v.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold truncate">{v.name}</p>
                    <span className="rounded-full bg-ai/10 px-2 py-0.5 text-[10px] font-bold text-ai shrink-0">{v.matchScore}%</span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" /> {v.distanceKm}km</span>
                    <span className="flex items-center gap-0.5"><Star className="h-3 w-3 fill-warning text-warning" /> {v.rating}</span>
                  </div>
                </div>
                <Button size="sm" variant="outline">Convidar</Button>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ONGs por ONGs preview */}
      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2"><Network className="h-5 w-5 text-ai" /> ONGs por ONGs</h2>
            <p className="text-xs text-muted-foreground">Cooperação entre instituições orquestrada pela IA</p>
          </div>
          <Button asChild variant="ghost" size="sm"><Link to="/ong/network">Ver tudo <ArrowRight className="ml-1 h-3 w-3" /></Link></Button>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {ngoConnections.slice(0, 3).map((c) => (
            <Link
              key={c.id}
              to="/ong/network/$connectionId"
              params={{ connectionId: c.id }}
              className="rounded-2xl border border-border/60 bg-card p-4 shadow-soft hover:shadow-elegant transition-all hover:-translate-y-0.5"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-ai text-ai-foreground font-bold text-sm">{c.orgInitials}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{c.org}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{c.city}</p>
                </div>
                <span className="rounded-full bg-ai/10 px-2 py-0.5 text-[10px] font-bold text-ai">{c.matchScore}%</span>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">{c.matchedItem}</p>
              <div className="mt-2 flex items-center justify-between text-[11px]">
                <span className={cn(
                  "rounded-full px-2 py-0.5 font-medium",
                  c.status === "active" ? "bg-success/15 text-success" :
                  c.status === "pending" ? "bg-warning/15 text-warning" :
                  "bg-muted text-muted-foreground"
                )}>
                  {c.status === "active" ? "Ativa" : c.status === "pending" ? "Pendente" : "Concluída"}
                </span>
                <span className="text-muted-foreground">{c.lastMessageAgo}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
