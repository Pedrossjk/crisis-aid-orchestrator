// ============================================================
// Cliente Supabase para uso no NAVEGADOR (browser-side)
// ============================================================
// - Usa a chave PUBLISHABLE (anon) — sujeita às políticas RLS.
// - Persiste a sessão no localStorage para manter o usuário logado.
// - NUNCA importe este arquivo em código que use service_role.
// ============================================================
import { createClient } from "@supabase/supabase-js";

// URL e chave pública vêm das variáveis VITE_* (expostas no bundle)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env
  .VITE_SUPABASE_PUBLISHABLE_KEY as string;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  // Aviso útil em dev caso o .env esteja faltando
  console.warn(
    "[Supabase] Variáveis VITE_SUPABASE_URL ou VITE_SUPABASE_PUBLISHABLE_KEY ausentes."
  );
}

// Cliente único, reaproveitado em todo o app
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    // Persiste tokens de sessão no localStorage do navegador
    persistSession: true,
    // Renova o access_token automaticamente antes de expirar
    autoRefreshToken: true,
    // Detecta callbacks OAuth/recovery via parâmetros na URL
    detectSessionInUrl: true,
  },
});
