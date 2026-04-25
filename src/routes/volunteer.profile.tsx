import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import {
  Bookmark,
  MapPin,
  Wrench,
  Star,
  CheckCircle2,
  Pencil,
  Plus,
  X,
  HeartHandshake,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { actions } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";

export const Route = createFileRoute("/volunteer/profile")({
  head: () => ({
    meta: [
      { title: "Perfil — Voluntário · Orquestra" },
      { name: "description", content: "Seu perfil de voluntário, histórico e habilidades." },
    ],
  }),
  component: VolunteerProfile,
});

function VolunteerProfile() {
  const [editOpen, setEditOpen] = useState(false);
  const [profile, setProfile] = useState({
    name: "Vitória Camargo",
    city: "Blumenau, SC",
    bio: "",
  });
  const [skills, setSkills] = useState(["Cozinhar", "Logística", "Atendimento", "Direção"]);
  const [draft, setDraft] = useState(profile);
  const [draftSkills, setDraftSkills] = useState(skills);
  const [newDraftSkill, setNewDraftSkill] = useState("");

  function openEdit() {
    setDraft(profile);
    setDraftSkills([...skills]);
    setNewDraftSkill("");
    setEditOpen(true);
  }

  function saveEdit() {
    setProfile(draft);
    setSkills(draftSkills);
    setEditOpen(false);
  }

  function addDraftSkill() {
    const s = newDraftSkill.trim();
    if (s && !draftSkills.includes(s)) {
      setDraftSkills((prev) => [...prev, s]);
    }
    setNewDraftSkill("");
  }

  const initials = profile.name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <AppShell role="volunteer">
      {/* Edit Profile Sheet */}
      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>Editar perfil</SheetTitle>
          </SheetHeader>
          <div className="space-y-5">
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-hero text-2xl font-bold text-primary-foreground">
                  {draft.name
                    .split(" ")
                    .slice(0, 2)
                    .map((w) => w[0])
                    .join("")
                    .toUpperCase()}
                </div>
                <button className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-card border border-border shadow">
                  <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground">Toque para alterar foto</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-name">Nome completo</Label>
              <Input
                id="edit-name"
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-city">Cidade / Estado</Label>
              <Input
                id="edit-city"
                value={draft.city}
                onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value }))}
                placeholder="Ex: São Paulo, SP"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-bio">Bio</Label>
              <Input
                id="edit-bio"
                value={draft.bio}
                onChange={(e) => setDraft((d) => ({ ...d, bio: e.target.value }))}
                placeholder="Conte um pouco sobre você…"
              />
            </div>

            <div className="space-y-2">
              <Label>Habilidades</Label>
              <div className="flex flex-wrap gap-1.5">
                {draftSkills.map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center gap-1 rounded-full bg-primary/10 pl-3 pr-1.5 py-1 text-xs font-medium text-primary"
                  >
                    {s}
                    <button
                      type="button"
                      onClick={() => setDraftSkills((prev) => prev.filter((x) => x !== s))}
                      aria-label={`Remover ${s}`}
                      className="rounded-full p-0.5 hover:bg-primary/20 transition"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Nova habilidade…"
                  value={newDraftSkill}
                  onChange={(e) => setNewDraftSkill(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addDraftSkill())}
                  className="text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={addDraftSkill}
                  aria-label="Adicionar habilidade"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setEditOpen(false)}>
                Cancelar
              </Button>
              <Button className="flex-1 bg-gradient-hero" onClick={saveEdit}>
                Salvar alterações
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <div className="bg-gradient-hero p-6 text-primary-foreground shadow-elegant">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 text-2xl font-bold">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold">{profile.name}</h1>
            <p className="text-sm opacity-90 flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> {profile.city}
            </p>
            {profile.bio && <p className="mt-1 text-xs opacity-80 line-clamp-2">{profile.bio}</p>}
          </div>
          <div className="grid grid-cols-2 gap-10 text-center">
            <div>
              <p className="text-2xl font-bold">23</p>
              <p className="text-xs opacity-80">Ações</p>
            </div>
            <div>
              <p className="text-2xl font-bold">147h</p>
              <p className="text-xs opacity-80">Voluntariado</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5">
        <button
          onClick={openEdit}
          className="shrink-0 flex items-center gap-1.5 rounded-xl bg-white/15 px-3 py-2 text-xs font-semibold hover:bg-white/25 transition"
        >
          <Pencil className="h-3.5 w-3.5" /> Editar Perfil
        </button>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-soft">
          <h2 className="font-bold flex items-center gap-2">
            <Bookmark className="h-4 w-4 text-primary" /> Ações Salvas
          </h2>
          {actions.slice(0, 3).length === 0 ? (
            <p className="mt-3 text-xs text-muted-foreground">Nenhuma ação salva ainda.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {actions.slice(0, 3).map((a) => (
                <Link
                  key={a.id}
                  to="/volunteer/action/$actionId"
                  params={{ actionId: a.id }}
                  className="flex items-start gap-2.5 rounded-xl bg-muted/60 px-3 py-2.5 transition hover:bg-muted group"
                >
                  <div
                    className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${
                      a.urgency === "high"
                        ? "bg-urgent"
                        : a.urgency === "medium"
                          ? "bg-warning"
                          : "bg-success"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold leading-tight truncate group-hover:text-primary transition-colors">
                      {a.title}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground truncate">
                      {a.org} · {a.distanceKm} km
                    </p>
                  </div>
                  <HeartHandshake className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                </Link>
              ))}
            </div>
          )}
        </div>
        <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-soft">
          <h2 className="font-bold flex items-center gap-2">
            <Wrench className="h-4 w-4 text-primary" /> Habilidades
          </h2>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {skills.map((s) => (
              <span
                key={s}
                className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-border/60 bg-card p-5 shadow-soft">
        <h2 className="font-bold">Histórico recente</h2>
        <div className="mt-3 space-y-3">
          {[
            { t: "Distribuição de água — Petrópolis", d: "Concluída há 5 dias", s: "5.0" },
            { t: "Triagem de doações — Blumenau", d: "Concluída há 2 semanas", s: "4.8" },
            { t: "Cozinha solidária — Joinville", d: "Concluída há 1 mês", s: "5.0" },
          ].map((h) => (
            <div
              key={h.t}
              className="flex items-center justify-between gap-3 border-b border-border/40 pb-3 last:border-0"
            >
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <div>
                  <p className="text-sm font-semibold">{h.t}</p>
                  <p className="text-xs text-muted-foreground">{h.d}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Button onClick={openEdit} variant="outline" className="mt-6 w-full gap-2">
        <Pencil className="h-4 w-4" /> Editar perfil
      </Button>
    </AppShell>
  );
}
