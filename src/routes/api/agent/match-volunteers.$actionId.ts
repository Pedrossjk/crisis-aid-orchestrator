// GET /api/agent/match-volunteers/:actionId
// ============================================================
// Skill: matchVolunteersForAction
// Ranqueia voluntários por compatibilidade com uma ação.
// Chamado automaticamente pelo IBM watsonx Orchestrate ou
// pela tela da ONG sem precisar de chat.
//
// Autenticação: Authorization: Bearer <AGENT_API_KEY>
// ============================================================
import { createAPIFileRoute } from "@tanstack/react-start/api";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  rankVolunteersForAction,
  type VolunteerInput,
  type ActionInput,
} from "@/lib/matching";

export const APIRoute = createAPIFileRoute(
  "/api/agent/match-volunteers/$actionId"
)({
  GET: async ({ request, params }) => {
    // ── Auth ────────────────────────────────────────────────
    const apiKey = request.headers.get("Authorization")?.replace("Bearer ", "");
    const expected = process.env.AGENT_API_KEY;
    if (expected && apiKey !== expected) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { actionId } = params;
    const url = new URL(request.url);
    const limit = Math.min(
      20,
      parseInt(url.searchParams.get("limit") ?? "10", 10)
    );

    // ── Busca a ação ────────────────────────────────────────
    const { data: actionRow, error: actionErr } = await supabaseAdmin
      .from("crisis_actions")
      .select(
        "id, title, description, help_types, urgency, volunteers_needed, volunteers_joined"
      )
      .eq("id", actionId)
      .maybeSingle();

    if (actionErr || !actionRow) {
      return Response.json(
        { error: "Ação não encontrada", actionId },
        { status: 404 }
      );
    }

    const action: ActionInput = {
      id:                actionRow.id as string,
      title:             actionRow.title as string,
      description:       (actionRow.description as string) ?? "",
      help_types:        (actionRow.help_types as string[]) ?? [],
      urgency:           (actionRow.urgency as "high" | "medium" | "low") ?? "medium",
      volunteers_needed: (actionRow.volunteers_needed as number) ?? 1,
      volunteers_joined: (actionRow.volunteers_joined as number) ?? 0,
    };

    // ── Busca voluntários (com perfil) ──────────────────────
    const { data: volRows, error: volErr } = await supabaseAdmin
      .from("volunteers")
      .select(
        "id, skills, help_types, reliability, rating, completed_actions, profiles!inner(full_name)"
      )
      .order("reliability", { ascending: false })
      .limit(500);

    if (volErr) {
      return Response.json({ error: "Erro ao buscar voluntários" }, { status: 500 });
    }

    const volunteers: VolunteerInput[] = (volRows ?? []).map((row) => {
      const profile = (row as { profiles?: { full_name?: string | null } }).profiles;
      const fullName = profile?.full_name ?? "Voluntário";
      return {
        id:               row.id as string,
        name:             fullName,
        initials:         fullName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase(),
        skills:           (row.skills as string[]) ?? [],
        help_types:       (row.help_types as string[]) ?? [],
        reliability:      (row.reliability as number) ?? 50,
        rating:           (row.rating as number) ?? 3.0,
        completed_actions: (row.completed_actions as number) ?? 0,
      };
    });

    // ── Executa o matching ──────────────────────────────────
    const ranked = rankVolunteersForAction(volunteers, action, limit);

    return Response.json({
      actionId,
      actionTitle: action.title,
      totalVolunteers: volunteers.length,
      matches: ranked.map((r) => ({
        volunteerId:      r.volunteerId,
        name:             r.name,
        score:            r.score,
        reason:           r.reason,
        breakdown:        r.breakdown,
      })),
    });
  },
});
