import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import {
  actions,
  matchedVolunteers,
  ngoConnections,
  helpTypeLabels,
  urgencyLabels,
  type Urgency,
  type Volunteer,
  type NgoConnection,
} from "@/lib/mock-data";
import {
  Plus,
  Sparkles,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  Star,
  MapPin,
  ArrowRight,
  Package,
  Network,
  ListChecks,
  Send,
  Loader2,
  Building2,
  UserCheck,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/ong/")({
  head: () => ({
    meta: [
      { title: "Painel ONG — Orquestra" },
      {
        name: "description",
        content:
          "Painel unificado da ONG: ações, recursos, voluntários e conexões com outras instituições.",
      },
    ],
  }),
  component: OngDashboard,
});

const urgencyStyles: Record<Urgency, string> = {
  high: "bg-urgent text-urgent-foreground",
  medium: "bg-warning text-warning-foreground",
  low: "bg-success text-success-foreground",
};

type PendingRequest = {
  id: string;
  org: string;
  orgInitials: string;
  city: string;
  topic: string;
  message: string;
  receivedAgo: string;
  matchScore: number;
};

const initialPendingRequests: PendingRequest[] = [
  {
    id: "pr1",
    org: "Saúde Sem Fronteiras",
    orgInitials: "SF",
    city: "Florianópolis, SC",
    topic: "Equipe médica",
    message:
      "Olá! Identificamos que vocês possuem recursos compatíveis com nossa necessidade urgente de equipe médica para triagem em abrigo. Gostaríamos de estabelecer uma parceria.",
    receivedAgo: "há 2h",
    matchScore: 88,
  },
  {
    id: "pr2",
    org: "Lar dos Pequenos",
    orgInitials: "LP",
    city: "Joinville, SC",
    topic: "Alimentos e cobertores",
    message:
      "Prezados, nossa organização está atendendo 120 crianças desabrigadas e precisamos de apoio com alimentos e cobertores. Podemos colaborar?",
    receivedAgo: "há 5h",
    matchScore: 79,
  },
];

type InviteState = {
  volunteer: Volunteer | null;
  message: string;
  sending: boolean;
  sent: boolean;
};

function buildInviteMessage(ongName: string, volunteer: Volunteer): string {
  return `Olá, ${volunteer.name}!\n\nSou da ONG ${ongName} e acreditamos que o seu perfil se encaixa perfeitamente com o nosso trabalho. Suas habilidades em ${volunteer.skills.join(" e ")} seriam de grande valor para as nossas ações.\n\nGostaríamos de convidá-lo(a) para fazer parte do nosso time de voluntários. Aguardamos seu contato!\n\nCom gratidão,\n${ongName}`;
}

