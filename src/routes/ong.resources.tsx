import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { resourceOffers, helpTypeLabels } from "@/lib/mock-data";
import { Plus, MapPin, Sparkles, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/ong/resources")({
  head: () => ({
    meta: [
      { title: "Recursos — ONG · Orquestra" },
      { name: "description", content: "Cadastre recursos disponíveis e deixe a IA conectar com instituições que precisam." },
    ],
  }),
  component: ResourcesPage,
});

function ResourcesPage() {
  return (
    <AppShell role="ong">
      <h1 className="text-2xl font-bold md:text-3xl flex items-center gap-2">
        <Package className="h-7 w-7 text-primary" /> Recursos
      </h1>
      <p className="mt-1 text-muted-foreground">O que sua instituição pode oferecer a outras ONGs.</p>

      <Tabs defaultValue="mine" className="mt-6">
        <TabsList>
          <TabsTrigger value="mine">Meus recursos</TabsTrigger>
          <TabsTrigger value="new">Cadastrar recurso</TabsTrigger>
        </TabsList>

        <TabsContent value="mine" className="mt-5">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {resourceOffers.map((r) => (
              <div key={r.id} className="rounded-2xl border border-border/60 bg-card p-5 shadow-soft">
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ai/10 text-ai"><Package className="h-5 w-5" /></div>
                  <span className="rounded-full bg-ai/10 px-2 py-0.5 text-[10px] font-bold text-ai flex items-center gap-1"><Sparkles className="h-2.5 w-2.5" />{r.matchedNeeds} matches</span>
                </div>
                <p className="mt-3 font-bold">{r.resource}</p>
                <p className="text-sm text-muted-foreground">{r.quantity}</p>
                <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="rounded-md bg-muted px-2 py-0.5">{helpTypeLabels[r.category]}</span>
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{r.location}</span>
                </div>
                <Button variant="outline" size="sm" className="mt-4 w-full">Ver matches</Button>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="new" className="mt-5">
          <div className="max-w-2xl rounded-2xl border border-border/60 bg-card p-6 shadow-soft">
            <h2 className="font-bold flex items-center gap-2"><Plus className="h-4 w-4" /> Cadastrar recurso disponível</h2>
            <p className="mt-1 text-xs text-muted-foreground">Descreva o recurso. A IA encontrará automaticamente ONGs que precisam.</p>
            <div className="mt-5 space-y-4">
              <div>
                <Label className="text-xs">Nome do recurso</Label>
                <Input placeholder="Ex.: 300 cestas básicas" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Descrição</Label>
                <Textarea placeholder="Detalhes, condições de retirada, validade…" className="mt-1 min-h-20" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Categoria</Label>
                  <select className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    {Object.entries(helpTypeLabels).map(([k, v]) => <option key={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Quantidade</Label>
                  <Input placeholder="Ex.: 300 unidades" className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Localização</Label>
                  <Input placeholder="Cidade / Estado" className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Disponível até</Label>
                  <Input type="date" className="mt-1" />
                </div>
              </div>
              <Button className="w-full bg-gradient-ai text-ai-foreground shadow-soft">Publicar recurso</Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
