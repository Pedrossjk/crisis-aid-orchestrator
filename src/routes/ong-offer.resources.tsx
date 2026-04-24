import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { resourceOffers, helpTypeLabels } from "@/lib/mock-data";
import { Plus, MapPin, Sparkles, Package } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/ong-offer/resources")({
  head: () => ({ meta: [{ title: "Recursos — ONG · Orquestra" }, { name: "description", content: "Cadastre e gerencie recursos disponíveis." }] }),
  component: ResourcesPage,
});

function ResourcesPage() {
  return (
    <AppShell role="ong-offer">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Recursos disponíveis</h1>
          <p className="mt-1 text-muted-foreground">Cadastre o que sua instituição pode oferecer.</p>
        </div>
        <Button className="bg-gradient-ai text-ai-foreground"><Plus className="mr-1 h-4 w-4" /> Novo</Button>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {resourceOffers.map((r) => (
          <div key={r.id} className="rounded-2xl border border-border/60 bg-card p-5 shadow-soft">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ai/10 text-ai"><Package className="h-5 w-5" /></div>
              <span className="rounded-full bg-ai/10 px-2 py-0.5 text-[10px] font-bold text-ai flex items-center gap-1"><Sparkles className="h-2.5 w-2.5" />{r.matchedNeeds}</span>
            </div>
            <p className="mt-3 font-bold">{r.resource}</p>
            <p className="text-sm text-muted-foreground">{r.quantity}</p>
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="rounded-md bg-muted px-2 py-0.5">{helpTypeLabels[r.category]}</span>
              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{r.location}</span>
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
