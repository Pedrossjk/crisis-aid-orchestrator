// Supabase Edge Function — crisis-summary
// Skill: summarizeCrisisStatus
// Retorna relatório completo em linguagem natural + dados estruturados.
//
// Auth aceita:
//   Authorization: Bearer <AGENT_API_KEY>   (IBM Orchestrate)
//   Authorization: Bearer <supabase-jwt>    (browser autenticado)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  findCoverageGaps,
  rankVolunteersForAction,
  type ActionInput,
  type VolunteerInput,
} from "../_shared/matching.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

// deno-lint-ignore no-explicit-any
function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  // ── Auth ──────────────────────────────────────────────────
  const token = req.headers.get("Authorization")?.replace("Bearer ", "") ?? "";
  const expected = Deno.env.get("AGENT_API_KEY");

  let authed = !expected; // sem env → aberto (dev local)
  if (!authed && token === expected) authed = true; // IBM Orchestrate

  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  if (!authed) {
    // Tenta JWT Supabase (browser autenticado)
    const { data: { user } } = await adminClient.auth.getUser(token);
    authed = !!user;
  }

  if (!authed) return json({ error: "Unauthorized" }, 401);

  const generatedAt = new Date().toISOString();

  // ── Ações abertas e em andamento ──────────────────────────
  const { data: actionRows, error: actErr } = await adminClient
    .from("crisis_actions")
    .select("id, title, location, help_types, urgency, volunteers_needed, volunteers_joined, status")
    .in("status", ["open", "in_progress"])
    .limit(100);

  if (actErr) return json({ error: "Erro ao buscar ações" }, 500);

  // ── Ações concluídas este mês ──────────────────────────────
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const { count: completedThisMonth } = await adminClient
    .from("crisis_actions")
    .select("id", { count: "exact", head: true })
    .eq("status", "completed")
    .gte("created_at", monthStart.toISOString());

  // deno-lint-ignore no-explicit-any
  const actions: ActionInput[] = (actionRows ?? []).map((row: any) => ({
    id:                row.id,
    title:             row.title,
    description:       "",
    help_types:        row.help_types ?? [],
    urgency:           row.urgency ?? "medium",
    volunteers_needed: row.volunteers_needed ?? 1,
    volunteers_joined: row.volunteers_joined ?? 0,
    status:            row.status,
  }));

  const totalActions = actions.length;
  const criticalGaps = findCoverageGaps(actions, 0.5);
  const highUrgency  = criticalGaps.filter((g) => g.urgency === "high");

  // ── Detalhes de cobertura por ação ────────────────────────
  // deno-lint-ignore no-explicit-any
  const actionDetails = (actionRows ?? []).map((row: any) => {
    const needed = row.volunteers_needed ?? 1;
    const joined = row.volunteers_joined ?? 0;
    const pct    = Math.round((joined / needed) * 100);
    return {
      id:          row.id,
      title:       row.title,
      location:    row.location ?? "",
      urgency:     row.urgency ?? "medium",
      status:      row.status,
      needed,
      joined,
      coveragePct: pct,
      critical:    pct < 50,
    };
  }).sort((a: { coveragePct: number }, b: { coveragePct: number }) => a.coveragePct - b.coveragePct);

  // ── Top voluntários para ação mais crítica ────────────────
  const pivot = highUrgency[0] ?? criticalGaps[0] ?? null;
  let readyToInvite = 0;
  let pivotTitle    = "";
  let topVolunteers: { name: string; score: number; reason: string }[] = [];

  if (pivot) {
    pivotTitle = pivot.title;
    const { data: volRows } = await adminClient
      .from("volunteers")
      .select("id, skills, help_types, reliability, rating, completed_actions, profiles!inner(full_name)")
      .limit(100);

    // deno-lint-ignore no-explicit-any
    const volunteers: VolunteerInput[] = (volRows ?? []).map((v: any) => ({
      id:                v.id,
      name:              v.profiles?.full_name ?? "Voluntário",
      help_types:        v.help_types ?? [],
      reliability:       v.reliability ?? 50,
      rating:            v.rating ?? 3,
      completed_actions: v.completed_actions ?? 0,
    }));

    // Recria ActionInput com os dados do gap para rankear
    const pivotAction: ActionInput = {
      id:                pivot.actionId,
      title:             pivot.title,
      description:       "",
      help_types:        actions.find((a) => a.id === pivot.actionId)?.help_types ?? [],
      urgency:           pivot.urgency as "high" | "medium" | "low",
      volunteers_needed: pivot.missing + (actions.find((a) => a.id === pivot.actionId)?.volunteers_joined ?? 0),
      volunteers_joined: actions.find((a) => a.id === pivot.actionId)?.volunteers_joined ?? 0,
    };

    const matches = rankVolunteersForAction(volunteers, pivotAction);
    readyToInvite = matches.filter((m) => m.score >= 70).length;
    topVolunteers = matches.slice(0, 3).map((m) => ({
      name:   m.name ?? "Voluntário",
      score:  m.score,
      reason: m.reason,
    }));
  }

  // ── Candidaturas ──────────────────────────────────────────
  const { count: pendingCount } = await adminClient
    .from("action_applications")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  const { count: acceptedCount } = await adminClient
    .from("action_applications")
    .select("id", { count: "exact", head: true })
    .eq("status", "accepted");

  // ── Recomendações ─────────────────────────────────────────
  const recommendations: string[] = [];

  if (highUrgency.length > 0) {
    const g = highUrgency[0];
    recommendations.push(
      `🚨 Prioridade máxima: recrutar voluntários para "${g.title}" (${g.coveragePct}% preenchida, urgência alta).`
    );
  }
  if (readyToInvite > 0 && pivotTitle) {
    recommendations.push(
      `✉️ Enviar convites para ${readyToInvite} voluntário${readyToInvite > 1 ? "s" : ""} compatíve${readyToInvite > 1 ? "is" : "l"} para "${pivotTitle}".`
    );
  }
  if ((pendingCount ?? 0) > 0) {
    recommendations.push(
      `📋 Avaliar ${pendingCount} candidatura${(pendingCount ?? 0) > 1 ? "s" : ""} pendente${(pendingCount ?? 0) > 1 ? "s" : ""} que aguardam resposta.`
    );
  }
  if (criticalGaps.length === 0 && totalActions > 0) {
    recommendations.push("✅ Todas as ações estão com boa cobertura. Continue monitorando.");
  }

  // ── Resumo em linguagem natural ───────────────────────────
  const lines: string[] = [];

  if (totalActions === 0) {
    lines.push("Não há ações ativas no momento.");
  } else {
    lines.push(`Você tem ${totalActions} ${totalActions === 1 ? "ação ativa" : "ações ativas"}.`);
  }

  if (highUrgency.length > 0) {
    const names = highUrgency.slice(0, 2).map((g) => `"${g.title}"`).join(" e ");
    lines.push(
      `${highUrgency.length === 1 ? "A ação" : "As ações"} ${names} ${highUrgency.length === 1 ? "está" : "estão"} com urgência alta e apenas ${highUrgency[0].coveragePct}% das vagas preenchidas — priorize o recrutamento.`
    );
  } else if (criticalGaps.length > 0) {
    lines.push(
      `${criticalGaps.length} ${criticalGaps.length === 1 ? "ação está" : "ações estão"} com cobertura abaixo de 50% — atenção ao recrutamento.`
    );
  } else if (totalActions > 0) {
    lines.push("Todas as ações estão com boa cobertura de voluntários.");
  }

  if (readyToInvite > 0 && pivotTitle) {
    lines.push(
      `${readyToInvite} voluntário${readyToInvite > 1 ? "s compatíveis" : " compatível"} com "${pivotTitle}" ainda ${readyToInvite > 1 ? "não foram convidados" : "não foi convidado"}.`
    );
  }
  if ((pendingCount ?? 0) > 0) {
    lines.push(
      `Há ${pendingCount} candidatura${(pendingCount ?? 0) > 1 ? "s" : ""} pendente${(pendingCount ?? 0) > 1 ? "s" : ""} aguardando avaliação.`
    );
  }

  return json({
    generatedAt,
    summary: lines.join(" "),
    lines,
    stats: {
      totalActions,
      completedThisMonth:  completedThisMonth ?? 0,
      activeVolunteers:    acceptedCount ?? 0,
      criticalGaps:        criticalGaps.length,
      highUrgencyGaps:     highUrgency.length,
      readyToInvite,
      pendingApplications: pendingCount ?? 0,
    },
    actionDetails,
    topVolunteersForCriticalAction: {
      actionTitle: pivotTitle,
      volunteers:  topVolunteers,
    },
    recommendations,
  });
});
