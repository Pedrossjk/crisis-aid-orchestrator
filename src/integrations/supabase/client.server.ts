// ============================================================
// Cliente Supabase ADMIN (server-side apenas)
// ============================================================
// - Usa a SERVICE_ROLE_KEY — bypassa todas as políticas RLS.
// - Só pode ser importado dentro de createServerFn / rotas /api.
// - JAMAIS importar isto em componentes React do cliente.
// ============================================================
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env
  .SUPABASE_SERVICE_ROLE_KEY as string;

// Cliente admin: ignora RLS, use com cuidado em operações de confiança
export const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      // Não persiste sessão - operações stateless do servidor
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);
