import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { actions } from "@/lib/mock-data";
import { MapPin, Navigation, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/volunteer/map")({
  head: () => ({ meta: [{ title: "Mapa — Voluntário · Orquestra" }, { name: "description", content: "Veja ações de voluntariado próximas no mapa." }] }),
  component: VolunteerMap,
});

function VolunteerMap() {
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
                <div key={a.id} style={{ left: p.l, top: p.t }} className={cn("absolute -translate-x-1/2 -translate-y-1/2", a.urgency === "high" && "animate-pulse-ring rounded-full")}>
                  <div className={cn("flex h-9 w-9 items-center justify-center rounded-full shadow-elegant", color)}>
                    <MapPin className="h-4 w-4 text-white" />
                  </div>
                </div>
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
            <div key={a.id} className="flex items-start gap-3 rounded-xl border border-border/60 bg-card p-3 shadow-soft">
              <div className={cn("mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full", a.urgency === "high" ? "bg-urgent" : a.urgency === "medium" ? "bg-warning" : "bg-success")} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold leading-tight truncate">{a.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{a.distanceKm} km · {a.location}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
