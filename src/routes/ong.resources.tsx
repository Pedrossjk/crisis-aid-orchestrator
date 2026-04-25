import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { resourceOffers, ngoConnections, helpTypeLabels, type ResourceOffer, type NgoConnection } from "@/lib/mock-data";
import { Plus, MapPin, Sparkles, Package, Building2, CheckCircle2, Send, Loader2, Network, Phone, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/ong/resources")({
  head: () => ({
    meta: [
      { title: "Recursos — ONG · Orquestra" },
      { name: "description", content: "Cadastre recursos disponíveis e deixe a IA conectar com instituições que precisam." },
    ],
  }),
  component: ResourcesPage,
});

// Rich profiles for the matched NGOs shown in Ver perfil
type RichNgoProfile = NgoConnection & { description?: string; areas?: string[]; phone?: string; website?: string };

const richNgoProfiles: Record<string, RichNgoProfile> = {
  n1: { ...ngoConnections[0], description: "Organização reconhecida pelo atendimento em crise hírica e distribuição de alimentos em Santa Catarina.", areas: ["Alimentos", "Logística", "Abrigo"], phone: "(47) 3399-1234", website: "cruzverdebrasil.org.br" },
  n2: { ...ngoConnections[1], description: "ONG especializada em resgates e transporte de animais em áreas de risco clímático.", areas: ["Transporte", "Resgate animal", "Bem-estar animal"], phone: "(47) 98877-5566", website: "patassolidarias.org" },
  n3: { ...ngoConnections[2], description: "Equipe médica voluntária que atua em triagem e primeiros socorros em abrigos emergenciais.", areas: ["Saúde", "Triagem", "Medicina de emergência"], phone: "(48) 99123-4567", website: "saudesemfronteiras.org.br" },
  n4: { ...ngoConnections[3], description: "Instituição focada em distribuição de alimentos e cobertores para famílias desabrigadas.", areas: ["Alimentação", "Suprimentos", "Abrigo familiar"], phone: "(47) 3212-9988", website: "maosquealimentam.org" },
};

function getRichProfile(ngo: NgoConnection): RichNgoProfile {
  return richNgoProfiles[ngo.id] ?? ngo;
}

// Mock: map resource id → matched NGO connections
const resourceMatchMap: Record<string, NgoConnection[]> = {
  r1: [ngoConnections[0], ngoConnections[3]],
  r2: [ngoConnections[1], ngoConnections[2]],
  r3: [ngoConnections[2], ngoConnections[0]],
  r4: [ngoConnections[3], ngoConnections[1], ngoConnections[0]],
};

function getMatchedNgos(resourceId: string): NgoConnection[] {
  return resourceMatchMap[resourceId] ?? ngoConnections.slice(0, 2);
}

type ContactState = { ngo: NgoConnection | null; message: string; sending: boolean; sent: boolean };

