import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { ActionPost } from "@/components/ActionPost";
import { actions as mockActions, type CrisisAction, type HelpType, type Urgency } from "@/lib/mock-data";
import { Sparkles, Search, Loader2, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useAgentRecommendations } from "@/hooks/use-agent";
import { supabase } from "@/integrations/supabase/client";
import { haversineKm, distanceToScore, cityToCoords } from "@/lib/matching";

export const Route = createFileRoute("/volunteer/")({
  head: () => ({
    meta: [
      { title: "Feed — Voluntário · Orquestra" },
      { name: "description", content: "Feed social de ações de voluntariado. Crises ativas e oportunidades recomendadas pela IA." },
    ],
  }),
  component: VolunteerHome,
});

function VolunteerHome() {
  const { user } = useAuth();
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [dbActions, setDbActions] = useState<CrisisAction[]>([]);
  const [actionCoords, setActionCoords] = useState<Map<string, { lat: number; lon: number }>>(new Map());
  const [userCoords, setUserCoords] = useState<{ lat: number; lon: number } | null>(null);

  // Pega GPS do usuário; fallback para cidade do perfil se negado/timeout
  useEffect(() => {
    if (!user?.id) return;

    const tryGps = () => {
      if (!navigator.geolocation) {
        tryCity();
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        () => tryCity(), // GPS negado ou timeout
        { timeout: 5000 }
      );
    };

    const tryCity = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("city")
        .eq("id", user!.id)
        .maybeSingle();
      const coords = cityToCoords(data?.city);
      if (coords) setUserCoords({ lat: coords[0], lon: coords[1] });
    };

    tryGps();
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Carrega ações reais do banco (inclui lat/lon); usa mock como fallback
  useEffect(() => {
    supabase
      .from("crisis_actions")
      .select("id, title, description, location, latitude, longitude, urgency, effort, help_types, volunteers_needed, volunteers_joined, status, created_at, ngos!inner(name, initials)")
      .in("status", ["open", "in_progress"])
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (!data || data.length === 0) return;
        const now = new Date();
        const coords = new Map<string, { lat: number; lon: number }>();
        setDbActions(
          data.map((row) => {
            const ngo = (row as { ngos?: { name?: string; initials?: string } }).ngos;
            const diffH = Math.floor((now.getTime() - new Date(row.created_at as string).getTime()) / 3_600_000);
            const lat = row.latitude as number | null;
            const lon = row.longitude as number | null;
            if (lat != null && lon != null) coords.set(row.id as string, { lat, lon });
            return {
              id:               row.id as string,
              title:            row.title as string,
              description:      (row.description as string) ?? "",
              org:              ngo?.name ?? "ONG",
              orgAvatar:        ngo?.initials ?? "NG",
              location:         (row.location as string) ?? "",
              distanceKm:       0,
              urgency:          row.urgency as Urgency,
              effort:           (row.effort as string) ?? "",
              helpTypes:        (row.help_types as HelpType[]) ?? [],
              volunteersNeeded: (row.volunteers_needed as number) ?? 1,
              volunteersJoined: (row.volunteers_joined as number) ?? 0,
              status:           row.status as "open" | "in_progress" | "completed" | "closed",
              postedAgo:        diffH < 1 ? "agora" : diffH < 24 ? `há ${diffH}h` : `há ${Math.floor(diffH / 24)}d`,
            };
          })
        );
        setActionCoords(coords);
      });
  }, []);

  // Recalcula distâncias quando o GPS chega
  const actionsWithDistance = useMemo(() => {
    if (!userCoords || dbActions.length === 0) return dbActions;
    return dbActions.map((a) => {
      const c = actionCoords.get(a.id);
      if (!c) return a;
      return { ...a, distanceKm: parseFloat(haversineKm(userCoords.lat, userCoords.lon, c.lat, c.lon).toFixed(1)) };
    });
  }, [userCoords, dbActions, actionCoords]);

  // Recomendações personalizadas PELO AGENTE (endpoint real, scores 0-100)
  const agentRec = useAgentRecommendations(user?.id ?? null);

  // Mapa actionId → score do agente
  const agentScoreMap = useMemo(() => {
    const m = new Map<string, number>();
    agentRec.recommendations.forEach((r) => m.set(r.actionId, r.score));
    return m;
  }, [agentRec.recommendations]);

  const agentActionIds = useMemo(
    () => new Set(agentRec.recommendations.map((r) => r.actionId)),
    [agentRec.recommendations]
  );

  const firstName = (user?.user_metadata?.full_name as string | undefined)?.split(" ")[0] ?? "Voluntário";

  const allActions = actionsWithDistance.length > 0 ? actionsWithDistance : (dbActions.length > 0 ? dbActions : mockActions);

  // Uma ação é considerada "recomendada" se está no top-50% dos scores do agente
  // (ou seja, score >= 50). Quando o agente retornou resultados mas sem IDs
  // reconhecidos (UUIDs diferentes entre mock e DB), usa limiar de score.
  const isAiRec = (a: CrisisAction): boolean => {
    if (agentActionIds.size > 0) return agentActionIds.has(a.id);
    // Agente não retornou nada: aceita a flag da mock data como fallback
    return !!a.isAiRecommended;
  };

  // Score combinado: score real do agente (85%) + proximidade geográfica (15%)
  function combinedScore(a: CrisisAction): number {
    const agentScore = agentScoreMap.get(a.id);
    if (agentScore != null) {
      const dScore = a.distanceKm > 0 ? distanceToScore(a.distanceKm) : 50;
      return agentScore * 0.85 + dScore * 0.15;
    }
    // Fallback enquanto carrega (sem score do agente ainda)
    const matchScore = isAiRec(a) ? 70 : 30;
    const dScore = a.distanceKm > 0 ? distanceToScore(a.distanceKm) : 50;
    return matchScore * 0.55 + dScore * 0.45;
  }

  // "Recomendadas" = ações que o agente incluiu no resultado (todas têm score)
  // Quando o agente retornou scores, todas as ações do DB que batem aparecem
  const recommended = agentActionIds.size > 0
    ? allActions.filter((a) => agentActionIds.has(a.id))
    : allActions.filter((a) => !!a.isAiRecommended);

  // Total de ações analisadas: prefere do agente, fallback para o que carregou no DB
  const totalAnalyzed = agentRec.totalActions > 0 ? agentRec.totalActions : allActions.length;

  // Timeline única ordenada por score combinado, excluindo hidden e aplicando busca
  const q = searchQuery.trim().toLowerCase();
  const timeline = allActions
    .filter((a) => !hiddenIds.includes(a.id))
    .filter((a) =>
      !q ||
      a.title.toLowerCase().includes(q) ||
      a.description.toLowerCase().includes(q) ||
      a.org.toLowerCase().includes(q) ||
      a.location.toLowerCase().includes(q)
    )
    .sort((a, b) => combinedScore(b) - combinedScore(a));

  function handleHide(id: string) {
    setHiddenIds((prev) => [...prev, id]);
  }

  return (
    <AppShell role="volunteer">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Greeting */}
        <div>
          <h1 className="text-2xl font-bold">Olá, {firstName}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            <span className="font-semibold text-ai">{recommended.length} ações recomendadas</span> pelo agente para você hoje.
          </p>
        </div>

        {/* AI recommendation strip */}
        <div className="flex items-start gap-3 bg-gradient-hero p-4 text-ai-foreground shadow-soft">
          <Sparkles className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            {agentRec.loading ? (
              <>
                <p className="font-semibold flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Agente analisando ações…
                </p>
                <p className="text-xs opacity-90">Calculando compatibilidade com seu perfil.</p>
              </>
            ) : (
              <>
                <p className="font-semibold">
                  A IA analisou {totalAnalyzed} ações ativas
                </p>
                <p className="text-xs opacity-90">
                  {recommended.length} recomendadas para você · ordenadas por compatibilidade real
                  {agentRec.hasDistanceData && " + distância"}
                </p>
              </>
            )}
          </div>
        </div>

        {/* Compact search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar ações, ONGs, locais…"
            className="pl-9 rounded-full bg-card"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Crisis carousel — horizontal, compact DESABILIDADO POR ENQUANTO*/ }
        {/* <section>
          <div className="mb-3 flex items-center gap-2 px-1">
            <Flame className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold">Ações Recomendadas</h2>
            <span className="ml-auto text-[11px] text-muted-foreground">{crises.length} regiões</span>
          </div>
          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-3 snap-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {crises.map((c) => (
              <div
                key={c.id}
                className="snap-start min-w-[220px] relative overflow-hidden p-4 shadow-soft transition-all hover:shadow-elegant cursor-pointer">
                
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                    c.severity === "high"
                      ? "bg-urgent/10 text-urgent"
                      : "bg-warning/10 text-warning-foreground"
                  )}>
                    {c.severity === "high" && (
                      <span className="relative flex h-1.5 w-1.5 shrink-0">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-urgent opacity-70" />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-urgent" />
                      </span>
                    )}
                    {c.severity === "high" ? "Alta urgência" : "Moderada"}
                  </span>
                  <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground truncate">
                    {c.region}
                  </span>
                </div>

                <p className="text-sm font-bold leading-snug">{c.name}</p>

                <div className="my-3 h-px bg-border/60" />

              
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-muted-foreground">Afetados</p>
                    <p className="text-sm font-bold">{c.affected.toLocaleString("pt-BR")}</p>
                  </div>
                  <div className={cn(
                    "h-8 w-px",
                    c.severity === "high" ? "bg-urgent/20" : "bg-warning/20"
                  )} />
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground">Ações ativas</p>
                    <p className="text-sm font-bold">{c.activeActions}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section> */}

        {/* Single-column timeline */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold">Seu feed</h2>
          </div>
          {timeline.length === 0 && (
            <div className="rounded-2xl border border-border/60 bg-card p-8 text-center text-muted-foreground text-sm shadow-soft">
              Nenhuma ação disponível no seu feed no momento.
            </div>
          )}
          {timeline.map((a) => (
            <ActionPost key={a.id} action={a} onHide={handleHide} />
          ))}
        </section>
      </div>
    </AppShell>
  );
}
