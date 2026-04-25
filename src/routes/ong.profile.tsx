import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Building2, MapPin, Star, BadgeCheck, Pencil, Camera, Loader2, X, Plus, Globe, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/ong/profile")({
  head: () => ({ meta: [{ title: "Perfil ONG — Orquestra" }, { name: "description", content: "Perfil da instituição na Orquestra." }] }),
  component: OngProfile,
});

function OngProfile() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [profile, setProfile] = useState({
    name: "",
    city: "",
    description: "",
    website: "",
    phone: "",
    avatarUrl: "",
  });
  const [areas, setAreas] = useState<string[]>([]);
  const [draft, setDraft] = useState(profile);
  const [draftAreas, setDraftAreas] = useState<string[]>([]);
  const [newArea, setNewArea] = useState("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoadingProfile(true);
      const [{ data: profileData }, { data: ongData }] = await Promise.all([
        supabase.from("profiles").select("full_name,city,state,phone,avatar_url").eq("id", user.id).maybeSingle(),
        supabase.from("ngos").select("name,description,city,state,website,offers").eq("owner_id", user.id).maybeSingle(),
      ]);
      const city = [ongData?.city ?? profileData?.city, ongData?.state ?? profileData?.state].filter(Boolean).join(", ");
      setProfile({
        name: ongData?.name ?? profileData?.full_name ?? "",
        city,
        description: ongData?.description ?? "",
        website: ongData?.website ?? "",
        phone: profileData?.phone ?? "",
        avatarUrl: profileData?.avatar_url ?? "",
      });
      setAreas((ongData?.offers as string[]) ?? []);
      setLoadingProfile(false);
    })();
  }, [user]);

  function openEdit() {
    setDraft(profile);
    setDraftAreas([...areas]);
    setNewArea("");
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!user) return;
    setSavingProfile(true);
    const [cityName, stateName] = draft.city.split(",").map((s) => s.trim());
    await Promise.all([
      supabase.from("profiles").update({
        full_name: draft.name || null,
        city: cityName || null,
        state: stateName || null,
        phone: draft.phone || null,
      }).eq("id", user.id),
      supabase.from("ngos").update({
        name: draft.name || null,
        description: draft.description || null,
        city: cityName || null,
        state: stateName || null,
        website: draft.website || null,
        offers: draftAreas as never[],
      }).eq("owner_id", user.id),
    ]);
    setProfile(draft);
    setAreas(draftAreas);
    setSavingProfile(false);
    setEditOpen(false);
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingAvatar(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (!upErr) {
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      const avatarUrl = urlData.publicUrl + `?t=${Date.now()}`;
      await supabase.from("profiles").update({ avatar_url: avatarUrl }).eq("id", user.id);
      setProfile((p) => ({ ...p, avatarUrl }));
      setDraft((d) => ({ ...d, avatarUrl }));
    }
    setUploadingAvatar(false);
  }

  function addArea() {
    const s = newArea.trim();
    if (s && !draftAreas.includes(s)) setDraftAreas((prev) => [...prev, s]);
    setNewArea("");
  }

  const displayName = profile.name || (user?.user_metadata?.full_name as string | undefined) || "Minha ONG";
  const initials = displayName.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();

  return (
    <AppShell role="ong">
      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleAvatarChange} />

      {/* Edit Sheet */}
      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>Editar perfil institucional</SheetTitle>
          </SheetHeader>
          <div className="space-y-5">
            {/* Avatar */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                {draft.avatarUrl ? (
                  <img src={draft.avatarUrl} alt="Logo" className="h-20 w-20 rounded-2xl object-cover" />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-success to-primary text-2xl font-bold text-white">
                    {initials}
                  </div>
                )}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-card border border-border shadow hover:bg-muted transition"
                  aria-label="Alterar logo"
                >
                  {uploadingAvatar ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" /> : <Camera className="h-3.5 w-3.5 text-muted-foreground" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">Toque para alterar logo da ONG</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ong-edit-name">Nome da ONG</Label>
              <Input id="ong-edit-name" value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ong-edit-city">Cidade / Estado</Label>
              <Input id="ong-edit-city" value={draft.city} onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value }))} placeholder="Ex: Blumenau, SC" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ong-edit-desc">Sobre nós</Label>
              <Textarea id="ong-edit-desc" value={draft.description} onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} placeholder="Descreva a missão e atividades da sua organização…" rows={4} className="resize-none" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ong-edit-website"><Globe className="inline h-3.5 w-3.5 mr-1" />Website</Label>
              <Input id="ong-edit-website" value={draft.website} onChange={(e) => setDraft((d) => ({ ...d, website: e.target.value }))} placeholder="https://suaong.org.br" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ong-edit-phone"><Phone className="inline h-3.5 w-3.5 mr-1" />Telefone</Label>
              <Input id="ong-edit-phone" value={draft.phone} onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))} placeholder="(00) 00000-0000" />
            </div>

            <div className="space-y-2">
              <Label>Áreas de atuação</Label>
              <div className="flex flex-wrap gap-1.5">
                {draftAreas.map((a) => (
                  <span key={a} className="inline-flex items-center gap-1 rounded-full bg-primary/10 pl-3 pr-1.5 py-1 text-xs font-medium text-primary">
                    {a}
                    <button type="button" onClick={() => setDraftAreas((prev) => prev.filter((x) => x !== a))} className="rounded-full p-0.5 hover:bg-primary/20 transition" aria-label={`Remover ${a}`}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <Input placeholder="Nova área…" value={newArea} onChange={(e) => setNewArea(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addArea())} className="text-sm" />
                <Button type="button" variant="outline" size="icon" onClick={addArea} aria-label="Adicionar área"><Plus className="h-4 w-4" /></Button>
              </div>
            </div>

            <Button onClick={saveEdit} disabled={savingProfile} className="w-full bg-gradient-hero shadow-elegant">
              {savingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar alterações
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {loadingProfile ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          {/* Header */}
          <div className="bg-gradient-to-br from-success to-primary p-6 text-white shadow-elegant rounded-2xl">
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt="Logo" className="h-16 w-16 rounded-2xl object-cover" />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 text-xl font-bold">
                    {initials}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold truncate">{displayName}</h1>
                <p className="text-sm opacity-90 flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  {profile.city || "Localização não informada"} · Verificada <BadgeCheck className="h-3.5 w-3.5 shrink-0" />
                </p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-4 gap-2 text-center">
              <div><p className="text-2xl font-bold">147</p><p className="text-xs opacity-80">Ações</p></div>
              <div><p className="text-2xl font-bold">2.3k</p><p className="text-xs opacity-80">Pessoas</p></div>
              <div><p className="text-2xl font-bold">47</p><p className="text-xs opacity-80">Parcerias</p></div>
              <div><p className="text-2xl font-bold flex items-center justify-center gap-1"><Star className="h-4 w-4 fill-current" />4.9</p><p className="text-xs opacity-80">Reputação</p></div>
            </div>
          </div>

          {/* Sobre nós */}
          <div className="mt-6 rounded-2xl border border-border/60 bg-card p-5 shadow-soft">
            <h2 className="font-bold">Sobre nós</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {profile.description || "Nenhuma descrição cadastrada."}
            </p>
            {(profile.website || profile.phone) && (
              <div className="mt-3 space-y-1">
                {profile.website && (
                  <a href={profile.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                    <Globe className="h-3.5 w-3.5" /> {profile.website}
                  </a>
                )}
                {profile.phone && (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" /> {profile.phone}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Áreas */}
          <div className="mt-4 rounded-2xl border border-border/60 bg-card p-5 shadow-soft">
            <h2 className="font-bold">Áreas de atuação</h2>
            {areas.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {areas.map((t) => (
                  <span key={t} className="rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-medium">{t}</span>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">Nenhuma área cadastrada.</p>
            )}
          </div>

          <Button onClick={openEdit} variant="outline" className="mt-6 w-full gap-2">
            <Pencil className="h-4 w-4" /> Editar perfil institucional
          </Button>
        </>
      )}
    </AppShell>
  );
}

