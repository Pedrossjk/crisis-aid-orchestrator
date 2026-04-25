import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { actions, type CrisisAction, helpTypeLabels, urgencyLabels, type Urgency, type HelpType } from "@/lib/mock-data";
import { ArrowLeft, MapPin, Clock, Users, Share2, Flame, Navigation, Car, Sparkles, CheckCircle2, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/volunteer/action/$actionId")({
  head: () => ({
    meta: [
      { title: "Detalhes da ação — Orquestra" },
      { name: "description", content: "Detalhes da ação de voluntariado, mapa, rota e impacto." },
    ],
  }),
  component: ActionDetail,
  notFoundComponent: NotFound,
});

const urgencyStyles: Record<Urgency, string> = {
  high: "bg-urgent text-urgent-foreground",
  medium: "bg-warning text-warning-foreground",
  low: "bg-success text-success-foreground",
};

function NotFound() {
  return (
    <AppShell role="volunteer">
      <div className="text-center py-20">
        <p className="text-lg font-bold">Ação não encontrada</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/volunteer">Voltar ao feed</Link>
        </Button>
      </div>
    </AppShell>
  );
}

function ActionDetail() {
  const { actionId } = Route.useParams();
  const action: CrisisAction | undefined = actions.find((a) => a.id === actionId);
  const { user } = useAuth();

  const [applyOpen, setApplyOpen] = useState(false);
  const [applyMsg, setApplyMsg] = useState("");
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [alreadyApplied, setAlreadyApplied] = useState(false);

  if (!action) return <NotFound />;

  const filledPct = (action.volunteersJoined / action.volunteersNeeded) * 100;

  const displayName = (user?.user_metadata?.full_name as string | undefined) ?? "Voluntário";
  const initials = displayName.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  const handleApply = async () => {
    if (!user) return;
    setApplying(true);
    try {
      const { error } = await supabase.from("action_applications").insert({
        action_id: action.id,
        action_title: action.title,
        volunteer_id: user.id,
        volunteer_name: displayName,
        volunteer_initials: initials,
        message: applyMsg.trim() || null,
        status: "pending",
      });
      if (error) {
        if (error.code === "23505") {
          setAlreadyApplied(true);
        } else {
          throw error;
        }
      } else {
        setApplied(true);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setApplying(false);
    }
  };

  return (
    <AppShell role="volunteer">
      <Button asChild variant="ghost" size="sm" className="-ml-3 mb-4">
        <Link to="/volunteer"><ArrowLeft className="mr-1 h-4 w-4" /> Voltar</Link>
      </Button>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-soft">
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase", urgencyStyles[action.urgency])}>
                {action.urgency === "high" && <Flame className="h-3 w-3" />}
                {urgencyLabels[action.urgency]}
              </span>
              {action.isAiRecommended && (
                <span className="inline-flex items-center gap-1 rounded-full bg-gradient-ai px-2.5 py-1 text-[10px] font-bold uppercase text-ai-foreground">
                  <Sparkles className="h-3 w-3" /> Match 94% para você
                </span>
              )}
            </div>
            <h1 className="mt-3 text-2xl font-bold md:text-3xl">{action.title}</h1>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-hero text-sm font-bold text-primary-foreground">
                {action.orgAvatar}
              </div>
              <div>
                <p className="text-sm font-semibold">{action.org}</p>
                <p className="text-xs text-muted-foreground">Postado {action.postedAgo}</p>
              </div>
            </div>
            <p className="mt-5 text-sm leading-relaxed text-muted-foreground">{action.description}</p>

            <div className="mt-5 grid grid-cols-3 gap-3 text-sm">
              <div className="rounded-xl bg-muted p-3">
                <MapPin className="h-4 w-4 text-primary" />
                <p className="mt-1 font-semibold">{action.distanceKm} km</p>
                <p className="text-xs text-muted-foreground">{action.location}</p>
              </div>
              <div className="rounded-xl bg-muted p-3">
                <Clock className="h-4 w-4 text-primary" />
                <p className="mt-1 font-semibold">{action.effort}</p>
                <p className="text-xs text-muted-foreground">Esforço</p>
              </div>
              <div className="rounded-xl bg-muted p-3">
                <Users className="h-4 w-4 text-primary" />
                <p className="mt-1 font-semibold">{action.volunteersJoined}/{action.volunteersNeeded}</p>
                <p className="text-xs text-muted-foreground">Voluntários</p>
              </div>
            </div>

            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-gradient-hero" style={{ width: `${filledPct}%` }} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{Math.round(filledPct)}% das vagas preenchidas</p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-soft">
            <div className="relative h-72 bg-gradient-to-br from-primary/20 via-accent to-ai/20">
              <svg className="absolute inset-0 h-full w-full opacity-40" viewBox="0 0 400 300" preserveAspectRatio="none">
                <defs>
                  <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5" />
                  </pattern>
                </defs>
                <rect width="400" height="300" fill="url(#grid)" className="text-primary" />
                <path d="M 50 250 Q 150 150 250 180 T 380 80" fill="none" stroke="oklch(0.48 0.12 215)" strokeWidth="3" strokeDasharray="8 4" />
              </svg>
              <div className="absolute left-[12%] bottom-[15%] flex flex-col items-center">
                <div className="h-3 w-3 rounded-full bg-primary ring-4 ring-primary/20" />
                <p className="mt-1 rounded-md bg-card/90 px-2 py-0.5 text-[10px] font-semibold shadow">Você</p>
              </div>
              <div className="absolute right-[15%] top-[20%] flex flex-col items-center animate-pulse-ring">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-urgent shadow-elegant">
                  <MapPin className="h-4 w-4 text-urgent-foreground" />
                </div>
                <p className="mt-1 rounded-md bg-card/90 px-2 py-0.5 text-[10px] font-semibold shadow">{action.location}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 p-4">
              <div className="text-center">
                <Navigation className="mx-auto h-4 w-4 text-primary" />
                <p className="mt-1 text-sm font-bold">{action.distanceKm} km</p>
                <p className="text-xs text-muted-foreground">Distância</p>
              </div>
              <div className="text-center">
                <Clock className="mx-auto h-4 w-4 text-primary" />
                <p className="mt-1 text-sm font-bold">{Math.round(action.distanceKm * 2.5)} min</p>
                <p className="text-xs text-muted-foreground">Tempo est.</p>
              </div>
              <div className="text-center">
                <Car className="mx-auto h-4 w-4 text-primary" />
                <p className="mt-1 text-sm font-bold">R$ {(action.distanceKm * 0.8).toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Custo est.</p>
              </div>
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-soft">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tipos de ajuda</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {action.helpTypes.map((t: HelpType) => (
                <span key={t} className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  {helpTypeLabels[t]}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-gradient-ai p-5 text-ai-foreground shadow-elegant">
            <Sparkles className="h-5 w-5" />
            <p className="mt-2 text-xs font-bold uppercase tracking-wider opacity-80">Análise da IA</p>
            <p className="mt-1 text-sm leading-relaxed">
              Esta ação combina perfeitamente com suas habilidades de logística e disponibilidade nas tardes.
              Você está a apenas {action.distanceKm}km do local.
            </p>
          </div>

          <div className="sticky bottom-24 md:bottom-4 space-y-2">
            <Button className="w-full bg-gradient-hero shadow-elegant" size="lg" onClick={() => { setApplyOpen(true); setApplied(false); setAlreadyApplied(false); setApplyMsg(""); }}>
              <CheckCircle2 className="mr-2 h-4 w-4" /> Quero ajudar
            </Button>
            <Button variant="outline" className="w-full" size="lg">
              <Share2 className="mr-2 h-4 w-4" /> Compartilhar
            </Button>
          </div>
        </aside>
      </div>

      {/* Application modal */}
      <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Candidatar-se à ação</DialogTitle>
          </DialogHeader>
          {applied ? (
            <div className="py-6 text-center space-y-3">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/15">
                <CheckCircle2 className="h-8 w-8 text-success" />
              </div>
              <p className="font-semibold">Solicitação enviada!</p>
              <p className="text-sm text-muted-foreground">A ONG foi notificada e entrará em contato em breve.</p>
              <Button className="w-full mt-2" onClick={() => setApplyOpen(false)}>Fechar</Button>
            </div>
          ) : alreadyApplied ? (
            <div className="py-6 text-center space-y-3">
              <p className="font-semibold">Você já se candidatou a esta ação</p>
              <p className="text-sm text-muted-foreground">Aguarde a resposta da ONG.</p>
              <Button variant="outline" className="w-full mt-2" onClick={() => setApplyOpen(false)}>Fechar</Button>
            </div>
          ) : (
            <>
              <div className="space-y-4 py-2">
                <div className="rounded-xl bg-muted p-3 text-sm">
                  <p className="font-semibold">{action.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{action.org} · {action.location}</p>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Mensagem para a ONG <span className="text-muted-foreground font-normal">(opcional)</span></label>
                  <Textarea
                    placeholder="Descreva brevemente sua experiência e por que quer ajudar…"
                    value={applyMsg}
                    onChange={(e) => setApplyMsg(e.target.value)}
                    rows={4}
                    className="resize-none"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setApplyOpen(false)} disabled={applying}>Cancelar</Button>
                <Button onClick={handleApply} disabled={applying} className="bg-gradient-hero">
                  {applying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Enviar solicitação
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
