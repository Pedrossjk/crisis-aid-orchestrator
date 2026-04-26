// ============================================================
// Hooks React para o motor de matching do agente
// ============================================================
// Usados diretamente pelas telas — sem precisar do chat do Orchestrate.
// O Orchestrate pode chamar os mesmos endpoints via /api/agent/*.
// ============================================================

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  rankVolunteersForAction,
  rankActionsForVolunteer,
  haversineKm,
  distanceToScore,
  type VolunteerInput,
  type ActionInput,
  type MatchResult,
} from "@/lib/matching";

// Re-exporta para que telas não precisem importar de dois arquivos
export type { MatchResult };
import {
  matchedVolunteers,
  actions as mockActions,
  type CrisisAction as MockAction,
  type Volunteer as MockVolunteer,
} from "@/lib/mock-data";

// ── Conversores mock → engine ─────────────────────────────────

/** Mapeamento de skills legíveis → help_types do banco. */
const SKILL_TO_HELP_TYPE: Record<string, string[]> = {
  Cozinha:        ["food"],
  Logística:      ["transport", "service"],
  "Direção":      ["transport"],
  Resgate:        ["service"],
  "Saúde":        ["medical"],
  Triagem:        ["medical", "service"],
  TI:             ["service"],
  "Comunicação":  ["service"],
  Suprimentos:    ["supplies"],
  Moradia:        ["shelter"],
};

function mockVolToInput(v: MockVolunteer): VolunteerInput {
  const help_types = [
    ...new Set(
      (v.skills ?? []).flatMap((s) => SKILL_TO_HELP_TYPE[s] ?? [])
    ),
  ];
  return {
    id:               v.id,
    name:             v.name,
    initials:         v.initials,
    skills:           v.skills,
    help_types,
    reliability:      (v as { reliability?: number }).reliability ?? 75,
    rating:           v.rating,
    completed_actions: v.completedActions,
    distanceKm:       v.distanceKm,
  };
}

function mockActionToInput(a: MockAction): ActionInput {
  return {
    id:                a.id,
    title:             a.title,
    description:       a.description,
    help_types:        a.helpTypes,
    urgency:           a.urgency,
    volunteers_needed: a.volunteersNeeded,
    volunteers_joined: a.volunteersJoined,
    status:            a.status,
  };
}

// ── Hook: matching voluntários para uma ação ──────────────────

/**
 * Retorna voluntários ranqueados por compatibilidade com uma ação.
 *
 * - Tenta dados reais do Supabase primeiro
 * - Cai para mock data se o banco estiver vazio (para demo)
 *
 * @param actionId  ID da ação. Passa `null` para desativar.
 * @param helpTypes  help_types da ação (ex: ["food","transport"])
 * @param urgency    urgência da ação
 */
