// ============================================================
// Camada de queries do Supabase
// ============================================================
// Funções tipadas que substituem o mock-data.ts. As telas podem
// importar daqui sem se preocupar com SQL/RLS.
//
// IMPORTANTE: As telas atuais ainda usam src/lib/mock-data.ts para
// não quebrar o design. Para migrar uma tela, troque os imports
// `from "@/lib/mock-data"` por estas funções.
// ============================================================
import { supabase } from "@/integrations/supabase/client";
import type {
  CrisisAction,
  Ngo,
  Profile,
  Volunteer,
} from "@/integrations/supabase/db-types";

// ---------------- Perfil do usuário logado ----------------

export async function getMyProfile(): Promise<Profile | null> {
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userRes.user.id)
    .maybeSingle();

  if (error) throw error;
  return data as Profile | null;
}

// Retorna o role principal do usuário (volunteer / ngo / admin)
export async function getMyRole(): Promise<string | null> {
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) return null;

  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userRes.user.id)
    .maybeSingle();

  return data?.role ?? null;
}

// ---------------- Ações de crise (feed) ----------------

// Lista todas as ações abertas, ordenadas por urgência e data
export async function listOpenActions(): Promise<CrisisAction[]> {
  const { data, error } = await supabase
    .from("crisis_actions")
    .select("*")
    .eq("status", "open")
    .order("urgency", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as CrisisAction[];
}

// Inscreve o usuário logado em uma ação
export async function joinAction(actionId: string) {
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) throw new Error("Usuário não autenticado");

  const { error } = await supabase.from("action_signups").insert({
    action_id: actionId,
    volunteer_id: userRes.user.id,
  });
  if (error) throw error;
}

// ---------------- ONGs ----------------

// Retorna a ONG da qual o usuário logado é dono
export async function getMyNgo(): Promise<Ngo | null> {
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) return null;

  const { data, error } = await supabase
    .from("ngos")
    .select("*")
    .eq("owner_id", userRes.user.id)
    .maybeSingle();

  if (error) throw error;
  return data as Ngo | null;
}

// Cria uma nova ação ligada à ONG do usuário
export async function createAction(input: {
  title: string;
  description: string;
  location: string;
  urgency: "high" | "medium" | "low";
  effort: string;
  help_types: string[];
  volunteers_needed: number;
}) {
  const ngo = await getMyNgo();
  if (!ngo) throw new Error("Você precisa cadastrar sua ONG primeiro.");

  const { data, error } = await supabase
    .from("crisis_actions")
    .insert({ ...input, ngo_id: ngo.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ---------------- Voluntários (visão da ONG) ----------------

// Lista voluntários — inclui campos internos (reliability, tags)
// que só ficam visíveis para ONGs por causa das policies de RLS.
export async function listVolunteersForNgo(): Promise<
  (Volunteer & { full_name: string | null })[]
> {
  const { data, error } = await supabase
    .from("volunteers")
    .select("*, profiles!inner(full_name)")
    .order("reliability", { ascending: false });

  if (error) throw error;
  // Achata o profile aninhado para facilitar o consumo no componente
  return (data ?? []).map((row: Record<string, unknown>) => {
    const profile = row.profiles as { full_name: string | null } | null;
    return {
      ...(row as unknown as Volunteer),
      full_name: profile?.full_name ?? null,
    };
  });
}

// Cria/atualiza uma avaliação privada de voluntário (apenas ONG)
export async function reviewVolunteer(input: {
  volunteer_id: string;
  rating: number;
  comment: string;
  internal_tags: string[];
}) {
  const ngo = await getMyNgo();
  if (!ngo) throw new Error("Apenas ONGs podem avaliar voluntários.");

  const { error } = await supabase.from("volunteer_reviews").insert({
    ...input,
    ngo_id: ngo.id,
  });
  if (error) throw error;
}
