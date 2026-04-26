// POST /api/agent/notify-ong-summary
// ============================================================
// Skill: notifyOngWithCrisisSummary
// Gera o relatório completo de crise e entrega como notificação
// diretamente ao painel da ONG. Chamado pelo IBM watsonx Orchestrate
// de forma autônoma (ex: quando uma ação crítica é detectada).
//
// Body JSON:
//   { recipientId: string }   ← user_id do dono da ONG
//
// Autenticação: Authorization: Bearer <AGENT_API_KEY>
// ============================================================
import { createAPIFileRoute } from "@tanstack/react-start/api";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  findCoverageGaps,
  rankVolunteersForAction,
  type ActionInput,
  type VolunteerInput,
} from "@/lib/matching";

interface NotifyPayload {
  recipientId: string; // user_id do owner da ONG
}

export const APIRoute = createAPIFileRoute("/api/agent/notify-ong-summary")({
  POST: async ({ request }) => {
    // ── Auth ────────────────────────────────────────────────
    const apiKey  = request.headers.get("Authorization")?.replace("Bearer ", "");
    const expected = process.env.AGENT_API_KEY;
    if (expected && apiKey !== expected) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: NotifyPayload;
    try {
      body = (await request.json()) as NotifyPayload;
    } catch {
      return Response.json({ error: "JSON inválido" }, { status: 400 });
    }

    const { recipientId } = body;
    if (!recipientId) {
      return Response.json({ error: "recipientId é obrigatório" }, { status: 400 });
    }

    // ── Gera o relatório ────────────────────────────────────
    const { data: actionRows } = await supabaseAdmin
      .from("crisis_actions")
      .select("id, title, help_types, urgency, volunteers_needed, volunteers_joined, status")
      .in("status", ["open", "in_progress"])
      .limit(100);

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

    const pivot = highUrgency[0] ?? criticalGaps[0] ?? null;
    let readyToInvite = 0;
    let pivotTitle    = "";

    if (pivot) {
      pivotTitle = pivot.title;
      const { data: volRows } = await supabaseAdmin
        .from("volunteers")
        .select("id, help_types, reliability, rating, completed_actions")
        .limit(100);

      const volunteers: VolunteerInput[] = (volRows ?? []).map((v) => ({
        id:                v.id as string,
        help_types:        (v.help_types as string[]) ?? [],
        reliability:       (v.reliability as number) ?? 50,
        rating:            (v.rating as number) ?? 3,
        completed_actions: (v.completed_actions as number) ?? 0,
      }));

      const matches = rankVolunteersForAction(volunteers, pivot);
      readyToInvite = matches.filter((m) => m.score >= 70).length;
    }

    const { count: pendingCount } = await supabaseAdmin
      .from("action_applications")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");

    // ── Compõe o texto do relatório ─────────────────────────
    const parts: string[] = [];

    if (totalActions === 0) {
      parts.push("Não há ações ativas no momento.");
    } else {
      parts.push(`${totalActions} ${totalActions === 1 ? "ação ativa" : "ações ativas"}.`);
    }

    if (highUrgency.length > 0) {
      const names = highUrgency.slice(0, 2).map((g) => `"${g.title}"`).join(" e ");
      const pct   = Math.round((highUrgency[0].volunteersJoined / highUrgency[0].volunteersNeeded) * 100);
      parts.push(`${names}: urgência alta, ${pct}% preenchida — ação necessária.`);
    } else if (criticalGaps.length > 0) {
      parts.push(`${criticalGaps.length} ação(ões) com cobertura abaixo de 50%.`);
    } else {
      parts.push("Cobertura de voluntários satisfatória em todas as ações.");
    }

    if (readyToInvite > 0 && pivotTitle) {
      parts.push(`${readyToInvite} voluntário(s) prontos para convidar para "${pivotTitle}".`);
    }
    if ((pendingCount ?? 0) > 0) {
      parts.push(`${pendingCount} candidatura(s) pendente(s) aguardando avaliação.`);
    }

    const notificationBody = parts.join(" ");
    const title = criticalGaps.length > 0
      ? `⚠️ Relatório de crise: ${criticalGaps.length} ação(ões) crítica(s)`
      : "✅ Relatório de situação: cobertura satisfatória";

    // ── Insere notificação no painel da ONG ─────────────────
    const { error: notifErr } = await supabaseAdmin
      .from("notifications")
      .insert({
        recipient_id: recipientId,
        sender_id:    recipientId, // sistema → o próprio usuário como destinatário
        sender_name:  "Agente IBM Orchestrate",
        type:         "summary",
        title,
        body:         notificationBody,
        unread:       true,
      });

    if (notifErr) {
      return Response.json({ error: "Erro ao inserir notificação", detail: notifErr.message }, { status: 500 });
    }

    return Response.json({
      ok:          true,
      recipientId,
      title,
      body:        notificationBody,
      stats: {
        totalActions,
        criticalGaps:        criticalGaps.length,
        highUrgencyGaps:     highUrgency.length,
        readyToInvite,
        pendingApplications: pendingCount ?? 0,
      },
    });
  },
});
