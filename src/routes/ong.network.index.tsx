import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { ngoConnections, type NgoConnection } from "@/lib/mock-data";
import { Building2, MapPin, Network, MessageCircle, UserCheck, X, Phone, Globe, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useState } from "react";

export const Route = createFileRoute("/ong/network/")({
  head: () => ({
    meta: [
      { title: "ONGs por ONGs — Orquestra" },
      { name: "description", content: "Cooperação entre instituições: matches da IA, conexões ativas e ONGs próximas." },
    ],
  }),
  component: NetworkPage,
});

type PendingRequest = {
  id: string;
  org: string;
  orgInitials: string;
  city: string;
  topic: string;
  message: string;
  receivedAgo: string;
  matchScore: number;
  website?: string;
  phone?: string;
  description?: string;
  areas?: string[];
};

const initialPendingRequests: PendingRequest[] = [
  {
    id: "pr1",
    org: "Saúde Sem Fronteiras",
    orgInitials: "SF",
    city: "Florianópolis, SC",
    topic: "Equipe médica",
    message: "Olá! Identificamos que vocês possuem recursos compatíveis com nossa necessidade urgente de equipe médica para triagem em abrigo. Gostaríamos de estabelecer uma parceria.",
    receivedAgo: "há 2h",
    matchScore: 88,
    website: "saudesemfronteiras.org.br",
    phone: "(48) 99123-4567",
    description: "Organização sem fins lucrativos que fornece atendimento médico de emergência em zonas de crise e desastres naturais.",
    areas: ["Saúde", "Triagem", "Medicina de emergência"],
  },
  {
    id: "pr2",
    org: "Lar dos Pequenos",
    orgInitials: "LP",
    city: "Joinville, SC",
    topic: "Alimentos e cobertores",
    message: "Prezados, nossa organização está atendendo 120 crianças desabrigadas e precisamos de apoio com alimentos e cobertores. Podemos colaborar?",
    receivedAgo: "há 5h",
    matchScore: 79,
    website: "lardospequenos.org",
    phone: "(47) 3322-1100",
    description: "Abrigo e centro de apoio à infância vulnerável em situação de calamidade pública.",
    areas: ["Abrigo infantil", "Alimentação", "Educação emergencial"],
  },
  {
    id: "pr3",
    org: "Reconstruir SC",
    orgInitials: "RC",
    city: "Blumenau, SC",
    topic: "Materiais de construção",
    message: "Estamos coordenando a reconstrução de casas afetadas pelas enchentes. Temos equipes disponíveis, mas precisamos de parceiros que possam ajudar na logística e captação de materiais.",
    receivedAgo: "há 1 dia",
    matchScore: 72,
    website: "reconstruirsc.com.br",
    phone: "(47) 3012-9988",
    description: "Iniciativa focada na reconstrução habitacional emergencial em zonas afetadas por desastres climáticos.",
    areas: ["Construção civil", "Logística", "Engenharia voluntária"],
  },
];

