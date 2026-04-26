import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { matchedVolunteers, type Volunteer } from "@/lib/mock-data";
import { MapPin, Star, Check, X, MessageCircle, Sparkles, Lock, Shield, Award, Plus, Send, Loader2, ChevronRight, Clock, User, CheckCircle2, Search, ExternalLink } from "lucide-react";
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

  const [chatVol, setChatVol] = useState<Volunteer | null>(null);
  const [volMsgs, setVolMsgs] = useState<{ id: string; own: boolean; content: string; time: Date }[]>([]);
  const [volInput, setVolInput] = useState("");
  const [sendingVol, setSendingVol] = useState(false);

  // Perfil do voluntário
  type VolProfile = {
    id: string;
    full_name: string;
    city: string | null;
    state: string | null;
    bio: string | null;
    avatar_url: string | null;
    help_types: string[] | null;
    skills: string[] | null;
    reliability: number | null;
    rating: number | null;
    completed_actions: number | null;
  };
  const [profileApp, setProfileApp] = useState<Application | null>(null);
  const [volProfile, setVolProfile] = useState<VolProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const openProfile = async (app: Application) => {
    setProfileApp(app);
    setVolProfile(null);
    setLoadingProfile(true);
    const [profileRes, volRes] = await Promise.all([
      supabase.from("profiles").select("id, full_name, city, state, bio, avatar_url").eq("id", app.volunteer_id).maybeSingle(),
      supabase.from("volunteers").select("id, help_types, skills, reliability, rating, completed_actions").eq("id", app.volunteer_id).maybeSingle(),
    ]);
    setVolProfile({
      id: app.volunteer_id,
      full_name: profileRes.data?.full_name ?? app.volunteer_name,
      city: profileRes.data?.city ?? null,
      state: profileRes.data?.state ?? null,
      bio: profileRes.data?.bio ?? null,
      avatar_url: profileRes.data?.avatar_url ?? null,
      help_types: (volRes.data?.help_types as string[] | null) ?? null,
      skills: (volRes.data?.skills as string[] | null) ?? null,
      reliability: (volRes.data?.reliability as number | null) ?? null,
      rating: (volRes.data?.rating as number | null) ?? null,
      completed_actions: (volRes.data?.completed_actions as number | null) ?? null,
    });
    setLoadingProfile(false);
  };

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
    await Promise.all([
      supabase.from("action_applications").update({ status: "accepted" }).eq("id", app.id),
      // Marca a ação como em andamento quando o primeiro voluntário é aceito
      supabase.from("crisis_actions").update({ status: "in_progress" }).eq("id", app.action_id).eq("status", "open"),
    ]);
    setApplications((prev) =>
      prev.map((a) => (a.id === app.id ? { ...a, status: "accepted" } : a)),
    );
    loadChat({ ...app, status: "accepted" });
  };

  const handleComplete = async (app: Application) => {
    await Promise.all([
      supabase.from("action_applications").update({ status: "rejected" /* reusing as closed */ }).eq("id", app.id),
      supabase.from("crisis_actions").update({ status: "completed" }).eq("id", app.action_id),
    ]);
    setApplications((prev) =>
      prev.map((a) => (a.id === app.id ? { ...a, status: "rejected" } : a)),
    );
    setChatApp(null);
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

  const openVolChat = (v: Volunteer) => {
    setChatVol(v);
    setVolMsgs([]);
    setVolInput("");
  };

  const sendVolMsg = () => {
    if (!volInput.trim() || sendingVol) return;
    const content = volInput.trim();
    setVolInput("");
    setSendingVol(true);
    setVolMsgs((prev) => [
      ...prev,
      { id: crypto.randomUUID(), own: true, content, time: new Date() },
    ]);
    setSendingVol(false);
  };

  // Voluntários únicos do banco (aba Todos)
  const [allVolunteers, setAllVolunteers] = useState<{ id: string; name: string; initials: string; action_title: string; completed_actions: number; rating: number | null }[]>([]);
  useEffect(() => {
    supabase
      .from("action_applications")
      .select("volunteer_id, volunteer_name, volunteer_initials, action_title")
      .eq("status", "accepted")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (!data) return;
        // Deduplica por volunteer_id
        const seen = new Set<string>();
        const unique = data.filter((r) => { if (seen.has(r.volunteer_id)) return false; seen.add(r.volunteer_id); return true; });
        setAllVolunteers(unique.map((r) => ({
          id: r.volunteer_id as string,
          name: r.volunteer_name as string,
          initials: r.volunteer_initials as string,
          action_title: r.action_title as string,
          completed_actions: 0,
          rating: null,
        })));
      });
  }, [applications]); // re-fetch whenever applications change

  const [volSearch, setVolSearch] = useState("");

  const vq = volSearch.trim().toLowerCase();
  const pendingApps  = applications.filter((a) => a.status === "pending"  && (!vq || a.volunteer_name.toLowerCase().includes(vq) || a.action_title.toLowerCase().includes(vq)));
  const acceptedApps = applications.filter((a) => a.status === "accepted" && (!vq || a.volunteer_name.toLowerCase().includes(vq) || a.action_title.toLowerCase().includes(vq)));
  const filteredAllVols = allVolunteers.filter((v) => !vq || v.name.toLowerCase().includes(vq) || v.action_title.toLowerCase().includes(vq));

  return (
    <AppShell role="ong">
      <h1 className="text-2xl font-bold md:text-3xl">Voluntários</h1>
      <p className="mt-1 text-muted-foreground">
        Gerencie candidatos, ativos e avaliações pós-ação.
      </p>

      {/* Privacy banner */}
      <div className="mt-5 flex items-start gap-3 border border-ai/30 bg-ai/5 p-4">
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
          <TabsTrigger value="pending" className="relative">
            Pendentes
            {pendingApps.length > 0 && (
              <Badge className="ml-1.5 h-4 min-w-4 px-1 text-[10px] bg-urgent text-urgent-foreground">
                {pendingApps.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="accepted">
            Aceitos
            {acceptedApps.length > 0 && (
              <span className="ml-1.5 rounded-full bg-success/15 px-1.5 py-0.5 text-[10px] font-bold text-success">
                {acceptedApps.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="all">Todos os voluntários</TabsTrigger>
          <TabsTrigger value="completed">Concluídos</TabsTrigger>
        </TabsList>
        <div className="mt-4 mb-3">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Buscar voluntário…"
              className="pl-9"
              value={volSearch}
              onChange={(e) => setVolSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Pendentes via Supabase */}
        <TabsContent value="pending" className="mt-4 space-y-3">
          {loadingApps ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : pendingApps.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <CheckCircle2 className="mx-auto h-10 w-10 opacity-30" />
              <p className="mt-3 font-medium">Nenhuma solicitação pendente</p>
              <p className="text-sm">Todas as solicitações foram processadas.</p>
            </div>
          ) : (
            pendingApps.map((app) => (
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
                  <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => openProfile(app)}>
                    <User className="mr-1 h-3.5 w-3.5" /> Ver perfil
                  </Button>
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

        {/* ── Aba Aceitos ── */}
        <TabsContent value="accepted" className="mt-4 space-y-3">
          {acceptedApps.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <CheckCircle2 className="mx-auto h-10 w-10 opacity-30" />
              <p className="mt-3 font-medium">Nenhum voluntário aceito ainda</p>
            </div>
          ) : (
            acceptedApps.map((app) => (
              <div key={app.id} className="border border-border/60 bg-card p-4 shadow-soft space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-hero text-primary-foreground font-bold text-sm">
                    {app.volunteer_initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold">{app.volunteer_name}</p>
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-bold bg-success/15 text-success">Aceito</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {app.action_title}
                    </p>
                    {app.message && (
                      <p className="mt-2 text-sm text-muted-foreground bg-muted rounded-lg px-3 py-2">{app.message}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => openProfile(app)}>
                    <User className="mr-1 h-3.5 w-3.5" /> Ver perfil
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => loadChat(app)}>
                    <MessageCircle className="mr-1 h-3.5 w-3.5" /> Chat
                    <ChevronRight className="ml-1 h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-3">
          {allVolunteers.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <User className="mx-auto h-10 w-10 opacity-30" />
              <p className="mt-3 font-medium">Nenhum voluntário ativo ainda</p>
            </div>
          ) : filteredAllVols.map((v) => (
            <div key={v.id} className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-4 shadow-soft">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-hero text-primary-foreground font-bold">
                {v.initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold">{v.name}</p>
                <p className="text-xs text-muted-foreground truncate">{v.action_title}</p>
              </div>
            </div>
          ))}
        </TabsContent>
        <TabsContent value="completed" className="space-y-3">
          {matchedVolunteers.slice(0, 3).map((v, i) => (
            <VolunteerRow key={i} volunteer={v} index={i} status="completed" onChat={openVolChat} />
          ))}
        </TabsContent>
      </Tabs>

      {/* Sheet — Perfil do voluntário */}
      <Sheet open={!!profileApp} onOpenChange={(open) => { if (!open) { setProfileApp(null); setVolProfile(null); } }}>
        <SheetContent side="right" className="sm:max-w-md overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle className="flex items-center gap-2">
              <User className="h-4 w-4 text-primary" /> Perfil do voluntário
            </SheetTitle>
            {profileApp && <SheetDescription className="text-xs truncate">{profileApp.action_title}</SheetDescription>}
          </SheetHeader>
          {loadingProfile ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : volProfile ? (
            <div className="space-y-5">
              {/* Avatar + nome */}
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-hero text-2xl font-bold text-primary-foreground shrink-0">
                  {volProfile.avatar_url
                    ? <img src={volProfile.avatar_url} alt="" className="h-full w-full rounded-2xl object-cover" />
                    : profileApp?.volunteer_initials ?? volProfile.full_name.charAt(0)}
                </div>
                <div>
                  <p className="text-lg font-bold">{volProfile.full_name}</p>
                  {(volProfile.city || volProfile.state) && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" /> {[volProfile.city, volProfile.state].filter(Boolean).join(", ")}
                    </p>
                  )}
                </div>
              </div>

              {/* Bio */}
              {volProfile.bio && (
                <p className="text-sm text-muted-foreground leading-relaxed">{volProfile.bio}</p>
              )}

              {/* Estatísticas */}
              <div className="grid grid-cols-3 gap-3">
                {volProfile.rating != null && (
                  <div className="rounded-xl bg-muted p-3 text-center">
                    <Star className="mx-auto h-4 w-4 text-warning" />
                    <p className="mt-1 font-bold">{volProfile.rating.toFixed(1)}</p>
                    <p className="text-[10px] text-muted-foreground">Avaliação</p>
                  </div>
                )}
                {volProfile.completed_actions != null && (
                  <div className="rounded-xl bg-muted p-3 text-center">
                    <CheckCircle2 className="mx-auto h-4 w-4 text-success" />
                    <p className="mt-1 font-bold">{volProfile.completed_actions}</p>
                    <p className="text-[10px] text-muted-foreground">Ações</p>
                  </div>
                )}
                {volProfile.reliability != null && (
                  <div className="rounded-xl bg-muted p-3 text-center">
                    <Shield className="mx-auto h-4 w-4 text-primary" />
                    <p className="mt-1 font-bold">{volProfile.reliability}%</p>
                    <p className="text-[10px] text-muted-foreground">Confiabilidade</p>
                  </div>
                )}
              </div>

              {/* Habilidades */}
              {volProfile.skills && volProfile.skills.length > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Habilidades</p>
                  <div className="flex flex-wrap gap-1.5">
                    {volProfile.skills.map((s) => (
                      <span key={s} className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Tipos de ajuda */}
              {volProfile.help_types && volProfile.help_types.length > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Tipos de ajuda</p>
                  <div className="flex flex-wrap gap-1.5">
                    {volProfile.help_types.map((t) => (
                      <span key={t} className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium capitalize">{t}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Ações de aceitar/rejeitar se ainda pendente */}
              {profileApp?.status === "pending" && (
                <div className="flex gap-2 pt-2 border-t border-border/60">
                  <Button variant="outline" className="flex-1 text-destructive" onClick={() => { handleReject(profileApp.id); setProfileApp(null); }}>
                    <X className="mr-1 h-3.5 w-3.5" /> Recusar
                  </Button>
                  <Button className="flex-1 bg-success hover:bg-success/90 text-white" onClick={() => { handleAccept(profileApp); setProfileApp(null); }}>
                    <Check className="mr-1 h-3.5 w-3.5" /> Aceitar
                  </Button>
                </div>
              )}
              {profileApp?.status === "accepted" && (
                <Button className="w-full" variant="outline" onClick={() => { loadChat(profileApp); setProfileApp(null); }}>
                  <MessageCircle className="mr-1 h-4 w-4" /> Abrir chat
                </Button>
              )}
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* Chat Sheet — voluntários mock */}
      <Sheet open={!!chatVol} onOpenChange={(open) => { if (!open) setChatVol(null); }}>
        <SheetContent side="right" className="flex flex-col sm:max-w-md p-0">
          <SheetHeader className="p-5 border-b">
            <SheetTitle className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-primary" />
              Chat com {chatVol?.name}
            </SheetTitle>
            <SheetDescription className="text-xs">
              {chatVol?.skills.join(" · ")}
            </SheetDescription>
          </SheetHeader>

          {/* Mensagens */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {volMsgs.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">
                Nenhuma mensagem ainda. Envie uma para começar!
              </p>
            )}
            {volMsgs.map((msg) => (
              <div key={msg.id} className={cn("flex", msg.own ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm shadow-soft",
                    msg.own
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-card border border-border/60 rounded-bl-sm",
                  )}
                >
                  <p>{msg.content}</p>
                  <p className={cn("text-[10px] mt-1 opacity-60", msg.own ? "text-right" : "")}>
                    {msg.time.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="border-t p-4 flex gap-2">
            <Input
              placeholder="Escreva uma mensagem…"
              value={volInput}
              onChange={(e) => setVolInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendVolMsg();
                }
              }}
              className="flex-1"
            />
            <Button
              size="icon"
              onClick={sendVolMsg}
              disabled={sendingVol || !volInput.trim()}
              className="bg-gradient-hero shrink-0"
            >
              {sendingVol ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

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

          {/* Finalizar ação */}
          {chatApp && (
            <div className="px-4 pt-3 pb-0">
              <Button
                size="sm"
                variant="outline"
                className="w-full text-success border-success/40 hover:bg-success/10"
                onClick={() => handleComplete(chatApp)}
              >
                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Finalizar ação — marcar como concluída
              </Button>
            </div>
          )}
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
  onChat,
}: {
  volunteer: Volunteer;
  index: number;
  status: "pending" | "active" | "completed";
  onChat?: (v: Volunteer) => void;
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
          <>
            <ProfileSheet volunteer={v} onChat={onChat} />
            <ReviewSheet volunteer={v} />
          </>
        ) : (
          <>
            <ProfileSheet volunteer={v} onChat={onChat} />
            <Button size="icon" variant="outline" aria-label="Mensagem" onClick={() => onChat?.(v)}>
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

function ProfileSheet({ volunteer: v, onChat }: { volunteer: Volunteer; onChat?: (v: Volunteer) => void }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button size="icon" variant="outline" aria-label="Ver perfil">
          <User className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <User className="h-4 w-4 text-primary" /> Perfil do voluntário
          </SheetTitle>
          <SheetDescription className="sr-only">Informações detalhadas do voluntário</SheetDescription>
        </SheetHeader>

        <div className="mt-5 space-y-5">
          {/* Header */}
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-hero text-primary-foreground font-bold text-xl">
              {v.initials}
            </div>
            <div className="flex-1">
              <p className="text-xl font-bold">{v.name}</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                <span className="rounded-full bg-ai/10 px-2.5 py-1 text-xs font-bold text-ai flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> {v.matchScore}% match
                </span>
                {v.reliability && v.reliability >= 90 && (
                  <span className="rounded-full bg-success/10 px-2.5 py-1 text-xs font-bold text-success flex items-center gap-1">
                    <Award className="h-3 w-3" /> Top performer
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-border/60 bg-muted/30 p-3 text-center">
              <p className="text-lg font-bold">{v.rating}</p>
              <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-0.5">
                <Star className="h-3 w-3 fill-warning text-warning" /> Avaliação
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/30 p-3 text-center">
              <p className="text-lg font-bold">{v.completedActions}</p>
              <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-0.5">
                <CheckCircle2 className="h-3 w-3" /> Ações
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/30 p-3 text-center">
              <p className="text-lg font-bold">{v.distanceKm}km</p>
              <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-0.5">
                <MapPin className="h-3 w-3" /> Distância
              </p>
            </div>
          </div>

          {/* Skills */}
          <div>
            <p className="text-[11px] font-medium uppercase text-muted-foreground">Habilidades</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {v.skills.map((s) => (
                <span key={s} className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">{s}</span>
              ))}
            </div>
          </div>

          {/* Internal tags */}
          {v.internalTags && v.internalTags.length > 0 && (
            <div className="rounded-xl border border-ai/20 bg-ai/5 p-4">
              <p className="text-[11px] font-medium uppercase text-ai flex items-center gap-1">
                <Lock className="h-3 w-3" /> Tags privadas (só sua ONG vê)
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {v.internalTags.map((t) => (
                  <span key={t} className="rounded-full bg-ai/15 px-2.5 py-1 text-xs font-medium text-ai">{t}</span>
                ))}
              </div>
            </div>
          )}

          {/* Reliability */}
          {v.reliability !== undefined && (
            <div>
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-medium uppercase text-muted-foreground flex items-center gap-1">
                  <Lock className="h-3 w-3" /> Score de confiabilidade (IA)
                </p>
                <span className={cn(
                  "text-sm font-bold",
                  v.reliability >= 90 ? "text-success" : v.reliability >= 70 ? "text-warning" : "text-destructive"
                )}>{v.reliability}%</span>
              </div>
              <div className="mt-1.5 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    v.reliability >= 90 ? "bg-success" : v.reliability >= 70 ? "bg-warning" : "bg-destructive"
                  )}
                  style={{ width: `${v.reliability}%` }}
                />
              </div>
            </div>
          )}

          {/* Last review */}
          {v.lastReview && (
            <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
              <p className="text-[11px] font-medium uppercase text-muted-foreground flex items-center gap-1">
                <Lock className="h-3 w-3" /> Última avaliação privada
              </p>
              <div className="mt-2 flex items-center gap-2">
                {[1,2,3,4,5].map((n) => (
                  <Star key={n} className={cn("h-4 w-4", n <= v.lastReview!.rating ? "fill-warning text-warning" : "text-muted-foreground/30")} />
                ))}
                <span className="text-xs text-muted-foreground ml-1">— {v.lastReview.org}</span>
              </div>
              <p className="mt-2 text-sm italic text-muted-foreground">"{v.lastReview.comment}"</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{v.lastReview.date}</p>
            </div>
          )}

          {/* Actions */}
          {onChat && (
            <SheetTrigger asChild>
              <Button
                variant="outline"
                className="w-full gap-1.5"
                onClick={() => onChat(v)}
              >
                <MessageCircle className="h-4 w-4" /> Enviar mensagem
              </Button>
            </SheetTrigger>
          )}
        </div>
      </SheetContent>
    </Sheet>
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
