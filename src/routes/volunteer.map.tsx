import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { MapPin, Navigation, Layers, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect, useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { urgencyLabels, helpTypeLabels, type CrisisAction, type HelpType, type Urgency } from "@/lib/mock-data";
import { Clock, Users, Flame, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useRecommendedActionIds } from "@/hooks/use-agent";
import { haversineKm, distanceToScore, cityToCoords } from "@/lib/matching";

export const Route = createFileRoute("/volunteer/map")({
  head: () => ({ meta: [{ title: "Mapa — Voluntário · Orquestra" }, { name: "description", content: "Veja ações de voluntariado próximas no mapa." }] }),
  component: VolunteerMap,
});

const urgencyStyles: Record<string, string> = {
  high: "bg-urgent text-urgent-foreground",
  medium: "bg-warning text-warning-foreground",
  low: "bg-success text-success-foreground",
};

// Coordenadas de cada ação carregadas do banco
type ActionWithCoords = CrisisAction & { lat?: number; lon?: number };

function ActionPreviewSheet({ action, open, onClose, userCoords }: {
  action: ActionWithCoords | null;
  open: boolean;
  onClose: () => void;
  userCoords: { lat: number; lon: number } | null;
}) {
  if (!action) return null;

  // Recalcula distância na hora com as coords mais recentes
  const distKm = userCoords && action.lat != null && action.lon != null
    ? parseFloat(haversineKm(userCoords.lat, userCoords.lon, action.lat, action.lon).toFixed(1))
    : action.distanceKm > 0 ? action.distanceKm : null;

  const filledPct = (action.volunteersJoined / action.volunteersNeeded) * 100;
  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl pb-8 max-h-[85vh] overflow-y-auto">
        <SheetHeader className="mb-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase", urgencyStyles[action.urgency])}>
              {action.urgency === "high" && <Flame className="h-3 w-3" />}
              {urgencyLabels[action.urgency]}
            </span>
            {action.isAiRecommended && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gradient-ai px-2.5 py-1 text-[10px] font-bold uppercase text-ai-foreground">
                <Sparkles className="h-3 w-3" /> Recomendada pela IA
              </span>
            )}
          </div>
          <SheetTitle className="text-xl font-bold leading-snug mt-1">{action.title}</SheetTitle>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-hero text-xs font-bold text-primary-foreground shrink-0">
              {action.orgAvatar}
            </div>
            <div>
              <p className="text-sm font-semibold">{action.org}</p>
              <p className="text-xs text-muted-foreground">Postado {action.postedAgo}</p>
            </div>
          </div>
        </SheetHeader>

        <p className="text-sm text-muted-foreground leading-relaxed">{action.description}</p>

        <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
          <div className="rounded-xl bg-muted p-3">
            <MapPin className="h-4 w-4 text-primary" />
            <p className="mt-1 font-semibold">{distKm != null ? `${distKm} km` : "—"}</p>
            <p className="text-xs text-muted-foreground">{action.location}</p>
          </div>
          <div className="rounded-xl bg-muted p-3">
            <Clock className="h-4 w-4 text-primary" />
            <p className="mt-1 font-semibold">{action.effort}</p>
            <p className="text-xs text-muted-foreground">Esforço</p>
          </div>
          <div className="rounded-xl bg-muted p-3">
            <Users className="h-4 w-4 text-primary" />
            <p className="mt-1 font-semibold">{action.volunteersJoined}/{action.volunteersNeeded}</p>
            <p className="text-xs text-muted-foreground">Voluntários</p>
          </div>
        </div>

        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-gradient-hero" style={{ width: `${filledPct}%` }} />
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">{Math.round(filledPct)}% das vagas preenchidas</p>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {action.helpTypes.map((t) => (
            <span key={t} className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {helpTypeLabels[t]}
            </span>
          ))}
        </div>

        <div className="mt-5 flex gap-3">
          <Button asChild className="flex-1 bg-gradient-hero shadow-elegant" size="lg">
            <Link to="/volunteer/action/$actionId" params={{ actionId: action.id }} onClick={onClose}>
              Ver detalhes completos <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Converte offset em graus para % na viewport do mapa fictício.