function NetworkPage() {
  const [localPending, setLocalPending] = useState<PendingRequest[]>(initialPendingRequests);
  const [localAccepted, setLocalAccepted] = useState<NgoConnection[]>([]);
  const [profileNgo, setProfileNgo] = useState<PendingRequest | null>(null);

  const acceptRequest = (r: PendingRequest) => {
    setLocalPending((prev) => prev.filter((p) => p.id !== r.id));
    setLocalAccepted((prev) => [
      ...prev,
      {
        id: r.id,
        org: r.org,
        orgInitials: r.orgInitials,
        city: r.city,
        topic: r.topic,
        matchedItem: r.topic,
        status: "active" as const,
        matchScore: r.matchScore,
        lastMessageAgo: "agora",
      },
    ]);
  };

  const rejectRequest = (id: string) => {
    setLocalPending((prev) => prev.filter((p) => p.id !== id));
  };

  const allActive = [...ngoConnections.filter((c) => c.status === "active"), ...localAccepted];

  return (
    <AppShell role="ong">
      <h1 className="text-2xl font-bold md:text-3xl flex items-center gap-2">
        <Network className="h-7 w-7 text-ai" />
        <span className="text-gradient-ai">ONGs por ONGs</span>
      </h1>
      <p className="mt-1 text-muted-foreground">Gerencie as conexões com outras instituições e responda a solicitações de parceria.</p>

      <Tabs defaultValue="active" className="mt-6">
        <TabsList>
          <TabsTrigger value="active">
            Conexões ativas
            {allActive.length > 0 && (
              <span className="ml-1.5 rounded-full bg-success/15 px-1.5 py-0.5 text-[10px] font-bold text-success">{allActive.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="needs">
            Solicitações recebidas
            {localPending.length > 0 && (
              <span className="ml-1.5 rounded-full bg-warning/15 px-1.5 py-0.5 text-[10px] font-bold text-warning">{localPending.length}</span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Active connections */}
        <TabsContent value="active" className="mt-5 space-y-3">
          {allActive.length === 0 ? (
            <div className="rounded-2xl border border-border/60 bg-muted/40 p-10 text-center text-sm text-muted-foreground">
              <Network className="mx-auto h-10 w-10 opacity-30 mb-3" />
              Nenhuma conexão ativa ainda. Aceite uma solicitação recebida para começar.
            </div>
          ) : (
            allActive.map((c) => (
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
                    <span className="rounded-full px-2 py-0.5 font-medium bg-success/15 text-success">Ativa</span>
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
            ))
          )}
        </TabsContent>

        {/* Solicitações recebidas */}
        <TabsContent value="needs" className="mt-5 space-y-3">
          {localPending.length === 0 ? (
            <div className="rounded-2xl border border-border/60 bg-muted/40 p-10 text-center text-sm text-muted-foreground">
              <Building2 className="mx-auto h-10 w-10 opacity-30 mb-3" />
              Nenhuma solicitação pendente no momento.
            </div>
          ) : (
            localPending.map((r) => (
              <div key={r.id} className="rounded-2xl border border-border/60 bg-card p-4 shadow-soft">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-ai text-ai-foreground font-bold">
                    {r.orgInitials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold">{r.org}</p>
                      <span className="rounded-full bg-ai/10 px-2 py-0.5 text-[10px] font-bold text-ai">{r.matchScore}% match</span>
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3" /> {r.city} · {r.topic}
                    </p>
                  </div>
                  <span className="text-[11px] text-muted-foreground shrink-0">{r.receivedAgo}</span>
                </div>
                <p className="mt-3 text-sm text-muted-foreground italic bg-muted/40 rounded-xl px-4 py-3 line-clamp-2">
                  "{r.message}"
                </p>
                <div className="mt-3 flex gap-2">
                  <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => setProfileNgo(r)}>
                    <Info className="h-3 w-3" /> Ver perfil
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs gap-1 text-destructive border-destructive/40 hover:bg-destructive/5"
                    onClick={() => rejectRequest(r.id)}
                  >
                    <X className="h-3 w-3" /> Recusar
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 text-xs gap-1 bg-gradient-hero"
                    onClick={() => acceptRequest(r)}
                  >
                    <UserCheck className="h-3 w-3" /> Aceitar
                  </Button>
                </div>
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* ── Profile Sheet (solicitações) ── */}
      <Sheet open={!!profileNgo} onOpenChange={(open) => { if (!open) setProfileNgo(null); }}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="mb-5">
            <SheetTitle className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" /> Perfil da ONG
            </SheetTitle>
          </SheetHeader>
          {profileNgo && (
            <div className="space-y-5">
              {/* Header */}
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-ai text-ai-foreground font-bold text-xl">
                  {profileNgo.orgInitials}
                </div>
                <div className="flex-1">
                  <p className="text-xl font-bold">{profileNgo.org}</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3.5 w-3.5" /> {profileNgo.city}
                  </p>
                  <span className="mt-1 inline-block rounded-full bg-ai/10 px-2 py-0.5 text-[10px] font-bold text-ai">
                    {profileNgo.matchScore}% compatibilidade
                  </span>
                </div>
              </div>

              {/* Info */}
              <div className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-4">
                {profileNgo.description && (
                  <div>
                    <p className="text-[11px] font-medium uppercase text-muted-foreground">Sobre</p>
                    <p className="mt-1 text-sm">{profileNgo.description}</p>
                  </div>
                )}
                <div>
                  <p className="text-[11px] font-medium uppercase text-muted-foreground">Área de atuação</p>
                  <p className="mt-1 text-sm font-medium">{profileNgo.topic}</p>
                </div>
                {profileNgo.areas && profileNgo.areas.length > 0 && (
                  <div>
                    <p className="text-[11px] font-medium uppercase text-muted-foreground">Especialidades</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {profileNgo.areas.map((a) => (
                        <span key={a} className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">{a}</span>
                      ))}
                    </div>
                  </div>
                )}
                {profileNgo.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{profileNgo.phone}</span>
                  </div>
                )}
                {profileNgo.website && (
                  <div className="flex items-center gap-2 text-sm">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <span className="text-primary">{profileNgo.website}</span>
                  </div>
                )}
              </div>

              {/* Mensagem recebida */}
              <div>
                <p className="text-[11px] font-medium uppercase text-muted-foreground mb-1">Mensagem enviada</p>
                <p className="text-sm text-muted-foreground bg-muted/40 rounded-xl p-3 italic">"{profileNgo.message}"</p>
              </div>

              {/* Actions */}
              <div className="border-t border-border/60 pt-4 space-y-2">
                <p className="text-[11px] text-muted-foreground text-center">
                  Se recusar, a {profileNgo.org} não será notificada.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 gap-1 text-destructive border-destructive/40 hover:bg-destructive/5"
                    onClick={() => { rejectRequest(profileNgo.id); setProfileNgo(null); }}
                  >
                    <X className="h-4 w-4" /> Recusar
                  </Button>
                  <Button
                    className="flex-1 gap-1 bg-gradient-hero"
                    onClick={() => { acceptRequest(profileNgo); setProfileNgo(null); }}
                  >
                    <UserCheck className="h-4 w-4" /> Aceitar conexão
                  </Button>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </AppShell>
  );
}
