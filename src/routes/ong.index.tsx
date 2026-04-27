import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import {
  ngoConnections,
  helpTypeLabels,
  urgencyLabels,
  type Urgency,
  type HelpType,
  type NgoConnection,
} from "@/lib/mock-data";
import { useMatchedVolunteers, useAgentCoverageGaps, useAgentCrisisSummary, type MatchResult } from "@/hooks/use-agent";
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
  RefreshCw,
  Download,
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

type DbAction = {
  id: string;
  title: string;
  description: string;
  location: string;
  urgency: Urgency;
  effort: string;
  helpTypes: HelpType[];
  volunteersNeeded: number;
  volunteersJoined: number;
  status: string;
  postedAgo: string;
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
  volunteer: MatchResult | null;
  message: string;
  sending: boolean;
  sent: boolean;
};

function buildInviteMessage(ongName: string, volunteer: MatchResult): string {
  const skills = (volunteer.skills ?? []).join(" e ") || "voluntariado";
  return `Olá, ${volunteer.name ?? "voluntário"}!\n\nSou da ONG ${ongName} e acreditamos que o seu perfil se encaixa perfeitamente com o nosso trabalho. Suas habilidades em ${skills} seriam de grande valor para as nossas ações.\n\nGostaríamos de convidá-lo(a) para fazer parte do nosso time de voluntários. Aguardamos seu contato!\n\nCom gratidão,\n${ongName}`;
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
  const [dbActions, setDbActions] = useState<DbAction[]>([]);
  const [dbVolCount, setDbVolCount] = useState(0);

  // Carrega ações e contagem de voluntários do Supabase
  useEffect(() => {
    if (!user) return;
    supabase
      .from("crisis_actions")
      .select("id, title, description, location, urgency, effort, help_types, volunteers_needed, volunteers_joined, status, created_at")
      .in("status", ["open", "in_progress"])
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (!data || data.length === 0) return;
        const now = new Date();
        setDbActions(
          data.map((row) => {
            const diffH = Math.floor((now.getTime() - new Date(row.created_at as string).getTime()) / 3_600_000);
            const postedAgo = diffH < 1 ? "agora" : diffH < 24 ? `há ${diffH}h` : `há ${Math.floor(diffH / 24)}d`;
            return {
              id:               row.id as string,
              title:            row.title as string,
              description:      (row.description as string) ?? "",
              location:         (row.location as string) ?? "",
              urgency:          row.urgency as Urgency,
              effort:           (row.effort as string) ?? "",
              helpTypes:        (row.help_types as HelpType[]) ?? [],
              volunteersNeeded: (row.volunteers_needed as number) ?? 1,
              volunteersJoined: (row.volunteers_joined as number) ?? 0,
              status:           row.status as string,
              postedAgo,
            };
          })
        );
      });
    supabase
      .from("volunteers")
      .select("id", { count: "exact", head: true })
      .then(({ count }) => {
        if (count != null) setDbVolCount(count);
      });
  }, [user]);

  // Ação mais crítica como pivot para o matching de voluntários
  const priorityAction =
    dbActions.find((a) => a.status === "open" && a.urgency === "high") ??
    dbActions.find((a) => a.status === "open") ??
    null;

  const { results: aiVolunteers, loading: aiVolLoading } = useMatchedVolunteers(
    priorityAction?.id ?? null,
    priorityAction?.helpTypes ?? [],
    priorityAction?.urgency ?? "high"
  );

  const openInvite = (v: MatchResult) => {
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
    // volunteerId === profile id — sem necessidade de busca por nome
    await supabase.from("notifications").insert({
      recipient_id: invite.volunteer.volunteerId,
      sender_id: user.id,
      sender_name: ongName,
      type: "invite",
      title: `Convite de ${ongName}`,
      body: invite.message,
      unread: true,
    });
    setInvite((s) => ({ ...s, sending: false, sent: true }));
    if (invite.volunteer) setInvitedVols((prev) => new Set([...prev, invite.volunteer!.volunteerId]));
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

  const open = dbActions.filter((a) => a.status === "open");
  const inProgress = dbActions.filter((a) => a.status === "in_progress");
  const criticalGaps = open.filter((a) => a.volunteersJoined / a.volunteersNeeded < 0.5);
  const activeConnections = ngoConnections.filter((n) => n.status === "active");

  // Análise de cobertura pelo agente (endpoint real)
  const agentGaps = useAgentCoverageGaps(!!user);
  // Relatório completo gerado pelo agente
  const crisisSummary = useAgentCrisisSummary(!!user);

  // Gera e baixa o relatório como .txt
  const downloadReport = () => {
    if (crisisSummary.loading || !crisisSummary.summary) return;
    const s = crisisSummary.stats;
    const date = crisisSummary.generatedAt
      ? new Date(crisisSummary.generatedAt).toLocaleString("pt-BR")
      : new Date().toLocaleString("pt-BR");

    const lines: string[] = [
      "═══════════════════════════════════════════════════════════",
      "   RELATÓRIO DE SITUAÇÃO — CRISIS AID ORCHESTRATOR",
      `   Gerado por: IBM watsonx Orchestrate`,
      `   Data/hora:  ${date}`,
      "═══════════════════════════════════════════════════════════",
      "",
      "▶ RESUMO EXECUTIVO",
      crisisSummary.summary,
      "",
      "▶ ESTATÍSTICAS",
      `   • Ações ativas:             ${s.totalActions}`,
      `   • Concluídas este mês:      ${s.completedThisMonth}`,
      `   • Voluntários ativos:       ${s.activeVolunteers}`,
      `   • Gaps críticos (< 50%):    ${s.criticalGaps}`,
      `   • Urgência alta com gap:    ${s.highUrgencyGaps}`,
      `   • Prontos para convidar:    ${s.readyToInvite}`,
      `   • Candidaturas pendentes:   ${s.pendingApplications}`,
      "",
      "▶ COBERTURA POR AÇÃO",
      ...crisisSummary.actionDetails.map((a) =>
        `   ${a.critical ? "⚠" : "✓"} [${a.urgency.toUpperCase()}] ${a.title} — ${a.coveragePct}% preenchida (${a.location})`
      ),
      "",
    ];

    if (crisisSummary.topVolunteers.actionTitle && crisisSummary.topVolunteers.volunteers.length > 0) {
      lines.push(`▶ TOP VOLUNTÁRIOS PARA "${crisisSummary.topVolunteers.actionTitle}"`);
      crisisSummary.topVolunteers.volunteers.forEach((v, i) =>
        lines.push(`   ${i + 1}. ${v.name} — score ${v.score}/100 — ${v.reason}`)
      );
      lines.push("");
    }

    if (crisisSummary.recommendations.length > 0) {
      lines.push("▶ RECOMENDAÇÕES DO AGENTE");
      crisisSummary.recommendations.forEach((r) => lines.push(`   ${r}`));
      lines.push("");
    }

    lines.push("═══════════════════════════════════════════════════════════");
    lines.push("   Crisis Aid Orchestrator · Hackathon IBM TechXchange 2026");
    lines.push("═══════════════════════════════════════════════════════════");

    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `relatorio-crise-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppShell role="ong">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold sm:text-2xl md:text-3xl">Painel · {ongName}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tudo que sua ONG precisa orquestrar em um só lugar.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
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

      {/* AI orchestration banner — resumo em linguagem natural */}
      <div className="mt-6 bg-gradient-hero p-4 sm:p-5 text-ai-foreground shadow-elegant rounded-xl">
        <div className="flex gap-3">
          <Sparkles className="h-5 w-5 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            {/* Título + botões na mesma linha em desktop, empilhados em mobile */}
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="font-bold flex items-center gap-2 text-sm sm:text-base">
                Relatório do agente
                {crisisSummary.loading && <Loader2 className="h-3.5 w-3.5 animate-spin opacity-70" />}
              </p>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={crisisSummary.refresh}
                  disabled={crisisSummary.loading}
                  className="flex items-center gap-1 rounded-lg bg-white/15 px-2 py-1.5 text-xs font-medium hover:bg-white/25 disabled:opacity-50 transition"
                  title="Atualizar relatório"
                >
                  <RefreshCw className={`h-3 w-3 ${crisisSummary.loading ? "animate-spin" : ""}`} />
                  <span className="hidden xs:inline">Atualizar</span>
                </button>
                <button
                  onClick={downloadReport}
                  disabled={crisisSummary.loading}
                  className="flex items-center gap-1 rounded-lg bg-white/15 px-2 py-1.5 text-xs font-medium hover:bg-white/25 disabled:opacity-50 transition"
                  title="Baixar relatório completo"
                >
                  <Download className="h-3 w-3" />
                  <span className="hidden xs:inline">Baixar</span>
                </button>
                <Button asChild size="sm" variant="secondary" className="shrink-0 h-7 text-xs px-2">
                  <Link to="/ong/actions">
                    Ver ações <ArrowRight className="ml-1 h-3 w-3" />
                  </Link>
                </Button>
              </div>
            </div>

            {/* Texto do resumo */}
            {crisisSummary.loading ? (
              <p className="mt-1.5 text-sm opacity-80">Analisando suas ações e voluntários…</p>
            ) : crisisSummary.error ? (
              <p className="mt-1.5 text-xs opacity-80 font-mono break-all">⚠ Erro ao carregar: {crisisSummary.error}</p>
            ) : crisisSummary.summary ? (
              <p className="mt-1.5 text-sm opacity-90 leading-relaxed">{crisisSummary.summary}</p>
            ) : (
              <p className="mt-1.5 text-sm opacity-80">
                {agentGaps.gaps.length > 0
                  ? `${agentGaps.gaps.length} ações com cobertura crítica · ${agentGaps.summary.high > 0 ? `${agentGaps.summary.high} urgência alta` : ""}`
                  : "Todas as ações com boa cobertura"}
              </p>
            )}

            {/* Chips de estatísticas */}
            {!crisisSummary.loading && crisisSummary.stats.totalActions > 0 && (
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1.5 text-xs opacity-80">
                {crisisSummary.stats.criticalGaps > 0 && (
                  <span>⚠ {crisisSummary.stats.criticalGaps} cobertura crítica</span>
                )}
                {crisisSummary.stats.readyToInvite > 0 && (
                  <span>👥 {crisisSummary.stats.readyToInvite} prontos p/ convidar</span>
                )}
                {crisisSummary.stats.pendingApplications > 0 && (
                  <span>📋 {crisisSummary.stats.pendingApplications} candidaturas</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recomendações do agente */}
      {!crisisSummary.loading && crisisSummary.recommendations.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {crisisSummary.recommendations.map((rec, i) => (
            <div key={i} className="flex items-start gap-2 rounded-lg border border-ai/20 bg-ai/5 px-3 py-2 text-sm text-foreground">
              {rec}
            </div>
          ))}
        </div>
      )}

      {/* KPIs */}
      <div className="mt-6 grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
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
            value: dbVolCount || 312,
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
                <div key={a.id} className="border border-border/60 bg-card p-3 sm:p-4 shadow-soft rounded-xl">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
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
                      <p className="mt-1 font-semibold leading-tight text-sm line-clamp-2">{a.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1 truncate">
                        <MapPin className="h-3 w-3 shrink-0" /> {a.location}
                      </p>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <p className="text-sm font-bold tabular-nums">
                        {a.volunteersJoined}/{a.volunteersNeeded}
                      </p>
                      <p className="text-[10px] text-muted-foreground">voluntários</p>
                    </div>
                  </div>
                  <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-gradient-hero" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {a.helpTypes.slice(0, 3).map((t) => (
                      <span
                        key={t}
                        className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                      >
                        {helpTypeLabels[t]}
                      </span>
                    ))}
                    {a.helpTypes.length > 3 && (
                      <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        +{a.helpTypes.length - 3}
                      </span>
                    )}
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
            {aiVolLoading ? (
              <div className="flex items-center justify-center py-6 gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Analisando voluntários…
              </div>
            ) : aiVolunteers.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Nenhum voluntário encontrado ainda.</p>
            ) : (
              aiVolunteers.slice(0, 3).map((v) => (
                <div
                  key={v.volunteerId}
                  className="flex items-center gap-3 border border-border/60 bg-card p-3 sm:p-4 shadow-soft rounded-xl"
                >
                  <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-hero text-primary-foreground font-bold text-sm">
                    {v.initials ?? v.name?.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold truncate text-sm">{v.name}</p>
                      <span className="rounded-full bg-ai/10 px-2 py-0.5 text-[10px] font-bold text-ai shrink-0">
                        {v.score}%
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                      {v.distanceKm != null && (
                        <span className="flex items-center gap-0.5">
                          <MapPin className="h-3 w-3" /> {v.distanceKm}km
                        </span>
                      )}
                      {v.rating != null && (
                        <span className="flex items-center gap-0.5">
                          <Star className="h-3 w-3 fill-warning text-warning" /> {v.rating.toFixed(1)}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[10px] text-ai/70 truncate">{v.reason}</p>
                  </div>
                  {invitedVols.has(v.volunteerId) ? (
                    <span className="flex items-center gap-1 rounded-full bg-success/15 px-2 sm:px-2.5 py-1 text-[11px] font-bold text-success shrink-0">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Convidado</span>
                    </span>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => openInvite(v)} className="shrink-0 text-xs px-2 sm:px-3">
                      <Send className="h-3 w-3 sm:mr-1" />
                      <span className="hidden sm:inline">Convidar</span>
                    </Button>
                  )}
                </div>
              ))
            )}
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
                        {(invite.volunteer.skills ?? []).join(" · ")}{invite.volunteer.distanceKm != null ? ` · ${invite.volunteer.distanceKm}km` : ""}
                      </p>
                    </div>
                    <span className="ml-auto rounded-full bg-ai/10 px-2 py-0.5 text-[10px] font-bold text-ai">
                      {invite.volunteer.score}% match
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
