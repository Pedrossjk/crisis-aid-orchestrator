import { createFileRoute, Link } from "@tanstack/react-router";
import { HeartHandshake, Sparkles, Users, Building2, ArrowRight, ShieldCheck, Zap, MapPin, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Orquestra — Gestão inteligente de voluntariado em crises" },
      { name: "description", content: "Plataforma com IA que conecta voluntários, ONGs e pessoas afetadas em situações de crise. Ação rápida, organizada e eficiente." },
      { property: "og:title", content: "Orquestra — Ajuda inteligente em crises" },
      { property: "og:description", content: "Conectamos quem quer ajudar a quem precisa, com IA que prioriza, recomenda e organiza." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="mt-2 mx-auto flex max-w-7xl items-center justify-between px-4 py-5 bg-white/80 backdrop-blur-sm rounded-xl shadow-elegant">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-hero shadow-glow">
            <HeartHandshake className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <p className="text-base font-bold leading-tight">Orquestra</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Uma Rede de ação</p>
          </div>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/onboarding">Entrar</Link>
        </Button>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-4 py-12 md:py-20">
        <div className="grid gap-12 md:grid-cols-2 md:items-center">
          <div>
            <div className="inline-flex items-center gap-2 border border-ai/30 bg-ai/10 px-3 py-1 text-xs font-medium text-ai">
              <Sparkles className="h-3 w-3" />
              Powered by · IBM watsonx.ai 
            </div>
            <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight md:text-6xl">
              Não conectamos pessoas. <span className="font-gradient-emphasis ">Orquestramos ajuda.</span>
            </h1>
            <p className="mt-5 text-lg text-muted-foreground">
              Em situações de crise, cada minuto importa. Nossa IA prioriza emergências, recomenda
              ações e organiza voluntários, ONGs e recursos para uma resposta rápida e eficiente.
            </p>

            <div className="mt-10 grid grid-cols-3 gap-4">
              {[
                { v: "12.4K", l: "Voluntários ativos" },
                { v: "847", l: "ONGs conectadas" },
                { v: "3.2K", l: "Ações concluídas" },
              ].map((s) => (
                <div key={s.l}>
                  <p className="text-2xl font-bold">{s.v}</p>
                  <p className="text-xs text-muted-foreground">{s.l}</p>
                </div>
              ))}
            </div>

            <div className="mt-10 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-gradient-hero shadow-elegant">
                <Link to="/onboarding">
                  Começar agora
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/volunteer">Ver demonstração</Link>
              </Button>
            </div>

          </div>

          {/* Visual */}
          <div className="relative">
            <div className="absolute -inset-4 rounded-3xl bg-gradient-ai opacity-20 blur-3xl" />
            <div className="relative space-y-3 rounded-3xl border border-border/60 bg-card p-5 shadow-elegant">
              <div className="flex items-center gap-2 rounded-xl bg-gradient-hero p-3 text-ai-foreground">
                <Sparkles className="h-4 w-4" />
                <p className="text-xs font-medium">IA encontrou 3 ações ideais para você</p>
              </div>
              {[
                { c: "bg-urgent", t: "Distribuição de cestas — Blumenau", d: "2.4 km · 4h · 12/20 voluntários", b: "URGENTE" },
                { c: "bg-warning", t: "Cozinheiros para abrigo — Brusque", d: "14 km · Manhã · 4/6 voluntários", b: "MODERADA" },
                { c: "bg-success", t: "Triagem de doações — Joinville", d: "22 km · 3h · 9/15 voluntários", b: "BAIXA" },
              ].map((card) => (
                <div key={card.t} className="flex items-center gap-3 rounded-xl border border-border bg-background p-3">
                  <div className={`h-10 w-1 shrink-0 rounded-full ${card.c}`} />
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{card.t}</p>
                    <p className="text-xs text-muted-foreground">{card.d}</p>
                  </div>
                  <span className={`hidden sm:inline text-[10px] font-bold text-white px-2 py-0.5 rounded-full ${card.c}`}>{card.b}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Roles */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="text-center">
          <h2 className="text-3xl font-bold md:text-4xl">Para cada papel, uma experiência</h2>
          <p className="mt-3 text-muted-foreground">Escolha como você quer fazer parte da rede.</p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: Users, title: "Voluntário", desc: "Receba ações personalizadas pela IA, baseadas no seu perfil, localização e disponibilidade.", color: "bg-primary", to: "/volunteer" },
            { icon: Building2, title: "ONG", desc: "Crie ações, gerencie voluntários, cadastre recursos e conecte-se a outras instituições — tudo orquestrado por IA.", color: "bg-success", to: "/ong" },
            { icon: HeartHandshake, title: "ONGs por ONGs", desc: "Cooperação inteligente entre instituições: a IA encontra ONGs com recursos e necessidades complementares.", color: "bg-ai", to: "/ong/network" },
          ].map((r) => {
            const Icon = r.icon;
            return (
              <Link key={r.title} to={r.to} className="group rounded-2xl border border-border/60 bg-card p-6 shadow-soft transition-all hover:shadow-elegant hover:-translate-y-1">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl text-white ${r.color}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-bold">{r.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{r.desc}</p>
                <div className="mt-4 flex items-center gap-1 text-sm font-semibold text-primary">
                  Acessar painel
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="grid gap-5 md:grid-cols-4">
          {[
            { icon: Sparkles, t: "IA orquestradora", d: "Match inteligente entre necessidades e recursos." },
            { icon: Zap, t: "Resposta rápida", d: "Crises ativas priorizadas em tempo real." },
            { icon: MapPin, t: "Geolocalização", d: "Encontre ações próximas com rota e tempo." },
            { icon: ShieldCheck, t: "Confiável", d: "ONGs verificadas e voluntários avaliados." },
          ].map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.t} className="rounded-2xl border border-border/60 bg-card p-5 shadow-soft">
                <Icon className="h-6 w-6 text-primary" />
                <p className="mt-3 font-semibold">{f.t}</p>
                <p className="mt-1 text-sm text-muted-foreground">{f.d}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="overflow-hidden rounded-2xl bg-gradient-hero p-10 text-center text-primary-foreground shadow-elegant md:p-16">
          <Rocket  className="mx-auto h-10 w-10 opacity-90" />
          <h2 className="mt-4 text-3xl font-bold md:text-4xl">Pronto para fazer a diferença?</h2>
          <p className="mt-3 opacity-90">Cadastre-se em menos de 2 minutos e seja parte da resposta.</p>
          <Button asChild size="lg" variant="secondary" className="mt-6">
            <Link to="/onboarding">
              Criar conta gratuita
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <footer className="mx-auto max-w-7xl px-4 py-10 text-center text-sm text-muted-foreground">
        © 2026 Orquestra · Hackathon IA Descomplicada · Unasp and IBM
      </footer>
    </div>
  );
}
