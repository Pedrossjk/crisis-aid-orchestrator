// GET /api/agent/match-volunteers/:actionId
// ============================================================
// Skill: matchVolunteersForAction
// Ranqueia voluntários por compatibilidade com uma ação.
// Chamado automaticamente pelo IBM watsonx Orchestrate ou
// pela tela da ONG sem precisar de chat.
//
// Autenticação: Authorization: Bearer <AGENT_API_KEY>
//
// Query params opcionais:
//   ?limit=<n>   Máximo de resultados (default 10)
//
// Distância: a ação tem lat/lon no banco. Cada voluntário tem
// city/state no perfil. Um mapa de cidades BR → coords é usado
// para estimar a distância voluntário → ação sem geocoding externo.
// ============================================================
import { createAPIFileRoute } from "@tanstack/react-start/api";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  rankVolunteersForAction,
  haversineKm,
  type VolunteerInput,
  type ActionInput,
} from "@/lib/matching";

// Coordenadas aproximadas de cidades brasileiras (lat, lon)
const CITY_COORDS: Record<string, [number, number]> = {
  // SC
  "Blumenau":       [-26.9196, -49.0661],
  "Itajaí":         [-26.9075, -48.6628],
  "Florianópolis":  [-27.5954, -48.5480],
  "Joinville":      [-26.3039, -48.8456],
  "Chapecó":        [-27.1005, -52.6155],
  "Brusque":        [-27.0972, -48.9117],
  "Lages":          [-27.8161, -50.3268],
  "Balneário Camboriú": [-26.9897, -48.6348],
  // RS
  "Porto Alegre":   [-30.0346, -51.2177],
  "Caxias do Sul":  [-29.1681, -51.1794],
  "Pelotas":        [-31.7726, -52.3376],
  "Canoas":         [-29.9185, -51.1834],
  // PR
  "Curitiba":       [-25.4290, -49.2671],
  "Londrina":       [-23.3045, -51.1696],
  // SP
  "São Paulo":      [-23.5505, -46.6333],
  // RJ
  "Rio de Janeiro": [-22.9068, -43.1729],
};

function cityToCoords(city?: string | null, state?: string | null): [number, number] | null {
  if (!city) return null;
  // Tenta match exato, depois parcial
  const key = Object.keys(CITY_COORDS).find(
    (k) => k.toLowerCase() === city.toLowerCase()
  ) ?? Object.keys(CITY_COORDS).find(
    (k) => city.toLowerCase().includes(k.toLowerCase())
  );
  return key ? CITY_COORDS[key] : null;
}

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
      const profile = (row as { profiles?: { full_name?: string | null; city?: string | null; state?: string | null } }).profiles;
      const fullName = profile?.full_name ?? "Voluntário";

      // Calcula distância usando cidade do perfil → coords do mapa de cidades
      let distanceKm: number | undefined;
      if (hasActionCoords) {
        const volCoords = cityToCoords(profile?.city, profile?.state);
        if (volCoords) {
          distanceKm = parseFloat(
            haversineKm(volCoords[0], volCoords[1], actionLat!, actionLon!).toFixed(1)
          );
        }
      }

      return {
        id:               row.id as string,
        name:             fullName,
        initials:         fullName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase(),
        skills:           (row.skills as string[]) ?? [],
        help_types:       (row.help_types as string[]) ?? [],
        reliability:      (row.reliability as number) ?? 50,
        rating:           (row.rating as number) ?? 3.0,
        completed_actions: (row.completed_actions as number) ?? 0,
        distanceKm,
      };
    });

    // ── Executa o matching ──────────────────────────────────
    const ranked = rankVolunteersForAction(volunteers, action, limit);

    return Response.json({
      actionId,
      actionTitle:       action.title,
      hasDistanceData:   hasActionCoords,
      totalVolunteers:   volunteers.length,
      matches: ranked.map((r) => ({
        volunteerId:    r.volunteerId,
        name:           r.name,
        score:          r.score,
        reason:         r.reason,
        distanceKm:     r.distanceKm ?? null,
        travelMinutes:  r.distanceKm != null ? Math.round((r.distanceKm / 40) * 60) : null,
        fuelCostBrl:    r.distanceKm != null ? parseFloat(((r.distanceKm / 12) * 6.20).toFixed(2)) : null,
        breakdown:      r.breakdown,
      })),
    });
  },
});
