import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { ngoConnections, resourceOffers, requests, helpTypeLabels } from "@/lib/mock-data";
import { Sparkles, ArrowRight, Building2, MapPin, Network, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/ong/network/")({
  head: () => ({
    meta: [
      { title: "ONGs por ONGs — Orquestra" },
      { name: "description", content: "Cooperação entre instituições: matches da IA, conexões ativas e ONGs próximas." },
    ],
  }),
  component: NetworkPage,
});

function NetworkPage() {
  return (
    <AppShell role="ong">
      <h1 className="text-2xl font-bold md:text-3xl flex items-center gap-2">
        <Network className="h-7 w-7 text-ai" />
        <span className="text-gradient-ai">ONGs por ONGs</span>
      </h1>
      <p className="mt-1 text-muted-foreground">A IA conecta sua instituição a outras que oferecem ou precisam exatamente do que você tem.</p>

      <Tabs defaultValue="matches" className="mt-6">
        <TabsList>
          <TabsTrigger value="matches">Matches da IA</TabsTrigger>
          <TabsTrigger value="active">Conexões ativas</TabsTrigger>
          <TabsTrigger value="needs">Solicitações de outras ONGs</TabsTrigger>
        </TabsList>

        {/* AI Matches */}
        <TabsContent value="matches" className="mt-5 space-y-4">
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
                  <Button asChild className="flex-1 bg-gradient-ai text-ai-foreground">
                    <Link to="/ong/network/$connectionId" params={{ connectionId: ngoConnections[i]?.id ?? "n1" }}>
                      <Sparkles className="mr-1 h-4 w-4" /> Conectar agora
                    </Link>
                  </Button>
                </div>
              </div>
            );
          })}
        </TabsContent>

        {/* Active connections */}
        <TabsContent value="active" className="mt-5 space-y-3">
          {ngoConnections.map((c) => (
            <Link
              key={c.id}
              to="/ong/network/$connectionId"
              params={{ connectionId: c.id }}
              className="flex items-center gap-4 rounded-2xl border border-border/60 bg-card p-4 shadow-soft hover:shadow-elegant transition"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-ai text-ai-foreground font-bold">{c.orgInitials}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold truncate">{c.org}</p>
                  <span className="rounded-full bg-ai/10 px-2 py-0.5 text-[10px] font-bold text-ai shrink-0">{c.matchScore}%</span>
                </div>
                <p className="text-xs text-muted-foreground truncate">{c.matchedItem}</p>
                <div className="mt-1 flex items-center gap-2 text-[11px]">
                  <span className={cn(
                    "rounded-full px-2 py-0.5 font-medium",
                    c.status === "active" ? "bg-success/15 text-success" :
                    c.status === "pending" ? "bg-warning/15 text-warning" :
                    "bg-muted text-muted-foreground"
                  )}>
                    {c.status === "active" ? "Ativa" : c.status === "pending" ? "Pendente" : "Concluída"}
                  </span>
                  <span className="text-muted-foreground">{c.lastMessageAgo}</span>
                </div>
              </div>
              {c.unread ? (
                <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-urgent px-1.5 text-[11px] font-bold text-urgent-foreground">
                  {c.unread}
                </span>
              ) : (
                <MessageCircle className="h-5 w-5 text-muted-foreground" />
              )}
            </Link>
          ))}
        </TabsContent>

        {/* Outras ONGs precisando */}
        <TabsContent value="needs" className="mt-5 space-y-3">
          {requests.map((r) => (
            <div key={r.id} className="flex items-center gap-4 rounded-2xl border border-border/60 bg-card p-4 shadow-soft">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10 text-success"><Building2 className="h-5 w-5" /></div>
              <div className="flex-1">
                <p className="font-semibold text-sm">{r.description}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{helpTypeLabels[r.helpType]} · {r.location}</p>
              </div>
              <Button size="sm" variant="outline">Conectar <ArrowRight className="ml-1 h-3 w-3" /></Button>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
