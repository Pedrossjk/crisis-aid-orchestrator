// GET /api/agent/crisis-summary
// ============================================================
// Skill: summarizeCrisisStatus
// Retorna relatório completo em linguagem natural + dados
// estruturados: cobertura por ação, voluntários recomendados,
// candidaturas pendentes e recomendações de ação.
//
// Autenticação: Authorization: Bearer <AGENT_API_KEY>
//               OU JWT Supabase (browser autenticado)
// ============================================================
import { createAPIFileRoute } from "@tanstack/react-start/api";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  findCoverageGaps,
  rankVolunteersForAction,
  type ActionInput,
  type VolunteerInput,
} from "@/lib/matching";

export const APIRoute = createAPIFileRoute("/api/agent/crisis-summary")({
  GET: async ({ request }) => {
    // ── Auth ────────────────────────────────────────────────
    const token = request.headers.get("Authorization")?.replace("Bearer ", "") ?? "";
    const expected = process.env.AGENT_API_KEY;
    let authed = !expected;
    if (!authed && token === expected) authed = true;
    if (!authed) {
      const { data: { user: sessionUser } } = await supabaseAdmin.auth.getUser(token);
      authed = !!sessionUser;
    }
    if (!authed) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const generatedAt = new Date().toISOString();

    // ── Busca ações abertas e em andamento ──────────────────
    const { data: actionRows, error: actErr } = await supabaseAdmin
      .from("crisis_actions")
      .select("id, title, location, help_types, urgency, volunteers_needed, volunteers_joined, status")
      .in("status", ["open", "in_progress"])
      .limit(100);

    if (actErr) return Response.json({ error: "Erro ao buscar ações" }, { status: 500 });

    // ── Busca ações concluídas este mês ──────────────────────
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const { count: completedThisMonth } = await supabaseAdmin
      .from("crisis_actions")
      .select("id", { count: "exact", head: true })
      .eq("status", "completed")
      .gte("created_at", monthStart.toISOString());

    const actions: ActionInput[] = (actionRows ?? []).map((row) => ({
      id:                row.id as string,
      title:             row.title as string,
      description:       "",
      help_types:        (row.help_types as string[]) ?? [],
      urgency:           (row.urgency as "high" | "medium" | "low") ?? "medium",
      volunteers_needed: (row.volunteers_needed as number) ?? 1,
      volunteers_joined: (row.volunteers_joined as number) ?? 0,
      status:            row.status as string,
    }));

    const totalActions = actions.length;
    const criticalGaps = findCoverageGaps(actions, 0.5);
    const highUrgency  = criticalGaps.filter((g) => g.urgency === "high");

    // ── Cobertura detalhada por ação ─────────────────────────
    const actionDetails = (actionRows ?? []).map((row) => {
      const needed = (row.volunteers_needed as number) ?? 1;
      const joined = (row.volunteers_joined as number) ?? 0;
      const pct    = Math.round((joined / needed) * 100);
      return {
        id:          row.id as string,
        title:       row.title as string,
        location:    (row.location as string) ?? "",
        urgency:     (row.urgency as string) ?? "medium",
        status:      (row.status as string),
        needed,
        joined,
        coveragePct: pct,
        critical:    pct < 50,
      };
    }).sort((a, b) => a.coveragePct - b.coveragePct);

    // ── Busca voluntários e rankeia para ação mais crítica ───
    const pivot = highUrgency[0] ?? criticalGaps[0] ?? null;
    let readyToInvite = 0;
    let pivotTitle    = "";
    let topVolunteers: { name: string; score: number; reason: string }[] = [];

    if (pivot) {
      pivotTitle = pivot.title;
      const { data: volRows } = await supabaseAdmin
        .from("volunteers")
        .select("id, skills, help_types, reliability, rating, completed_actions, profiles!inner(full_name)")
        .limit(100);

      const volunteers: VolunteerInput[] = (volRows ?? []).map((v) => {
        const profile = (v as { profiles?: { full_name?: string } }).profiles;
        return {
          id:                v.id as string,
          name:              profile?.full_name ?? "Voluntário",
          help_types:        (v.help_types as string[]) ?? [],
          reliability:       (v.reliability as number) ?? 50,
          rating:            (v.rating as number) ?? 3,
          completed_actions: (v.completed_actions as number) ?? 0,
        };
      });

      const matches = rankVolunteersForAction(volunteers, pivot);
      readyToInvite = matches.filter((m) => m.score >= 70).length;
      topVolunteers = matches.slice(0, 3).map((m) => ({
        name:   m.name ?? "Voluntário",
        score:  m.score,
        reason: m.reason,
      }));
    }

    // ── Candidaturas pendentes ───────────────────────────────
    const { count: pendingCount } = await supabaseAdmin
      .from("action_applications")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");

    // ── Candidaturas aceitas (ativos) ────────────────────────
    const { count: acceptedCount } = await supabaseAdmin
      .from("action_applications")
      .select("id", { count: "exact", head: true })
      .eq("status", "accepted");

    // ── Recomendações de ação do agente ──────────────────────
    const recommendations: string[] = [];

    if (highUrgency.length > 0) {
      const action = highUrgency[0];
      const pct = Math.round((action.volunteersJoined / action.volunteersNeeded) * 100);
      recommendations.push(
        `🚨 Prioridade máxima: recrutar voluntários para "${action.title}" (${pct}% preenchida, urgência alta).`
      );
    }
    if (readyToInvite > 0 && pivotTitle) {
      recommendations.push(
        `✉️ Enviar convites para ${readyToInvite} voluntário${readyToInvite > 1 ? "s" : ""} compatíve${readyToInvite > 1 ? "is" : "l"} identificado${readyToInvite > 1 ? "s" : ""} para "${pivotTitle}".`
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

    // ── Resumo em linguagem natural ──────────────────────────
    const lines: string[] = [];

    if (totalActions === 0) {
      lines.push("Não há ações ativas no momento.");
    } else {
      lines.push(`Você tem ${totalActions} ${totalActions === 1 ? "ação ativa" : "ações ativas"}.`);
    }

    if (highUrgency.length > 0) {
      const names = highUrgency.slice(0, 2).map((g) => `"${g.title}"`).join(" e ");
      const pct   = Math.round((highUrgency[0].volunteersJoined / highUrgency[0].volunteersNeeded) * 100);
      lines.push(
        `${highUrgency.length === 1 ? "A ação" : "As ações"} ${names} ${highUrgency.length === 1 ? "está" : "estão"} com urgência alta e apenas ${pct}% das vagas preenchidas — priorize o recrutamento.`
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

    return Response.json({
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
  },
});
