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
  Camera,
  Loader2,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { actions } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

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
  const { user, loading: authLoading, setAvatarUrl: setGlobalAvatarUrl } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [profile, setProfile] = useState({
    name: "",
    city: "",
    bio: "",
    avatarUrl: "",
  });
  const [skills, setSkills] = useState<string[]>([]);
  const [draft, setDraft] = useState(profile);
  const [draftSkills, setDraftSkills] = useState<string[]>([]);
  const [newDraftSkill, setNewDraftSkill] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  // Load profile from Supabase
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoadingProfile(false);
      return;
    }
    (async () => {
      setLoadingProfile(true);
      try {
        const [{ data: profileData }, { data: volunteerData }] = await Promise.all([
          supabase
            .from("profiles")
            .select("full_name,city,state,bio,avatar_url")
            .eq("id", user.id)
            .maybeSingle(),
          supabase.from("volunteers").select("skills").eq("id", user.id).maybeSingle(),
        ]);
        const fullName = profileData?.full_name ?? user.user_metadata?.full_name ?? "";
        const city = [profileData?.city, profileData?.state].filter(Boolean).join(", ");
        setProfile({
          name: fullName,
          city: city,
          bio: profileData?.bio ?? "",
          avatarUrl: profileData?.avatar_url ?? "",
        });
        setSkills(volunteerData?.skills ?? []);
      } finally {
        setLoadingProfile(false);
      }
    })();
  }, [user, authLoading]);

  function openEdit() {
    setDraft(profile);
    setDraftSkills([...skills]);
    setNewDraftSkill("");
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!user) return;
    setSavingProfile(true);
    setSaveError(null);
    try {
      const [cityName, stateName] = draft.city.split(",").map((s) => s.trim());

      const { error: profileErr } = await supabase.from("profiles").upsert(
        {
          id: user.id,
          full_name: draft.name || null,
          city: cityName || null,
          state: stateName || null,
          bio: draft.bio || null,
        },
        { onConflict: "id" },
      );

      if (profileErr) throw profileErr;

      const { error: volunteerErr } = await supabase
        .from("volunteers")
        .upsert({ id: user.id, skills: draftSkills }, { onConflict: "id" });

      if (volunteerErr) throw volunteerErr;

      // Re-busca do banco para confirmar o que foi realmente persistido
      const [{ data: profileData }, { data: volunteerData }] = await Promise.all([
        supabase
          .from("profiles")
          .select("full_name,city,state,bio,avatar_url")
          .eq("id", user.id)
          .maybeSingle(),
        supabase.from("volunteers").select("skills").eq("id", user.id).maybeSingle(),
      ]);
      const fullName = profileData?.full_name ?? user.user_metadata?.full_name ?? "";
      const city = [profileData?.city, profileData?.state].filter(Boolean).join(", ");
      setProfile({
        name: fullName,
        city,
        bio: profileData?.bio ?? "",
        avatarUrl: profileData?.avatar_url ?? "",
      });
      setSkills(volunteerData?.skills ?? []);
      setEditOpen(false);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Erro ao salvar. Tente novamente.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingAvatar(true);
    setAvatarError(null);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/avatar.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      const avatarUrl = urlData.publicUrl + `?t=${Date.now()}`;
      const { error: profileErr } = await supabase
        .from("profiles")
        .update({ avatar_url: avatarUrl })
        .eq("id", user.id);
      if (profileErr) throw profileErr;
      setProfile((p) => ({ ...p, avatarUrl }));
      setDraft((d) => ({ ...d, avatarUrl }));
      setGlobalAvatarUrl(avatarUrl);
    } catch (e) {
      setAvatarError(e instanceof Error ? e.message : "Erro ao enviar foto.");
    } finally {
      setUploadingAvatar(false);
    }
  }

  function addDraftSkill() {
    const s = newDraftSkill.trim();
    if (s && !draftSkills.includes(s)) {
      setDraftSkills((prev) => [...prev, s]);
    }
    setNewDraftSkill("");
  }

  const displayName = profile.name || user?.user_metadata?.full_name || "Usuário";
  const initials = displayName
    .split(" ")
    .slice(0, 2)
    .map((w: string) => w[0])
    .join("")
    .toUpperCase();

  return (
    <AppShell role="volunteer">
      {/* Hidden file input for avatar */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handleAvatarChange}
      />

      {/* Edit Profile Sheet */}
      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>Editar perfil</SheetTitle>
          </SheetHeader>
          <div className="space-y-5">
            {/* Avatar upload */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                {draft.avatarUrl ? (
                  <img
                    src={draft.avatarUrl}
                    alt="Avatar"
                    className="h-20 w-20 rounded-2xl object-cover"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-hero text-2xl font-bold text-primary-foreground">
                    {(draft.name || displayName)
                      .split(" ")
                      .slice(0, 2)
                      .map((w: string) => w[0])
                      .join("")
                      .toUpperCase()}
                  </div>
                )}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-card border border-border shadow hover:bg-muted transition"
                  aria-label="Alterar foto"
                >
                  {uploadingAvatar ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                  ) : (
                    <Camera className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">Toque para alterar foto de perfil</p>
              {avatarError && <p className="text-xs text-destructive text-center">{avatarError}</p>}
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
              <Button
                className="flex-1 bg-gradient-hero"
                onClick={saveEdit}
                disabled={savingProfile}
              >
                {savingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar alterações
              </Button>
            </div>
            {saveError && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {saveError}
              </p>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {loadingProfile ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="bg-gradient-hero px-5 pt-5 pb-4 text-primary-foreground shadow-elegant">
            {/* Avatar + nome + edit */}
            <div className="flex items-start gap-4">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={displayName}
                  className="h-16 w-16 shrink-0 rounded-2xl object-cover ring-2 ring-white/20"
                />
              ) : (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-xl font-bold">
                  {initials}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h1 className="text-xl font-bold leading-tight break-words">{displayName}</h1>
                  <button
                    onClick={openEdit}
                    className="shrink-0 flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-semibold hover:bg-white/20 transition"
                  >
                    <Pencil className="h-3 w-3" /> Editar
                  </button>
                </div>
                {profile.city && (
                  <p className="mt-1 text-sm opacity-90 flex items-center gap-1">
                    <MapPin className="h-3 w-3 shrink-0" /> {profile.city}
                  </p>
                )}
                {profile.bio && (
                  <p className="mt-1 text-xs opacity-80 line-clamp-2 leading-relaxed">{profile.bio}</p>
                )}
              </div>
            </div>
            {/* Stats */}
            <div className="mt-4 flex items-center gap-6">
              <div>
                <p className="text-2xl font-bold">23</p>
                <p className="text-xs opacity-80">Ações</p>
              </div>
              <div className="h-8 w-px bg-white/20" />
              <div>
                <p className="text-2xl font-bold">147h</p>
                <p className="text-xs opacity-80">Voluntariado</p>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-soft">
              <h2 className="font-bold flex items-center gap-2">
                <Bookmark className="h-4 w-4 text-primary" /> Ações Salvas
              </h2>
              <div className="mt-3 space-y-2">
                {actions.slice(0, 3).map((a) => (
                  <Link
                    key={a.id}
                    to="/volunteer/action/$actionId"
                    params={{ actionId: a.id }}
                    className="flex items-start gap-2.5 rounded-xl bg-muted/60 px-3 py-2.5 transition hover:bg-muted group"
                  >
                    <div
                      className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${a.urgency === "high" ? "bg-urgent" : a.urgency === "medium" ? "bg-warning" : "bg-success"}`}
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
            </div>
            <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-soft">
              <h2 className="font-bold flex items-center gap-2">
                <Wrench className="h-4 w-4 text-primary" /> Habilidades
              </h2>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {skills.length > 0 ? (
                  skills.map((s) => (
                    <span
                      key={s}
                      className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                    >
                      {s}
                    </span>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">Nenhuma habilidade cadastrada.</p>
                )}
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
                  <span className="text-xs font-bold flex items-center gap-0.5">
                    <Star className="h-3 w-3 fill-warning text-warning" />
                    {h.s}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <Button onClick={openEdit} variant="outline" className="mt-6 w-full gap-2">
            <Pencil className="h-4 w-4" /> Editar perfil
          </Button>
        </>
      )}
    </AppShell>
  );
}
