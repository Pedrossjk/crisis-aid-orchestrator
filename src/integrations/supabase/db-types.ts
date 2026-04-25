// ============================================================
// Tipos espelhando o schema do banco (orquestra_schema.sql)
// ============================================================
// Mantém alinhamento entre o front e as tabelas do Supabase.
// Atualize aqui sempre que mudar o schema no banco.
// ============================================================

export type AppRole = "volunteer" | "ngo" | "admin";
export type Urgency = "high" | "medium" | "low";
export type ActionStatus = "open" | "in_progress" | "completed" | "cancelled";
export type HelpType =
  | "money"
  | "food"
  | "transport"
  | "service"
  | "shelter"
  | "medical"
  | "supplies";
export type ConnectionStatus = "pending" | "active" | "completed" | "rejected";
export type RequestStatus = "open" | "assigned" | "fulfilled";

// Linha da tabela `profiles` (1-1 com auth.users)
export interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

// Linha da tabela `volunteers` (perfil estendido para voluntários)
export interface Volunteer {
  id: string;
  skills: string[];
  help_types: HelpType[];
  resources: string[];
  availability: string[];
  // Campos internos usados pela IA - NÃO exibir ao próprio voluntário
  reliability: number;
  internal_tags: string[];
  rating: number;
  completed_actions: number;
}

// Linha da tabela `ngos`
export interface Ngo {
  id: string;
  owner_id: string;
  name: string;
  cnpj: string | null;
  description: string | null;
  city: string | null;
  state: string | null;
  logo_url: string | null;
  verified: boolean;
  offers: HelpType[];
  needs: HelpType[];
  created_at: string;
}

// Linha da tabela `crisis_actions`
export interface CrisisAction {
  id: string;
  ngo_id: string;
  crisis_id: string | null;
  title: string;
  description: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  urgency: Urgency;
  effort: string;
  help_types: HelpType[];
  volunteers_needed: number;
  volunteers_joined: number;
  status: ActionStatus;
  is_ai_recommended: boolean;
  created_at: string;
}
