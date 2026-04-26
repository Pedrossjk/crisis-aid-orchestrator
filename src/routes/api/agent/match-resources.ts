// GET /api/agent/match-resources
// ============================================================
// Skill: matchResourcesForActions
// Analisa semanticamente os recursos cadastrados pelas ONGs
// e os cruza com as necessidades das ações abertas.
//
// O algoritmo de matching é baseado em:
//   1. Overlap de category (help_type) entre recurso e ação    → 50 pts
//   2. Palavras-chave em comum entre description do recurso
//      e description + title da ação (jaccard de tokens)       → 30 pts
//   3. Urgência da ação (high=20, medium=10, low=5)            → 20 pts
//
// Query params:
//   ?resourceId=<uuid>   Filtra por recurso específico (opcional)
//   ?actionId=<uuid>     Filtra por ação específica (opcional)
//   ?limit=<n>           Máx de pares retornados (default 10)
//
// Autenticação: Authorization: Bearer <AGENT_API_KEY>
//               OU JWT Supabase (browser autenticado)
// ============================================================
import { createAPIFileRoute } from "@tanstack/react-start/api";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// ── Helpers ─────────────────────────────────────────────────

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")    // remove diacritics
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 2)         // ignora stop-words curtas
  );
}

function jaccardScore(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  a.forEach((t) => { if (b.has(t)) inter++; });
  const union = a.size + b.size - inter;
  return inter / union;
}

const URGENCY_SCORE: Record<string, number> = { high: 20, medium: 10, low: 5 };

type ResourceRow = {
  id: string;
  org_name: string;
  resource: string;
  category: string;
  quantity: string;
  location: string;
};

type ActionRow = {
  id: string;
  title: string;
  description: string;
  help_types: string[];
  urgency: string;
  location: string;
  volunteers_needed: number;
  volunteers_joined: number;
};

function scoreMatch(res: ResourceRow, action: ActionRow): { score: number; reason: string } {
  let score = 0;
  const reasons: string[] = [];

  // 1. Category overlap (50 pts)
  const actionTypes: string[] = action.help_types ?? [];
  if (actionTypes.includes(res.category)) {
    score += 50;
    reasons.push(`categoria '${res.category}' coincide com a ação`);
  }

  // 2. Keyword jaccard (30 pts)
  const resTokens = tokenize(res.resource);
  const actTokens = tokenize(`${action.title} ${action.description}`);
  const jac = jaccardScore(resTokens, actTokens);
  const kwScore = Math.round(jac * 30);
  if (kwScore > 0) {
    score += kwScore;
    reasons.push(`${kwScore} pts por palavras-chave em comum`);
  }

  // 3. Urgency bonus (20 pts max)
  const urgBonus = URGENCY_SCORE[action.urgency] ?? 5;
  score += urgBonus;
  reasons.push(`urgência ${action.urgency} (+${urgBonus} pts)`);

  return { score: Math.min(100, score), reason: reasons.join("; ") };
}

// ── Route ────────────────────────────────────────────────────

export const APIRoute = createAPIFileRoute("/api/agent/match-resources")({
  GET: async ({ request }) => {
    // ── Auth ───────────────────────────────────────────────
    const token = request.headers.get("Authorization")?.replace("Bearer ", "") ?? "";
    const expected = process.env.AGENT_API_KEY;
    let authed = !expected;
    if (!authed && token === expected) authed = true;
    if (!authed) {
      const { data: { user: sessionUser } } = await supabaseAdmin.auth.getUser(token);
      authed = !!sessionUser;
    }
    if (!authed) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(request.url);
    const resourceId = url.searchParams.get("resourceId") ?? null;
    const actionId   = url.searchParams.get("actionId")   ?? null;
    const limit      = Math.min(50, parseInt(url.searchParams.get("limit") ?? "10", 10));

    // ── Fetch resources ────────────────────────────────────
    let resQuery = supabaseAdmin
      .from("ngo_resources")
      .select("id, org_name, resource, category, quantity, location");
    if (resourceId) resQuery = resQuery.eq("id", resourceId);
    const { data: resources, error: resErr } = await resQuery.limit(100);
    if (resErr) return Response.json({ error: "Erro ao buscar recursos" }, { status: 500 });

    // ── Fetch open actions ─────────────────────────────────
    let actQuery = supabaseAdmin
      .from("crisis_actions")
      .select("id, title, description, help_types, urgency, location, volunteers_needed, volunteers_joined")
      .eq("status", "open");
    if (actionId) actQuery = actQuery.eq("id", actionId);
    const { data: actions, error: actErr } = await actQuery.limit(200);
    if (actErr) return Response.json({ error: "Erro ao buscar ações" }, { status: 500 });

    if (!resources?.length || !actions?.length) {
      return Response.json({ totalPairs: 0, matches: [] });
    }

    // ── Score all pairs ────────────────────────────────────
    type MatchPair = {
      resourceId: string;
      resourceName: string;
      orgName: string;
      quantity: string;
      resourceLocation: string;
      actionId: string;
      actionTitle: string;
      actionLocation: string;
      urgency: string;
      coveragePct: number;
      score: number;
      reason: string;
    };

    const pairs: MatchPair[] = [];

    for (const res of resources as ResourceRow[]) {
      for (const action of actions as ActionRow[]) {
        const { score, reason } = scoreMatch(res, action);
        if (score < 30) continue; // descarta matches fracos
        const coveragePct = action.volunteers_needed > 0
          ? Math.round((action.volunteers_joined / action.volunteers_needed) * 100)
          : 0;
        pairs.push({
          resourceId:       res.id,
          resourceName:     res.resource,
          orgName:          res.org_name,
          quantity:         res.quantity,
          resourceLocation: res.location,
          actionId:         action.id,
          actionTitle:      action.title,
          actionLocation:   action.location,
          urgency:          action.urgency,
          coveragePct,
          score,
          reason,
        });
      }
    }

    pairs.sort((a, b) => b.score - a.score);
    const top = pairs.slice(0, limit);

    return Response.json({
      totalResourcesAnalyzed: resources.length,
      totalActionsAnalyzed:   actions.length,
      totalPairs:             pairs.length,
      matches:                top,
    });
  },
});
