import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { actions as mockActions, type CrisisAction, helpTypeLabels, urgencyLabels, type Urgency, type HelpType } from "@/lib/mock-data";
import { ArrowLeft, MapPin, Clock, Users, Share2, Flame, Navigation, Car, Sparkles, CheckCircle2, Send, Loader2, Check, Building2, Phone, Globe, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useMyScoreForAction } from "@/hooks/use-agent";
import { cityToCoords } from "@/lib/matching";

type OngProfile = {
  name: string;
  initials: string;
  city: string;
  description: string;
  areas: string[];
  phone?: string;
  website?: string;
  activeActions: number;
  volunteersHelped: number;
};

const ongProfiles: Record<string, OngProfile> = {
  "Cruz Verde Brasil": { name: "Cruz Verde Brasil", initials: "CV", city: "Blumenau, SC", description: "Organização reconhecida pelo atendimento em crise hídrica e distribuição de alimentos em Santa Catarina. Atuamos em mais de 30 municípios desde 2012.", areas: ["Alimentos", "Logística", "Abrigo"], phone: "(47) 3399-1234", website: "cruzverdebrasil.org.br", activeActions: 8, volunteersHelped: 1240 },
  "Patas Solidárias": { name: "Patas Solidárias", initials: "PS", city: "Itajaí, SC", description: "ONG especializada em resgates e transporte de animais em áreas de risco climático. Já resgatamos mais de 3.000 animais.", areas: ["Resgate animal", "Transporte", "Bem-estar animal"], phone: "(47) 98877-5566", website: "patassolidarias.org", activeActions: 3, volunteersHelped: 540 },
  "Saúde Sem Fronteiras": { name: "Saúde Sem Fronteiras", initials: "SF", city: "Florianópolis, SC", description: "Equipe médica voluntária que atua em triagem e primeiros socorros em abrigos emergenciais em todo o Sul do Brasil.", areas: ["Saúde", "Triagem", "Medicina de emergência"], phone: "(48) 99123-4567", website: "saudesemfronteiras.org.br", activeActions: 5, volunteersHelped: 890 },
  "Mãos que Alimentam": { name: "Mãos que Alimentam", initials: "MA", city: "Brusque, SC", description: "Instituição focada na distribuição de alimentos e cobertores para famílias desabrigadas em situações de calamidade.", areas: ["Alimentação", "Suprimentos", "Abrigo familiar"], phone: "(47) 3212-9988", website: "maosquealimentam.org", activeActions: 6, volunteersHelped: 2100 },
};

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
  const { user } = useAuth();

  const [action, setAction] = useState<CrisisAction | undefined>(
    mockActions.find((a) => a.id === actionId)
  );
  const [actionCoords, setActionCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [loadingAction, setLoadingAction] = useState(!action);

  // GPS do usuário → fallback por cidade (mesmo padrão do feed)
  const [userCoords, setUserCoords] = useState<{ lat: number; lon: number; source: "gps" | "city" } | null>(null);
  useEffect(() => {
    if (!user?.id) return;
    const tryCity = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("city")
        .eq("id", user!.id)
        .maybeSingle();
      const coords = cityToCoords(data?.city);
      if (coords) setUserCoords({ lat: coords[0], lon: coords[1], source: "city" });
    };
    if (!navigator.geolocation) { tryCity(); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude, source: "gps" }),
      () => tryCity(),
      { timeout: 4000 }
    );
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Busca ação real do banco (IDs do banco são UUIDs, não "a1","a2"…)
  useEffect(() => {
    if (action) return; // já achou no mock, não precisa buscar
    setLoadingAction(true);
    supabase
      .from("crisis_actions")
      .select("id, title, description, location, latitude, longitude, urgency, effort, help_types, volunteers_needed, volunteers_joined, status, created_at, ngos!inner(name, initials)")
      .eq("id", actionId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          const ngo = (data as { ngos?: { name?: string; initials?: string } }).ngos;
          const now = new Date();
          const diffH = Math.floor((now.getTime() - new Date(data.created_at as string).getTime()) / 3_600_000);
          setAction({
            id:               data.id as string,
            title:            data.title as string,
            description:      (data.description as string) ?? "",
            org:              ngo?.name ?? "ONG",
            orgAvatar:        ngo?.initials ?? "NG",
            location:         (data.location as string) ?? "",
            distanceKm:       0,
            urgency:          data.urgency as Urgency,
            effort:           (data.effort as string) ?? "",
            helpTypes:        (data.help_types as HelpType[]) ?? [],
            volunteersNeeded: (data.volunteers_needed as number) ?? 1,
            volunteersJoined: (data.volunteers_joined as number) ?? 0,
            status:           data.status as "open" | "in_progress" | "completed" | "closed",
            postedAgo:        diffH < 1 ? "agora" : diffH < 24 ? `há ${diffH}h` : `há ${Math.floor(diffH / 24)}d`,
          });
          const lat = data.latitude as number | null;
          const lon = data.longitude as number | null;
          if (lat != null && lon != null) {
            setActionCoords({ lat, lon });
          } else {
            // Fallback: extrai cidade do campo location e usa CITY_COORDS
            const fallback = cityToCoords((data.location as string) ?? "");
            if (fallback) setActionCoords({ lat: fallback[0], lon: fallback[1] });
          }
        }
        setLoadingAction(false);
      });
  }, [actionId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fallback de coords da ação: tenta parsear city do campo location quando não há lat/lon do banco
  const resolvedActionCoords = actionCoords ?? (() => {
    if (!action) return null;
    const c = cityToCoords(action.location);
    return c ? { lat: c[0], lon: c[1] } : null;
  })();

  const myScore = useMyScoreForAction(
    user?.id ?? null,
    action?.id ?? null,
    userCoords?.lat ?? null,
    userCoords?.lon ?? null,
    resolvedActionCoords?.lat ?? null,
    resolvedActionCoords?.lon ?? null,
    action?.helpTypes ?? [],
    (action?.urgency ?? "medium") as "high" | "medium" | "low",
    userCoords?.source ?? null
  );

  const [applyOpen, setApplyOpen] = useState(false);
  const [applyMsg, setApplyMsg] = useState("");
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [alreadyApplied, setAlreadyApplied] = useState(false);
  const [shared, setShared] = useState(false);
  const [ongSheetOpen, setOngSheetOpen] = useState(false);

  if (loadingAction) {
    return (
      <AppShell role="volunteer">
        <div className="flex items-center justify-center py-24 gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Carregando ação…
        </div>
      </AppShell>
    );
  }
  if (!action) return <NotFound />;

  const ongProfile: OngProfile =
    ongProfiles[action.org] ?? {
      name: action.org,
      initials: action.orgAvatar,
      city: action.location,
      description: "Organização sem fins lucrativos dedicada a ajudar comunidades afetadas por crises e desastres.",
      areas: ["Ajuda humanitária"],
      activeActions: 1,
      volunteersHelped: 0,
    };

  const handleShare = async () => {
    const url = window.location.href;
    const shareData = {
      title: action.title,
      text: `Ajude a ${action.org} com: ${action.title} — ${action.location}`,
      url,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // user cancelled
      }
    } else {
      await navigator.clipboard.writeText(url);
      setShared(true);
      setTimeout(() => setShared(false), 2500);
    }
  };

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
                  <Sparkles className="h-3 w-3" /> Match {myScore.score > 0 ? `${myScore.score}%` : "recomendado"} para você
                </span>
              )}
              {!action.isAiRecommended && !myScore.loading && myScore.score > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-gradient-ai px-2.5 py-1 text-[10px] font-bold uppercase text-ai-foreground">
                  <Sparkles className="h-3 w-3" /> Match {myScore.score}% para você
                </span>
              )}
            </div>
            <h1 className="mt-3 text-2xl font-bold md:text-3xl">{action.title}</h1>
            <button
              className="mt-3 flex items-center gap-3 rounded-xl hover:bg-muted/60 transition -mx-2 px-2 py-1.5 w-full text-left"
              onClick={() => setOngSheetOpen(true)}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-hero text-sm font-bold text-primary-foreground shrink-0">
                {action.orgAvatar}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{action.org}</p>
                <p className="text-xs text-muted-foreground">Postado {action.postedAgo} · <span className="text-primary">Ver perfil da ONG</span></p>
              </div>
              <Info className="h-4 w-4 text-muted-foreground shrink-0" />
            </button>
            <p className="mt-5 text-sm leading-relaxed text-muted-foreground">{action.description}</p>

            <div className="mt-5 grid grid-cols-3 gap-3 text-sm">
              <div className="rounded-xl bg-muted p-3">
                <MapPin className="h-4 w-4 text-primary" />
                <p className="mt-1 font-semibold">
                  {myScore.loading
                    ? <Loader2 className="inline h-3.5 w-3.5 animate-spin text-muted-foreground" />
                    : myScore.distanceKm != null ? `${myScore.distanceKm} km` : "—"}
                </p>
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
                <p className="mt-1 text-sm font-bold">
                  {myScore.loading ? (
                    <Loader2 className="inline h-3.5 w-3.5 animate-spin text-muted-foreground" />
                  ) : myScore.distanceKm != null ? (
                    `${myScore.distanceKm} km`
                  ) : "— km"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {myScore.distanceSource === "city" ? "Dist. aprox." : "Distância"}
                </p>
              </div>
              <div className="text-center">
                <Clock className="mx-auto h-4 w-4 text-primary" />
                <p className="mt-1 text-sm font-bold">
                  {myScore.loading ? (
                    <Loader2 className="inline h-3.5 w-3.5 animate-spin text-muted-foreground" />
                  ) : myScore.travelMinutes != null ? (
                    `${myScore.travelMinutes} min`
                  ) : "— min"}
                </p>
                <p className="text-xs text-muted-foreground">Tempo est.</p>
              </div>
              <div className="text-center">
                <Car className="mx-auto h-4 w-4 text-primary" />
                <p className="mt-1 text-sm font-bold">
                  {myScore.loading ? (
                    <Loader2 className="inline h-3.5 w-3.5 animate-spin text-muted-foreground" />
                  ) : myScore.fuelCostBrl != null ? (
                    `R$ ${myScore.fuelCostBrl.toFixed(2)}`
                  ) : "—"}
                </p>
                <p className="text-xs text-muted-foreground">Gasolina est.</p>
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
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              {!myScore.loading && myScore.score > 0 && (
                <span className="ml-auto text-lg font-black">{myScore.score}%</span>
              )}
            </div>
            <p className="mt-2 text-xs font-bold uppercase tracking-wider opacity-80">Análise da IA</p>
            {myScore.loading ? (
              <div className="mt-2 flex items-center gap-2 text-xs opacity-70">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Calculando compatibilidade…
              </div>
            ) : (
              <>
                <p className="mt-1 text-sm leading-relaxed">{myScore.reason || "Perfil compatível com esta ação."}</p>
                {myScore.distanceKm != null && (
                  <p className="mt-2 text-xs opacity-75">
                    📍 {myScore.distanceKm} km do local
                    {myScore.distanceSource === "city" && " (aprox., baseado na sua cidade)"}
                    {" "}· ~{myScore.travelMinutes} min de carro · est. R$ {myScore.fuelCostBrl?.toFixed(2)} de gasolina
                  </p>
                )}
                {myScore.distanceKm == null && actionCoords && (
                  <p className="mt-2 text-xs opacity-75">Permita localização para calcular distância.</p>
                )}
              </>
            )}
          </div>

          <div className="sticky bottom-24 md:bottom-4 space-y-2">
            <Button className="w-full bg-gradient-hero shadow-elegant" size="lg" onClick={() => { setApplyOpen(true); setApplied(false); setAlreadyApplied(false); setApplyMsg(""); }}>
              <CheckCircle2 className="mr-2 h-4 w-4" /> Quero ajudar
            </Button>
            <Button variant="outline" className="w-full" size="lg" onClick={handleShare}>
              {shared ? (
                <><Check className="mr-2 h-4 w-4 text-success" /> Link copiado!</>
              ) : (
                <><Share2 className="mr-2 h-4 w-4" /> Compartilhar</>
              )}
            </Button>
          </div>
        </aside>
      </div>

      {/* ONG Profile Sheet */}
      <Sheet open={ongSheetOpen} onOpenChange={setOngSheetOpen}>
        <SheetContent side="right" className="overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" /> Sobre a ONG
            </SheetTitle>
            <SheetDescription className="sr-only">Informações da organização responsável pela ação</SheetDescription>
          </SheetHeader>

          <div className="mt-5 space-y-5">
            {/* Header */}
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-hero text-primary-foreground font-bold text-xl">
                {ongProfile.initials}
              </div>
              <div className="flex-1">
                <p className="text-xl font-bold">{ongProfile.name}</p>
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3.5 w-3.5" /> {ongProfile.city}
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border/60 bg-muted/30 p-3 text-center">
                <p className="text-lg font-bold">{ongProfile.activeActions}</p>
                <p className="text-[11px] text-muted-foreground">Ações ativas</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/30 p-3 text-center">
                <p className="text-lg font-bold">{ongProfile.volunteersHelped > 0 ? ongProfile.volunteersHelped.toLocaleString("pt-BR") : "—"}</p>
                <p className="text-[11px] text-muted-foreground">Voluntários impactados</p>
              </div>
            </div>

            {/* Sobre */}
            <div>
              <p className="text-[11px] font-medium uppercase text-muted-foreground">Sobre</p>
              <p className="mt-1 text-sm leading-relaxed">{ongProfile.description}</p>
            </div>

            {/* Áreas */}
            <div>
              <p className="text-[11px] font-medium uppercase text-muted-foreground">Área de atuação</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {ongProfile.areas.map((a) => (
                  <span key={a} className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">{a}</span>
                ))}
              </div>
            </div>

            {/* Contato */}
            {(ongProfile.phone || ongProfile.website) && (
              <div className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-2">
                <p className="text-[11px] font-medium uppercase text-muted-foreground">Contato</p>
                {ongProfile.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{ongProfile.phone}</span>
                  </div>
                )}
                {ongProfile.website && (
                  <div className="flex items-center gap-2 text-sm">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <span className="text-primary">{ongProfile.website}</span>
                  </div>
                )}
              </div>
            )}

            <Button
              className="w-full bg-gradient-hero gap-1.5"
              onClick={() => { setOngSheetOpen(false); setApplyOpen(true); setApplied(false); setAlreadyApplied(false); setApplyMsg(""); }}
            >
              <CheckCircle2 className="h-4 w-4" /> Quero ajudar nesta ação
            </Button>
          </div>
        </SheetContent>
      </Sheet>

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
