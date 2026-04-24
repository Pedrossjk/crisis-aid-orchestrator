import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { resourceOffers, requests, helpTypeLabels } from "@/lib/mock-data";
import { Plus, Sparkles, Package, ArrowRight, MapPin, Building2, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/ong-offer/")({
  head: () => ({ meta: [{ title: "Painel — ONG oferece ajuda · Orquestra" }, { name: "description", content: "Gestão de recursos disponíveis e match inteligente entre instituições." }] }),
  component: OngOfferDashboard,
});

function OngOfferDashboard() {
  return (
    <AppShell role="ong-offer">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Painel · Mercado Solidário</h1>
          <p className="mt-1 text-muted-foreground">Disponibilize recursos e conecte-se a quem precisa.</p>
        </div>
        <Button className="bg-gradient-ai shadow-elegant text-ai-foreground"><Plus className="mr-1 h-4 w-4" /> Cadastrar recurso</Button>
      </div>

      {/* AI Match highlight */}
      <div className="mt-6 rounded-2xl bg-gradient-ai p-5 text-ai-foreground shadow-elegant">
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">23 matches encontrados pela IA hoje</p>
            <p className="mt-1 text-sm opacity-90">
              Suas 300 cestas básicas combinam com 4 ações urgentes. Cruz Verde Brasil precisa de 80 unidades em Blumenau (2.4 km).
            </p>
          </div>
          <Button size="sm" variant="secondary" className="shrink-0">Ver matches</Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="mt-6 grid gap-3 md:grid-cols-3">
        {[
          { icon: Package, label: "Recursos disponíveis", value: 12, color: "text-primary" },
          { icon: TrendingUp, label: "Matches ativos", value: 23, color: "text-ai" },
          { icon: Building2, label: "ONGs conectadas", value: 47, color: "text-success" },
        ].map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="rounded-2xl border border-border/60 bg-card p-5 shadow-soft">
              <Icon className={`h-5 w-5 ${k.color}`} />
              <p className="mt-3 text-3xl font-bold">{k.value}</p>
              <p className="text-xs text-muted-foreground">{k.label}</p>
            </div>
          );
        })}
      </div>

      {/* My resources */}
      <section className="mt-8">
        <h2 className="text-lg font-bold">Meus recursos</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {resourceOffers.map((r) => (
            <div key={r.id} className="rounded-2xl border border-border/60 bg-card p-5 shadow-soft">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium">{helpTypeLabels[r.category]}</span>
                  <p className="mt-2 font-bold">{r.resource}</p>
                  <p className="text-sm text-muted-foreground">{r.quantity}</p>
                </div>
                <span className="rounded-full bg-ai/10 px-2 py-1 text-[10px] font-bold text-ai flex items-center gap-1 shrink-0">
                  <Sparkles className="h-2.5 w-2.5" /> {r.matchedNeeds} matches
                </span>
              </div>
              <p className="mt-3 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" /> {r.location}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Open requests from other ONGs */}
      <section className="mt-8">
        <h2 className="text-lg font-bold">Solicitações de outras ONGs</h2>
        <div className="mt-3 space-y-3">
          {requests.slice(0, 3).map((r) => (
            <div key={r.id} className="flex items-center gap-4 rounded-2xl border border-border/60 bg-card p-4 shadow-soft">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10 text-success"><Building2 className="h-5 w-5" /></div>
              <div className="flex-1">
                <p className="font-semibold text-sm">{r.description}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{helpTypeLabels[r.helpType]} · {r.location}</p>
              </div>
              <Button size="sm" variant="outline">Conectar <ArrowRight className="ml-1 h-3 w-3" /></Button>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
