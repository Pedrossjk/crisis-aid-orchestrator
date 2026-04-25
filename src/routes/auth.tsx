// ============================================================
// Página /auth — Login e Cadastro
// ============================================================
// Tela única que alterna entre login e signup.
// Após sucesso, redireciona para /onboarding (se for signup) ou
// para a home apropriada com base no role do usuário.
// ============================================================
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { HeartHandshake, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Orquestra" },
      { name: "description", content: "Acesse sua conta na Orquestra para coordenar ações de ajuda em crises." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();

  // Modo: 'login' (entrar) ou 'signup' (criar conta)
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handler do submit do formulário
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (mode === "signup") {
      // Cadastro: cria conta + perfil (via trigger no banco)
      const { error } = await signUp(email, password, fullName);
      if (error) {
        setError(traduzirErro(error.message));
        setLoading(false);
        return;
      }
      // Após signup, leva ao onboarding para escolher role e preferências
      navigate({ to: "/onboarding" });
    } else {
      // Login: autentica e descobre o role para redirecionar
      const { error } = await signIn(email, password);
      if (error) {
        setError(traduzirErro(error.message));
        setLoading(false);
        return;
      }
      // Busca o role do usuário em user_roles para decidir destino
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        const { data: roleRow } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userData.user.id)
          .maybeSingle();

        if (roleRow?.role === "ngo") navigate({ to: "/ong" });
        else if (roleRow?.role === "volunteer") navigate({ to: "/volunteer" });
        else navigate({ to: "/onboarding" }); // sem role → completa cadastro
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-4 py-5">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-hero shadow-glow">
            <HeartHandshake className="h-5 w-5 text-primary-foreground" />
          </div>
          <p className="text-base font-bold">Orquestra</p>
        </Link>
        <Link to="/" className="text-xs text-muted-foreground inline-flex items-center gap-1 hover:text-foreground">
          <ArrowLeft className="h-3 w-3" /> Voltar
        </Link>
      </header>

      <div className="mx-auto max-w-md px-4 py-10">
        <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-elegant md:p-8">
          <h1 className="text-2xl font-bold">
            {mode === "login" ? "Bem-vindo de volta" : "Criar sua conta"}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {mode === "login"
              ? "Entre para acessar suas ações e voluntários."
              : "Em poucos passos você faz parte da rede de ajuda."}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {/* Nome completo só aparece no signup */}
            {mode === "signup" && (
              <div>
                <Label htmlFor="name">Nome completo</Label>
                <Input
                  id="name"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Maria Silva"
                  className="mt-1.5"
                />
              </div>
            )}
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@email.com"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1.5"
              />
            </div>

            {/* Mensagem de erro traduzida */}
            {error && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <Button type="submit" disabled={loading} className="w-full bg-gradient-hero shadow-soft">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "login" ? "Entrar" : "Criar conta"}
            </Button>
          </form>

          {/* Toggle entre login e signup */}
          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "login" ? "Ainda não tem conta?" : "Já tem conta?"}{" "}
            <button
              onClick={() => {
                setMode(mode === "login" ? "signup" : "login");
                setError(null);
              }}
              className="font-semibold text-primary hover:underline"
            >
              {mode === "login" ? "Cadastre-se" : "Entrar"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

// Traduz mensagens comuns do Supabase para PT-BR
function traduzirErro(msg: string): string {
  if (msg.includes("Invalid login credentials")) return "E-mail ou senha incorretos.";
  if (msg.includes("User already registered")) return "Este e-mail já está cadastrado.";
  if (msg.includes("Password should be at least")) return "A senha deve ter pelo menos 6 caracteres.";
  if (msg.includes("rate limit")) return "Muitas tentativas. Aguarde um momento.";
  return msg;
}
