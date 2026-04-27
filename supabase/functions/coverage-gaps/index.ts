import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { findCoverageGaps, type ActionInput } from "../_shared/matching.ts";

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

  const apiKey = req.headers.get("Authorization")?.replace(/^bearer\s+/i, "");
  const expected = Deno.env.get("AGENT_API_KEY");
  if (expected && apiKey !== expected) return json({ error: "Unauthorized" }, 401);

  const url = new URL(req.url);
  const thresholdPct = parseInt(url.searchParams.get("threshold") ?? "60");
  const urgencyFilter = url.searchParams.get("urgency");

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  let query = supabase
    .from("crisis_actions")
    .select("id, title, help_types, urgency, volunteers_needed, volunteers_joined, status")
    .in("status", ["open", "in_progress"]);

  if (urgencyFilter) query = query.eq("urgency", urgencyFilter);

  const { data: rows, error } = await query.limit(500);
  if (error) return json({ error: "Erro ao buscar ações" }, 500);

  // deno-lint-ignore no-explicit-any
  const actions: ActionInput[] = (rows ?? []).map((row: any) => ({
    id: row.id, title: row.title, description: "",
    help_types: row.help_types ?? [],
    urgency: row.urgency ?? "medium",
    volunteers_needed: row.volunteers_needed ?? 1,
    volunteers_joined: row.volunteers_joined ?? 0,
    status: row.status,
  }));

  const gaps = findCoverageGaps(actions, thresholdPct / 100);

  return json({
    totalActionsAnalyzed: actions.length,
    threshold: thresholdPct,
    gaps,
    summary: {
      high:   gaps.filter((g) => g.urgency === "high").length,
      medium: gaps.filter((g) => g.urgency === "medium").length,
      low:    gaps.filter((g) => g.urgency === "low").length,
    },
  });
});
