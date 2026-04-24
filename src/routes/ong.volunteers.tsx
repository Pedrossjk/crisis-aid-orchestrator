import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { matchedVolunteers, type Volunteer } from "@/lib/mock-data";
import { MapPin, Star, Check, X, MessageCircle, Sparkles, Lock, Shield, Award, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/ong/volunteers")({
  head: () => ({
    meta: [
      { title: "Voluntários — ONG · Orquestra" },
      { name: "description", content: "Gerencie candidatos, voluntários ativos e avaliações privadas que alimentam a IA." },
    ],
  }),
  component: VolunteersPage,
});

const TAG_OPTIONS = ["Pontual", "Líder natural", "Comunicativo(a)", "Resiliente", "Calmo(a) sob pressão", "Veículo próprio", "Profissional certificado(a)", "Precisou de orientação"];

function VolunteersPage() {
  return (
    <AppShell role="ong">
      <h1 className="text-2xl font-bold md:text-3xl">Voluntários</h1>
      <p className="mt-1 text-muted-foreground">Gerencie candidatos, ativos e avaliações pós-ação.</p>

      {/* Privacy banner */}
      <div className="mt-5 flex items-start gap-3 rounded-2xl border border-ai/30 bg-ai/5 p-4">
        <Shield className="h-5 w-5 text-ai mt-0.5 shrink-0" />
        <div className="text-sm">
          <p className="font-semibold text-foreground">Avaliações privadas alimentam a IA</p>
          <p className="text-muted-foreground mt-0.5">
            Suas avaliações <strong>não são exibidas</strong> aos voluntários. Elas são usadas apenas para que a IA
            recomende os melhores perfis para cada ação.
          </p>
        </div>
      </div>

      <Tabs defaultValue="all" className="mt-6">
        <TabsList>
          <TabsTrigger value="all">Todos (24)</TabsTrigger>
          <TabsTrigger value="pending">Pendentes (8)</TabsTrigger>
          <TabsTrigger value="active">Ativos (12)</TabsTrigger>
          <TabsTrigger value="completed">Concluídos (4)</TabsTrigger>
        </TabsList>

        <div className="mt-4 mb-3">
          <Input placeholder="Buscar voluntário…" className="max-w-md" />
        </div>

        <TabsContent value="all" className="space-y-3">
          {[...matchedVolunteers, ...matchedVolunteers].map((v, i) => (
            <VolunteerRow key={i} volunteer={v} index={i} status="active" />
          ))}
        </TabsContent>
        <TabsContent value="pending" className="space-y-3">
          {matchedVolunteers.slice(0, 2).map((v, i) => <VolunteerRow key={i} volunteer={v} index={i} status="pending" />)}
        </TabsContent>
        <TabsContent value="active" className="space-y-3">
          {matchedVolunteers.map((v, i) => <VolunteerRow key={i} volunteer={v} index={i} status="active" />)}
        </TabsContent>
        <TabsContent value="completed" className="space-y-3">
          {matchedVolunteers.slice(0, 3).map((v, i) => <VolunteerRow key={i} volunteer={v} index={i} status="completed" />)}
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function VolunteerRow({ volunteer: v, index: i, status }: { volunteer: Volunteer; index: number; status: "pending" | "active" | "completed" }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/60 bg-card p-4 shadow-soft">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-hero text-primary-foreground font-bold">
        {v.initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold">{v.name}</p>
          {i < 3 && <span className="rounded-full bg-ai/10 px-2 py-0.5 text-[10px] font-bold text-ai flex items-center gap-0.5"><Sparkles className="h-2.5 w-2.5" />{v.matchScore}%</span>}
          {v.reliability && v.reliability >= 90 && (
            <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-bold text-success flex items-center gap-0.5">
              <Award className="h-2.5 w-2.5" /> Top performer
            </span>
          )}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" /> {v.distanceKm}km</span>
          <span className="flex items-center gap-0.5"><Star className="h-3 w-3 fill-warning text-warning" /> {v.rating}</span>
          <span>{v.skills.join(" · ")}</span>
          <span>{v.completedActions} ações</span>
        </div>
        {/* Internal-only tags */}
        {v.internalTags && v.internalTags.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1 items-center">
            <Lock className="h-3 w-3 text-ai" />
            {v.internalTags.map((t) => (
              <span key={t} className="rounded-md bg-ai/10 px-1.5 py-0.5 text-[10px] font-medium text-ai">{t}</span>
            ))}
          </div>
        )}
      </div>
      <div className="flex gap-1 ml-auto">
        {status === "completed" ? (
          <ReviewSheet volunteer={v} />
        ) : (
          <>
            <Button size="icon" variant="outline" aria-label="Mensagem"><MessageCircle className="h-4 w-4" /></Button>
            {status === "pending" && (
              <>
                <Button size="icon" variant="outline" className="text-destructive" aria-label="Recusar"><X className="h-4 w-4" /></Button>
                <Button size="icon" className="bg-success hover:bg-success/90" aria-label="Aceitar"><Check className="h-4 w-4" /></Button>
              </>
            )}
            {status === "active" && (
              <ReviewSheet volunteer={v} />
            )}
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

  const toggleTag = (t: string) => setTags((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);

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
            Esta avaliação <strong>não será visível</strong> para {v.name}. Será usada apenas para a IA recomendar
            (ou não) este voluntário em ações futuras.
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
              <p className="text-xs text-muted-foreground">{v.completedActions} ações · {v.skills.join(" · ")}</p>
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
                    n <= rating ? "text-warning" : "text-muted-foreground hover:text-warning/60"
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
              <span className="text-xs font-bold text-ai">{rating >= 4 ? "Sim, com certeza" : rating === 3 ? "Talvez" : rating > 0 ? "Não recomendo" : "—"}</span>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {[
                { v: "yes", label: "Sim", color: "text-success border-success/40 hover:bg-success/5" },
                { v: "maybe", label: "Talvez", color: "text-warning border-warning/40 hover:bg-warning/5" },
                { v: "no", label: "Não", color: "text-destructive border-destructive/40 hover:bg-destructive/5" },
              ].map((opt) => (
                <button
                  key={opt.v}
                  type="button"
                  className={cn("rounded-xl border-2 p-3 text-sm font-semibold transition", opt.color)}
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
                      active ? "border-ai bg-ai text-ai-foreground" : "border-border bg-card hover:border-ai/50"
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
