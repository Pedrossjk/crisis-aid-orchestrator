import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { ActionCard } from "@/components/ActionCard";
import { actions, crises } from "@/lib/mock-data";
import { Sparkles, Search, Filter, Flame, ArrowRight, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/volunteer/")({
  head: () => ({
    meta: [
      { title: "Início — Voluntário · Orquestra" },
      { name: "description", content: "Feed de ações de voluntariado recomendadas pela IA. Crises ativas e oportunidades próximas." },
    ],
  }),
  component: VolunteerHome,
});

function VolunteerHome() {
  const recommended = actions.filter((a) => a.isAiRecommended);
  const all = actions;

  return (
    <AppShell role="volunteer">
      <div className="space-y-8">
        {/* Greeting */}
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Olá, Vitória 👋</h1>
          <p className="mt-1 text-muted-foreground">A IA encontrou <span className="font-semibold text-ai">{recommended.length} ações ideais</span> para você hoje.</p>
        </div>

        {/* Search */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por ação, ONG ou local…" className="pl-9" />
          </div>
          <Button variant="outline" size="icon"><Filter className="h-4 w-4" /></Button>
        </div>

        {/* Crisis section */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <Flame className="h-5 w-5 text-urgent" />
              Crises ativas
            </h2>
            <button className="text-xs font-medium text-primary hover:underline">Ver todas</button>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {crises.map((c) => (
              <div key={c.id} className="relative overflow-hidden rounded-2xl border border-border/60 bg-card p-4 shadow-soft">
                {c.severity === "high" && (
                  <span className="absolute right-3 top-3 flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-urgent opacity-60" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-urgent" />
                  </span>
                )}
                <div className={cn(
                  "absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-10",
                  c.severity === "high" ? "bg-urgent" : "bg-warning"
                )} />
                <p className="text-xs font-medium text-muted-foreground">{c.region}</p>
                <p className="mt-1 font-bold leading-tight">{c.name}</p>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <div>
                    <p className="text-muted-foreground">Afetados</p>
                    <p className="font-bold">{c.affected.toLocaleString("pt-BR")}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-muted-foreground">Ações</p>
                    <p className="font-bold">{c.activeActions}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* AI Recommendations */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-bold">
                <Sparkles className="h-5 w-5 text-ai" />
                <span className="text-gradient-ai">Recomendadas para você</span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">Baseado em suas habilidades, localização e disponibilidade</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {recommended.map((a) => <ActionCard key={a.id} action={a} />)}
          </div>
        </section>

        {/* All actions */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <TrendingUp className="h-5 w-5 text-primary" />
              Todas as ações
            </h2>
            <button className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              Ver todas <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {all.map((a) => <ActionCard key={a.id} action={a} />)}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