// Escala: 1° ≈ 111 km → mapa 600px wide representa ~600km → 1° ≈ 1px? Não.
// Usamos escala relativa: ±3° lat/lon = ±45% do mapa (≈ 330km de raio visível)
function coordToPercent(
  lat: number, lon: number,
  centerLat: number, centerLon: number
): { left: string; top: string } | null {
  const dLat = lat - centerLat;
  const dLon = lon - centerLon;
  const scale = 14; // graus visíveis cobertos em 100% do mapa
  const left = 50 + (dLon / scale) * 100;
  const top  = 50 - (dLat / scale) * 100;
  if (left < 3 || left > 97 || top < 3 || top > 97) return null; // fora do viewport
  return { left: `${left.toFixed(1)}%`, top: `${top.toFixed(1)}%` };
}

function VolunteerMap() {
  const { user } = useAuth();
  const [selectedAction, setSelectedAction] = useState<ActionWithCoords | null>(null);
  const [dbActions, setDbActions] = useState<ActionWithCoords[]>([]);
  const [userCoords, setUserCoords] = useState<{ lat: number; lon: number } | null>(null);
  // Fallback: centro de SC caso GPS negado
  const CENTER_LAT = -27.5;
  const CENTER_LON = -50.0;

  const { recommendedIds } = useRecommendedActionIds(user?.id ?? null);

  // GPS do usuário; fallback para cidade do perfil se negado/timeout
  useEffect(() => {
    if (!user?.id) return;

    const tryGps = () => {
      if (!navigator.geolocation) { tryCity(); return; }
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        () => tryCity(),
        { timeout: 5000 }
      );
    };

    const tryCity = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("city")
        .eq("id", user!.id)
        .maybeSingle();
      const coords = cityToCoords(data?.city);
      if (coords) setUserCoords({ lat: coords[0], lon: coords[1] });
    };

    tryGps();
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Carrega ações do banco com coordenadas
  useEffect(() => {
    supabase
      .from("crisis_actions")
      .select("id, title, description, location, latitude, longitude, urgency, effort, help_types, volunteers_needed, volunteers_joined, status, created_at, ngos!inner(name, initials)")
      .in("status", ["open", "in_progress"])
      .then(({ data }) => {
        if (!data) return;
        const now = new Date();
        setDbActions(
          data.map((row) => {
            const ngo = (row as { ngos?: { name?: string; initials?: string } }).ngos;
            const diffH = Math.floor((now.getTime() - new Date(row.created_at as string).getTime()) / 3_600_000);
            const latLon = row.latitude != null && row.longitude != null
              ? { lat: row.latitude as number, lon: row.longitude as number }
              : (() => { const c = cityToCoords(row.location as string); return c ? { lat: c[0], lon: c[1] } : null; })();
            return {
              id:               row.id as string,
              title:            row.title as string,
              description:      (row.description as string) ?? "",
              org:              ngo?.name ?? "ONG",
              orgAvatar:        ngo?.initials ?? "NG",
              location:         (row.location as string) ?? "",
              distanceKm:       0,
              urgency:          row.urgency as Urgency,
              effort:           (row.effort as string) ?? "",
              helpTypes:        (row.help_types as HelpType[]) ?? [],
              volunteersNeeded: (row.volunteers_needed as number) ?? 1,
              volunteersJoined: (row.volunteers_joined as number) ?? 0,
              status:           row.status as "open" | "in_progress" | "completed" | "closed",
              postedAgo:        diffH < 1 ? "agora" : diffH < 24 ? `há ${diffH}h` : `há ${Math.floor(diffH / 24)}d`,
              lat:              latLon?.lat,
              lon:              latLon?.lon,
            };
          })
        );
      });
  }, []);

  // Recalcula distâncias e ordena por score combinado (match 55% + proximidade 45%)
  const sortedActions = useMemo(() => {
    const center = userCoords ?? { lat: CENTER_LAT, lon: CENTER_LON };
    return dbActions
      .map((a) => ({
        ...a,
        distanceKm: a.lat != null && a.lon != null
          ? parseFloat(haversineKm(center.lat, center.lon, a.lat, a.lon).toFixed(1))
          : 0,
      }))
      .sort((a, b) => {
        const isRecA = recommendedIds.includes(a.id);
        const isRecB = recommendedIds.includes(b.id);
        const matchA = isRecA ? 70 : 30;
        const matchB = isRecB ? 70 : 30;
        const dScoreA = a.distanceKm > 0 ? distanceToScore(a.distanceKm) : 50;
        const dScoreB = b.distanceKm > 0 ? distanceToScore(b.distanceKm) : 50;
        return (matchB * 0.55 + dScoreB * 0.45) - (matchA * 0.55 + dScoreA * 0.45);
      });
  }, [dbActions, userCoords, recommendedIds]); // eslint-disable-line react-hooks/exhaustive-deps

  const centerLat = userCoords?.lat ?? CENTER_LAT;
  const centerLon = userCoords?.lon ?? CENTER_LON;

  return (
    <AppShell role="volunteer">
      <h1 className="text-2xl font-bold">Mapa de ações</h1>
      <p className="mt-1 text-muted-foreground text-sm">
        {sortedActions.length} ações ativas{userCoords ? " · ordenadas pela sua localização" : ""}
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 overflow-hidden border border-border/60 bg-card shadow-soft">
          <div className="relative h-[60vh] bg-gradient-to-br from-primary/15 via-accent to-ai/15">
            <svg className="absolute inset-0 h-full w-full opacity-30" viewBox="0 0 600 500" preserveAspectRatio="none">
              <defs>
                <pattern id="grid2" width="30" height="30" patternUnits="userSpaceOnUse">
                  <path d="M 30 0 L 0 0 0 30" fill="none" stroke="currentColor" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="600" height="500" fill="url(#grid2)" className="text-primary" />
            </svg>

            {/* Você */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
              <div className="h-4 w-4 rounded-full bg-primary ring-4 ring-primary/30 animate-pulse" />
              <p className="mt-1 rounded-md bg-card/90 px-1.5 py-0.5 text-[9px] font-semibold shadow text-center">Você</p>
            </div>

            {/* Pins das ações posicionados por lat/lon */}
            {sortedActions.map((a) => {
              const pos = a.lat != null && a.lon != null
                ? coordToPercent(a.lat, a.lon, centerLat, centerLon)
                : null;
              if (!pos) return null;
              const color = a.urgency === "high" ? "bg-urgent" : a.urgency === "medium" ? "bg-warning" : "bg-success";
              const isRec = recommendedIds.includes(a.id);
              return (
                <button
                  key={a.id}
                  style={{ left: pos.left, top: pos.top }}
                  className={cn("absolute -translate-x-1/2 -translate-y-1/2 group z-10", a.urgency === "high" && "animate-pulse-ring rounded-full")}
                  onClick={() => setSelectedAction(a)}
                  aria-label={`Ver detalhes: ${a.title}`}
                >
                  <div className={cn("flex h-9 w-9 items-center justify-center rounded-full shadow-elegant transition-transform group-hover:scale-110", color)}>
                    <MapPin className="h-4 w-4 text-white" />
                  </div>
                  {isRec && (
                    <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-ai border-2 border-card" />
                  )}
                </button>
              );
            })}

            <button className="absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center rounded-xl bg-card shadow-elegant">
              <Layers className="h-5 w-5" />
            </button>
            <button className="absolute bottom-16 right-4 flex h-10 w-10 items-center justify-center rounded-xl bg-card shadow-elegant">
              <Navigation className="h-5 w-5" />
            </button>

            {!userCoords && (
              <div className="absolute bottom-4 left-4 rounded-lg bg-card/90 px-3 py-1.5 text-[11px] text-muted-foreground shadow">
                Permita localização para ver distâncias reais
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="font-semibold text-sm">
            {userCoords ? "Mais próximas de você" : "Ações ativas"}
          </h2>
          {sortedActions.slice(0, 6).map((a) => {
            const isRec = recommendedIds.includes(a.id);
            return (
              <button
                key={a.id}
                className="flex w-full items-start gap-3 border border-border/60 bg-card p-3 shadow-soft text-left transition-all hover:shadow-elegant hover:border-primary/30"
                onClick={() => setSelectedAction(a)}
              >
                <div className={cn("mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full", a.urgency === "high" ? "bg-urgent" : a.urgency === "medium" ? "bg-warning" : "bg-success")} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold leading-tight truncate">{a.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {a.distanceKm > 0 ? `${a.distanceKm} km · ` : ""}{a.location}
                  </p>
                  {isRec && (
                    <p className="mt-0.5 text-[10px] text-ai font-semibold flex items-center gap-1">
                      <Sparkles className="h-2.5 w-2.5" /> Recomendada para você
                    </p>
                  )}
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              </button>
            );
          })}
        </div>
      </div>

      <ActionPreviewSheet
        action={selectedAction}
        open={selectedAction !== null}
        onClose={() => setSelectedAction(null)}
        userCoords={userCoords}
      />
    </AppShell>
  );
}
