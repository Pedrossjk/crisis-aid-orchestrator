import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { matchedVolunteers, type Volunteer } from "@/lib/mock-data";
import {
  MapPin,
  Star,
  Check,
  X,
  MessageCircle,
  Sparkles,
  Lock,
  Shield,
  Award,
  Plus,
  Send,
  Loader2,
  ChevronRight,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/ong/volunteers")({
  head: () => ({
    meta: [
      { title: "Voluntários — ONG · Orquestra" },
      {
        name: "description",
        content:
          "Gerencie candidatos, voluntários ativos e avaliações privadas que alimentam a IA.",
      },
    ],
  }),
  component: VolunteersPage,
});

const TAG_OPTIONS = [
  "Pontual",
  "Líder natural",
  "Comunicativo(a)",
  "Resiliente",
  "Calmo(a) sob pressão",
  "Veículo próprio",
  "Profissional certificado(a)",
  "Precisou de orientação",
];

type Application = {
  id: string;
  action_id: string;
  action_title: string;
  volunteer_id: string;
  volunteer_name: string;
  volunteer_initials: string;
  message: string | null;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
};

type ChatMessage = {
  id: string;
  application_id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  created_at: string;
};

function VolunteersPage() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loadingApps, setLoadingApps] = useState(true);
  const [chatApp, setChatApp] = useState<Application | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);

  const ongName = (user?.user_metadata?.full_name as string | undefined) ?? "ONG";

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    setLoadingApps(true);
    const { data } = await supabase
      .from("action_applications")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setApplications(data as Application[]);
    setLoadingApps(false);
  };

  const loadChat = async (app: Application) => {
    setChatApp(app);
    setChatMessages([]);
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("application_id", app.id)
      .order("created_at", { ascending: true });
    if (data) setChatMessages(data as ChatMessage[]);
  };

  const handleAccept = async (app: Application) => {
    await supabase.from("action_applications").update({ status: "accepted" }).eq("id", app.id);
    setApplications((prev) =>
      prev.map((a) => (a.id === app.id ? { ...a, status: "accepted" } : a)),
    );
    loadChat({ ...app, status: "accepted" });
  };

  const handleReject = async (appId: string) => {
    await supabase.from("action_applications").update({ status: "rejected" }).eq("id", appId);
    setApplications((prev) => prev.map((a) => (a.id === appId ? { ...a, status: "rejected" } : a)));
  };

  const sendChatMessage = async () => {
    if (!chatApp || !user || !chatInput.trim()) return;
    setSendingMsg(true);
    const content = chatInput.trim();
    setChatInput("");
    const { data } = await supabase
      .from("chat_messages")
      .insert({
        application_id: chatApp.id,
        sender_id: user.id,
        sender_name: ongName,
        content,
      })
      .select()
      .single();
    if (data) setChatMessages((prev) => [...prev, data as ChatMessage]);
    setSendingMsg(false);
  };

  const pendingApps = applications.filter((a) => a.status === "pending");

  return (
    <AppShell role="ong">
      <h1 className="text-2xl font-bold md:text-3xl">Voluntários</h1>
      <p className="mt-1 text-muted-foreground">
        Gerencie candidatos, ativos e avaliações pós-ação.
      </p>

      {/* Privacy banner */}
      <div className="mt-5 flex items-start gap-3 rounded-2xl border border-ai/30 bg-ai/5 p-4">
        <Shield className="h-5 w-5 text-ai mt-0.5 shrink-0" />
        <div className="text-sm">
          <p className="font-semibold text-foreground">Avaliações privadas alimentam a IA</p>
          <p className="text-muted-foreground mt-0.5">
            Suas avaliações <strong>não são exibidas</strong> aos voluntários. Elas são usadas
            apenas para que a IA recomende os melhores perfis para cada ação.
          </p>
        </div>
      </div>

      <Tabs defaultValue="pending" className="mt-6">
        <TabsList>
          <TabsTrigger value="all">Todos (24)</TabsTrigger>

          <TabsTrigger value="active">Ativos (12)</TabsTrigger>
          <TabsTrigger value="completed">Concluídos (4)</TabsTrigger>
          <TabsTrigger value="pending" className="relative">
            Pendentes
            {pendingApps.length > 0 && (
              <Badge className="ml-1.5 h-4 min-w-4 px-1 text-[10px] bg-urgent text-urgent-foreground">
                {pendingApps.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
        <div className="mt-4 mb-3">
          <Input placeholder="Buscar voluntário…" className="max-w-md" />
        </div>

        {/* Pendentes via Supabase */}
        <TabsContent value="pending" className="mt-4 space-y-3">
          {loadingApps ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : applications.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <MessageCircle className="mx-auto h-10 w-10 opacity-30" />
              <p className="mt-3 font-medium">Nenhuma solicitação ainda</p>
              <p className="text-sm">
                Quando voluntários clicarem em "Quero ajudar", as solicitações aparecerão aqui.
              </p>
            </div>
          ) : (
            applications.map((app) => (
              <div
                key={app.id}
                className="border border-border/60 bg-card p-4 shadow-soft space-y-3"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-hero text-primary-foreground font-bold text-sm">
                    {app.volunteer_initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold">{app.volunteer_name}</p>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-bold",
                          app.status === "pending"
                            ? "bg-warning/15 text-warning"
                            : app.status === "accepted"
                              ? "bg-success/15 text-success"
                              : "bg-destructive/15 text-destructive",
                        )}
                      >
                        {app.status === "pending"
                          ? "Pendente"
                          : app.status === "accepted"
                            ? "Aceito"
                            : "Recusado"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {app.action_title}
                    </p>
                    {app.message && (
                      <p className="mt-2 text-sm text-muted-foreground bg-muted rounded-lg px-3 py-2">
                        {app.message}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  {app.status === "pending" && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive"
                        onClick={() => handleReject(app.id)}
                      >
                        <X className="mr-1 h-3.5 w-3.5" /> Recusar
                      </Button>
                      <Button
                        size="sm"
                        className="bg-success hover:bg-success/90 text-white"
                        onClick={() => handleAccept(app)}
                      >
                        <Check className="mr-1 h-3.5 w-3.5" /> Aceitar
                      </Button>
                    </>
                  )}
                  {app.status === "accepted" && (
                    <Button size="sm" variant="outline" onClick={() => loadChat(app)}>
                      <MessageCircle className="mr-1 h-3.5 w-3.5" /> Abrir chat
                      <ChevronRight className="ml-1 h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-3">
          {[...matchedVolunteers, ...matchedVolunteers].map((v, i) => (
            <VolunteerRow key={i} volunteer={v} index={i} status="active" />
          ))}
        </TabsContent>
        <TabsContent value="active" className="space-y-3">
          {matchedVolunteers.map((v, i) => (
            <VolunteerRow key={i} volunteer={v} index={i} status="active" />
          ))}
        </TabsContent>
        <TabsContent value="completed" className="space-y-3">
          {matchedVolunteers.slice(0, 3).map((v, i) => (
            <VolunteerRow key={i} volunteer={v} index={i} status="completed" />
          ))}
        </TabsContent>
      </Tabs>

      {/* Chat sheet */}
      <Sheet
        open={!!chatApp}
        onOpenChange={(open) => {
          if (!open) setChatApp(null);
        }}
      >
        <SheetContent side="right" className="flex flex-col sm:max-w-md p-0">
          <SheetHeader className="p-5 border-b">
            <SheetTitle className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-primary" />
              Chat com {chatApp?.volunteer_name}
            </SheetTitle>
            <SheetDescription className="text-xs">{chatApp?.action_title}</SheetDescription>
          </SheetHeader>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {chatMessages.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">
                Nenhuma mensagem ainda. Envie uma para começar!
              </p>
            )}
            {chatMessages.map((msg) => {
              const isOwn = msg.sender_id === user?.id;
              return (
                <div key={msg.id} className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[75%] px-4 py-2.5 text-sm shadow-soft",
                      isOwn
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-card border border-border/60 rounded-bl-sm",
                    )}
                  >
                    {!isOwn && (
                      <p className="text-[10px] font-bold opacity-60 mb-0.5">{msg.sender_name}</p>
                    )}
                    <p>{msg.content}</p>
                    <p className={cn("text-[10px] mt-1 opacity-60", isOwn ? "text-right" : "")}>
                      {new Date(msg.created_at).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Input */}
          <div className="border-t p-4 flex gap-2">
            <Input
              placeholder="Escreva uma mensagem…"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendChatMessage();
                }
              }}
              className="flex-1"
            />
            <Button
              size="icon"
              onClick={sendChatMessage}
              disabled={sendingMsg || !chatInput.trim()}
              className="bg-gradient-hero shrink-0"
            >
              {sendingMsg ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </AppShell>
  );
}

function VolunteerRow({
  volunteer: v,
  index: i,
  status,
}: {
  volunteer: Volunteer;
  index: number;
  status: "pending" | "active" | "completed";
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/60 bg-card p-4 shadow-soft">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-hero text-primary-foreground font-bold">
        {v.initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold">{v.name}</p>
          {i < 3 && (
            <span className="rounded-full bg-ai/10 px-2 py-0.5 text-[10px] font-bold text-ai flex items-center gap-0.5">
              <Sparkles className="h-2.5 w-2.5" />
              {v.matchScore}%
            </span>
          )}
          {v.reliability && v.reliability >= 90 && (
            <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-bold text-success flex items-center gap-0.5">
              <Award className="h-2.5 w-2.5" /> Top performer
            </span>
          )}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-0.5">
            <MapPin className="h-3 w-3" /> {v.distanceKm}km
          </span>
          <span className="flex items-center gap-0.5">
            <Star className="h-3 w-3 fill-warning text-warning" /> {v.rating}
          </span>
          <span>{v.skills.join(" · ")}</span>
          <span>{v.completedActions} ações</span>
        </div>
        {/* Internal-only tags */}
        {v.internalTags && v.internalTags.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1 items-center">
            <Lock className="h-3 w-3 text-ai" />
            {v.internalTags.map((t) => (
              <span
                key={t}
                className="rounded-md bg-ai/10 px-1.5 py-0.5 text-[10px] font-medium text-ai"
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="flex gap-1 ml-auto">
        {status === "completed" ? (
          <ReviewSheet volunteer={v} />
        ) : (
          <>
            <Button size="icon" variant="outline" aria-label="Mensagem">
              <MessageCircle className="h-4 w-4" />
            </Button>
            {status === "pending" && (
              <>
                <Button
                  size="icon"
                  variant="outline"
                  className="text-destructive"
                  aria-label="Recusar"
                >
                  <X className="h-4 w-4" />
                </Button>
                <Button size="icon" className="bg-success hover:bg-success/90" aria-label="Aceitar">
                  <Check className="h-4 w-4" />
                </Button>
              </>
            )}
            {status === "active" && <ReviewSheet volunteer={v} />}
          </>
        )}
      </div>
    </div>
  );
}

function ReviewSheet({ volunteer: v }: { volunteer: Volunteer }) {
  const [rating, setRating] = useState<number>(v.lastReview?.rating ?? 0);
  const [tags, setTags] = useState<string[]>(v.internalTags ?? []);
  const [comment, setComment] = useState<string>(v.lastReview?.comment ?? "");

  const toggleTag = (t: string) =>
    setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1">
          <Star className="h-3.5 w-3.5" /> Avaliar
        </Button>
      </SheetTrigger>
      <SheetContent className="overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-ai" />
            Avaliação privada
          </SheetTitle>
          <SheetDescription>
            Esta avaliação <strong>não será visível</strong> para {v.name}. Será usada apenas para a
            IA recomendar (ou não) este voluntário em ações futuras.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Volunteer header */}
          <div className="flex items-center gap-3 rounded-2xl bg-muted p-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-hero text-primary-foreground font-bold">
              {v.initials}
            </div>
            <div>
              <p className="font-semibold">{v.name}</p>
              <p className="text-xs text-muted-foreground">
                {v.completedActions} ações · {v.skills.join(" · ")}
              </p>
            </div>
          </div>

          {/* Star rating */}
          <div>
            <Label className="text-xs">Quão bem ele(a) cumpriu o combinado?</Label>
            <div className="mt-2 flex gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  className={cn(
                    "rounded-lg p-1.5 transition",
                    n <= rating ? "text-warning" : "text-muted-foreground hover:text-warning/60",
                  )}
                  aria-label={`${n} estrela${n > 1 ? "s" : ""}`}
                >
                  <Star className={cn("h-7 w-7", n <= rating && "fill-warning")} />
                </button>
              ))}
            </div>
          </div>

          {/* Reliability slider visual */}
          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Recomendaria para outras ações?</Label>
              <span className="text-xs font-bold text-ai">
                {rating >= 4
                  ? "Sim, com certeza"
                  : rating === 3
                    ? "Talvez"
                    : rating > 0
                      ? "Não recomendo"
                      : "—"}
              </span>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {[
                {
                  v: "yes",
                  label: "Sim",
                  color: "text-success border-success/40 hover:bg-success/5",
                },
                {
                  v: "maybe",
                  label: "Talvez",
                  color: "text-warning border-warning/40 hover:bg-warning/5",
                },
                {
                  v: "no",
                  label: "Não",
                  color: "text-destructive border-destructive/40 hover:bg-destructive/5",
                },
              ].map((opt) => (
                <button
                  key={opt.v}
                  type="button"
                  className={cn(
                    "rounded-xl border-2 p-3 text-sm font-semibold transition",
                    opt.color,
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <Label className="text-xs flex items-center gap-1">
              <Plus className="h-3 w-3" /> Tags de competência (privadas)
            </Label>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {TAG_OPTIONS.map((t) => {
                const active = tags.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleTag(t)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs transition",
                      active
                        ? "border-ai bg-ai text-ai-foreground"
                        : "border-border bg-card hover:border-ai/50",
                    )}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Comment */}
          <div>
            <Label className="text-xs">Notas privadas (opcional)</Label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Observações que ajudarão a IA a entender o desempenho…"
              className="mt-1.5 min-h-24"
            />
          </div>

          {/* AI impact preview */}
          <div className="rounded-xl border border-ai/30 bg-ai/5 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-ai flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Impacto na IA
            </p>
            <p className="mt-1.5 text-sm">
              {rating >= 4
                ? `Score de confiabilidade aumentará. ${v.name.split(" ")[0]} terá prioridade em ações similares.`
                : rating === 3
                  ? "Sem impacto significativo na recomendação."
                  : rating > 0
                    ? `Score de confiabilidade reduzirá. A IA evitará recomendar para ações de alta criticidade.`
                    : "Selecione uma nota para ver o impacto."}
            </p>
          </div>

          <Button className="w-full bg-gradient-ai text-ai-foreground" disabled={rating === 0}>
            Salvar avaliação privada
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
