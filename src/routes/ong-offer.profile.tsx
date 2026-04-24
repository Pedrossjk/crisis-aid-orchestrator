import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Building2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/ong-offer/profile")({
  head: () => ({ meta: [{ title: "Perfil — ONG oferece · Orquestra" }, { name: "description", content: "Perfil institucional." }] }),
  component: Profile,
});

function Profile() {
  return (
    <AppShell role="ong-offer">
      <div className="rounded-3xl bg-gradient-ai p-6 text-ai-foreground shadow-elegant">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20"><Building2 className="h-8 w-8" /></div>
          <div>
            <h1 className="text-2xl font-bold">Mercado Solidário</h1>
            <p className="text-sm opacity-90 flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> Curitiba, PR · Verificada ✓</p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2 text-center">
          <div><p className="text-2xl font-bold">12</p><p className="text-xs opacity-80">Recursos</p></div>
          <div><p className="text-2xl font-bold">47</p><p className="text-xs opacity-80">ONGs parceiras</p></div>
          <div><p className="text-2xl font-bold">128</p><p className="text-xs opacity-80">Matches feitos</p></div>
        </div>
      </div>
      <Button variant="outline" className="mt-6 w-full">Editar perfil</Button>
    </AppShell>
  );
}