export function useMatchedVolunteers(
  actionId: string | null,
  helpTypes: string[],
  urgency: "high" | "medium" | "low"
): { results: MatchResult[]; loading: boolean; refresh: () => void } {
  const [results, setResults] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [tick, setTick] = useState(0);

  // Refs para evitar re-renders causados por arrays mutados externamente
  const helpTypesRef = useRef(helpTypes);
  const urgencyRef   = useRef(urgency);
  useEffect(() => { helpTypesRef.current = helpTypes; }, [helpTypes]);
  useEffect(() => { urgencyRef.current = urgency; },   [urgency]);

  useEffect(() => {
    if (!actionId) {
      setResults([]);
      return;
    }

    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        // 1. Busca voluntários no banco (inclui nome do perfil)
        const { data: volData } = await supabase
          .from("volunteers")
          .select(
            "id, skills, help_types, reliability, rating, completed_actions, profiles!inner(full_name)"
          )
          .order("reliability", { ascending: false })
          .limit(200);

        let volunteers: VolunteerInput[];

        if (volData && volData.length > 0) {
          // Voluntários reais do banco
          volunteers = volData.map((row) => {
            const profile = (row as { profiles?: { full_name?: string | null } }).profiles;
            const fullName = profile?.full_name ?? "Voluntário";
            const initials = fullName
              .split(" ")
              .map((n: string) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();
            return {
              id:               row.id as string,
              name:             fullName,
              initials,
              skills:           (row.skills as string[]) ?? [],
              help_types:       (row.help_types as string[]) ?? [],
              reliability:      (row.reliability as number) ?? 50,
              rating:           (row.rating as number) ?? 3.0,
              completed_actions: (row.completed_actions as number) ?? 0,
            };
          });
        } else {
          // Fallback → mock data (mantém demo funcional sem BD)
          volunteers = matchedVolunteers.map(mockVolToInput);
        }

        const action: ActionInput = {
          id:                actionId,
          title:             "",
          description:       "",
          help_types:        helpTypesRef.current,
          urgency:           urgencyRef.current,
          volunteers_needed: 1,
          volunteers_joined: 0,
        };

        const ranked = rankVolunteersForAction(volunteers, action, 5);
        if (!cancelled) setResults(ranked);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [actionId, tick]); // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = () => setTick((t) => t + 1);

  return { results, loading, refresh };
}

// ── Hook: recomendações de ações para um voluntário ───────────

/**
 * Retorna IDs de ações recomendadas para o voluntário (do mais relevante ao menos).
 *
 * - Tenta dados reais do Supabase primeiro
 * - Cai para mock data se o banco estiver vazio
 *
 * @param volunteerId  ID do usuário voluntário (auth.uid).
 */
export function useRecommendedActionIds(volunteerId: string | null): {
  recommendedIds: string[];
  loading: boolean;
} {
  const [recommendedIds, setRecommendedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!volunteerId) return;

    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const [{ data: volData }, { data: actData }] = await Promise.all([
          supabase
            .from("volunteers")
            .select("id, help_types, reliability, rating, completed_actions")
            .eq("id", volunteerId)
            .maybeSingle(),
          supabase
            .from("crisis_actions")
            .select(
              "id, title, description, help_types, urgency, volunteers_needed, volunteers_joined, status"
            )
            .eq("status", "open")
            .limit(100),
        ]);

        const volunteer: VolunteerInput = volData
          ? {
              id:               volData.id as string,
              help_types:       (volData.help_types as string[]) ?? [],
              reliability:      (volData.reliability as number) ?? 50,
              rating:           (volData.rating as number) ?? 3.0,
              completed_actions: (volData.completed_actions as number) ?? 0,
            }
          : // Fallback: voluntário genérico baseado no primeiro mock
            mockVolToInput(matchedVolunteers[0]);

        const actions: ActionInput[] =
          actData && actData.length > 0
            ? actData.map((row) => ({
                id:                row.id as string,
                title:             row.title as string,
                description:       (row.description as string) ?? "",
                help_types:        (row.help_types as string[]) ?? [],
                urgency:           (row.urgency as "high" | "medium" | "low") ?? "medium",
                volunteers_needed: (row.volunteers_needed as number) ?? 1,
                volunteers_joined: (row.volunteers_joined as number) ?? 0,
                status:            row.status as string,
              }))
            : // Fallback → mock data
              mockActions.map(mockActionToInput);

        const ranked = rankActionsForVolunteer(actions, volunteer, 20);
        if (!cancelled) setRecommendedIds(ranked.map((r) => r.actionId));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [volunteerId]);

  return { recommendedIds, loading };
}

// ── Hook: score do voluntário logado para uma ação específica ─

import { scoreVolunteerForAction, cityToCoords } from "@/lib/matching";
export type MyScoreResult = {
  score: number;
  reason: string;
  distanceKm: number | null;
  travelMinutes: number | null;
  fuelCostBrl: number | null;
  distanceSource: "gps" | "city" | null; // indica como a distância foi calculada
  loading: boolean;
};

/**
 * Calcula o score de compatibilidade do voluntário logado com uma ação.
 * Usa geolocalização real do browser para calcular distância.
 *
 * @param volunteerId  auth.uid() do voluntário logado
 * @param actionId     UUID da ação no banco
 * @param actionLat    latitude da ação (null se desconhecida)
 * @param actionLon    longitude da ação (null se desconhecida)
 * @param actionHelpTypes  help_types da ação
 * @param actionUrgency   urgência da ação
 */
export function useMyScoreForAction(
  volunteerId: string | null,
  actionId: string | null,
  userLat: number | null,
  userLon: number | null,
  actionLat: number | null,
  actionLon: number | null,
  actionHelpTypes: string[],
  actionUrgency: "high" | "medium" | "low",
  passedDistanceSource?: "gps" | "city" | null
): MyScoreResult {
  const [result, setResult] = useState<MyScoreResult>({
    score: 0, reason: "", distanceKm: null, travelMinutes: null, fuelCostBrl: null, distanceSource: null, loading: true,
  });

  useEffect(() => {
    if (!actionId) return;

    setResult((r) => ({ ...r, loading: true }));
    let cancelled = false;

    (async () => {
      // ── Distância (calculada localmente a partir das coords passadas) ──────
      let distanceKm: number | null = null;
      const distanceSource = passedDistanceSource ?? null;

      if (userLat != null && userLon != null && actionLat != null && actionLon != null) {
        distanceKm = parseFloat(
          haversineKm(userLat, userLon, actionLat, actionLon).toFixed(1)
        );
      }

      if (cancelled) return;

      // ── Estimativas de deslocamento ────────────────────────────────────────
      const travelMinutes = distanceKm != null ? Math.round((distanceKm / 40) * 60) : null;
      const fuelCostBrl   = distanceKm != null ? parseFloat(((distanceKm / 12) * 6.20).toFixed(2)) : null;

      // ── Score de compatibilidade (requer row em volunteers) ────────────────
      let score = 0;
      let reason = "";

      if (volunteerId) {
        const { data: volData } = await supabase
          .from("volunteers")
          .select("id, skills, help_types, reliability, rating, completed_actions")
          .eq("id", volunteerId)
          .maybeSingle();

        if (!cancelled && volData) {
          const volunteer: VolunteerInput = {
            id:                volData.id as string,
            skills:            (volData.skills as string[]) ?? [],
            help_types:        (volData.help_types as string[]) ?? [],
            reliability:       (volData.reliability as number) ?? 50,
            rating:            (volData.rating as number) ?? 3.0,
            completed_actions: (volData.completed_actions as number) ?? 0,
            distanceKm:        distanceKm ?? undefined,
          };

          const actionInput: ActionInput = {
            id:                actionId,
            title:             "",
            description:       "",
            help_types:        actionHelpTypes,
            urgency:           actionUrgency,
            volunteers_needed: 1,
            volunteers_joined: 0,
          };

          const matchResult = scoreVolunteerForAction(volunteer, actionInput);
          score  = matchResult.score;
          reason = matchResult.reason;
        }
      }

      if (!cancelled) {
        setResult({ score, reason, distanceKm, travelMinutes, fuelCostBrl, distanceSource, loading: false });
      }
    })();

    return () => { cancelled = true; };
  }, [volunteerId, actionId, userLat, userLon, actionLat, actionLon]); // eslint-disable-line react-hooks/exhaustive-deps

  return result;
}

// ── Hook: recomendações via agente (endpoint real) ────────────

export type AgentRecommendation = {
  actionId: string;
  score: number;
  reason: string;
  distanceKm: number | null;
  travelMinutes: number | null;
  fuelCostBrl: number | null;
};

export type AgentRecommendationsResult = {
  recommendations: AgentRecommendation[];
  totalActions: number;
  hasDistanceData: boolean;
  loading: boolean;
};

/**
 * Chama GET /api/agent/recommend/:volunteerId com JWT do Supabase.
 * Retorna ações ordenadas por score real do agente (não binário).
 * Inclui GPS se disponível para melhorar o score de distância.
 */
export function useAgentRecommendations(
  volunteerId: string | null
): AgentRecommendationsResult {
  const [state, setState] = useState<AgentRecommendationsResult>({
    recommendations: [], totalActions: 0, hasDistanceData: false, loading: true,
  });

  useEffect(() => {
    if (!volunteerId) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }

    let cancelled = false;
    // Garante spinner enquanto o fetch está em voo (inclusive no 2° render quando auth carrega)
    setState((s) => ({ ...s, loading: true }));

    (async () => {
      // 1. Pega JWT do Supabase
      const { data: { session } } = await supabase.auth.getSession();
      const jwt = session?.access_token;
      if (!jwt || cancelled) {
        setState((s) => ({ ...s, loading: false }));
        return;
      }

      // 2. Tenta GPS (opcional — melhora o score de distância)
      let gpsParams = "";
      let userLat: number | null = null;
      let userLon: number | null = null;
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 4000 })
        );
        userLat = pos.coords.latitude;
        userLon = pos.coords.longitude;
        gpsParams = `&lat=${userLat}&lon=${userLon}`;
      } catch {
        // Sem GPS — agente usará só tipos de ajuda e confiabilidade
      }

      // 3. Tenta endpoint do agente
      let apiSuccess = false;
      try {
        const res = await fetch(
          `/api/agent/recommend/${volunteerId}?limit=30${gpsParams}`,
          { headers: { Authorization: `Bearer ${jwt}` } }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json() as {
          recommendations: AgentRecommendation[];
          totalActions: number;
          hasDistanceData: boolean;
        };
        if (!cancelled && (json.totalActions ?? 0) > 0) {
          setState({
            recommendations: json.recommendations ?? [],
            totalActions:    json.totalActions,
            hasDistanceData: json.hasDistanceData ?? false,
            loading:         false,
          });
          apiSuccess = true;
        }
      } catch {
        // ignora — fallback local abaixo
      }

      if (apiSuccess || cancelled) return;

      // 4. Fallback local: busca ações + perfil do voluntário no Supabase e computa localmente
      try {
        const [actionsRes, volRes] = await Promise.all([
          supabase
            .from("crisis_actions")
            .select("id, title, urgency, help_types, volunteers_needed, volunteers_joined, latitude, longitude")
            .in("status", ["open", "in_progress"]),
          supabase
            .from("volunteers")
            .select("id, help_types, reliability, rating")
            .eq("id", volunteerId)
            .maybeSingle(),
        ]);

        if (cancelled) return;

        const actions = actionsRes.data ?? [];
        const vol = volRes.data;

        if (actions.length === 0) {
          setState((s) => ({ ...s, loading: false }));
          return;
        }

        // Computa scores localmente sem o volunteer (só prioridade de urgência)
        const scored: AgentRecommendation[] = actions.map((a) => {
          const urgencyWeight = a.urgency === "critical" ? 1.0 : a.urgency === "high" ? 0.8 : a.urgency === "medium" ? 0.6 : 0.4;
          const coverage = Math.min(1, (a.volunteers_joined ?? 0) / Math.max(1, a.volunteers_needed ?? 1));
          const coverageGap = 1 - coverage;

          const volTypes: string[] = (vol?.help_types as string[] | null) ?? [];
          const actTypes: string[] = (a.help_types as string[] | null) ?? [];
          const overlap = volTypes.length > 0 && actTypes.length > 0
            ? actTypes.filter((t) => volTypes.includes(t)).length / actTypes.length
            : 0.5; // sem dados: neutro

          let distScore = 50;
          if (userLat != null && userLon != null && a.latitude != null && a.longitude != null) {
            distScore = distanceToScore(haversineKm(userLat, userLon, a.latitude as number, a.longitude as number));
          }

          const raw = (overlap * 0.40 + coverageGap * 0.30 + (vol?.reliability ?? 80) / 100 * 0.15 + distScore / 100 * 0.15) * urgencyWeight * 100;
          return {
            actionId: a.id as string,
            score:    Math.round(Math.max(0, Math.min(100, raw))),
            reason:   "Compatibilidade estimada localmente",
          };
        });

        scored.sort((a, b) => b.score - a.score);

        if (!cancelled) {
          setState({
            recommendations: scored,
            totalActions:    actions.length,
            hasDistanceData: userLat != null,
            loading:         false,
          });
        }
      } catch {
        if (!cancelled) setState((s) => ({ ...s, loading: false }));
      }
    })();

    return () => { cancelled = true; };
  }, [volunteerId]);

  return state;
}