function ResourcesPage() {
  const { user } = useAuth();

  const [matchesResource, setMatchesResource] = useState<ResourceOffer | null>(null);
  const [contactedNgos, setContactedNgos] = useState<Set<string>>(new Set());
  const [contact, setContact] = useState<ContactState>({ ngo: null, message: "", sending: false, sent: false });
  const [resourceProfileNgo, setResourceProfileNgo] = useState<RichNgoProfile | null>(null);

  const buildContactMsg = (ngoName: string, resource: ResourceOffer): string => {
    const ongName = (user?.user_metadata?.full_name as string | undefined) ?? "nossa ONG";
    return `Olá, ${ngoName}!\n\nSou da ONG ${ongName} e identificamos que vocês podem se beneficiar do nosso recurso disponível: ${resource.resource} (${resource.quantity}) localizado em ${resource.location}.\n\nGostaríamos de entrar em contato para discutir como podemos colaborar nessa iniciativa.\n\nCom gratidão,\n${ongName}`;
  };

  const openContact = (ngo: NgoConnection) => {
    if (!matchesResource) return;
    setContact({ ngo, message: buildContactMsg(ngo.org, matchesResource), sending: false, sent: false });
  };

  const closeContact = () => setContact((s) => ({ ...s, ngo: null, sent: false }));

  const sendContact = async () => {
    if (!contact.ngo || !user) return;
    setContact((s) => ({ ...s, sending: true }));
    await supabase.from("notifications").insert({
      recipient_id: null, // NGO user lookup would require a profiles query; using null for mock
      sender_id: user.id,
      sender_name: (user.user_metadata?.full_name as string) ?? "ONG",
      type: "invite",
      title: `Proposta de parceria: ${matchesResource?.resource ?? "recurso"}`,
      body: contact.message,
      unread: true,
    });
    setContact((s) => ({ ...s, sending: false, sent: true }));
    setContactedNgos((prev) => new Set([...prev, contact.ngo!.id]));
  };

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
              <div key={r.id} className="border border-border/60 bg-card p-5 shadow-soft">
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
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 w-full gap-1.5"
                  onClick={() => { setMatchesResource(r); setContactedNgos(new Set()); }}
                >
                  <Sparkles className="h-3.5 w-3.5 text-ai" /> Ver matches
                </Button>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="new" className="mt-5">
          <div className="max-w-2xl border border-border/60 bg-card p-6 shadow-soft">
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

      {/* ── Matches Sheet ── */}
      <Sheet open={!!matchesResource} onOpenChange={(open) => { if (!open) setMatchesResource(null); }}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="mb-5">
            <SheetTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-ai" />
              <span className="text-gradient-ai">ONGs com match</span>
            </SheetTitle>
            {matchesResource && (
              <p className="text-xs text-muted-foreground truncate">
                Recurso: <span className="font-medium text-foreground">{matchesResource.resource}</span> · {matchesResource.quantity}
              </p>
            )}
          </SheetHeader>

          <div className="rounded-xl border border-ai/20 bg-ai/5 px-3 py-2 text-xs text-muted-foreground mb-4">
            Instituições identificadas pela IA com maior compatibilidade de necessidade, localização e capacidade para receber este recurso.
          </div>

          <div className="space-y-3">
            {matchesResource && getMatchedNgos(matchesResource.id).map((ngo) => (
              <div key={ngo.id} className="rounded-2xl border border-ai/20 bg-card p-4 shadow-soft">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-ai text-ai-foreground font-bold text-sm">
                    {ngo.orgInitials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold">{ngo.org}</p>
                      <span className="rounded-full bg-ai/10 px-2 py-0.5 text-[10px] font-bold text-ai">{ngo.matchScore}% match</span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {ngo.city}</span>
                      <span className="flex items-center gap-1"><Network className="h-3 w-3" /> {ngo.topic}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground italic">{ngo.matchedItem}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => setResourceProfileNgo(getRichProfile(ngo))}>
                    <Building2 className="h-3 w-3" /> Ver perfil
                  </Button>
                  {contactedNgos.has(ngo.id) ? (
                    <span className="flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-1 text-[11px] font-bold text-success">
                      <CheckCircle2 className="h-3 w-3" /> Contato enviado
                    </span>
                  ) : (
                    <Button size="sm" className="gap-1.5 bg-gradient-hero" onClick={() => openContact(ngo)}>
                      <Send className="h-3.5 w-3.5" /> Entrar em contato
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Contact Dialog ── */}
      <Dialog open={!!contact.ngo} onOpenChange={(open) => { if (!open) closeContact(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Entrar em contato</DialogTitle>
          </DialogHeader>
          {contact.sent ? (
            <div className="py-6 text-center space-y-3">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/15">
                <CheckCircle2 className="h-8 w-8 text-success" />
              </div>
              <p className="font-semibold">Mensagem enviada!</p>
              <p className="text-sm text-muted-foreground">
                {contact.ngo?.org} receberá uma notificação com sua proposta.
              </p>
              <Button className="w-full mt-2" onClick={closeContact}>Fechar</Button>
            </div>
          ) : (
            <>
              <div className="space-y-4 py-2">
                {contact.ngo && (
                  <div className="flex items-center gap-3 rounded-xl bg-muted p-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-ai text-ai-foreground font-bold text-sm">
                      {contact.ngo.orgInitials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold">{contact.ngo.org}</p>
                      <p className="text-xs text-muted-foreground">{contact.ngo.city} · {contact.ngo.topic}</p>
                    </div>
                    <span className="rounded-full bg-ai/10 px-2 py-0.5 text-[10px] font-bold text-ai shrink-0">{contact.ngo.matchScore}% match</span>
                  </div>
                )}
                {matchesResource && (
                  <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-card px-3 py-2">
                    <Package className="h-3.5 w-3.5 text-primary shrink-0" />
                    <p className="text-xs text-muted-foreground truncate">
                      Recurso: <span className="font-medium text-foreground">{matchesResource.resource}</span> · {matchesResource.quantity}
                    </p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium mb-1.5 block">
                    Mensagem <span className="text-muted-foreground font-normal">(editável)</span>
                  </label>
                  <Textarea
                    value={contact.message}
                    onChange={(e) => setContact((s) => ({ ...s, message: e.target.value }))}
                    rows={9}
                    className="resize-none text-sm"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={closeContact} disabled={contact.sending}>Cancelar</Button>
                <Button onClick={sendContact} disabled={contact.sending || !contact.message.trim()} className="bg-gradient-hero">
                  {contact.sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Enviar mensagem
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
      {/* ── Resource ONG Profile Dialog ── */}
      <Dialog open={!!resourceProfileNgo} onOpenChange={(open) => { if (!open) setResourceProfileNgo(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" /> Perfil da instituição
            </DialogTitle>
          </DialogHeader>
          {resourceProfileNgo && (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-ai text-ai-foreground font-bold text-lg">
                  {resourceProfileNgo.orgInitials}
                </div>
                <div className="flex-1">
                  <p className="text-lg font-bold">{resourceProfileNgo.org}</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> {resourceProfileNgo.city}
                  </p>
                </div>
                <span className="rounded-full bg-ai/10 px-2 py-0.5 text-[10px] font-bold text-ai shrink-0">{resourceProfileNgo.matchScore}% match</span>
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-4">
                {resourceProfileNgo.description && (
                  <div>
                    <p className="text-[11px] font-medium uppercase text-muted-foreground">Sobre</p>
                    <p className="mt-1 text-sm">{resourceProfileNgo.description}</p>
                  </div>
                )}
                <div>
                  <p className="text-[11px] font-medium uppercase text-muted-foreground">Área de atuação</p>
                  <p className="mt-1 text-sm font-medium">{resourceProfileNgo.topic}</p>
                </div>
                {resourceProfileNgo.areas && resourceProfileNgo.areas.length > 0 && (
                  <div>
                    <p className="text-[11px] font-medium uppercase text-muted-foreground">Especialidades</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {resourceProfileNgo.areas.map((a) => (
                        <span key={a} className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">{a}</span>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-[11px] font-medium uppercase text-muted-foreground">Necessidade identificada</p>
                  <p className="mt-1 text-sm">{resourceProfileNgo.matchedItem}</p>
                </div>
                {resourceProfileNgo.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{resourceProfileNgo.phone}</span>
                  </div>
                )}
                {resourceProfileNgo.website && (
                  <div className="flex items-center gap-2 text-sm">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <span className="text-primary">{resourceProfileNgo.website}</span>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setResourceProfileNgo(null)}>Fechar</Button>
            {resourceProfileNgo && !contactedNgos.has(resourceProfileNgo.id) && (
              <Button className="bg-gradient-hero" onClick={() => { openContact(resourceProfileNgo); setResourceProfileNgo(null); }}>
                <Send className="mr-2 h-4 w-4" /> Entrar em contato
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
