import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Users, Building2, HeartHandshake, ArrowRight, ArrowLeft, Check, MapPin, Clock, Sparkles, Wrench, Car, Loader2, Phone, Globe, Target, HandHeart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Onboarding — Orquestra" },
      { name: "description", content: "Cadastre-se na Orquestra: voluntário, ONG ou doador. Formulário inteligente em 3 passos." },
    ],
  }),
  component: Onboarding,
});

type Role = "volunteer" | "ong";

const helpOptions = [
  { id: "money", label: "Dinheiro", icon: "💰" },
  { id: "food", label: "Alimentos", icon: "🍲" },
  { id: "transport", label: "Transporte", icon: "🚗" },
  { id: "service", label: "Serviços", icon: "🛠" },
  { id: "shelter", label: "Abrigo", icon: "🏠" },
  { id: "medical", label: "Saúde", icon: "🩺" },
];

const skillOptions = ["Cozinhar", "Dirigir", "Atendimento", "TI", "Saúde", "Construção", "Tradução", "Logística"];
const resourceOptions = ["Carro", "Caminhão", "Ferramentas", "Espaço físico", "Computador", "Equipamentos médicos"];

// Opções específicas para ONGs
const ongAreaOptions = ["Assistência social", "Saúde", "Educação", "Meio ambiente", "Direitos humanos", "Desastres naturais", "Habitação", "Segurança alimentar"];
const ongCapacityOptions = ["1–5 voluntários por ação", "6–20 voluntários por ação", "21–50 voluntários", "Mais de 50 voluntários"];
const ongOfferOptions = [
  { id: "food", label: "Alimentação", icon: "🍲" },
  { id: "shelter", label: "Abrigo", icon: "🏠" },
  { id: "medical", label: "Atendimento médico", icon: "🩺" },
  { id: "transport", label: "Transporte", icon: "🚗" },
  { id: "service", label: "Serviços técnicos", icon: "🛠" },
  { id: "supplies", label: "Mantimentos", icon: "📦" },
];
const ongNeedOptions = [
  { id: "money", label: "Recursos financeiros", icon: "💰" },
  { id: "transport", label: "Veículos/Transporte", icon: "🚌" },
  { id: "service", label: "Mão de obra voluntária", icon: "🤝" },
  { id: "supplies", label: "Doações de itens", icon: "📦" },
  { id: "medical", label: "Profissionais de saúde", icon: "👨‍⚕️" },
  { id: "food", label: "Alimentos", icon: "🥫" },
];

