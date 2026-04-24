import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { ActionPost } from "@/components/ActionPost";
import { actions, crises } from "@/lib/mock-data";
import { Sparkles, Search, Flame, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/volunteer/")({
  head: () => ({
    meta: [
      { title: "Feed — Voluntário · Orquestra" },
      { name: "description", content: "Feed social de ações de voluntariado. Crises ativas e oportunidades recomendadas pela IA." },
    ],
  }),
  component: VolunteerHome,
});

function VolunteerHome() {
  const recommended = actions.filter((a) => a.isAiRecommended);

  // Build a single timeline mixing recommendations and other actions
  const timeline = [
    ...recommended,
    ...actions.filter((a) => !a.isAiRecommended),
  ];

  return (
    <AppShell role="volunteer">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Greeting */}
        <div>
          <h1 className="text-2xl font-bold">Olá, Vitória 👋</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            <span className="font-semibold text-ai">{recommended.length} ações ideais</span> esperando por você hoje.
          </p>
        </div>

        {/* Compact search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar ações, ONGs, locais…" className="pl-9 rounded-full bg-card" />
        </div>

        {/* Crisis carousel — horizontal, compact */}
        <section>
          <div className="mb-2 flex items-center gap-2 px-1">
            <Flame className="h-4 w-4 text-urgent" />
            <h2 className="text-sm font-bold">Crises ativas</h2>
            <span className="ml-auto text-[11px] text-muted-foreground">{crises.length} regiões</span>
          </div>
          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 snap-x">
            {crises.map((c) => (
              <div
                key={c.id}
                className="snap-start min-w-[240px] relative overflow-hidden rounded-2xl border border-border/60 bg-card p-4 shadow-soft"
              >
                {c.severity === "high" && (
                  <span className="absolute right-3 top-3 flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-urgent opacity-60" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-urgent" />
                  </span>
                )}
                <div className={cn(
                  "absolute -right-8 -top-8 h-20 w-20 rounded-full opacity-10",
                  c.severity === "high" ? "bg-urgent" : "bg-warning"
                )} />
                <p className="text-[10px] font-medium uppercase text-muted-foreground">{c.region}</p>
                <p className="mt-1 text-sm font-bold leading-tight">{c.name}</p>
                <div className="mt-3 flex items-center justify-between text-[11px]">
                  <div>
                    <p className="text-muted-foreground">Afetados</p>
                    <p className="font-bold text-sm">{c.affected.toLocaleString("pt-BR")}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-muted-foreground">Ações</p>
                    <p className="font-bold text-sm">{c.activeActions}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* AI recommendation strip */}
        <div className="flex items-center gap-3 rounded-2xl bg-gradient-ai p-4 text-ai-foreground shadow-soft">
          <Sparkles className="h-5 w-5 shrink-0" />
          <div className="flex-1 text-sm">
            <p className="font-semibold">Feed personalizado pela IA</p>
            <p className="text-xs opacity-90">Ordenado por compatibilidade com suas habilidades e localização.</p>
          </div>
        </div>

        {/* Single-column timeline */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold">Seu feed</h2>
          </div>
          {timeline.map((a) => (
            <ActionPost key={a.id} action={a} />
          ))}
        </section>
      </div>
    </AppShell>
  );
}
