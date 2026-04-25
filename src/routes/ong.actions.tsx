import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { actions, requests, helpTypeLabels, urgencyLabels, type Urgency, type CrisisAction } from "@/lib/mock-data";
import { useMatchedVolunteers, type MatchResult } from "@/hooks/use-agent";
import { Plus, MapPin, Flame, Clock, Users, ListChecks, Inbox, Sparkles, CheckCircle2, Trash2, Pencil, X, Loader2, UserCheck, Star, Send } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

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

type Application = {
  id: string;
  action_id: string;
  volunteer_name: string;
  volunteer_initials: string;
  message: string | null;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
};

type ManageDraft = {
  title: string;
  description: string;
  location: string;
  effort: string;
  urgency: Urgency;
  volunteersNeeded: number;
  status: "open" | "in_progress" | "closed";
};

function ActionsPage() {
  const { user } = useAuth();

  // Candidates sheet
  const [candidatesAction, setCandidatesAction] = useState<CrisisAction | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  // Invite dialog state
  type InviteVolState = { vol: MatchResult | null; message: string; sending: boolean; sent: boolean };
  const [inviteVol, setInviteVol] = useState<InviteVolState>({ vol: null, message: "", sending: false, sent: false });
  const [invitedVols, setInvitedVols] = useState<Set<string>>(new Set());

  // Manage sheet
  const [manageAction, setManageAction] = useState<CrisisAction | null>(null);
  const [manageDraft, setManageDraft] = useState<ManageDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Real-time AI matching for the open candidates sheet
  const { results: aiSuggestions, loading: aiLoading } = useMatchedVolunteers(
    candidatesAction?.id ?? null,
    candidatesAction?.helpTypes ?? [],
    candidatesAction?.urgency ?? "medium"
  );

  // Local actions state (for status updates / deletions in-session)
  const [localActions, setLocalActions] = useState(actions);

  const openCandidates = async (a: CrisisAction) => {
    setCandidatesAction(a);
    setInvitedVols(new Set());
    setLoadingApps(true);
    const { data } = await supabase
      .from("action_applications")
      .select("id,action_id,volunteer_name,volunteer_initials,message,status,created_at")
      .eq("action_id", a.id)
      .order("created_at", { ascending: false });
    setApplications((data as Application[]) ?? []);
    setLoadingApps(false);
  };

  const openManage = (a: CrisisAction) => {
    setManageAction(a);
    setManageDraft({
      title: a.title,
      description: a.description,
      location: a.location,
      effort: a.effort,
      urgency: a.urgency,
      volunteersNeeded: a.volunteersNeeded,
      status: a.status as ManageDraft["status"],
    });
    setConfirmDelete(false);
  };

  const saveManage = async () => {
    if (!manageAction || !manageDraft) return;
    setSaving(true);
    // Update in Supabase if the action has a real DB record
    await supabase.from("crisis_actions").update({
      title: manageDraft.title,
      description: manageDraft.description,
      location: manageDraft.location,
      effort: manageDraft.effort,
      urgency: manageDraft.urgency,
      volunteers_needed: manageDraft.volunteersNeeded,
      status: manageDraft.status,
    }).eq("id", manageAction.id);
    // Update local state for immediate UI feedback
    setLocalActions((prev) =>
      prev.map((a) =>
        a.id === manageAction.id
          ? { ...a, ...manageDraft, volunteersNeeded: manageDraft.volunteersNeeded }
          : a
      )
    );
    setSaving(false);
    setManageAction(null);
  };

  const markComplete = async () => {
    if (!manageAction) return;
    setSaving(true);
    await supabase.from("crisis_actions").update({ status: "closed" }).eq("id", manageAction.id);
    setLocalActions((prev) =>
      prev.map((a) => (a.id === manageAction.id ? { ...a, status: "closed" } : a))
    );
    setSaving(false);
    setManageAction(null);
  };

  const deleteAction = async () => {
    if (!manageAction) return;
    setSaving(true);
    await supabase.from("crisis_actions").delete().eq("id", manageAction.id);
    setLocalActions((prev) => prev.filter((a) => a.id !== manageAction.id));
    setSaving(false);
    setManageAction(null);
  };

  const buildVolInviteMsg = (volName: string, actionTitle: string): string => {
    const ongName = (user?.user_metadata?.full_name as string | undefined) ?? "nossa ONG";
    return `Olá, ${volName}!\n\nSou da ONG ${ongName} e identificamos que o seu perfil tem grande compatibilidade com a nossa ação "${actionTitle}".\n\nGostaríamos de convidá-lo(a) a participar desta iniciativa. Acesse o app para ver todos os detalhes e confirmar sua participação.\n\nCom gratidão,\n${ongName}`;
  };

  const openInviteVol = (v: MatchResult) => {
    if (!candidatesAction) return;
    setInviteVol({ vol: v, message: buildVolInviteMsg(v.name ?? "voluntário", candidatesAction.title), sending: false, sent: false });
  };

  const closeInviteVol = () => setInviteVol((s) => ({ ...s, vol: null, sent: false }));

  const sendInviteVol = async () => {
    if (!inviteVol.vol || !user) return;
    setInviteVol((s) => ({ ...s, sending: true }));
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .ilike("name", inviteVol.vol.name ?? "")
      .maybeSingle();
    await supabase.from("notifications").insert({
      recipient_id: profile?.id ?? null,
      sender_id: user.id,
      sender_name: (user.user_metadata?.full_name as string) ?? "ONG",
      type: "invite",
      title: `Convite para ação: ${candidatesAction?.title ?? ""}`,
      body: inviteVol.message,
      unread: true,
    });
    setInviteVol((s) => ({ ...s, sending: false, sent: true }));
    if (inviteVol.vol) setInvitedVols((prev) => new Set([...prev, inviteVol.vol!.volunteerId]));
  };



  return (
    <AppShell role="ong">
      <h1 className="text-2xl font-bold md:text-3xl flex items-center gap-2">
        <ListChecks className="h-7 w-7 text-primary" /> Ações
      </h1>
      <p className="mt-1 text-muted-foreground">Crie ações que mobilizam voluntários ou assuma solicitações abertas.</p>

      <Tabs defaultValue="mine" className="mt-6">
        <TabsList>
          <TabsTrigger value="mine">Minhas ações</TabsTrigger>
          <TabsTrigger value="in_progress">
            Em andamento
            {localActions.filter((a) => a.status === "in_progress").length > 0 && (
              <span className="ml-1.5 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                {localActions.filter((a) => a.status === "in_progress").length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="new">Nova ação</TabsTrigger>
        </TabsList>

        <TabsContent value="mine" className="mt-5">
          <div className="space-y-3">
            {localActions.map((a) => {
              const pct = (a.volunteersJoined / a.volunteersNeeded) * 100;
              return (
                <div key={a.id} className="border border-border/60 bg-card p-5 shadow-soft">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase flex items-center gap-1", urgencyStyles[a.urgency])}>
                      {a.urgency === "high" && <Flame className="h-3 w-3" />}
                      {urgencyLabels[a.urgency]}
                    </span>
                    {a.helpTypes.map((t) => (
                      <span key={t} className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium">{helpTypeLabels[t]}</span>
                    ))}
                    {a.status === "closed" && (
                      <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold text-success flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Concluída
                      </span>
                    )}
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
                    <Button variant="outline" className="flex-1" onClick={() => openCandidates(a)}>
                      <Users className="mr-1.5 h-3.5 w-3.5" /> Ver candidatos
                    </Button>
                    <Button className="flex-1 bg-primary" onClick={() => openManage(a)}>
                      <Pencil className="mr-1.5 h-3.5 w-3.5" /> Gerenciar
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="in_progress" className="mt-5">
          {localActions.filter((a) => a.status === "in_progress").length === 0 ? (
            <div className="rounded-2xl border border-border/60 bg-muted/40 p-10 text-center text-sm text-muted-foreground">
              <ListChecks className="mx-auto h-10 w-10 opacity-30 mb-3" />
              Nenhuma ação em andamento no momento.
            </div>
          ) : (
            <div className="space-y-3">
              {localActions.filter((a) => a.status === "in_progress").map((a) => {
                const pct = (a.volunteersJoined / a.volunteersNeeded) * 100;
                return (
                  <div key={a.id} className="border border-border/60 bg-card p-5 shadow-soft">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase flex items-center gap-1", urgencyStyles[a.urgency])}>
                        {a.urgency === "high" && <Flame className="h-3 w-3" />}
                        {urgencyLabels[a.urgency]}
                      </span>
                      {a.helpTypes.map((t) => (
                        <span key={t} className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium">{helpTypeLabels[t]}</span>
                      ))}
                      <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Em andamento
                      </span>
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
                      <Button variant="outline" className="flex-1" onClick={() => openCandidates(a)}>
                        <Users className="mr-1.5 h-3.5 w-3.5" /> Ver candidatos
                      </Button>
                      <Button className="flex-1 bg-primary" onClick={() => openManage(a)}>
                        <Pencil className="mr-1.5 h-3.5 w-3.5" /> Gerenciar
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
          <div className="max-w-2xl border border-border/60 bg-card p-6 shadow-soft">
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

      {/* ── Candidates Sheet ── */}
      <Sheet open={!!candidatesAction} onOpenChange={(open) => { if (!open) setCandidatesAction(null); }}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="mb-5">
            <SheetTitle className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" /> Candidatos
            </SheetTitle>
            {candidatesAction && (
              <p className="text-xs text-muted-foreground truncate">{candidatesAction.title}</p>
            )}
          </SheetHeader>

          {/* Enrolled applicants */}
          <div className="space-y-5">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <UserCheck className="h-4 w-4 text-success" />
                <p className="text-sm font-bold">Inscritos na ação</p>
                {!loadingApps && (
                  <Badge className="bg-success/15 text-success text-[10px] h-4 px-1.5">{applications.length}</Badge>
                )}
              </div>
              {loadingApps ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : applications.length === 0 ? (
                <div className="rounded-xl border border-border/60 bg-muted/40 p-5 text-center text-sm text-muted-foreground">
                  <Users className="mx-auto h-8 w-8 opacity-30 mb-2" />
                  Nenhum inscrito ainda para esta ação.
                </div>
              ) : (
                <div className="space-y-2">
                  {applications.map((app) => (
                    <div key={app.id} className="flex items-start gap-3 rounded-xl border border-border/60 bg-card p-3 shadow-soft">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-hero text-primary-foreground font-bold text-sm">
                        {app.volunteer_initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold">{app.volunteer_name}</p>
                          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold",
                            app.status === "pending" ? "bg-warning/15 text-warning" :
                            app.status === "accepted" ? "bg-success/15 text-success" :
                            "bg-destructive/15 text-destructive"
                          )}>
                            {app.status === "pending" ? "Pendente" : app.status === "accepted" ? "Aceito" : "Recusado"}
                          </span>
                        </div>
                        {app.message && (
                          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{app.message}</p>
                        )}
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          {new Date(app.created_at).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* AI suggestions */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-ai" />
                <p className="text-sm font-bold text-gradient-ai">Sugestões da IA</p>
                {!aiLoading && (
                  <Badge className="bg-ai/10 text-ai text-[10px] h-4 px-1.5">{aiSuggestions.length}</Badge>
                )}
              </div>
              <div className="rounded-xl border border-ai/20 bg-ai/5 px-3 py-2 text-xs text-muted-foreground mb-3">
                Voluntários com maior compatibilidade de habilidades, confiabilidade e avaliação para esta ação.
              </div>
              {aiLoading ? (
                <div className="flex items-center justify-center py-6 gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Analisando voluntários…
                </div>
              ) : (
                <div className="space-y-2">
                  {aiSuggestions.map((v) => (
                    <div key={v.volunteerId} className="flex items-center gap-3 rounded-xl border border-ai/20 bg-card p-3 shadow-soft">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-ai text-ai-foreground font-bold text-sm">
                        {v.initials ?? v.name?.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold">{v.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          {v.distanceKm != null && (
                            <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" /> {v.distanceKm}km</span>
                          )}
                          {v.rating != null && (
                            <span className="flex items-center gap-0.5"><Star className="h-3 w-3 fill-warning text-warning" /> {v.rating.toFixed(1)}</span>
                          )}
                          {v.skills && v.skills.length > 0 && (
                            <span className="truncate">{v.skills.join(" · ")}</span>
                          )}
                        </div>
                        <p className="mt-0.5 text-[10px] text-ai/70 truncate">{v.reason}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="rounded-full bg-ai/10 px-2 py-0.5 text-[10px] font-bold text-ai">{v.score}%</span>
                        {invitedVols.has(v.volunteerId) ? (
                          <span className="flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-1 text-[11px] font-bold text-success">
                            <CheckCircle2 className="h-3 w-3" /> Convidado
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            className="h-7 px-2.5 text-xs gap-1 bg-gradient-hero"
                            onClick={() => openInviteVol(v)}
                          >
                            <Send className="h-3 w-3" /> Convidar
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Invite Vol Dialog ── */}
      <Dialog open={!!inviteVol.vol} onOpenChange={(open) => { if (!open) closeInviteVol(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Convidar voluntário</DialogTitle>
          </DialogHeader>
          {inviteVol.sent ? (
            <div className="py-6 text-center space-y-3">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/15">
                <CheckCircle2 className="h-8 w-8 text-success" />
              </div>
              <p className="font-semibold">Convite enviado!</p>
              <p className="text-sm text-muted-foreground">
                {inviteVol.vol?.name} receberá uma notificação com sua mensagem.
              </p>
              <Button className="w-full mt-2" onClick={closeInviteVol}>Fechar</Button>
            </div>
          ) : (
            <>
              <div className="space-y-4 py-2">
                {inviteVol.vol && (
                  <div className="flex items-center gap-3 rounded-xl bg-muted p-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-ai text-ai-foreground font-bold text-sm">
                      {inviteVol.vol.initials}
                    </div>
                    <div>
                      <p className="font-semibold">{inviteVol.vol.name}</p>
                    <p className="text-xs text-muted-foreground">{(inviteVol.vol?.skills ?? []).join(" · ")}{inviteVol.vol?.distanceKm != null ? ` · ${inviteVol.vol.distanceKm}km` : ""}</p>
                    </div>
                    <span className="ml-auto rounded-full bg-ai/10 px-2 py-0.5 text-[10px] font-bold text-ai">{inviteVol.vol?.score}% match</span>
                  </div>
                )}
                {candidatesAction && (
                  <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-card px-3 py-2">
                    <ListChecks className="h-3.5 w-3.5 text-primary shrink-0" />
                    <p className="text-xs text-muted-foreground truncate">Ação: <span className="font-medium text-foreground">{candidatesAction.title}</span></p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium mb-1.5 block">
                    Mensagem <span className="text-muted-foreground font-normal">(editável)</span>
                  </label>
                  <Textarea
                    value={inviteVol.message}
                    onChange={(e) => setInviteVol((s) => ({ ...s, message: e.target.value }))}
                    rows={9}
                    className="resize-none text-sm"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={closeInviteVol} disabled={inviteVol.sending}>Cancelar</Button>
                <Button onClick={sendInviteVol} disabled={inviteVol.sending || !inviteVol.message.trim()} className="bg-gradient-hero">
                  {inviteVol.sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Enviar convite
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Manage Sheet ── */}
      <Sheet open={!!manageAction} onOpenChange={(open) => { if (!open) { setManageAction(null); setConfirmDelete(false); } }}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="mb-5">
            <SheetTitle className="flex items-center gap-2">
              <Pencil className="h-4 w-4 text-primary" /> Gerenciar ação
            </SheetTitle>
          </SheetHeader>

          {manageDraft && manageAction && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Título</Label>
                <Input value={manageDraft.title} onChange={(e) => setManageDraft((d) => d ? { ...d, title: e.target.value } : d)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Descrição</Label>
                <Textarea value={manageDraft.description} onChange={(e) => setManageDraft((d) => d ? { ...d, description: e.target.value } : d)} className="min-h-24 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Localização</Label>
                  <Input value={manageDraft.location} onChange={(e) => setManageDraft((d) => d ? { ...d, location: e.target.value } : d)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Esforço</Label>
                  <Input value={manageDraft.effort} onChange={(e) => setManageDraft((d) => d ? { ...d, effort: e.target.value } : d)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Urgência</Label>
                  <select
                    value={manageDraft.urgency}
                    onChange={(e) => setManageDraft((d) => d ? { ...d, urgency: e.target.value as Urgency } : d)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="high">Urgente</option>
                    <option value="medium">Moderada</option>
                    <option value="low">Baixa</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Voluntários necessários</Label>
                  <Input
                    type="number"
                    value={manageDraft.volunteersNeeded}
                    onChange={(e) => setManageDraft((d) => d ? { ...d, volunteersNeeded: Number(e.target.value) } : d)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <select
                  value={manageDraft.status}
                  onChange={(e) => setManageDraft((d) => d ? { ...d, status: e.target.value as ManageDraft["status"] } : d)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="open">Aberta</option>
                  <option value="in_progress">Em andamento</option>
                  <option value="closed">Concluída</option>
                </select>
              </div>

              {/* Save */}
              <Button onClick={saveManage} disabled={saving} className="w-full bg-gradient-hero shadow-elegant">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Pencil className="mr-2 h-4 w-4" />}
                Salvar alterações
              </Button>

              {/* Mark complete shortcut */}
              {manageDraft.status !== "closed" && (
                <Button onClick={markComplete} disabled={saving} variant="outline" className="w-full gap-2 text-success border-success/40 hover:bg-success/5">
                  <CheckCircle2 className="h-4 w-4" /> Marcar como concluída
                </Button>
              )}

              {/* Delete */}
              <div className="border-t border-border/60 pt-4">
                {!confirmDelete ? (
                  <Button
                    variant="outline"
                    className="w-full gap-2 text-destructive border-destructive/40 hover:bg-destructive/5"
                    onClick={() => setConfirmDelete(true)}
                  >
                    <Trash2 className="h-4 w-4" /> Excluir ação
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-center text-muted-foreground">Tem certeza? Esta ação não pode ser desfeita.</p>
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1" onClick={() => setConfirmDelete(false)} disabled={saving}>Cancelar</Button>
                      <Button onClick={deleteAction} disabled={saving} className="flex-1 bg-destructive hover:bg-destructive/90 text-white">
                        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                        Confirmar exclusão
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </AppShell>
  );
}
