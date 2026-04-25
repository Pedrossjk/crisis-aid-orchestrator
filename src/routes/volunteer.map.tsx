import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { actions } from "@/lib/mock-data";
import { MapPin, Navigation, Layers, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import type { CrisisAction } from "@/lib/mock-data";
import { urgencyLabels, helpTypeLabels } from "@/lib/mock-data";
import { Clock, Users, Flame, Sparkles } from "lucide-react";

export const Route = createFileRoute("/volunteer/map")({
  head: () => ({ meta: [{ title: "Mapa — Voluntário · Orquestra" }, { name: "description", content: "Veja ações de voluntariado próximas no mapa." }] }),
  component: VolunteerMap,
});

const urgencyStyles: Record<string, string> = {
  high: "bg-urgent text-urgent-foreground",
  medium: "bg-warning text-warning-foreground",
  low: "bg-success text-success-foreground",
};

function ActionPreviewSheet({ action, open, onClose }: { action: CrisisAction | null; open: boolean; onClose: () => void }) {
  if (!action) return null;
  const filledPct = (action.volunteersJoined / action.volunteersNeeded) * 100;
  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl pb-8 max-h-[85vh] overflow-y-auto">
        <SheetHeader className="mb-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase", urgencyStyles[action.urgency])}>
              {action.urgency === "high" && <Flame className="h-3 w-3" />}
              {urgencyLabels[action.urgency]}
            </span>
            {action.isAiRecommended && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gradient-ai px-2.5 py-1 text-[10px] font-bold uppercase text-ai-foreground">
                <Sparkles className="h-3 w-3" /> Recomendada pela IA
              </span>
            )}
          </div>
          <SheetTitle className="text-xl font-bold leading-snug mt-1">{action.title}</SheetTitle>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-hero text-xs font-bold text-primary-foreground shrink-0">
              {action.orgAvatar}
            </div>
            <div>
              <p className="text-sm font-semibold">{action.org}</p>
              <p className="text-xs text-muted-foreground">Postado {action.postedAgo}</p>
            </div>
          </div>
        </SheetHeader>

        <p className="text-sm text-muted-foreground leading-relaxed">{action.description}</p>

        <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
          <div className="rounded-xl bg-muted p-3">
            <MapPin className="h-4 w-4 text-primary" />
            <p className="mt-1 font-semibold">{action.distanceKm} km</p>
            <p className="text-xs text-muted-foreground">{action.location}</p>
          </div>
          <div className="rounded-xl bg-muted p-3">
            <Clock className="h-4 w-4 text-primary" />
            <p className="mt-1 font-semibold">{action.effort}</p>
            <p className="text-xs text-muted-foreground">Esforço</p>
          </div>
          <div className="rounded-xl bg-muted p-3">
            <Users className="h-4 w-4 text-primary" />
            <p className="mt-1 font-semibold">{action.volunteersJoined}/{action.volunteersNeeded}</p>
            <p className="text-xs text-muted-foreground">Voluntários</p>
          </div>
        </div>

        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-gradient-hero" style={{ width: `${filledPct}%` }} />
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">{Math.round(filledPct)}% das vagas preenchidas</p>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {action.helpTypes.map((t) => (
            <span key={t} className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {helpTypeLabels[t]}
            </span>
          ))}
        </div>

        <div className="mt-5 flex gap-3">
          <Button asChild className="flex-1 bg-gradient-hero shadow-elegant" size="lg">
            <Link to="/volunteer/action/$actionId" params={{ actionId: action.id }} onClick={onClose}>
              Ver detalhes completos <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function VolunteerMap() {
  const [selectedAction, setSelectedAction] = useState<CrisisAction | null>(null);
  return (
    <AppShell role="volunteer">
      <h1 className="text-2xl font-bold">Mapa de ações</h1>
      <p className="mt-1 text-muted-foreground text-sm">{actions.length} ações ativas próximas a você</p>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 overflow-hidden rounded-2xl border border-border/60 bg-card shadow-soft">
          <div className="relative h-[60vh] bg-gradient-to-br from-primary/15 via-accent to-ai/15">
            <svg className="absolute inset-0 h-full w-full opacity-30" viewBox="0 0 600 500" preserveAspectRatio="none">
              <defs>
                <pattern id="grid2" width="30" height="30" patternUnits="userSpaceOnUse">
                  <path d="M 30 0 L 0 0 0 30" fill="none" stroke="currentColor" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="600" height="500" fill="url(#grid2)" className="text-primary" />
            </svg>

            {/* You */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="h-4 w-4 rounded-full bg-primary ring-4 ring-primary/30 animate-pulse" />
            </div>

            {/* Action pins */}
            {actions.map((a, i) => {
              const positions = [
                { l: "20%", t: "30%" }, { l: "70%", t: "25%" }, { l: "30%", t: "70%" },
                { l: "75%", t: "60%" }, { l: "55%", t: "20%" }, { l: "15%", t: "60%" },
              ];
              const p = positions[i % positions.length];
              const color = a.urgency === "high" ? "bg-urgent" : a.urgency === "medium" ? "bg-warning" : "bg-success";
              return (
                <button
                  key={a.id}
                  style={{ left: p.l, top: p.t }}
                  className={cn("absolute -translate-x-1/2 -translate-y-1/2 group", a.urgency === "high" && "animate-pulse-ring rounded-full")}
                  onClick={() => setSelectedAction(a)}
                  aria-label={`Ver detalhes: ${a.title}`}
                >
                  <div className={cn("flex h-9 w-9 items-center justify-center rounded-full shadow-elegant transition-transform group-hover:scale-110", color)}>
                    <MapPin className="h-4 w-4 text-white" />
                  </div>
                </button>
              );
            })}

            <button className="absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center rounded-xl bg-card shadow-elegant">
              <Layers className="h-5 w-5" />
            </button>
            <button className="absolute bottom-16 right-4 flex h-10 w-10 items-center justify-center rounded-xl bg-card shadow-elegant">
              <Navigation className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="font-semibold text-sm">Ações próximas</h2>
          {actions.slice(0, 5).map((a) => (
            <button
              key={a.id}
              className="flex w-full items-start gap-3 rounded-xl border border-border/60 bg-card p-3 shadow-soft text-left transition-all hover:shadow-elegant hover:border-primary/30"
              onClick={() => setSelectedAction(a)}
            >
              <div className={cn("mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full", a.urgency === "high" ? "bg-urgent" : a.urgency === "medium" ? "bg-warning" : "bg-success")} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold leading-tight truncate">{a.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{a.distanceKm} km · {a.location}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            </button>
          ))}
        </div>
      </div>

      <ActionPreviewSheet
        action={selectedAction}
        open={selectedAction !== null}
        onClose={() => setSelectedAction(null)}
      />
    </AppShell>
  );
}
