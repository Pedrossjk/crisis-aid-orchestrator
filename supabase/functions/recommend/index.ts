import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { rankActionsForVolunteer, type VolunteerInput, type ActionInput } from "../_shared/matching.ts";

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

  const apiKey = req.headers.get("Authorization")?.replace("Bearer ", "");
  const expected = Deno.env.get("AGENT_API_KEY");
  if (expected && apiKey !== expected) return json({ error: "Unauthorized" }, 401);

  const url = new URL(req.url);
  const volunteerId = url.searchParams.get("volunteerId");
  const limit = Math.min(30, parseInt(url.searchParams.get("limit") ?? "10"));

  if (!volunteerId) return json({ error: "Parâmetro obrigatório: volunteerId" }, 400);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const [{ data: volRow, error: volErr }, { data: actRows }] = await Promise.all([
    supabase.from("volunteers")
      .select("id, help_types, reliability, rating, completed_actions")
      .eq("id", volunteerId)
      .maybeSingle(),
    supabase.from("crisis_actions")
      .select("id, title, description, help_types, urgency, volunteers_needed, volunteers_joined, status")
      .eq("status", "open")
      .limit(200),
  ]);

  if (volErr || !volRow) return json({ error: "Voluntário não encontrado", volunteerId }, 404);

  const volunteer: VolunteerInput = {
    id: volRow.id,
    help_types: volRow.help_types ?? [],
    reliability: volRow.reliability ?? 50,
    rating: volRow.rating ?? 3.0,
    completed_actions: volRow.completed_actions ?? 0,
  };

  // deno-lint-ignore no-explicit-any
  const actions: ActionInput[] = (actRows ?? []).map((row: any) => ({
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    help_types: row.help_types ?? [],
    urgency: row.urgency ?? "medium",
    volunteers_needed: row.volunteers_needed ?? 1,
    volunteers_joined: row.volunteers_joined ?? 0,
    status: row.status,
  }));

  const recommendations = rankActionsForVolunteer(actions, volunteer, limit);

  return json({ volunteerId, totalActions: actions.length, recommendations });
});
