// POST /api/agent/invite
// ============================================================
// Skill: inviteVolunteerToAction
// Envia um convite (notificação) de uma ONG para um voluntário.
// O Orchestrate chama isto automaticamente após encontrar matches.
//
// Body JSON:
//   { volunteerId: string, actionId: string, actionTitle: string,
//     senderName: string, senderId: string, message?: string }
//
// Autenticação: Authorization: Bearer <AGENT_API_KEY>
// ============================================================
import { createAPIFileRoute } from "@tanstack/react-start/api";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

interface InvitePayload {
  volunteerId: string;
  actionId:    string;
  actionTitle: string;
  senderName:  string;
  senderId:    string;
  message?:    string;
}

export const APIRoute = createAPIFileRoute("/api/agent/invite")({
  POST: async ({ request }) => {
    // ── Auth ────────────────────────────────────────────────
    const apiKey = request.headers.get("Authorization")?.replace("Bearer ", "");
    const expected = process.env.AGENT_API_KEY;
    if (expected && apiKey !== expected) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: InvitePayload;
    try {
      body = (await request.json()) as InvitePayload;
    } catch {
      return Response.json({ error: "JSON inválido" }, { status: 400 });
    }

    const { volunteerId, actionId, actionTitle, senderName, senderId, message } =
      body;

    if (!volunteerId || !actionId || !actionTitle || !senderName || !senderId) {
      return Response.json(
        { error: "Campos obrigatórios: volunteerId, actionId, actionTitle, senderName, senderId" },
        { status: 400 }
      );
    }

    const defaultMessage =
      `Olá!\n\nA ONG ${senderName} identificou que seu perfil é altamente compatível ` +
      `com a ação "${actionTitle}" e gostaria de convidá-lo(a) a participar.\n\n` +
      `Acesse o app para ver os detalhes e confirmar sua participação.\n\nCom gratidão,\n${senderName}`;

    const { error } = await supabaseAdmin.from("notifications").insert({
      recipient_id: volunteerId,
      sender_id:    senderId,
      sender_name:  senderName,
      type:         "invite",
      title:        `Convite para: ${actionTitle}`,
      body:         message ?? defaultMessage,
      unread:       true,
    });

    if (error) {
      return Response.json(
        { error: "Erro ao inserir notificação", detail: error.message },
        { status: 500 }
      );
    }

    return Response.json({
      ok:          true,
      volunteerId,
      actionId,
      message:     "Convite enviado com sucesso.",
    });
  },
});
