import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);

  const apiKey = req.headers.get("Authorization")?.replace(/^bearer\s+/i, "");
  const expected = Deno.env.get("AGENT_API_KEY");
  if (expected && apiKey !== expected) return json({ error: "Unauthorized" }, 401);

  // deno-lint-ignore no-explicit-any
  let body: any;
  try { body = await req.json(); } catch { return json({ error: "JSON inválido" }, 400); }

  const { volunteerId, actionId, actionTitle, senderName, senderId, message } = body;
  if (!volunteerId || !actionId || !actionTitle || !senderName) {
    return json({ error: "Campos obrigatórios: volunteerId, actionId, actionTitle, senderName" }, 400);
  }

  // senderId é opcional — deve ser um UUID válido de auth.users.
  // Se não for fornecido ou não for UUID válido, usa null (FK permite null).
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const resolvedSenderId: string | null = (senderId && UUID_RE.test(String(senderId))) ? senderId : null;

  const defaultMessage =
    `Olá!\n\nA ONG ${senderName} identificou que seu perfil é altamente compatível ` +
    `com a ação "${actionTitle}" e gostaria de convidá-lo(a) a participar.\n\n` +
    `Acesse o app para ver os detalhes e confirmar sua participação.\n\nCom gratidão,\n${senderName}`;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { error } = await supabase.from("notifications").insert({
    recipient_id: volunteerId,
    sender_id: resolvedSenderId,
    sender_name: senderName,
    type: "invite",
    title: `Convite para: ${actionTitle}`,
    body: message ?? defaultMessage,
    unread: true,
  });

  if (error) return json({ error: "Erro ao inserir notificação", detail: error.message }, 500);

  return json({ ok: true, volunteerId, actionId, message: "Convite enviado com sucesso." });
});