function OngDashboard() {
  const { user } = useAuth();
  const ongName = (user?.user_metadata?.full_name as string | undefined) ?? "Cruz Verde Brasil";

  const [invite, setInvite] = useState<InviteState>({
    volunteer: null,
    message: "",
    sending: false,
    sent: false,
  });
  const [invitedVols, setInvitedVols] = useState<Set<string>>(new Set());
  const [localPending, setLocalPending] = useState<PendingRequest[]>(initialPendingRequests);
  const [localAccepted, setLocalAccepted] = useState<NgoConnection[]>([]);
  const [profileNgo, setProfileNgo] = useState<PendingRequest | null>(null);

  const openInvite = (v: Volunteer) => {
    setInvite({
      volunteer: v,
      message: buildInviteMessage(ongName, v),
      sending: false,
      sent: false,
    });
  };

  const closeInvite = () => setInvite((s) => ({ ...s, volunteer: null, sent: false }));

  const sendInvite = async () => {
    if (!invite.volunteer || !user) return;
    setInvite((s) => ({ ...s, sending: true }));

    // Tenta encontrar o voluntário por nome na tabela profiles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id")
      .ilike("full_name", `%${invite.volunteer.name.split(" ")[0]}%`)
      .limit(1);

    const recipientId = profiles?.[0]?.id ?? null;

    await supabase.from("notifications").insert({
      recipient_id: recipientId,
      sender_id: user.id,
      sender_name: ongName,
      type: "invite",
      title: `Convite de ${ongName}`,
      body: invite.message,
    });

    setInvite((s) => ({ ...s, sending: false, sent: true }));
    if (invite.volunteer) setInvitedVols((prev) => new Set([...prev, invite.volunteer!.id]));
  };

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

  const open = actions.filter((a) => a.status === "open");
  const inProgress = actions.filter((a) => a.status === "in_progress");
  const activeConnections = ngoConnections.filter((n) => n.status === "active");

  return (
    <AppShell role="ong">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Painel · Cruz Verde Brasil</h1>
          <p className="mt-1 text-muted-foreground">
            Tudo que sua ONG precisa orquestrar em um só lugar.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" className="hidden sm:inline-flex">
            <Link to="/ong/resources">
              <Package className="mr-1 h-4 w-4" /> Recurso
            </Link>
          </Button>
          <Button asChild className="bg-gradient-hero shadow-elegant">
            <Link to="/ong/actions">
              <Plus className="mr-1 h-4 w-4" /> Nova ação
            </Link>
          </Button>
        </div>
      </div>

      {/* AI orchestration banner */}
      <div className="mt-6 bg-gradient-hero p-5 text-ai-foreground shadow-elegant">
        <div className="flex flex-wrap items-start gap-3">
          <Sparkles className="h-5 w-5 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-[200px]">
            <p className="font-bold">A IA orquestrou 3 movimentos hoje</p>
            <p className="mt-1 text-sm opacity-90">
              4 voluntários ideais para "Cestas básicas" · 2 ONGs com recursos compatíveis · 1 caso
              urgente sugerido
            </p>
          </div>
          <Button asChild size="sm" variant="secondary" className="shrink-0">
            <Link to="/ong/network">
              Ver conexões <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="mt-6 grid gap-3 grid-cols-2 lg:grid-cols-5">
        {[
          {
            icon: AlertCircle,
            label: "Ações abertas",
            value: open.length,
            color: "text-urgent",
            bg: "bg-urgent/10",
          },
          {
            icon: Clock,
            label: "Em andamento",
            value: inProgress.length,
            color: "text-warning",
            bg: "bg-warning/10",
          },
          {
            icon: CheckCircle2,
            label: "Concluídas/mês",
            value: 47,
            color: "text-success",
            bg: "bg-success/10",
          },
          {
            icon: Users,
            label: "Voluntários ativos",
            value: 312,
            color: "text-primary",
            bg: "bg-primary/10",
          },
          {
            icon: Network,
            label: "Conexões ONG",
            value: activeConnections.length,
            color: "text-ai",
            bg: "bg-ai/10",
          },
        ].map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="border border-border/60 bg-card p-4 shadow-soft">
              <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl", k.bg)}>
                <Icon className={cn("h-5 w-5", k.color)} />
              </div>
              <p className="mt-3 text-2xl font-bold">{k.value}</p>
              <p className="text-xs text-muted-foreground">{k.label}</p>
            </div>
          );
        })}
      </div>

      {/* Quick sections grid */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Open actions */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-primary" /> Ações abertas
            </h2>
            <Button asChild variant="ghost" size="sm">
              <Link to="/ong/actions">
                Ver todas <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </div>
          <div className="space-y-3">
            {open.slice(0, 3).map((a) => {
              const pct = (a.volunteersJoined / a.volunteersNeeded) * 100;
              return (
                <div key={a.id} className="border border-border/60 bg-card p-4 shadow-soft">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                            urgencyStyles[a.urgency],
                          )}
                        >
                          {urgencyLabels[a.urgency]}
                        </span>
                        <span className="text-xs text-muted-foreground">{a.postedAgo}</span>
                      </div>
                      <p className="mt-1.5 font-semibold leading-tight">{a.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {a.location}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold">
                        {a.volunteersJoined}/{a.volunteersNeeded}
                      </p>
                      <p className="text-[10px] text-muted-foreground">voluntários</p>
                    </div>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-gradient-hero" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {a.helpTypes.map((t) => (
                      <span
                        key={t}
                        className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                      >
                        {helpTypeLabels[t]}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* AI matched volunteers */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-ai" />
              <span className="text-gradient-ai">Voluntários sugeridos</span>
            </h2>
            <Button asChild variant="ghost" size="sm">
              <Link to="/ong/volunteers">
                Ver todos <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </div>
          <div className="space-y-3">
            {matchedVolunteers.slice(0, 3).map((v) => (
              <div
                key={v.id}
                className="flex items-center gap-3 border border-border/60 bg-card p-4 shadow-soft"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-hero text-primary-foreground font-bold">
                  {v.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold truncate">{v.name}</p>
                    <span className="rounded-full bg-ai/10 px-2 py-0.5 text-[10px] font-bold text-ai shrink-0">
                      {v.matchScore}%
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-0.5">
                      <MapPin className="h-3 w-3" /> {v.distanceKm}km
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Star className="h-3 w-3 fill-warning text-warning" /> {v.rating}
                    </span>
                  </div>
                </div>
                {invitedVols.has(v.id) ? (
                  <span className="flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-1 text-[11px] font-bold text-success">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Convidado
                  </span>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => openInvite(v)}>
                    Convidar
                  </Button>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Invite dialog */}
      <Dialog
        open={!!invite.volunteer}
        onOpenChange={(open) => {
          if (!open) closeInvite();
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Convidar voluntário</DialogTitle>
          </DialogHeader>
          {invite.sent ? (
            <div className="py-6 text-center space-y-3">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/15">
                <CheckCircle2 className="h-8 w-8 text-success" />
              </div>
              <p className="font-semibold">Convite enviado!</p>
              <p className="text-sm text-muted-foreground">
                {invite.volunteer?.name} receberá uma notificação com sua mensagem.
              </p>
              <Button className="w-full mt-2" onClick={closeInvite}>
                Fechar
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-4 py-2">
                {invite.volunteer && (
                  <div className="flex items-center gap-3 rounded-xl bg-muted p-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-hero text-primary-foreground font-bold text-sm">
                      {invite.volunteer.initials}
                    </div>
                    <div>
                      <p className="font-semibold">{invite.volunteer.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {invite.volunteer.skills.join(" · ")} · {invite.volunteer.distanceKm}km
                      </p>
                    </div>
                    <span className="ml-auto rounded-full bg-ai/10 px-2 py-0.5 text-[10px] font-bold text-ai">
                      {invite.volunteer.matchScore}% match
                    </span>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium mb-1.5 block">
                    Mensagem <span className="text-muted-foreground font-normal">(editável)</span>
                  </label>
                  <Textarea
                    value={invite.message}
                    onChange={(e) => setInvite((s) => ({ ...s, message: e.target.value }))}
                    rows={9}
                    className="resize-none text-sm"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={closeInvite} disabled={invite.sending}>
                  Cancelar
                </Button>
                <Button
                  onClick={sendInvite}
                  disabled={invite.sending || !invite.message.trim()}
                  className="bg-gradient-hero"
                >
                  {invite.sending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  Enviar convite
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ONGs por ONGs */}
      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Network className="h-5 w-5 text-ai" /> ONGs por ONGs
            </h2>
            <p className="mt-3 text-xs text-muted-foreground">Cooperação direta entre instituições</p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link to="/ong/network">
              Ver tudo <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        </div>

        <div className="mt-5 grid gap-6 lg:grid-cols-2">
          {/* Solicitações recebidas */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-warning" />
              <p className="text-sm font-bold">Solicitações recebidas</p>
              {localPending.length > 0 && (
                <span className="rounded-full bg-warning/15 px-1.5 py-0.5 text-[10px] font-bold text-warning">
                  {localPending.length}
                </span>
              )}
            </div>
            {localPending.length === 0 ? (
              <div className="rounded-2xl border border-border/60 bg-muted/40 p-6 text-center text-sm text-muted-foreground">
                <Building2 className="mx-auto h-8 w-8 opacity-30 mb-2" />
                Nenhuma solicitação pendente.
              </div>
            ) : (
              <div className="space-y-3">
                {localPending.map((r) => (
                  <div
                    key={r.id}
                    className="rounded-2xl border border-border/60 bg-card p-4 shadow-soft"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-ai text-ai-foreground font-bold text-sm">
                        {r.orgInitials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold">{r.org}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {r.city} · {r.topic}
                        </p>
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {r.receivedAgo}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground italic bg-muted/40 rounded-lg px-3 py-2 line-clamp-2">
                      "{r.message}"
                    </p>
                    <div className="mt-3 flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs gap-1"
                        onClick={() => setProfileNgo(r)}
                      >
                        <Building2 className="h-3 w-3" /> Ver perfil
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
                ))}
              </div>
            )}
          </div>

          {/* Conexões ativas */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-success" />
              <p className="text-sm font-bold">Conexões ativas</p>
              <span className="rounded-full bg-success/15 px-1.5 py-0.5 text-[10px] font-bold text-success">
                {activeConnections.length + localAccepted.length}
              </span>
            </div>
            {activeConnections.length === 0 && localAccepted.length === 0 ? (
              <div className="rounded-2xl border border-border/60 bg-muted/40 p-6 text-center text-sm text-muted-foreground">
                <Network className="mx-auto h-8 w-8 opacity-30 mb-2" />
                Nenhuma conexão ativa ainda.
              </div>
            ) : (
              <div className="space-y-2">
                {[...activeConnections, ...localAccepted].slice(0, 4).map((c) => (
                  <Link
                    key={c.id}
                    to="/ong/network/$connectionId"
                    params={{ connectionId: c.id }}
                    className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-3 shadow-soft hover:shadow-elegant transition-all hover:-translate-y-0.5"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-ai text-ai-foreground font-bold text-sm">
                      {c.orgInitials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{c.org}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {c.topic} · {c.city}
                      </p>
                    </div>
                    {c.unread && c.unread > 0 ? (
                      <span className="rounded-full bg-primary text-primary-foreground px-1.5 py-0.5 text-[10px] font-bold">
                        {c.unread}
                      </span>
                    ) : (
                      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Profile Sheet */}
      <Sheet
        open={!!profileNgo}
        onOpenChange={(open) => {
          if (!open) setProfileNgo(null);
        }}
      >
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="mb-5">
            <SheetTitle className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" /> Perfil da ONG
            </SheetTitle>
          </SheetHeader>
          {profileNgo && (
            <div className="space-y-5">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-ai text-ai-foreground font-bold text-xl">
                  {profileNgo.orgInitials}
                </div>
                <div>
                  <p className="text-xl font-bold">{profileNgo.org}</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> {profileNgo.city}
                  </p>
                </div>
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-3">
                <div>
                  <p className="text-[11px] font-medium uppercase text-muted-foreground">
                    Área de atuação
                  </p>
                  <p className="mt-1 text-sm font-medium">{profileNgo.topic}</p>
                </div>
                <div>
                  <p className="text-[11px] font-medium uppercase text-muted-foreground">
                    Compatibilidade da IA
                  </p>
                  <p className="mt-1 text-sm font-bold text-ai">{profileNgo.matchScore}%</p>
                </div>
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase text-muted-foreground mb-1">
                  Mensagem enviada
                </p>
                <p className="text-sm text-muted-foreground bg-muted/40 rounded-xl p-3 italic">
                  "{profileNgo.message}"
                </p>
              </div>
              <div className="border-t border-border/60 pt-4 space-y-2">
                <p className="text-[11px] text-muted-foreground text-center">
                  Se recusar, a {profileNgo.org} não será notificada.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 gap-1 text-destructive border-destructive/40 hover:bg-destructive/5"
                    onClick={() => {
                      rejectRequest(profileNgo.id);
                      setProfileNgo(null);
                    }}
                  >
                    <X className="h-4 w-4" /> Recusar
                  </Button>
                  <Button
                    className="flex-1 gap-1 bg-gradient-hero"
                    onClick={() => {
                      acceptRequest(profileNgo);
                      setProfileNgo(null);
                    }}
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
