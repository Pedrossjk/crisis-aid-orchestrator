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
  helpType:    0.40, // compatibilidade de tipos de ajuda
  reliability: 0.30, // histórico de confiabilidade interno
  rating:      0.15, // avaliação pública do voluntário
  distance:    0.15, // proximidade geográfica (0 se distância desconhecida)
};

/**
 * Converte distância em km para score 0–100.
 * 0 km → 100 · 30 km → ~50 · 100 km → 0
 */
export function distanceToScore(km: number): number {
  return clamp(Math.round(Math.max(0, 100 - km * 1.5)));
}

/**
 * Fórmula de Haversine: distância em km entre dois pontos geográficos.
 */
export function haversineKm(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

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

  const distScore = vol.distanceKm != null ? distanceToScore(vol.distanceKm) : null;

  const score = clamp(
    helpTypeScore    * W.helpType +
    reliabilityScore * W.reliability +
    ratingScore      * W.rating +
    (distScore != null ? distScore * W.distance : 0)
  );

  // Gera frase de razão legível em português
  const parts: string[] = [];
  if (helpTypeScore >= 50)
    parts.push(`${helpTypeScore}% de compatibilidade de habilidades`);
  if (vol.reliability >= 80)
    parts.push("alta confiabilidade");
  if (vol.rating >= 4.5)
    parts.push(`nota ${vol.rating.toFixed(1)}`);
  if (vol.completed_actions >= 10)
    parts.push(`${vol.completed_actions} ações concluídas`);
  if (vol.distanceKm != null && vol.distanceKm <= 20)
    parts.push(`apenas ${vol.distanceKm.toFixed(1)} km de distância`);

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

// ── Mapa de cidades brasileiras → coordenadas ─────────────────
// Fallback de localização quando GPS não está disponível.
// Compartilhado: browser, agent endpoints e Supabase Functions.
export const CITY_COORDS: Record<string, [number, number]> = {
  // SC
  "Blumenau":            [-26.9196, -49.0661],
  "Itajaí":              [-26.9075, -48.6628],
  "Florianópolis":       [-27.5954, -48.5480],
  "Joinville":           [-26.3039, -48.8456],
  "Chapecó":             [-27.1005, -52.6155],
  "Brusque":             [-27.0972, -48.9117],
  "São José":            [-27.5942, -48.6400],
  "Balneário Camboriú":  [-26.9897, -48.6348],
  "Lages":               [-27.8161, -50.3268],
  "Criciúma":            [-28.6800, -49.3700],
  // RS
  "Porto Alegre":        [-30.0346, -51.2177],
  "Caxias do Sul":       [-29.1681, -51.1794],
  "Pelotas":             [-31.7726, -52.3376],
  "Canoas":              [-29.9185, -51.1834],
  "Santa Maria":         [-29.6869, -53.8014],
  // PR
  "Curitiba":            [-25.4290, -49.2671],
  "Londrina":            [-23.3045, -51.1696],
  "Maringá":             [-23.4273, -51.9375],
  // SP
  "São Paulo":           [-23.5505, -46.6333],
  "Campinas":            [-22.9056, -47.0608],
  // RJ
  "Rio de Janeiro":      [-22.9068, -43.1729],
  // MG
  "Belo Horizonte":      [-19.9167, -43.9345],
  // DF
  "Brasília":            [-15.7801, -47.9292],
  // BA
  "Salvador":            [-12.9714, -38.5014],
};

/**
 * Converte nome de cidade para coordenadas [lat, lon].
 * Tenta correspondência exata primeiro, depois correspondência parcial.
 */
export function cityToCoords(city?: string | null): [number, number] | null {
  if (!city) return null;
  const normalized = city.trim().toLowerCase();
  const key =
    Object.keys(CITY_COORDS).find((k) => k.toLowerCase() === normalized) ??
    Object.keys(CITY_COORDS).find((k) => normalized.includes(k.toLowerCase()));
  return key ? CITY_COORDS[key] : null;
}
