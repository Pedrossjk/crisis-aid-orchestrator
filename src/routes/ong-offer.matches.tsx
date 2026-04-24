import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { resourceOffers, requests, helpTypeLabels } from "@/lib/mock-data";
import { Sparkles, ArrowRight, Building2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/ong-offer/matches")({
  head: () => ({ meta: [{ title: "Matches IA — Orquestra" }, { name: "description", content: "Conexões inteligentes entre instituições." }] }),
  component: MatchesPage,
});

function MatchesPage() {
  return (
    <AppShell role="ong-offer">
      <h1 className="text-2xl font-bold md:text-3xl flex items-center gap-2">
        <Sparkles className="h-7 w-7 text-ai" />
        <span className="text-gradient-ai">Matches inteligentes</span>
      </h1>
      <p className="mt-1 text-muted-foreground">A IA conecta seus recursos às necessidades certas.</p>

      <div className="mt-6 space-y-4">
        {resourceOffers.slice(0, 3).map((r, i) => {
          const need = requests[i];
          return (
            <div key={r.id} className="rounded-2xl border border-ai/30 bg-card p-5 shadow-elegant">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-gradient-ai px-3 py-1 text-[10px] font-bold text-ai-foreground">MATCH {92 - i * 4}%</span>
                <span className="text-xs text-muted-foreground">há {i + 1}h</span>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-center">
                <div className="rounded-xl bg-ai/5 p-4">
                  <p className="text-[10px] font-bold uppercase text-ai">Você oferece</p>
                  <p className="mt-1 font-bold">{r.resource}</p>
                  <p className="text-xs text-muted-foreground">{r.quantity} · {r.location}</p>
                </div>
                <ArrowRight className="hidden md:block mx-auto h-5 w-5 text-ai" />
                <div className="rounded-xl bg-success/5 p-4">
                  <p className="text-[10px] font-bold uppercase text-success">Quem precisa</p>
                  <p className="mt-1 font-bold">{need?.description ?? "Nova demanda"}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><MapPin className="h-3 w-3" />{need?.location}</p>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button variant="outline" className="flex-1"><Building2 className="mr-1 h-4 w-4" /> Ver instituição</Button>
                <Button className="flex-1 bg-gradient-ai text-ai-foreground">Conectar agora</Button>
              </div>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
