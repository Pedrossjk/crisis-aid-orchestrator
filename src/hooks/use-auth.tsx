// ============================================================
// Hook e Provider de Autenticação
// ============================================================
// - Centraliza o estado de sessão/usuário do Supabase.
// - Configura o listener onAuthStateChange ANTES do getSession
//   para evitar perder eventos durante a hidratação.
// - Expõe helpers de signIn / signUp / signOut.
// ============================================================
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (
    email: string,
    password: string,
    fullName: string
  ) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1) Registramos o listener PRIMEIRO para capturar qualquer mudança
    //    (login, logout, refresh de token, recovery, etc.)
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
      }
    );

    // 2) Em seguida buscamos a sessão atual (caso o usuário já esteja logado)
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    // Limpeza: cancela a inscrição ao desmontar
    return () => subscription.subscription.unsubscribe();
  }, []);

  // Login com email/senha
  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  // Cadastro: cria conta e dispara o trigger handle_new_user no banco,
  // que automaticamente cria a linha em `profiles`.
  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Redireciona após confirmação de email para a home
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          // Metadados consumidos pelo trigger handle_new_user
          full_name: fullName,
        },
      },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{ user, session, loading, signIn, signUp, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Hook de consumo - lança erro se usado fora do Provider
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  return ctx;
}
