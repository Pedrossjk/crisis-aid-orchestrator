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
