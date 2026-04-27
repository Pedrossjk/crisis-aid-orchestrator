import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { rankVolunteersForAction, type VolunteerInput, type ActionInput } from "../_shared/matching.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  // Auth
  const apiKey = req.headers.get("Authorization")?.replace(/^bearer\s+/i, "");
  const expected = Deno.env.get("AGENT_API_KEY");
  if (expected && apiKey !== expected) return json({ error: "Unauthorized" }, 401);

  const url = new URL(req.url);
  const actionId = url.searchParams.get("actionId");
  const limit = Math.min(20, parseInt(url.searchParams.get("limit") ?? "10"));

  if (!actionId) return json({ error: "Parâmetro obrigatório: actionId" }, 400);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Busca a ação
  const { data: actionRow, error: actionErr } = await supabase
    .from("crisis_actions")
    .select("id, title, description, help_types, urgency, volunteers_needed, volunteers_joined")
    .eq("id", actionId)
    .maybeSingle();

  if (actionErr || !actionRow) return json({ error: "Ação não encontrada", actionId }, 404);

  const action: ActionInput = {
    id: actionRow.id,
    title: actionRow.title,
    description: actionRow.description ?? "",
    help_types: actionRow.help_types ?? [],
    urgency: actionRow.urgency ?? "medium",
    volunteers_needed: actionRow.volunteers_needed ?? 1,
    volunteers_joined: actionRow.volunteers_joined ?? 0,
  };

  // Busca voluntários com perfil
  // Query volunteers e profiles em duas chamadas separadas para evitar
  // falha silenciosa do PostgREST ao inferir FK volunteers.id → profiles.id
  const { data: volRows, error: volErr } = await supabase
    .from("volunteers")
    .select("id, skills, help_types, reliability, rating, completed_actions")
    .order("reliability", { ascending: false })
    .limit(500);

  if (volErr) return json({ error: "Erro ao buscar voluntários", detail: volErr.message }, 500);

  const volIds = (volRows ?? []).map((v: { id: string }) => v.id);

  const { data: profileRows } = volIds.length > 0
    ? await supabase.from("profiles").select("id, full_name").in("id", volIds)
    : { data: [] };

  const profileMap = new Map(
    (profileRows ?? []).map((p: { id: string; full_name: string | null }) => [p.id, p.full_name ?? "Voluntário"])
  );

  // deno-lint-ignore no-explicit-any
  const volunteers: VolunteerInput[] = (volRows ?? []).map((row: any) => {
    const fullName: string = profileMap.get(row.id) ?? "Voluntário";
    return {
      id: row.id,
      name: fullName,
      initials: fullName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase(),
      skills: row.skills ?? [],
      help_types: row.help_types ?? [],
      reliability: row.reliability ?? 50,
      rating: row.rating ?? 3.0,
      completed_actions: row.completed_actions ?? 0,
    };
  });

  const matches = rankVolunteersForAction(volunteers, action, limit);

  return json({
    actionId,
    actionTitle: action.title,
    totalVolunteers: volunteers.length,
    matches: matches.map((m) => ({
      volunteerId: m.volunteerId,
      name: m.name,
      score: m.score,
      reason: m.reason,
      breakdown: m.breakdown,
    })),
  });
});
