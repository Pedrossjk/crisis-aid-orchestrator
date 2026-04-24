import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { actions, requests, helpTypeLabels, urgencyLabels, type Urgency } from "@/lib/mock-data";
import { Plus, MapPin, Flame, Clock, Users, ListChecks, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/ong/actions")({
  head: () => ({
    meta: [
      { title: "Ações — ONG · Orquestra" },
      { name: "description", content: "Cadastre e gerencie ações de mobilização de voluntários e responda a solicitações abertas." },
    ],
  }),
  component: ActionsPage,
});

const urgencyStyles: Record<Urgency, string> = {
  high: "bg-urgent text-urgent-foreground",
  medium: "bg-warning text-warning-foreground",
  low: "bg-success text-success-foreground",
};

function ActionsPage() {
  return (
    <AppShell role="ong">
      <h1 className="text-2xl font-bold md:text-3xl flex items-center gap-2">
        <ListChecks className="h-7 w-7 text-primary" /> Ações
      </h1>
      <p className="mt-1 text-muted-foreground">Crie ações que mobilizam voluntários ou assuma solicitações abertas.</p>

      <Tabs defaultValue="mine" className="mt-6">
        <TabsList>
          <TabsTrigger value="mine">Minhas ações</TabsTrigger>
          <TabsTrigger value="requests">Solicitações abertas</TabsTrigger>
          <TabsTrigger value="new">Nova ação</TabsTrigger>
        </TabsList>

        <TabsContent value="mine" className="mt-5">
          <div className="space-y-3">
            {actions.map((a) => {
              const pct = (a.volunteersJoined / a.volunteersNeeded) * 100;
              return (
                <div key={a.id} className="rounded-2xl border border-border/60 bg-card p-5 shadow-soft">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase flex items-center gap-1", urgencyStyles[a.urgency])}>
                      {a.urgency === "high" && <Flame className="h-3 w-3" />}
                      {urgencyLabels[a.urgency]}
                    </span>
                    {a.helpTypes.map((t) => (
                      <span key={t} className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium">{helpTypeLabels[t]}</span>
                    ))}
                    <span className="ml-auto text-xs text-muted-foreground">{a.postedAgo}</span>
                  </div>
                  <p className="mt-3 font-semibold">{a.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{a.description}</p>
                  <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {a.location}</span>
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {a.volunteersJoined}/{a.volunteersNeeded}</span>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-gradient-hero" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button variant="outline" className="flex-1">Ver candidatos</Button>
                    <Button className="flex-1 bg-primary">Gerenciar</Button>
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="requests" className="mt-5">
          <p className="text-sm text-muted-foreground mb-4 flex items-center gap-2">
            <Inbox className="h-4 w-4" /> Casos enviados por pessoas ou outras instituições. Assuma para transformar em ação.
          </p>
          <div className="space-y-3">
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
        </TabsContent>

        <TabsContent value="new" className="mt-5">
          <div className="max-w-2xl rounded-2xl border border-border/60 bg-card p-6 shadow-soft">
            <h2 className="font-bold flex items-center gap-2"><Plus className="h-4 w-4" /> Cadastrar nova ação</h2>
            <p className="mt-1 text-xs text-muted-foreground">A IA usará esses dados para recomendar voluntários ideais.</p>
            <div className="mt-5 space-y-4">
              <div>
                <Label className="text-xs">Título</Label>
                <Input placeholder="Ex.: Distribuição de cestas básicas" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Descrição</Label>
                <Textarea placeholder="Descreva a ação e o tipo de apoio necessário…" className="mt-1 min-h-24" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Localização</Label>
                  <Input placeholder="Cidade / Estado" className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Esforço estimado</Label>
                  <Input placeholder="Ex.: 4h presencial" className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Tipo de ajuda</Label>
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
                <div>
                  <Label className="text-xs">Voluntários necessários</Label>
                  <Input type="number" placeholder="20" className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Data limite</Label>
                  <Input type="date" className="mt-1" />
                </div>
              </div>
              <Button className="w-full bg-gradient-hero shadow-soft">Publicar ação</Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
