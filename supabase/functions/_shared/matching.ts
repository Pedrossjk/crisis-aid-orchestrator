// Motor de matching — cópia portável para Deno/Edge Functions
// Mesma lógica de src/lib/matching.ts (código puro, sem I/O)

export type HelpType = string;

export interface VolunteerInput {
  id: string;
  name?: string;
  initials?: string;
  skills?: string[];
  help_types: HelpType[];
  reliability: number; // 0–100
  rating: number;      // 0–5
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
  status?: string;
}

export interface MatchResult {
  volunteerId: string;
  name?: string;
  initials?: string;
  distanceKm?: number;
  rating?: number;
  skills?: string[];
  score: number;
  reason: string;
  breakdown: {
    helpTypeScore: number;
    reliabilityScore: number;
    ratingScore: number;
  };
}

const W = { helpType: 0.45, reliability: 0.35, rating: 0.20 };
const URGENCY_BONUS: Record<string, number> = { high: 1.12, medium: 1.00, low: 0.90 };

function jaccard(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const setA = new Set(a.map((x) => x.toLowerCase()));
  const union = new Set([...a.map((x) => x.toLowerCase()), ...b.map((x) => x.toLowerCase())]);
  const intersection = b.filter((x) => setA.has(x.toLowerCase())).length;
  return intersection / union.size;
}

function clamp(v: number, min = 0, max = 100): number {
  return Math.round(Math.min(max, Math.max(min, v)));
}

export function scoreVolunteerForAction(vol: VolunteerInput, action: ActionInput): MatchResult {
  const helpTypeScore    = clamp(jaccard(vol.help_types, action.help_types) * 100);
  const reliabilityScore = clamp(vol.reliability * (URGENCY_BONUS[action.urgency] ?? 1));
  const ratingScore      = clamp((vol.rating / 5) * 100);
  const score = clamp(helpTypeScore * W.helpType + reliabilityScore * W.reliability + ratingScore * W.rating);

  const parts: string[] = [];
  if (helpTypeScore >= 50)        parts.push(`${helpTypeScore}% compatibilidade`);
  if (vol.reliability >= 80)      parts.push("alta confiabilidade");
  if (vol.rating >= 4.5)          parts.push(`nota ${vol.rating.toFixed(1)}`);
  if (vol.completed_actions >= 10) parts.push(`${vol.completed_actions} ações concluídas`);

  return {
    volunteerId: vol.id, name: vol.name, initials: vol.initials,
    distanceKm: vol.distanceKm, rating: vol.rating, skills: vol.skills,
    score, reason: parts.join(" · ") || "Perfil geral compatível",
    breakdown: { helpTypeScore, reliabilityScore, ratingScore },
  };
}

export function rankVolunteersForAction(volunteers: VolunteerInput[], action: ActionInput, limit = 10): MatchResult[] {
  return volunteers.map((v) => scoreVolunteerForAction(v, action))
    .sort((a, b) => b.score - a.score).slice(0, limit);
}

export function rankActionsForVolunteer(
  actions: ActionInput[], volunteer: VolunteerInput, limit = 10
): Array<{ actionId: string; title: string; score: number; reason: string }> {
  return actions.map((a) => {
    const helpTypeScore = clamp(jaccard(volunteer.help_types, a.help_types) * 100);
    const urgencyWeight = ({ high: 1.0, medium: 0.85, low: 0.70 } as Record<string, number>)[a.urgency] ?? 0.85;
    const coverageGap = 1 - Math.min(1, a.volunteers_joined / Math.max(1, a.volunteers_needed));
    const score = clamp((helpTypeScore * 0.60 + coverageGap * 100 * 0.40) * urgencyWeight);
    return { actionId: a.id, title: a.title, score, reason: helpTypeScore >= 50 ? "Habilidades compatíveis" : "Ação precisa de voluntários" };
  }).sort((a, b) => b.score - a.score).slice(0, limit);
}

export function findCoverageGaps(actions: ActionInput[], threshold = 0.5) {
  const urgOrd: Record<string, number> = { high: 0, medium: 1, low: 2 };
  return actions
    .filter((a) => a.status !== "closed" && a.status !== "completed")
    .map((a) => ({
      actionId: a.id, title: a.title,
      coveragePct: clamp((a.volunteers_joined / Math.max(1, a.volunteers_needed)) * 100),
      urgency: a.urgency,
      missing: Math.max(0, a.volunteers_needed - a.volunteers_joined),
    }))
    .filter((a) => a.coveragePct / 100 < threshold)
    .sort((a, b) => (urgOrd[a.urgency] ?? 1) - (urgOrd[b.urgency] ?? 1) || a.coveragePct - b.coveragePct);
}
