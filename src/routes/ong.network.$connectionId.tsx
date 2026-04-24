import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { ngoConnections } from "@/lib/mock-data";
import { ArrowLeft, Sparkles, MapPin, Phone, Mail, Calendar, CheckCircle2, Send, Paperclip, Building2, Truck, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/ong/network/$connectionId")({
  head: ({ params }) => ({
    meta: [
      { title: `Conexão ONG — Orquestra` },
      { name: "description", content: `Conexão entre instituições · ${params.connectionId}` },
    ],
  }),
  loader: ({ params }) => {
    const connection = ngoConnections.find((c) => c.id === params.connectionId);
    if (!connection) throw notFound();
    return { connection };
  },
  errorComponent: ({ error }) => (
    <AppShell role="ong">
      <p className="text-destructive">Erro: {error.message}</p>
      <Button asChild variant="outline" className="mt-4"><Link to="/ong/network">Voltar</Link></Button>
    </AppShell>
  ),
  notFoundComponent: () => (
    <AppShell role="ong">
      <p>Conexão não encontrada.</p>
      <Button asChild variant="outline" className="mt-4"><Link to="/ong/network">Voltar para conexões</Link></Button>
    </AppShell>
  ),
  component: ConnectionDetail,
});

function ConnectionDetail() {
  const { connection } = Route.useLoaderData();

  // Mock messages timeline
  const messages = [
    { from: "ai", text: `Match identificado: você oferece "${connection.topic}" e ${connection.org} precisa exatamente disso.`, ago: "há 2h" },
    { from: "them", text: "Olá! Recebemos sua proposta pela IA. Podemos receber o material amanhã às 9h?", ago: "há 1h" },
    { from: "us", text: "Perfeito. Vamos confirmar o transporte e enviamos o comprovante.", ago: "há 45min" },
    { from: "them", text: "Ótimo! Endereço: Rua das Flores, 122 — Galpão 3.", ago: "há 12min" },
  ];

  return (
    <AppShell role="ong">
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link to="/ong/network"><ArrowLeft className="mr-1 h-4 w-4" /> Conexões</Link>
      </Button>

      {/* Hero */}
      <div className="rounded-3xl bg-gradient-ai p-6 text-ai-foreground shadow-elegant">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 font-bold text-xl">{connection.orgInitials}</div>
            <div>
              <p className="text-xs uppercase tracking-wider opacity-80 flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Conexão orquestrada pela IA · {connection.matchScore}% match
              </p>
              <h1 className="mt-1 text-2xl font-bold">{connection.org}</h1>
              <p className="text-sm opacity-90 flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {connection.city}</p>
            </div>
          </div>
          <span className={cn(
            "rounded-full px-3 py-1 text-xs font-bold shrink-0",
            connection.status === "active" ? "bg-success text-success-foreground" :
            connection.status === "pending" ? "bg-warning text-warning-foreground" :
            "bg-white/20"
          )}>
            {connection.status === "active" ? "Conexão ativa" : connection.status === "pending" ? "Aguardando" : "Concluída"}
          </span>
        </div>

        <div className="mt-5 rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
          <p className="text-xs font-bold uppercase tracking-wider opacity-80">O que está sendo orquestrado</p>
          <p className="mt-1 font-semibold">{connection.matchedItem}</p>
          <p className="mt-0.5 text-sm opacity-90">Categoria: {connection.topic}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Conversation timeline */}
        <section className="rounded-2xl border border-border/60 bg-card shadow-soft">
          <header className="flex items-center justify-between border-b border-border/60 px-5 py-3">
            <h2 className="font-bold">Conversa institucional</h2>
            <span className="text-xs text-muted-foreground">Privada · entre as ONGs</span>
          </header>

          <div className="space-y-4 p-5">
            {messages.map((m, i) => (
              <div key={i} className={cn("flex gap-3", m.from === "us" && "flex-row-reverse")}>
                {m.from === "ai" ? (
                  <div className="mx-auto max-w-md rounded-xl bg-ai/10 px-4 py-2 text-center text-xs text-ai">
                    <Sparkles className="inline h-3 w-3 mr-1" />
                    {m.text}
                    <p className="mt-0.5 text-[10px] opacity-70">{m.ago}</p>
                  </div>
                ) : (
                  <>
                    <div className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                      m.from === "us" ? "bg-primary text-primary-foreground" : "bg-muted"
                    )}>
                      {m.from === "us" ? "CV" : connection.orgInitials}
                    </div>
                    <div className={cn(
                      "max-w-[75%] rounded-2xl px-4 py-2.5",
                      m.from === "us" ? "bg-primary text-primary-foreground" : "bg-muted"
                    )}>
                      <p className="text-sm">{m.text}</p>
                      <p className={cn("mt-1 text-[10px]", m.from === "us" ? "opacity-80" : "text-muted-foreground")}>{m.ago}</p>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          <footer className="flex items-center gap-2 border-t border-border/60 p-3">
            <Button variant="ghost" size="icon" aria-label="Anexar"><Paperclip className="h-4 w-4" /></Button>
            <Input placeholder="Escreva uma mensagem…" className="flex-1" />
            <Button size="icon" className="bg-primary"><Send className="h-4 w-4" /></Button>
          </footer>
        </section>

        {/* Side: actions and contacts */}
        <aside className="space-y-4">
          <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-soft">
            <h3 className="font-bold text-sm">Próximos passos sugeridos</h3>
            <ul className="mt-3 space-y-2.5 text-sm">
              <li className="flex items-start gap-2">
                <Truck className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Confirmar transporte</p>
                  <p className="text-xs text-muted-foreground">Frota Cidadã pode levar amanhã 8h</p>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <Calendar className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Agendar entrega</p>
                  <p className="text-xs text-muted-foreground">Janela: amanhã 9h-11h</p>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <FileText className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Termo de doação</p>
                  <p className="text-xs text-muted-foreground">Gerar PDF para registro</p>
                </div>
              </li>
            </ul>
            <Button className="mt-4 w-full bg-success hover:bg-success/90">
              <CheckCircle2 className="mr-1 h-4 w-4" /> Marcar como concluída
            </Button>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-soft">
            <h3 className="font-bold text-sm flex items-center gap-2"><Building2 className="h-4 w-4" /> Contato institucional</h3>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="truncate">contato@{connection.orgInitials.toLowerCase()}.org.br</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                <span>(47) 99999-0000</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{connection.city}</span>
              </div>
            </dl>
          </div>

          <div className="rounded-2xl border border-ai/30 bg-ai/5 p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-ai flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Insight da IA
            </p>
            <p className="mt-2 text-sm">
              Esta conexão tem <strong>{connection.matchScore}% de compatibilidade</strong> com base em proximidade,
              urgência e histórico de cooperação. ONGs com este perfil concluem 88% das parcerias.
            </p>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
