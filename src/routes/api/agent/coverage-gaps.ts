// GET /api/agent/coverage-gaps
// ============================================================
// Skill: getCoverageGaps
// Retorna ações com cobertura de voluntários abaixo do limite.
// Usado pelo Orchestrate para alertas proativos à ONG.
//
// Query params:
//   threshold  (0–100, default 60) — % mínima de cobertura
//   urgency    (high | medium | low) — filtro opcional
//
// Autenticação: Authorization: Bearer <AGENT_API_KEY>
// ============================================================
import { createAPIFileRoute } from "@tanstack/react-start/api";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { findCoverageGaps, type ActionInput } from "@/lib/matching";

export const APIRoute = createAPIFileRoute("/api/agent/coverage-gaps")({
  GET: async ({ request }) => {
    // ── Auth ────────────────────────────────────────────────
    const token = request.headers.get("Authorization")?.replace("Bearer ", "") ?? "";
    const expected = process.env.AGENT_API_KEY;
    let authed = !expected; // sem env → aberto (dev local)
    if (!authed && token === expected) authed = true; // IBM Orchestrate
    if (!authed) {
      // Tenta JWT Supabase (browser autenticado)
      const { data: { user: sessionUser } } = await supabaseAdmin.auth.getUser(token);
      authed = !!sessionUser;
    }
    if (!authed) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(request.url);
    const thresholdPct = parseInt(url.searchParams.get("threshold") ?? "60", 10);
    const urgencyFilter = url.searchParams.get("urgency") ?? null;

    // ── Busca ações abertas e em andamento ──────────────────
    let query = supabaseAdmin
      .from("crisis_actions")
      .select(
        "id, title, help_types, urgency, volunteers_needed, volunteers_joined, status"
      )
      .in("status", ["open", "in_progress"]);

    if (urgencyFilter) {
      query = query.eq("urgency", urgencyFilter);
    }

    const { data: rows, error } = await query.limit(500);

    if (error) {
      return Response.json({ error: "Erro ao buscar ações" }, { status: 500 });
    }

    const actions: ActionInput[] = (rows ?? []).map((row) => ({
      id:                row.id as string,
      title:             row.title as string,
      description:       "",
      help_types:        (row.help_types as string[]) ?? [],
      urgency:           (row.urgency as "high" | "medium" | "low") ?? "medium",
      volunteers_needed: (row.volunteers_needed as number) ?? 1,
      volunteers_joined: (row.volunteers_joined as number) ?? 0,
      status:            row.status as string,
    }));

    const gaps = findCoverageGaps(actions, thresholdPct / 100);

    return Response.json({
      totalActionsAnalyzed: actions.length,
      threshold: thresholdPct,
      gaps,
      summary: {
        high:   gaps.filter((g) => g.urgency === "high").length,
        medium: gaps.filter((g) => g.urgency === "medium").length,
        low:    gaps.filter((g) => g.urgency === "low").length,
      },
    });
  },
});