// ── Hook: coverage gaps via agente (endpoint real) ────────────

export type CoverageGap = {
  actionId: string;
  title: string;
  urgency: string;
  coveragePct: number;
  volunteersNeeded: number;
  volunteersJoined: number;
  missingCount: number;
};

export type AgentCoverageGapsResult = {
  gaps: CoverageGap[];
  totalAnalyzed: number;
  summary: { high: number; medium: number; low: number };
  loading: boolean;
};

/**
 * Chama GET /api/agent/coverage-gaps com JWT do Supabase.
 * Retorna análise de cobertura feita pelo agente (servidor).
 */
export function useAgentCoverageGaps(
  enabled: boolean = true
): AgentCoverageGapsResult {
  const [state, setState] = useState<AgentCoverageGapsResult>({
    gaps: [], totalAnalyzed: 0, summary: { high: 0, medium: 0, low: 0 }, loading: true,
  });

  useEffect(() => {
    if (!enabled) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }

    let cancelled = false;

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const jwt = session?.access_token;
      if (!jwt || cancelled) {
        setState((s) => ({ ...s, loading: false }));
        return;
      }

      try {
        const res = await fetch(
          `/api/agent/coverage-gaps?threshold=50`,
          { headers: { Authorization: `Bearer ${jwt}` } }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json() as {
          gaps: CoverageGap[];
          totalActionsAnalyzed: number;
          summary: { high: number; medium: number; low: number };
        };
        if (!cancelled) {
          setState({
            gaps:          json.gaps ?? [],
            totalAnalyzed: json.totalActionsAnalyzed ?? 0,
            summary:       json.summary ?? { high: 0, medium: 0, low: 0 },
            loading:       false,
          });
        }
      } catch {
        if (!cancelled) setState((s) => ({ ...s, loading: false }));
      }
    })();

    return () => { cancelled = true; };
  }, [enabled]);

  return state;
}

