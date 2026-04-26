// GET /api/agent/recommend/:volunteerId
// ============================================================
// Skill: recommendActionsForVolunteer
// Retorna ações abertas ordenadas por compatibilidade com o
// perfil do voluntário — alimenta o feed personalizado.
//
// Autenticação: Authorization: Bearer <AGENT_API_KEY>
//               OU JWT Supabase (chamadas do browser autenticado)
//
// Query params opcionais:
//   ?lat=<latitude>&lon=<longitude>  Coordenadas do voluntário para
//                                    incluir distância no score.
//   ?limit=<n>                       Máximo de resultados (default 10)
// ============================================================
import { createAPIFileRoute } from "@tanstack/react-start/api";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  rankActionsForVolunteer,
  haversineKm,
  type VolunteerInput,
  type ActionInput,
} from "@/lib/matching";

export const APIRoute = createAPIFileRoute(
  "/api/agent/recommend/$volunteerId"
)({
  GET: async ({ request, params }) => {
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

    const { volunteerId } = params;
    const url = new URL(request.url);
    const limit = Math.min(
      30,
      parseInt(url.searchParams.get("limit") ?? "10", 10)
    );
    const userLat = parseFloat(url.searchParams.get("lat") ?? "");
    const userLon = parseFloat(url.searchParams.get("lon") ?? "");
    const hasCoords = !isNaN(userLat) && !isNaN(userLon);

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

    // ── Busca ações abertas (inclui lat/lon quando disponível) ─
    const { data: actRows, error: actErr } = await supabaseAdmin
      .from("crisis_actions")
      .select(
        "id, title, description, help_types, urgency, volunteers_needed, volunteers_joined, status, latitude, longitude"
      )
      .eq("status", "open")
      .limit(200);

    if (actErr) {
      return Response.json({ error: "Erro ao buscar ações" }, { status: 500 });
    }

    const actions: (ActionInput & { distanceKm?: number })[] = (actRows ?? []).map((row) => {
      const lat = row.latitude as number | null;
      const lon = row.longitude as number | null;
      const distanceKm =
        hasCoords && lat != null && lon != null
          ? parseFloat(haversineKm(userLat, userLon, lat, lon).toFixed(1))
          : undefined;
      return {
        id:                row.id as string,
        title:             row.title as string,
        description:       (row.description as string) ?? "",
        help_types:        (row.help_types as string[]) ?? [],
        urgency:           (row.urgency as "high" | "medium" | "low") ?? "medium",
        volunteers_needed: (row.volunteers_needed as number) ?? 1,
        volunteers_joined: (row.volunteers_joined as number) ?? 0,
        status:            row.status as string,
        distanceKm,
      };
    });

    const ranked = rankActionsForVolunteer(actions, volunteer, limit);

    // Enriquece resultado com distância
    const recommendations = ranked.map((r) => {
      const action = actions.find((a) => a.id === r.actionId);
      return {
        ...r,
        distanceKm:     action?.distanceKm ?? null,
        travelMinutes:  action?.distanceKm != null ? Math.round((action.distanceKm / 40) * 60) : null,
        fuelCostBrl:    action?.distanceKm != null ? parseFloat(((action.distanceKm / 12) * 6.20).toFixed(2)) : null,
      };
    });

    return Response.json({
      volunteerId,
      hasDistanceData: hasCoords,
      totalActions: actions.length,
      recommendations,
    });
  },
});
