import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { ActionPost } from "@/components/ActionPost";
import { actions, crises } from "@/lib/mock-data";
import { Sparkles, Search, Flame, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useState } from "react";

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
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);

  const recommended = actions.filter((a) => a.isAiRecommended);

  // Build a single timeline mixing recommendations and other actions, excluding hidden
  const timeline = [
    ...recommended,
    ...actions.filter((a) => !a.isAiRecommended),
  ].filter((a) => !hiddenIds.includes(a.id));

  function handleHide(id: string) {
    setHiddenIds((prev) => [...prev, id]);
  }

  return (
    <AppShell role="volunteer">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Greeting */}
        <div>
          <h1 className="text-2xl font-bold">Olá, Vitória</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            <span className="font-semibold text-ai">{recommended.length} ações ideais</span> esperando por você hoje.
          </p>
        </div>

        {/* AI recommendation strip */}
        <div className="flex items-center gap-3 bg-gradient-hero  p-4 text-ai-foreground shadow-soft">
          <Sparkles className="h-5 w-5 shrink-0" />
          <div className="flex-1 text-sm">
            <p className="font-semibold">Feed personalizado pela IA</p>
            <p className="text-xs opacity-90">Ordenado por compatibilidade com suas habilidades e localização.</p>
          </div>
        </div>

        {/* Compact search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar ações, ONGs, locais…" className="pl-9 rounded-full bg-card" />
        </div>

        {/* Crisis carousel — horizontal, compact */}
        <section>
          <div className="mb-3 flex items-center gap-2 px-1">
            <Flame className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold">Ações Recomendadas</h2>
            <span className="ml-auto text-[11px] text-muted-foreground">{crises.length} regiões</span>
          </div>
          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-3 snap-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {crises.map((c) => (
              <div
                key={c.id}
                className="snap-start min-w-[220px] relative overflow-hidden p-4 shadow-soft transition-all hover:shadow-elegant cursor-pointer">
                {/* Header: badge + região */}
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                    c.severity === "high"
                      ? "bg-urgent/10 text-urgent"
                      : "bg-warning/10 text-warning-foreground"
                  )}>
                    {c.severity === "high" && (
                      <span className="relative flex h-1.5 w-1.5 shrink-0">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-urgent opacity-70" />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-urgent" />
                      </span>
                    )}
                    {c.severity === "high" ? "Alta urgência" : "Moderada"}
                  </span>
                  <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground truncate">
                    {c.region}
                  </span>
                </div>

                <p className="text-sm font-bold leading-snug">{c.name}</p>

                <div className="my-3 h-px bg-border/60" />

                {/* Stats */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-muted-foreground">Afetados</p>
                    <p className="text-sm font-bold">{c.affected.toLocaleString("pt-BR")}</p>
                  </div>
                  <div className={cn(
                    "h-8 w-px",
                    c.severity === "high" ? "bg-urgent/20" : "bg-warning/20"
                  )} />
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground">Ações ativas</p>
                    <p className="text-sm font-bold">{c.activeActions}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>



        {/* Single-column timeline */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold">Seu feed</h2>
          </div>
          {timeline.length === 0 && (
            <div className="rounded-2xl border border-border/60 bg-card p-8 text-center text-muted-foreground text-sm shadow-soft">
              Nenhuma ação disponível no seu feed no momento.
            </div>
          )}
          {timeline.map((a) => (
            <ActionPost key={a.id} action={a} onHide={handleHide} />
          ))}
        </section>
      </div>
    </AppShell>
  );
}
