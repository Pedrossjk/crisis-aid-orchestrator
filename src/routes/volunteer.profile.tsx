import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Award, MapPin, Wrench, Star, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/volunteer/profile")({
  head: () => ({ meta: [{ title: "Perfil — Voluntário · Orquestra" }, { name: "description", content: "Seu perfil de voluntário, histórico e habilidades." }] }),
  component: VolunteerProfile,
});

function VolunteerProfile() {
  return (
    <AppShell role="volunteer">
      <div className="bg-gradient-hero p-6 text-primary-foreground shadow-elegant">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 text-2xl font-bold">VC</div>
          <div>
            <h1 className="text-2xl font-bold">Vitória Camargo</h1>
            <p className="text-sm opacity-90 flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> Blumenau, SC</p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2 text-center">
          <div><p className="text-2xl font-bold">23</p><p className="text-xs opacity-80">Ações</p></div>
          <div><p className="text-2xl font-bold">147h</p><p className="text-xs opacity-80">Voluntariado</p></div>
          <div className="flex flex-col items-center"><p className="text-2xl font-bold flex items-center gap-1"><Star className="h-4 w-4 fill-current" />4.9</p><p className="text-xs opacity-80">Avaliação</p></div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-soft">
          <h2 className="font-bold flex items-center gap-2"><Wrench className="h-4 w-4 text-primary" /> Habilidades</h2>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {["Cozinhar", "Logística", "Atendimento", "Direção"].map((s) => (
              <span key={s} className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">{s}</span>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-soft">
          <h2 className="font-bold flex items-center gap-2"><Award className="h-4 w-4 text-warning" /> Conquistas</h2>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {["🏆", "❤️", "⭐", "🌟"].map((e, i) => (
              <div key={i} className="aspect-square rounded-xl bg-muted flex items-center justify-center text-2xl">{e}</div>
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
            <div key={h.t} className="flex items-center justify-between gap-3 border-b border-border/40 pb-3 last:border-0">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <div>
                  <p className="text-sm font-semibold">{h.t}</p>
                  <p className="text-xs text-muted-foreground">{h.d}</p>
                </div>
              </div>
              <span className="text-xs font-bold flex items-center gap-0.5"><Star className="h-3 w-3 fill-warning text-warning" />{h.s}</span>
            </div>
          ))}
        </div>
      </div>

      <Button variant="outline" className="mt-6 w-full">Editar perfil</Button>
    </AppShell>
  );
}
