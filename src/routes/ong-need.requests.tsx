import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { requests, helpTypeLabels, urgencyLabels, type Urgency } from "@/lib/mock-data";
import { MapPin, Plus, Flame, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/ong-need/requests")({
  head: () => ({ meta: [{ title: "Solicitações — Orquestra" }, { name: "description", content: "Solicitações de pessoas e casos abertos para sua ONG assumir." }] }),
  component: RequestsPage,
});

const urgencyStyles: Record<Urgency, string> = {
  high: "bg-urgent text-urgent-foreground",
  medium: "bg-warning text-warning-foreground",
  low: "bg-success text-success-foreground",
};

function RequestsPage() {
  return (
    <AppShell role="ong-need">
      <h1 className="text-2xl font-bold md:text-3xl">Solicitações abertas</h1>
      <p className="mt-1 text-muted-foreground">Pessoas e casos aguardando atendimento. Assuma para transformar em ação.</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {requests.map((r) => (
            <div key={r.id} className="rounded-2xl border border-border/60 bg-card p-5 shadow-soft">
              <div className="flex flex-wrap items-center gap-2">
                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase flex items-center gap-1", urgencyStyles[r.urgency])}>
                  {r.urgency === "high" && <Flame className="h-3 w-3" />}
                  {urgencyLabels[r.urgency]}
                </span>
                <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium">{helpTypeLabels[r.helpType]}</span>
                {r.status === "assigned" && (
                  <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold text-success">Atribuído a {r.assignedTo}</span>
                )}
              </div>
              <p className="mt-3 font-semibold">{r.description}</p>
              <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {r.location}</span>
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {r.postedAgo}</span>
              </div>
              {r.status === "open" && (
                <div className="mt-4 flex gap-2">
                  <Button variant="outline" className="flex-1">Ver detalhes</Button>
                  <Button className="flex-1 bg-primary">Assumir caso</Button>
                </div>
              )}
            </div>
          ))}
        </div>

        <aside className="rounded-2xl border border-border/60 bg-card p-5 shadow-soft h-fit">
          <h2 className="font-bold flex items-center gap-2"><Plus className="h-4 w-4" /> Nova solicitação</h2>
          <p className="mt-1 text-xs text-muted-foreground">Cadastre um caso para ONGs avaliarem.</p>
          <div className="mt-4 space-y-3">
            <div>
              <Label className="text-xs">Descrição</Label>
              <Textarea placeholder="Descreva a necessidade…" className="mt-1 min-h-20" />
            </div>
            <div>
              <Label className="text-xs">Localização</Label>
              <Input placeholder="Cidade / Estado" className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Tipo</Label>
                <select className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  {Object.entries(helpTypeLabels).map(([k, v]) => <option key={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-xs">Urgência</Label>
                <select className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option>Urgente</option><option>Moderada</option><option>Baixa</option>
                </select>
              </div>
            </div>
            <Button className="w-full bg-gradient-hero shadow-soft">Enviar solicitação</Button>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