function Onboarding() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [step, setStep] = useState(0);
  const [role, setRole] = useState<Role | null>(null);
  const [help, setHelp] = useState<string[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [resources, setResources] = useState<string[]>([]);
  // Campos do formulário do passo 1 (controlados para enviar ao banco)
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [availability, setAvailability] = useState<string[]>([]);
  // ONG-specific fields
  const [ongName, setOngName] = useState("");
  const [ongCnpj, setOngCnpj] = useState("");
  const [ongDescription, setOngDescription] = useState("");
  const [ongWebsite, setOngWebsite] = useState("");
  const [ongAreas, setOngAreas] = useState<string[]>([]);
  const [ongCapacity, setOngCapacity] = useState("");
  const [ongOffers, setOngOffers] = useState<string[]>([]);
  const [ongNeeds, setOngNeeds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Se não estiver autenticado, manda para /auth (signup) antes do onboarding
  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: "/auth" });
    }
  }, [authLoading, user, navigate]);

  const toggle = (arr: string[], v: string, set: (a: string[]) => void) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  // Persiste todo o onboarding no Supabase e redireciona conforme o role
  const finish = async () => {
    if (!user || !role) return;
    setSaving(true);
    setSaveError(null);

    try {
      // 1) Atualiza o perfil base (criado pelo trigger handle_new_user)
      const [cityName, stateName] = city.split("/").map((s) => s.trim());
      const { error: profileErr } = await supabase
        .from("profiles")
        .update({
          full_name: (role === "ong" ? ongName : name) || null,
          phone: phone || null,
          city: cityName || null,
          state: stateName || null,
        })
        .eq("id", user.id);
      if (profileErr) throw profileErr;

      // 2) Garante o role na tabela user_roles (chave: volunteer | ngo)
      const dbRole = role === "ong" ? "ngo" : "volunteer";
      await supabase
        .from("user_roles")
        .upsert({ user_id: user.id, role: dbRole }, { onConflict: "user_id,role" });

      // 3) Cria o registro específico do tipo de usuário
      if (role === "volunteer") {
        await supabase.from("volunteers").upsert({
          id: user.id,
          skills,
          help_types: help,
          resources,
          availability,
        });
        navigate({ to: "/volunteer" });
      } else {
        // ONG - salva dados completos do onboarding
        await supabase.from("ngos").upsert(
          {
            owner_id: user.id,
            name: ongName || name || "Minha ONG",
            cnpj: ongCnpj || null,
            description: ongDescription || null,
            city: cityName || null,
            state: stateName || null,
            offers: ongOffers as never[],
            needs: ongNeeds as never[],
          },
          { onConflict: "owner_id" }
        );
        navigate({ to: "/ong" });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao salvar dados";
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
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
        <p className="text-xs text-muted-foreground">Passo {step + 1} de 4</p>
      </header>

      {/* Progress */}
      <div className="mx-auto max-w-3xl px-4">
        <div className="flex gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={cn("h-1.5 flex-1 rounded-full transition-all", i <= step ? "bg-primary" : "bg-muted")} />
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-8 md:py-12">
        {/* Step 0: Role */}
        {step === 0 && (
          <div>
            <h1 className="text-3xl font-bold md:text-4xl">Como você quer participar?</h1>
            <p className="mt-2 text-muted-foreground">Escolha o seu papel na rede de ajuda.</p>

            <div className="mt-8 space-y-3">
              {[
                { id: "volunteer", icon: Users, title: "Sou voluntário", desc: "Quero doar tempo, habilidades ou recursos pessoais para causas próximas a mim.", color: "bg-primary" },
                { id: "ong", icon: Building2, title: "Represento uma ONG", desc: "Minha instituição precisa de apoio, oferece recursos a outras ONGs — ou ambos.", color: "bg-success" },
              ].map((r) => {
                const Icon = r.icon;
                const active = role === r.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => setRole(r.id as Role)}
                    className={cn(
                      "flex w-full items-center gap-4 rounded-2xl border-2 p-5 text-left transition-all",
                      active ? "border-primary bg-primary/5 shadow-elegant" : "border-border bg-card hover:border-primary/40"
                    )}
                  >
                    <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white", r.color)}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold">{r.title}</p>
                      <p className="text-sm text-muted-foreground">{r.desc}</p>
                    </div>
                    {active && <Check className="h-5 w-5 text-primary" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 1: Basic info */}
        {step === 1 && (
          <div>
            <h1 className="text-3xl font-bold md:text-4xl">
              {role === "ong" ? "Sobre sua organização" : "Conte um pouco sobre você"}
            </h1>
            <p className="mt-2 text-muted-foreground">
              {role === "ong" ? "Informações básicas da sua ONG." : "Suas informações básicas para conexão."}
            </p>

            <div className="mt-8 space-y-4">
              {role === "ong" ? (
                <>
                  <div>
                    <Label htmlFor="ong-name">Nome da ONG <span className="text-destructive">*</span></Label>
                    <Input id="ong-name" value={ongName} onChange={(e) => setOngName(e.target.value)} placeholder="Instituto Solidário" className="mt-1.5" />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="ong-cnpj">CNPJ</Label>
                      <Input id="ong-cnpj" value={ongCnpj} onChange={(e) => setOngCnpj(e.target.value)} placeholder="00.000.000/0001-00" className="mt-1.5" />
                    </div>
                    <div>
                      <Label htmlFor="ong-phone"><Phone className="inline h-3.5 w-3.5 mr-1" />Telefone</Label>
                      <Input id="ong-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(00) 00000-0000" className="mt-1.5" />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="ong-desc">Descrição da ONG</Label>
                    <Textarea id="ong-desc" value={ongDescription} onChange={(e) => setOngDescription(e.target.value)} placeholder="Descreva a missão e atividades da sua organização…" className="mt-1.5 resize-none" rows={3} />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="ong-website"><Globe className="inline h-3.5 w-3.5 mr-1" />Website</Label>
                      <Input id="ong-website" value={ongWebsite} onChange={(e) => setOngWebsite(e.target.value)} placeholder="https://suaong.org.br" className="mt-1.5" />
                    </div>
                    <div>
                      <Label htmlFor="ong-loc"><MapPin className="inline h-3.5 w-3.5 mr-1" />Localização</Label>
                      <Input id="ong-loc" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Cidade / Estado" className="mt-1.5" />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <Label htmlFor="name">Nome completo</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Maria Silva" className="mt-1.5" />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="email">E-mail</Label>
                      <Input id="email" type="email" value={user?.email ?? ""} disabled placeholder="maria@email.com" className="mt-1.5" />
                    </div>
                    <div>
                      <Label htmlFor="phone">WhatsApp</Label>
                      <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(00) 00000-0000" className="mt-1.5" />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="loc"><MapPin className="inline h-3.5 w-3.5 mr-1" />Localização</Label>
                    <Input id="loc" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Cidade / Estado" className="mt-1.5" />
                  </div>
                  <div>
                    <Label><Clock className="inline h-3.5 w-3.5 mr-1" />Disponibilidade</Label>
                    <div className="mt-1.5 flex flex-wrap gap-2">
                      {["Manhãs", "Tardes", "Noites", "Fins de semana", "Plantão"].map((d) => {
                        const active = availability.includes(d);
                        return (
                          <button
                            key={d}
                            type="button"
                            onClick={() => toggle(availability, d, setAvailability)}
                            className={cn(
                              "rounded-full border px-3 py-1.5 text-sm transition",
                              active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/40"
                            )}
                          >
                            {d}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Help types & skills (volunteer) / Áreas e capacidade (ONG) */}
        {step === 2 && role === "volunteer" && (
          <div>
            <h1 className="text-3xl font-bold md:text-4xl">Como você pode ajudar?</h1>
            <p className="mt-2 text-muted-foreground">Selecione tudo que se aplica. A IA usará isso para te recomendar ações.</p>

            <div className="mt-8 space-y-6">
              <div>
                <p className="mb-3 text-sm font-semibold">Tipos de ajuda</p>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                  {helpOptions.map((h) => {
                    const active = help.includes(h.id);
                    return (
                      <button
                        key={h.id}
                        onClick={() => toggle(help, h.id, setHelp)}
                        className={cn(
                          "flex items-center gap-2 rounded-xl border-2 p-3 text-sm font-medium transition",
                          active ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"
                        )}
                      >
                        <span className="text-lg">{h.icon}</span>
                        {h.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="mb-3 text-sm font-semibold flex items-center gap-1.5"><Wrench className="h-4 w-4" />Habilidades</p>
                <div className="flex flex-wrap gap-2">
                  {skillOptions.map((s) => {
                    const active = skills.includes(s);
                    return (
                      <button
                        key={s}
                        onClick={() => toggle(skills, s, setSkills)}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-sm transition",
                          active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/40"
                        )}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="mb-3 text-sm font-semibold flex items-center gap-1.5"><Car className="h-4 w-4" />Recursos disponíveis</p>
                <div className="flex flex-wrap gap-2">
                  {resourceOptions.map((r) => {
                    const active = resources.includes(r);
                    return (
                      <button
                        key={r}
                        onClick={() => toggle(resources, r, setResources)}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-sm transition",
                          active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/40"
                        )}
                      >
                        {r}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: ONG — Áreas de atuação e capacidade */}
        {step === 2 && role === "ong" && (
          <div>
            <h1 className="text-3xl font-bold md:text-4xl">Áreas de atuação</h1>
            <p className="mt-2 text-muted-foreground">
              Essas informações ajudam a IA a conectar sua ONG com as crises mais relevantes.
            </p>

            <div className="mt-8 space-y-7">
              <div>
                <p className="mb-3 text-sm font-semibold flex items-center gap-1.5">
                  <Target className="h-4 w-4" /> Áreas de atuação da ONG
                </p>
                <div className="flex flex-wrap gap-2">
                  {ongAreaOptions.map((a) => {
                    const active = ongAreas.includes(a);
                    return (
                      <button
                        key={a}
                        type="button"
                        onClick={() => toggle(ongAreas, a, setOngAreas)}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-sm transition",
                          active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/40"
                        )}
                      >
                        {a}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="mb-3 text-sm font-semibold flex items-center gap-1.5">
                  <Users className="h-4 w-4" /> Capacidade de voluntários por ação
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {ongCapacityOptions.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setOngCapacity(c)}
                      className={cn(
                        "rounded-xl border-2 p-3 text-sm font-medium text-left transition",
                        ongCapacity === c ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"
                      )}
                    >
                      {ongCapacity === c && <Check className="mb-1 h-3.5 w-3.5 text-primary" />}
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: ONG — O que oferece e o que precisa */}
        {step === 3 && role === "ong" && (
          <div>
            <h1 className="text-3xl font-bold md:text-4xl">Ofertas e necessidades</h1>
            <p className="mt-2 text-muted-foreground">
              Isso permite a IA identificar oportunidades de match entre ONGs e recursos disponíveis.
            </p>

            <div className="mt-8 space-y-7">
              <div>
                <p className="mb-3 text-sm font-semibold flex items-center gap-1.5">
                  <HandHeart className="h-4 w-4 text-success" /> O que sua ONG oferece
                </p>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                  {ongOfferOptions.map((o) => {
                    const active = ongOffers.includes(o.id);
                    return (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => toggle(ongOffers, o.id, setOngOffers)}
                        className={cn(
                          "flex items-center gap-2 rounded-xl border-2 p-3 text-sm font-medium transition",
                          active ? "border-success bg-success/5" : "border-border bg-card hover:border-success/40"
                        )}
                      >
                        <span className="text-lg">{o.icon}</span>
                        {o.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="mb-3 text-sm font-semibold flex items-center gap-1.5">
                  <HeartHandshake className="h-4 w-4 text-primary" /> Do que sua ONG precisa
                </p>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                  {ongNeedOptions.map((o) => {
                    const active = ongNeeds.includes(o.id);
                    return (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => toggle(ongNeeds, o.id, setOngNeeds)}
                        className={cn(
                          "flex items-center gap-2 rounded-xl border-2 p-3 text-sm font-medium transition",
                          active ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"
                        )}
                      >
                        <span className="text-lg">{o.icon}</span>
                        {o.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3 (volunteer only): Tudo pronto! */}
        {step === 3 && role === "volunteer" && (
          <div className="py-8 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-ai shadow-glow">
              <Sparkles className="h-10 w-10 text-ai-foreground" />
            </div>
            <h1 className="mt-6 text-3xl font-bold md:text-4xl">Tudo pronto!</h1>
            <p className="mt-3 text-muted-foreground">
              Nossa IA já está analisando seu perfil e encontrando as melhores oportunidades para você.
            </p>

            <div className="mx-auto mt-8 max-w-md rounded-2xl border border-ai/30 bg-ai/5 p-5 text-left">
              <p className="text-xs font-bold uppercase tracking-wider text-ai">Análise inicial</p>
              <ul className="mt-3 space-y-2 text-sm">
                <li className="flex items-start gap-2"><Check className="h-4 w-4 text-success mt-0.5" /> 12 ações compatíveis encontradas</li>
                <li className="flex items-start gap-2"><Check className="h-4 w-4 text-success mt-0.5" /> 3 crises ativas na sua região</li>
                <li className="flex items-start gap-2"><Check className="h-4 w-4 text-success mt-0.5" /> Match score médio: 87%</li>
              </ul>
            </div>
          </div>
        )}

        {/* Step 3 (ONG): Ofertas e necessidades is rendered above — nav shows "Criar conta da ONG" */}

        {/* Nav */}
        {saveError && (
          <p className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{saveError}</p>
        )}
        <div className="mt-10 flex items-center justify-between gap-3">
          <Button variant="ghost" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0 || saving}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
          </Button>
          {/* Volunteer: show "Continuar" until step 3, then "Acessar"; ONG: show "Continuar" until step 3, then "Acessar" */}
          {step < 3 ? (
            <Button onClick={() => setStep(step + 1)} disabled={step === 0 && !role} className="bg-gradient-hero shadow-soft">
              Continuar <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={finish} disabled={saving} className="bg-gradient-hero shadow-elegant">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {role === "ong" ? "Criar conta da ONG" : "Acessar plataforma"} {!saving && <ArrowRight className="ml-1 h-4 w-4" />}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
