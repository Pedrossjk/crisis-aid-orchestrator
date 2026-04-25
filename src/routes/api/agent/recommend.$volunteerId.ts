// GET /api/agent/recommend/:volunteerId
// ============================================================
// Skill: recommendActionsForVolunteer
// Retorna ações abertas ordenadas por compatibilidade com o
// perfil do voluntário — alimenta o feed personalizado.
//
// Autenticação: Authorization: Bearer <AGENT_API_KEY>
// ============================================================
import { createAPIFileRoute } from "@tanstack/react-start/api";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  rankActionsForVolunteer,
  type VolunteerInput,
  type ActionInput,
} from "@/lib/matching";

export const APIRoute = createAPIFileRoute(
  "/api/agent/recommend/$volunteerId"
)({
  GET: async ({ request, params }) => {
    // ── Auth ────────────────────────────────────────────────
    const apiKey = request.headers.get("Authorization")?.replace("Bearer ", "");
    const expected = process.env.AGENT_API_KEY;
    if (expected && apiKey !== expected) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { volunteerId } = params;
    const url = new URL(request.url);
    const limit = Math.min(
      30,
      parseInt(url.searchParams.get("limit") ?? "10", 10)
    );

    // ── Busca perfil do voluntário ──────────────────────────
    const { data: volRow, error: volErr } = await supabaseAdmin
      .from("volunteers")
      .select("id, skills, help_types, reliability, rating, completed_actions")
      .eq("id", volunteerId)
      .maybeSingle();

    if (volErr || !volRow) {
      return Response.json(
        { error: "Voluntário não encontrado", volunteerId },
        { status: 404 }
      );
    }

    const volunteer: VolunteerInput = {
      id:               volRow.id as string,
      skills:           (volRow.skills as string[]) ?? [],
      help_types:       (volRow.help_types as string[]) ?? [],
      reliability:      (volRow.reliability as number) ?? 50,
      rating:           (volRow.rating as number) ?? 3.0,
      completed_actions: (volRow.completed_actions as number) ?? 0,
    };

    // ── Busca ações abertas ─────────────────────────────────
    const { data: actRows, error: actErr } = await supabaseAdmin
      .from("crisis_actions")
      .select(
        "id, title, description, help_types, urgency, volunteers_needed, volunteers_joined, status"
      )
      .eq("status", "open")
      .limit(200);

    if (actErr) {
      return Response.json({ error: "Erro ao buscar ações" }, { status: 500 });
    }

    const actions: ActionInput[] = (actRows ?? []).map((row) => ({
      id:                row.id as string,
      title:             row.title as string,
      description:       (row.description as string) ?? "",
      help_types:        (row.help_types as string[]) ?? [],
      urgency:           (row.urgency as "high" | "medium" | "low") ?? "medium",
      volunteers_needed: (row.volunteers_needed as number) ?? 1,
      volunteers_joined: (row.volunteers_joined as number) ?? 0,
      status:            row.status as string,
    }));

    const ranked = rankActionsForVolunteer(actions, volunteer, limit);

    return Response.json({
      volunteerId,
      totalActions: actions.length,
      recommendations: ranked,
    });
  },
});