// ── Hook: resumo de crise em linguagem natural ────────────────

type CrisisSummaryStats = {
  totalActions: number;
  completedThisMonth: number;
  activeVolunteers: number;
  criticalGaps: number;
  highUrgencyGaps: number;
  readyToInvite: number;
  pendingApplications: number;
};

type ActionDetail = {
  id: string;
  title: string;
  location: string;
  urgency: string;
  status: string;
  coveragePct: number;
  critical: boolean;
};

type CrisisSummaryResult = {
  generatedAt: string;
  summary: string;
  lines: string[];
  stats: CrisisSummaryStats;
  actionDetails: ActionDetail[];
  topVolunteers: { actionTitle: string; volunteers: { name: string; score: number; reason: string }[] };
  recommendations: string[];
  loading: boolean;
  error: string;
  refresh: () => void;
};

const EMPTY_SUMMARY_STATS: CrisisSummaryStats = {
  totalActions: 0, completedThisMonth: 0, activeVolunteers: 0,
  criticalGaps: 0, highUrgencyGaps: 0, readyToInvite: 0, pendingApplications: 0,
};

/**
 * Busca o relatório completo de crise gerado pelo agente.
 * Chama GET /api/agent/crisis-summary
 */
export function useAgentCrisisSummary(enabled: boolean = true): CrisisSummaryResult {
  const [state, setState] = useState<CrisisSummaryResult>({
    generatedAt: "",
    summary: "",
    lines: [],
    stats: EMPTY_SUMMARY_STATS,
    actionDetails: [],
    topVolunteers: { actionTitle: "", volunteers: [] },
    recommendations: [],
    loading: true,
    error: "",
    refresh: () => {},
  });
  const [tick, setTick] = useState(0);

  const refresh = () => setTick((t) => t + 1);

  useEffect(() => {
    if (!enabled) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }

    let cancelled = false;

    (async () => {
      setState((s) => ({ ...s, loading: true, error: "" }));
      const { data: { session } } = await supabase.auth.getSession();
      const jwt = session?.access_token;
      if (!jwt || cancelled) {
        setState((s) => ({ ...s, loading: false, error: jwt ? "" : "Sessão não encontrada" }));
        return;
      }

      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
        const res = await fetch(`${supabaseUrl}/functions/v1/crisis-summary`, {
          headers: { Authorization: `Bearer ${jwt}` },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text().catch(() => "")}`);
        const json = await res.json() as {
          generatedAt: string;
          summary: string;
          lines: string[];
          stats: CrisisSummaryStats;
          actionDetails: ActionDetail[];
          topVolunteersForCriticalAction: { actionTitle: string; volunteers: { name: string; score: number; reason: string }[] };
          recommendations: string[];
        };
        if (!cancelled) {
          setState({
            generatedAt:     json.generatedAt ?? "",
            summary:         json.summary ?? "",
            lines:           json.lines ?? [],
            stats:           json.stats ?? EMPTY_SUMMARY_STATS,
            actionDetails:   json.actionDetails ?? [],
            topVolunteers:   json.topVolunteersForCriticalAction ?? { actionTitle: "", volunteers: [] },
            recommendations: json.recommendations ?? [],
            loading:         false,
            error:           "",
            refresh,
          });
        }
      } catch (err) {
        if (!cancelled) setState((s) => ({ ...s, loading: false, error: err instanceof Error ? err.message : String(err) }));
      }
    })();

    return () => { cancelled = true; };
  }, [enabled, tick]); // eslint-disable-line react-hooks/exhaustive-deps

  return { ...state, refresh };
}
