import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { resourceOffers, ngoConnections, helpTypeLabels, type ResourceOffer, type NgoConnection } from "@/lib/mock-data";
import { Plus, MapPin, Sparkles, Package, Building2, CheckCircle2, Send, Loader2, Network, Phone, Globe, Pencil, Trash2, Zap, Flame, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
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

  // Recursos do banco
  const [localResources, setLocalResources] = useState<ResourceOffer[]>([]);
  const [loadingRes, setLoadingRes] = useState(true);

  const rowToOffer = (row: Record<string, unknown>): ResourceOffer => ({
    id:           row.id as string,
    org:          row.org_name as string,
    resource:     row.resource as string,
    category:     row.category as ResourceOffer["category"],
    quantity:     row.quantity as string,
    location:     row.location as string,
    matchedNeeds: 0,
  });

  useEffect(() => {
    if (!user) return;
    supabase
      .from("ngo_resources")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setLocalResources(data.map(rowToOffer));
        setLoadingRes(false);
      });
  }, [user]);

  // Formulário de novo recurso
  const EMPTY_RES = { name: "", description: "", category: "food", quantity: "", location: "", expiresAt: "" };
  const [resDraft, setResDraft] = useState(EMPTY_RES);
  const [publishingRes, setPublishingRes] = useState(false);
  const [publishedResOk, setPublishedResOk] = useState(false);

  const publishResource = async () => {
    if (!user || !resDraft.name.trim() || !resDraft.location.trim()) return;
    setPublishingRes(true);
    const orgName = (user.user_metadata?.full_name as string | undefined) ?? "ONG";
    const { data, error } = await supabase
      .from("ngo_resources")
      .insert({
        owner_id: user.id,
        org_name: orgName,
        resource: resDraft.name.trim(),
        category: resDraft.category,
        quantity: resDraft.quantity.trim() || "—",
        location: resDraft.location.trim(),
      })
      .select("*")
      .single();
    if (!error && data) {
      setLocalResources((prev) => [rowToOffer(data as Record<string, unknown>), ...prev]);
      setResDraft(EMPTY_RES);
      setPublishedResOk(true);
      setTimeout(() => setPublishedResOk(false), 3000);
    }
    setPublishingRes(false);
  };

  // Editar / excluir recursos
  const [editRes, setEditRes] = useState<ResourceOffer | null>(null);
  const [editDraft, setEditDraft] = useState({ name: "", quantity: "", category: "food", location: "" });
  const [confirmDelRes, setConfirmDelRes] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  const openEditRes = (r: ResourceOffer) => {
    setEditRes(r);
    setEditDraft({ name: r.resource, quantity: r.quantity, category: r.category, location: r.location });
    setConfirmDelRes(false);
  };

  const saveEditRes = async () => {
    if (!editRes) return;
    setSavingEdit(true);
    await supabase
      .from("ngo_resources")
      .update({
        resource: editDraft.name.trim() || editRes.resource,
        quantity: editDraft.quantity.trim() || editRes.quantity,
        category: editDraft.category,
        location: editDraft.location.trim() || editRes.location,
        updated_at: new Date().toISOString(),
      })
      .eq("id", editRes.id);
    setLocalResources((prev) =>
      prev.map((r) => r.id === editRes.id
        ? { ...r, resource: editDraft.name.trim() || r.resource, quantity: editDraft.quantity.trim() || r.quantity, category: editDraft.category as ResourceOffer["category"], location: editDraft.location.trim() || r.location }
        : r)
    );
    setSavingEdit(false);
    setEditRes(null);
  };

  const deleteRes = async () => {
    if (!editRes) return;
    await supabase.from("ngo_resources").delete().eq("id", editRes.id);
    setLocalResources((prev) => prev.filter((r) => r.id !== editRes.id));
    setEditRes(null);
    setConfirmDelRes(false);
  };

  // Match recurso ↔ ações via agente
  type MatchPair = {
    resourceId: string; resourceName: string; orgName: string; quantity: string;
    resourceLocation: string; actionId: string; actionTitle: string;
    actionLocation: string; urgency: string; coveragePct: number; score: number; reason: string;
  };
  const [actionMatchRes, setActionMatchRes] = useState<ResourceOffer | null>(null);
  const [actionMatches, setActionMatches] = useState<MatchPair[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);

  // Matching client-side (evita dependência de build do endpoint)
  function tokenize(text: string): Set<string> {
    return new Set(
      text.toLowerCase().normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/).filter((t) => t.length > 2)
    );
  }
  function jaccardScore(a: Set<string>, b: Set<string>): number {
    if (a.size === 0 || b.size === 0) return 0;
    let inter = 0;
    a.forEach((t) => { if (b.has(t)) inter++; });
    return inter / (a.size + b.size - inter);
  }
  const URGENCY_BONUS: Record<string, number> = { high: 20, medium: 10, low: 5 };

  const fetchActionMatches = async (r: ResourceOffer) => {
    setActionMatchRes(r);
    setActionMatches([]);
    setMatchError(null);
    setLoadingMatches(true);
    try {
      const { data: actions, error } = await supabase
        .from("crisis_actions")
        .select("id, title, description, help_types, urgency, location, volunteers_needed, volunteers_joined")
        .eq("status", "open")
        .limit(100);
      if (error || !actions) throw new Error(error?.message ?? "Erro ao buscar ações");
      const resTokens = tokenize(r.resource);
      const pairs: MatchPair[] = [];
      for (const action of actions) {
        const helpTypes: string[] = (action.help_types as string[]) ?? [];
        let score = 0;
        const reasons: string[] = [];
        // Categoria
        if (helpTypes.includes(r.category)) {
          score += 50;
          reasons.push(`categoria '${r.category}' coincide`);
        }
        // Palavras-chave
        const actTokens = tokenize(`${action.title ?? ""} ${action.description ?? ""}`);
        const jac = jaccardScore(resTokens, actTokens);
        const kwScore = Math.round(jac * 30);
        if (kwScore > 0) { score += kwScore; reasons.push(`${kwScore} pts por palavras-chave`); }
        // Urgência
        const urgBonus = URGENCY_BONUS[action.urgency as string] ?? 5;
        score += urgBonus;
        reasons.push(`urgência ${action.urgency}`);
        if (score < 30) continue;
        const coveragePct = (action.volunteers_needed as number) > 0
          ? Math.round(((action.volunteers_joined as number) / (action.volunteers_needed as number)) * 100)
          : 0;
        pairs.push({
          resourceId: r.id, resourceName: r.resource, orgName: r.org,
          quantity: r.quantity, resourceLocation: r.location,
          actionId: action.id as string, actionTitle: action.title as string,
          actionLocation: action.location as string, urgency: action.urgency as string,
          coveragePct, score: Math.min(100, score), reason: reasons.join("; "),
        });
      }
      pairs.sort((a, b) => b.score - a.score);
      setActionMatches(pairs.slice(0, 10));
    } catch (err) {
      setMatchError(err instanceof Error ? err.message : "Erro desconhecido");
    }
    setLoadingMatches(false);
  };

  // Oferecer ajuda para uma ação
  type OfferState = { match: MatchPair | null; message: string; sending: boolean; sent: boolean };
  const [offer, setOffer] = useState<OfferState>({ match: null, message: "", sending: false, sent: false });

  const buildOfferMsg = (m: MatchPair): string => {
    const ongName = (user?.user_metadata?.full_name as string | undefined) ?? "nossa ONG";
    return `Olá! Somos a ${ongName} e identificamos que temos um recurso que pode ajudar diretamente a sua ação "${m.actionTitle}".\n\nRecurso disponível: ${m.resourceName} (${m.quantity}) em ${m.resourceLocation}.\n\nGostaríamos de oferecer esta ajuda e coordenar a entrega conforme sua necessidade.\n\nCom gratidão,\n${ongName}`;
  };

  const openOffer = (m: MatchPair) => {
    setOffer({ match: m, message: buildOfferMsg(m), sending: false, sent: false });
  };

  const sendOffer = async () => {
    if (!offer.match || !user) return;
    setOffer((s) => ({ ...s, sending: true }));

    // Descobre o ngo owner_id da ação para saber o destinatário
    const { data: actionRow } = await supabase
      .from("crisis_actions")
      .select("ngo_id")
      .eq("id", offer.match.actionId)
      .maybeSingle();

    let recipientId: string | null = null;
    if (actionRow?.ngo_id) {
      const { data: ngoRow } = await supabase
        .from("ngos")
        .select("owner_id")
        .eq("id", actionRow.ngo_id)
        .maybeSingle();
      recipientId = (ngoRow?.owner_id as string | null) ?? null;
    }

    const ongName = (user.user_metadata?.full_name as string | undefined) ?? "ONG";
    const initials = ongName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();

    await supabase.from("ngo_help_offers").insert({
      sender_id:       user.id,
      sender_name:     ongName,
      sender_initials: initials,
      sender_city:     "",
      resource_name:   offer.match.resourceName,
      resource_qty:    offer.match.quantity,
      action_id:       offer.match.actionId,
      action_title:    offer.match.actionTitle,
      recipient_ngo_id: recipientId,
      message:         offer.message,
      match_score:     offer.match.score,
    });

    setOffer((s) => ({ ...s, sending: false, sent: true }));
  };

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
          {loadingRes ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mr-2" /> Carregando recursos…
            </div>
          ) : localResources.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <Package className="mx-auto h-10 w-10 opacity-30" />
              <p className="mt-3 font-medium">Nenhum recurso cadastrado ainda</p>
              <p className="mt-1 text-sm">Use a aba “Cadastrar recurso” para adicionar.</p>
            </div>
          ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {localResources.map((r) => (
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
                  onClick={() => fetchActionMatches(r)}
                >
                  <Sparkles className="h-3.5 w-3.5 text-ai" /> Ver matches
                </Button>
                <div className="mt-2 flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => openEditRes(r)}>
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 gap-1 text-destructive hover:bg-destructive/10" onClick={() => { setEditRes(r); setConfirmDelRes(true); }}>
                    <Trash2 className="h-3.5 w-3.5" /> Excluir
                  </Button>
                </div>
              </div>
            ))}
          </div>
          )}
        </TabsContent>

        <TabsContent value="new" className="mt-5">
          <div className="max-w-2xl border border-border/60 bg-card p-6 shadow-soft">
            <h2 className="font-bold flex items-center gap-2"><Plus className="h-4 w-4" /> Cadastrar recurso disponível</h2>
            <p className="mt-1 text-xs text-muted-foreground">Descreva o recurso. A IA encontrará automaticamente ONGs que precisam.</p>
            {publishedResOk && (
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-success/40 bg-success/10 px-4 py-3 text-sm text-success">
                <CheckCircle2 className="h-4 w-4 shrink-0" /> Recurso publicado com sucesso!
              </div>
            )}
            <div className="mt-5 space-y-4">
              <div>
                <Label className="text-xs">Nome do recurso</Label>
                <Input placeholder="Ex.: 300 cestas básicas" className="mt-1"
                  value={resDraft.name} onChange={(e) => setResDraft((d) => ({ ...d, name: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Descrição</Label>
                <Textarea placeholder="Detalhes, condições de retirada, validade…" className="mt-1 min-h-20"
                  value={resDraft.description} onChange={(e) => setResDraft((d) => ({ ...d, description: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Categoria</Label>
                  <select className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={resDraft.category} onChange={(e) => setResDraft((d) => ({ ...d, category: e.target.value }))}>
                    {Object.entries(helpTypeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Quantidade</Label>
                  <Input placeholder="Ex.: 300 unidades" className="mt-1"
                    value={resDraft.quantity} onChange={(e) => setResDraft((d) => ({ ...d, quantity: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">Localização</Label>
                  <Input placeholder="Cidade / Estado" className="mt-1"
                    value={resDraft.location} onChange={(e) => setResDraft((d) => ({ ...d, location: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">Disponível até</Label>
                  <Input type="date" className="mt-1"
                    value={resDraft.expiresAt} onChange={(e) => setResDraft((d) => ({ ...d, expiresAt: e.target.value }))} />
                </div>
              </div>
              <Button
                className="w-full bg-gradient-ai text-ai-foreground shadow-soft"
                onClick={publishResource}
                disabled={publishingRes || !resDraft.name.trim() || !resDraft.location.trim()}
              >
                {publishingRes ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Package className="mr-2 h-4 w-4" />}
                Publicar recurso
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Action Matches Sheet ── */}
      <Sheet open={!!actionMatchRes} onOpenChange={(open) => { if (!open) setActionMatchRes(null); }}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="mb-5">
            <SheetTitle className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-ai" />
              <span className="text-gradient-ai">Ações que precisam deste recurso</span>
            </SheetTitle>
            {actionMatchRes && (
              <p className="text-xs text-muted-foreground truncate">
                Recurso: <span className="font-medium text-foreground">{actionMatchRes.resource}</span> · {actionMatchRes.quantity}
              </p>
            )}
          </SheetHeader>

          <div className="rounded-xl border border-ai/20 bg-ai/5 px-3 py-2 text-xs text-muted-foreground mb-4">
            A IA analisou a descrição do recurso e das ações abertas e ranqueou por compatibilidade de categoria e palavras-chave.
          </div>

          {loadingMatches ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Analisando com IA…
            </div>
          ) : matchError ? (
            <div className="py-12 text-center text-destructive">
              <AlertCircle className="mx-auto h-8 w-8 opacity-60" />
              <p className="mt-3 font-medium">Erro ao buscar matches</p>
              <p className="text-xs mt-1 text-muted-foreground">{matchError}</p>
            </div>
          ) : actionMatches.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <AlertCircle className="mx-auto h-8 w-8 opacity-30" />
              <p className="mt-3 font-medium">Nenhum match encontrado</p>
              <p className="text-sm mt-1">Nenhuma ação aberta compatível com este recurso no momento.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {actionMatches.map((m, i) => (
                <div key={`${m.resourceId}-${m.actionId}`} className="rounded-2xl border border-ai/20 bg-card p-4 shadow-soft">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {i === 0 && <span className="rounded-full bg-ai/15 px-2 py-0.5 text-[10px] font-bold text-ai flex items-center gap-0.5"><Sparkles className="h-2.5 w-2.5" /> Melhor match</span>}
                        <p className="font-semibold text-sm">{m.actionTitle}</p>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{m.actionLocation}</span>
                        <span className="flex items-center gap-1">
                          {m.urgency === "high" ? <Flame className="h-3 w-3 text-urgent" /> : null}
                          {m.urgency === "high" ? "Urgente" : m.urgency === "medium" ? "Média" : "Baixa"}
                        </span>
                        <span>{m.coveragePct}% coberto</span>
                      </div>
                      <p className="mt-2 text-[11px] text-muted-foreground italic">{m.reason}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-ai/10 px-2.5 py-1 text-sm font-bold text-ai">{m.score}%</span>
                  </div>
                  <Button
                    size="sm"
                    className="mt-3 w-full gap-1.5 bg-gradient-hero"
                    onClick={() => openOffer(m)}
                  >
                    <Send className="h-3.5 w-3.5" /> Oferecer ajuda
                  </Button>
                </div>
              ))}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Offer Help Dialog ── */}
      <Dialog open={!!offer.match} onOpenChange={(open) => { if (!open) setOffer({ match: null, message: "", sending: false, sent: false }); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-4 w-4 text-primary" /> Oferecer ajuda
            </DialogTitle>
          </DialogHeader>
          {offer.sent ? (
            <div className="py-6 text-center space-y-3">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/15">
                <CheckCircle2 className="h-8 w-8 text-success" />
              </div>
              <p className="font-semibold">Oferta enviada!</p>
              <p className="text-sm text-muted-foreground">
                A ONG responsável pela ação <strong>{offer.match?.actionTitle}</strong> receberá sua proposta e poderá aceitar ou recusar.
              </p>
              <Button className="w-full mt-2" onClick={() => setOffer({ match: null, message: "", sending: false, sent: false })}>Fechar</Button>
            </div>
          ) : (
            <>
              <div className="space-y-4 py-2">
                {offer.match && (
                  <div className="flex items-center gap-3 rounded-xl bg-muted p-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-hero text-primary-foreground font-bold text-sm">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{offer.match.actionTitle}</p>
                      <p className="text-xs text-muted-foreground">{offer.match.actionLocation}</p>
                    </div>
                    <span className="rounded-full bg-ai/10 px-2 py-0.5 text-[10px] font-bold text-ai shrink-0">{offer.match.score}% match</span>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium mb-1.5 block">
                    Mensagem <span className="text-muted-foreground font-normal">(editável)</span>
                  </label>
                  <Textarea
                    value={offer.message}
                    onChange={(e) => setOffer((s) => ({ ...s, message: e.target.value }))}
                    rows={8}
                    className="resize-none text-sm"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOffer({ match: null, message: "", sending: false, sent: false })} disabled={offer.sending}>Cancelar</Button>
                <Button onClick={sendOffer} disabled={offer.sending || !offer.message.trim()} className="bg-gradient-hero">
                  {offer.sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Enviar oferta
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Edit Resource Sheet ── */}
      <Sheet open={!!editRes && !confirmDelRes} onOpenChange={(open) => { if (!open) setEditRes(null); }}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="mb-5">
            <SheetTitle className="flex items-center gap-2">
              <Pencil className="h-4 w-4 text-primary" /> Editar recurso
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Nome do recurso</Label>
              <Input className="mt-1" value={editDraft.name} onChange={(e) => setEditDraft((d) => ({ ...d, name: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Quantidade</Label>
              <Input className="mt-1" value={editDraft.quantity} onChange={(e) => setEditDraft((d) => ({ ...d, quantity: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Categoria</Label>
              <select className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={editDraft.category} onChange={(e) => setEditDraft((d) => ({ ...d, category: e.target.value }))}>
                {Object.entries(helpTypeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs">Localização</Label>
              <Input className="mt-1" value={editDraft.location} onChange={(e) => setEditDraft((d) => ({ ...d, location: e.target.value }))} />
            </div>
          </div>
          <div className="mt-6 flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setEditRes(null)}>Cancelar</Button>
            <Button className="flex-1 bg-gradient-hero" onClick={saveEditRes} disabled={savingEdit || !editDraft.name.trim()}>
              {savingEdit ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Salvar alterações
            </Button>
          </div>
          <div className="mt-4 border-t pt-4">
            <Button variant="outline" className="w-full text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => setConfirmDelRes(true)}>
              <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Excluir recurso
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Confirm Delete Resource Dialog ── */}
      <Dialog open={confirmDelRes} onOpenChange={(open) => { if (!open) { setConfirmDelRes(false); setEditRes(null); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-4 w-4" /> Excluir recurso
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir <strong>{editRes?.resource}</strong>? Esta ação não pode ser desfeita.
          </p>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => { setConfirmDelRes(false); setEditRes(null); }}>Cancelar</Button>
            <Button variant="destructive" onClick={deleteRes}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
