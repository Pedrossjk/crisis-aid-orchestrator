import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Building2, MapPin, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/ong-need/profile")({
  head: () => ({ meta: [{ title: "Perfil ONG — Orquestra" }, { name: "description", content: "Perfil da instituição." }] }),
  component: OngProfile,
});

function OngProfile() {
  return (
    <AppShell role="ong-need">
      <div className="rounded-3xl bg-gradient-to-br from-success to-primary p-6 text-white shadow-elegant">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20"><Building2 className="h-8 w-8" /></div>
          <div>
            <h1 className="text-2xl font-bold">Cruz Verde Brasil</h1>
            <p className="text-sm opacity-90 flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> Blumenau, SC · Verificada ✓</p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2 text-center">
          <div><p className="text-2xl font-bold">147</p><p className="text-xs opacity-80">Ações</p></div>
          <div><p className="text-2xl font-bold">2.3k</p><p className="text-xs opacity-80">Pessoas ajudadas</p></div>
          <div><p className="text-2xl font-bold flex items-center justify-center gap-1"><Star className="h-4 w-4 fill-current" />4.9</p><p className="text-xs opacity-80">Reputação</p></div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border/60 bg-card p-5 shadow-soft">
        <h2 className="font-bold">Sobre nós</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Atuamos há 12 anos em resposta a desastres naturais, com foco em distribuição de alimentos,
          abrigo e suporte médico em comunidades afetadas.
        </p>
      </div>

      <Button variant="outline" className="mt-6 w-full">Editar perfil institucional</Button>
    </AppShell>
  );
}
