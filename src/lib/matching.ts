// ============================================================
// Motor de matching voluntários ↔ ações
// ============================================================
// Funções puras — sem I/O. Rodam no browser, Worker ou Edge.
// Expostas como Skills do IBM watsonx Orchestrate via /api/agent/*.
// ============================================================

export type HelpType = string; // "food" | "transport" | "medical" | ...

export interface VolunteerInput {
  id: string;
  name?: string;
  initials?: string;
  skills?: string[];
  help_types: HelpType[];
  /** 0–100 — campo interno, não exibir ao próprio voluntário */
  reliability: number;
  /** 0–5 */
  rating: number;
  completed_actions: number;
  distanceKm?: number;
}

export interface ActionInput {
  id: string;
  title: string;
  description: string;
  help_types: HelpType[];
  urgency: "high" | "medium" | "low";
  volunteers_needed: number;
  volunteers_joined: number;
  /** opcional — usado na análise de gaps */
  status?: string;
}

export interface MatchResult {
  volunteerId: string;
  name?: string;
  initials?: string;
  distanceKm?: number;
  /** Avaliação pública exibível (0–5) */
  rating?: number;
  /** Habilidades legíveis para exibição */
  skills?: string[];
  /** 0–100 — score exibível como "% match" */
  score: number;
  /** Frase curta explicando o match */
  reason: string;
  breakdown: {
    helpTypeScore: number;    // 0–100
    reliabilityScore: number; // 0–100
    ratingScore: number;      // 0–100
  };
}

// ── Pesos do algoritmo ────────────────────────────────────────
// Soma = 1.0. Ajuste aqui para priorizar critérios diferentes.
const W = {
  helpType:    0.45, // compatibilidade de tipos de ajuda
  reliability: 0.35, // histórico de confiabilidade interno
  rating:      0.20, // avaliação pública do voluntário
};

// Urgência "alta" booста o peso da confiabilidade
const URGENCY_RELIABILITY_BONUS: Record<string, number> = {
  high:   1.12,
  medium: 1.00,
  low:    0.90,
};

// ── Helpers ───────────────────────────────────────────────────

/** Similaridade de Jaccard entre dois conjuntos (arrays de strings). */
function jaccardSimilarity(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const setA = new Set(a.map((x) => x.toLowerCase()));
  const union = new Set([
    ...a.map((x) => x.toLowerCase()),
    ...b.map((x) => x.toLowerCase()),
  ]);
  const intersection = b.filter((x) => setA.has(x.toLowerCase())).length;
  return intersection / union.size;
}

function clamp(v: number, min = 0, max = 100): number {
  return Math.round(Math.min(max, Math.max(min, v)));
}

// ── Score principal ───────────────────────────────────────────

/**
 * Calcula o score de compatibilidade de um voluntário para uma ação.
 * Retorna 0–100 com breakdown e frase de razão.
 */
export function scoreVolunteerForAction(
  vol: VolunteerInput,
  action: ActionInput
): MatchResult {
  const helpTypeScore = clamp(
    jaccardSimilarity(vol.help_types, action.help_types) * 100
  );
  const reliabilityBonus =
    URGENCY_RELIABILITY_BONUS[action.urgency] ?? 1.0;
  const reliabilityScore = clamp(vol.reliability * reliabilityBonus);
  const ratingScore = clamp((vol.rating / 5) * 100);

  const score = clamp(
    helpTypeScore   * W.helpType +
    reliabilityScore * W.reliability +
    ratingScore     * W.rating
  );

  // Gera frase de razão legível em português
  const parts: string[] = [];
  if (helpTypeScore >= 50)
    parts.push(`${helpTypeScore}% de compatibilidade`);
  if (vol.reliability >= 80)
    parts.push("alta confiabilidade");
  if (vol.rating >= 4.5)
    parts.push(`nota ${vol.rating.toFixed(1)}`);
  if (vol.completed_actions >= 10)
    parts.push(`${vol.completed_actions} ações concluídas`);

  return {
    volunteerId:  vol.id,
    name:         vol.name,
    initials:     vol.initials,
    distanceKm:   vol.distanceKm,
    rating:       vol.rating,
    skills:       vol.skills,
    score,
    reason: parts.length > 0 ? parts.join(" · ") : "Perfil geral compatível",
    breakdown: {
      helpTypeScore,
      reliabilityScore,
      ratingScore,
    },
  };
}

/**
 * Ranqueia todos os voluntários para uma ação (do mais compatível ao menos).
 */
export function rankVolunteersForAction(
  volunteers: VolunteerInput[],
  action: ActionInput,
  limit = 10
): MatchResult[] {
  return volunteers
    .map((v) => scoreVolunteerForAction(v, action))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Ranqueia ações para um voluntário — perspectiva inversa.
 * Considera compatibilidade de tipos de ajuda + gap de cobertura + urgência.
 */
export function rankActionsForVolunteer(
  actions: ActionInput[],
  volunteer: VolunteerInput,
  limit = 10
): Array<{ actionId: string; title: string; score: number; reason: string }> {
  return actions
    .map((a) => {
      const helpTypeScore = clamp(
        jaccardSimilarity(volunteer.help_types, a.help_types) * 100
      );
      const urgencyWeight =
        { high: 1.0, medium: 0.85, low: 0.70 }[a.urgency] ?? 0.85;
      const coverageGap =
        1 - Math.min(1, a.volunteers_joined / Math.max(1, a.volunteers_needed));
      const score = clamp(
        (helpTypeScore * 0.60 + coverageGap * 100 * 0.40) * urgencyWeight
      );
      const reason =
        helpTypeScore >= 50
          ? "Habilidades compatíveis"
          : coverageGap > 0.5
          ? "Ação precisa de voluntários"
          : "Compatível";
      return { actionId: a.id, title: a.title, score, reason };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Retorna ações com cobertura abaixo do threshold — "gaps" que precisam
 * de atenção proativa da ONG ou do agente.
 */
export function findCoverageGaps(
  actions: ActionInput[],
  threshold = 0.5
): Array<{
  actionId: string;
  title: string;
  coveragePct: number;
  urgency: string;
  missing: number;
}> {
  const urgOrd: Record<string, number> = { high: 0, medium: 1, low: 2 };
  return actions
    .filter((a) => a.status !== "closed" && a.status !== "completed")
    .map((a) => ({
      actionId:    a.id,
      title:       a.title,
      coveragePct: clamp(
        (a.volunteers_joined / Math.max(1, a.volunteers_needed)) * 100
      ),
      urgency: a.urgency,
      missing: Math.max(0, a.volunteers_needed - a.volunteers_joined),
    }))
    .filter((a) => a.coveragePct / 100 < threshold)
    .sort((a, b) => {
      const urgDiff =
        (urgOrd[a.urgency] ?? 1) - (urgOrd[b.urgency] ?? 1);
      return urgDiff !== 0 ? urgDiff : a.coveragePct - b.coveragePct;
    });
}
