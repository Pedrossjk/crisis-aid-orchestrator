import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { matchedVolunteers } from "@/lib/mock-data";
import { MapPin, Star, Check, X, MessageCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/ong-need/volunteers")({
  head: () => ({ meta: [{ title: "Voluntários — ONG · Orquestra" }, { name: "description", content: "Gerencie candidatos e voluntários ativos." }] }),
  component: VolunteersPage,
});

function VolunteersPage() {
  return (
    <AppShell role="ong-need">
      <h1 className="text-2xl font-bold md:text-3xl">Voluntários</h1>
      <p className="mt-1 text-muted-foreground">Candidatos, ativos e avaliações pós-ação.</p>

      <Input placeholder="Buscar voluntário…" className="mt-6 max-w-md" />

      <div className="mt-6 flex gap-2 overflow-x-auto">
        {["Todos (24)", "Pendentes (8)", "Ativos (12)", "Concluídos (4)"].map((t, i) => (
          <button key={t} className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium ${i === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-3">
        {[...matchedVolunteers, ...matchedVolunteers].map((v, i) => (
          <div key={i} className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-4 shadow-soft">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-hero text-primary-foreground font-bold">
              {v.initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold">{v.name}</p>
                {i < 3 && <span className="rounded-full bg-ai/10 px-2 py-0.5 text-[10px] font-bold text-ai flex items-center gap-0.5"><Sparkles className="h-2.5 w-2.5" />{v.matchScore}%</span>}
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" /> {v.distanceKm}km</span>
                <span className="flex items-center gap-0.5"><Star className="h-3 w-3 fill-warning text-warning" /> {v.rating}</span>
                <span>{v.skills.join(" · ")}</span>
              </div>
            </div>
            <div className="flex gap-1">
              <Button size="icon" variant="outline" aria-label="Mensagem"><MessageCircle className="h-4 w-4" /></Button>
              <Button size="icon" variant="outline" className="text-destructive" aria-label="Recusar"><X className="h-4 w-4" /></Button>
              <Button size="icon" className="bg-success hover:bg-success/90" aria-label="Aceitar"><Check className="h-4 w-4" /></Button>
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
